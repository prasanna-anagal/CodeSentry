import "dotenv/config";
import { Worker } from "bullmq";
import { getRedisConnection } from "../config/redis.js";
import { connectDB } from "../config/db.js";
import { SCAN_QUEUE_NAME } from "../queues/scanQueue.js";
import { cloneRepo, cleanupClone } from "../services/cloneRepo.js";
import { scanForSecrets } from "../services/scanSecrets.js";
import { scanForPii } from "../services/scanPii.js";
import { checkVulnerabilities } from "../services/checkVulnerabilities.js";
import { diffFindings } from "../services/diffFindings.js";
import { publishScanEvent } from "../services/scanEvents.js";
import { Scan } from "../models/scan.model.js";
import { Finding } from "../models/finding.model.js";

const workerId = process.env.WORKER_ID || process.pid;

const processJob = async (job) => {
  const { repo, commit } = job.data;
  console.log(`[worker ${workerId}] picked up job ${job.id} - repo=${repo} commit=${commit}`);

  // BullMQ guarantees at-least-once delivery, so a worker crash mid-job can
  // cause the same job to be redelivered. Skip re-scanning a commit that was
  // already scanned to completion rather than double-counting findings.
  const existingScan = await Scan.findOne({ repo, commit, status: "completed" });
  if (existingScan) {
    console.log(
      `[worker ${workerId}] skipping job ${job.id} - ${repo}@${commit} was already scanned (scan ${existingScan._id})`
    );
    return { scanId: existingScan._id.toString(), skipped: true };
  }

  const scan = await Scan.create({ repo, commit });
  await publishScanEvent({ kind: "scan-started", repo, commit, scanId: scan._id.toString() });

  let repoDir;

  try {
    repoDir = await cloneRepo(repo, commit);

    const secretFindings = await scanForSecrets(repoDir);
    const piiFindings = await scanForPii(repoDir);
    const vulnFindings = await checkVulnerabilities(repoDir);

    const rawFindings = [
      ...secretFindings.map((f) => ({ ...f, type: "secret" })),
      ...piiFindings.map((f) => ({ ...f, type: "pii" })),
      ...vulnFindings.map((f) => ({ ...f, type: "vulnerability" })),
    ];

    const classifiedFindings = await diffFindings(repo, scan._id, rawFindings);

    if (classifiedFindings.length > 0) {
      await Finding.insertMany(
        classifiedFindings.map((f) => ({
          scanId: scan._id,
          repo,
          commit,
          ...f,
        }))
      );
    }

    scan.status = "completed";
    scan.finishedAt = new Date();
    await scan.save();

    const newCount = classifiedFindings.filter((f) => f.status === "new").length;
    const persistingCount = classifiedFindings.filter((f) => f.status === "persisting").length;

    console.log(
      `[worker ${workerId}] finished job ${job.id} - ${classifiedFindings.length} finding(s) (${newCount} new, ${persistingCount} persisting)`
    );

    await publishScanEvent({
      kind: "scan-completed",
      repo,
      commit,
      scanId: scan._id.toString(),
      totalFindings: classifiedFindings.length,
      newCount,
      persistingCount,
    });
  } catch (err) {
    scan.status = "failed";
    scan.finishedAt = new Date();
    await scan.save();
    await publishScanEvent({ kind: "scan-failed", repo, commit, scanId: scan._id.toString() });
    throw err;
  } finally {
    if (repoDir) await cleanupClone(repoDir);
  }

  return { scanId: scan._id.toString(), processedBy: workerId };
};

const start = async () => {
  await connectDB();

  const worker = new Worker(SCAN_QUEUE_NAME, processJob, {
    connection: getRedisConnection(),
    concurrency: 1,
  });

  worker.on("completed", (job) => {
    console.log(`[worker ${workerId}] job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[worker ${workerId}] job ${job?.id} failed:`, err.message);
  });

  console.log(`[worker ${workerId}] listening on queue "${SCAN_QUEUE_NAME}"`);
};

start();
