import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";

const createRedisConnection = () =>
  new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: {}, // thêm dòng này nếu dùng Upstash
  });

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
