import "dotenv/config";
import { Worker } from "bullmq";
import { getRedisConnection } from "../config/redis.js";
import { connectDB } from "../config/db.js";
import { SCAN_QUEUE_NAME } from "../queues/scanQueue.js";
import { cloneRepo, cleanupClone } from "../services/cloneRepo.js";
import { scanForSecrets } from "../services/scanSecrets.js";
import { Scan } from "../models/scan.model.js";
import { Finding } from "../models/finding.model.js";

const workerId = process.env.WORKER_ID || process.pid;

const processJob = async (job) => {
  const { repo, commit } = job.data;
  console.log(`[worker ${workerId}] picked up job ${job.id} - repo=${repo} commit=${commit}`);

  const scan = await Scan.create({ repo, commit });
  let repoDir;

  try {
    repoDir = await cloneRepo(repo, commit);
    const secretFindings = await scanForSecrets(repoDir);

    if (secretFindings.length > 0) {
      await Finding.insertMany(
        secretFindings.map((f) => ({
          scanId: scan._id,
          repo,
          commit,
          type: "secret",
          ...f,
        }))
      );
    }

    scan.status = "completed";
    scan.finishedAt = new Date();
    await scan.save();

    console.log(
      `[worker ${workerId}] finished job ${job.id} - ${secretFindings.length} secret finding(s)`
    );
  } catch (err) {
    scan.status = "failed";
    scan.finishedAt = new Date();
    await scan.save();
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
