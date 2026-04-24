import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";

const createRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const isUpstashOrSecure = redisUrl.startsWith("rediss://");
  
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: isUpstashOrSecure ? { rejectUnauthorized: false } : undefined,
  });
};

export const orderQueue = new Queue("process-checkout", {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 3600, count: 500 },
    removeOnFail: { age: 86400 },
  },
});

export const orderQueueEvents = new QueueEvents("process-checkout", {
  connection: createRedisConnection(),
});

export { createRedisConnection };
