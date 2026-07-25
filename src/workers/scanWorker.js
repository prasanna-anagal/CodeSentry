import "dotenv/config";
import { Worker } from "bullmq";
import { getRedisConnection } from "../config/redis.js";
import { connectDB } from "../config/db.js";
import { SCAN_QUEUE_NAME } from "../queues/scanQueue.js";

const workerId = process.env.WORKER_ID || process.pid;

const processJob = async (job) => {
  console.log(`[worker ${workerId}] picked up job ${job.id} - repo=${job.data.repo} commit=${job.data.commit}`);

  // Placeholder work - real cloning + detection logic gets added next.
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log(`[worker ${workerId}] finished job ${job.id}`);
  return { processedBy: workerId, receivedAt: job.data.enqueuedAt };
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
