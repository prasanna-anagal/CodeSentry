import IORedis from "ioredis";

let connection = null;

export const getRedisConnection = () => {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }
  return connection;
};

// A subscriber connection can't run normal commands once it SUBSCRIBEs, so
// pub/sub needs its own dedicated connection rather than sharing the one
// BullMQ uses for the job queue.
export const createRedisConnection = () =>
  new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
