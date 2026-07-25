import { Queue } from "bullmq";
import { getRedisConnection } from "../config/redis.js";

export const SCAN_QUEUE_NAME = "repo-scan";

let scanQueue = null;

export const getScanQueue = () => {
  if (!scanQueue) {
    scanQueue = new Queue(SCAN_QUEUE_NAME, { connection: getRedisConnection() });
  }
  return scanQueue;
};
