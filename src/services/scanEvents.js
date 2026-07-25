import { createRedisConnection } from "../config/redis.js";

export const SCAN_EVENTS_CHANNEL = "scan-events";

let publisher = null;

export const publishScanEvent = async (event) => {
  if (!publisher) {
    publisher = createRedisConnection();
  }
  await publisher.publish(SCAN_EVENTS_CHANNEL, JSON.stringify(event));
};
