import { createRedisConnection } from "./config/redis.js";
import { SCAN_EVENTS_CHANNEL } from "./services/scanEvents.js";
import { getIo } from "./socket.js";

// Scans run in separate worker processes, so this subscriber is what lets
// the API server's connected dashboard clients hear about them in real time.
export const relayScanEvents = async () => {
  const subscriber = createRedisConnection();
  await subscriber.subscribe(SCAN_EVENTS_CHANNEL);

  subscriber.on("message", (channel, message) => {
    try {
      const event = JSON.parse(message);
      getIo().emit("scan-event", event);
    } catch (err) {
      console.error("[relay] failed to parse scan event:", err.message);
    }
  });

  console.log(`[relay] listening for scan events on "${SCAN_EVENTS_CHANNEL}"`);
};
