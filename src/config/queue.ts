import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";

// ─── Singleton Redis connection cho BullMQ ───────────────────────────────────
// Tạo MỘT kết nối duy nhất được chia sẻ cho Queue, QueueEvents, và Worker
// → Giảm đáng kể số lệnh PING/AUTH/CONFIG gửi tới Upstash

let _redisInstance: IORedis | null = null;

export const getBullMQRedis = (): IORedis => {
  if (_redisInstance) return _redisInstance;

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const isSecure = redisUrl.startsWith("rediss://");

  _redisInstance = new IORedis(redisUrl, {
    maxRetriesPerRequest: null, // Bắt buộc với BullMQ
    enableReadyCheck: false,   // BullMQ tự xử lý
    // Bỏ rejectUnauthorized: false → dùng TLS đúng chuẩn
    tls: isSecure ? {} : undefined,
    retryStrategy: (times) => {
      // Tăng dần thời gian kết nối lại, tối đa 15 giây để tránh bị Upstash spam log
      return Math.min(times * 1000, 15000);
    },
  });

  _redisInstance.on("error", (err) => {
    // Chỉ log, không crash — BullMQ tự retry kết nối
    console.error("[BullMQ Redis] Connection error:", err.message);
  });

  return _redisInstance;
};

// ─── Dead-Letter Queue ────────────────────────────────────────────────────────
// Job checkout thất bại sau tất cả lần retry → chuyển vào DLQ để xem xét thủ công
export const orderDLQ = new Queue("order-dlq", {
  connection: getBullMQRedis(),
  defaultJobOptions: {
    removeOnComplete: { age: 7 * 24 * 3600 }, // Giữ 7 ngày trong DLQ
    removeOnFail: false,
  },
});

// ─── Main Order Queue ─────────────────────────────────────────────────────────
export const orderQueue = new Queue("process-checkout", {
  connection: getBullMQRedis(), // Dùng singleton, không tạo connection mới
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 3600, count: 100 }, // Giảm count: 500 → 100 (tiết kiệm bộ nhớ Redis)
    removeOnFail: { age: 86400 },
  },
});

// ─── Queue Events ─────────────────────────────────────────────────────────────
export const orderQueueEvents = new QueueEvents("process-checkout", {
  connection: getBullMQRedis(), // Dùng cùng singleton
});
