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
