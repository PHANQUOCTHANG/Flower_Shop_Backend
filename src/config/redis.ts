import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const isSecure = redisUrl.startsWith("rediss://");

const redisClient = createClient({
  url: redisUrl,
  socket: {
    tls: isSecure ? true : undefined,
    reconnectStrategy: (retries: number, cause: Error) => {
      // Nếu gặp lỗi quá giới hạn Upstash, ngừng cố gắng kết nối lại để không bị bão spam lỗi
      if (cause?.message?.includes("max requests limit exceeded")) {
        return new Error("Upstash max requests limit exceeded. Stopping reconnect.");
      }
      // Trì hoãn reconnect theo số lần thử (tối đa 3 giây)
      return Math.min(retries * 50, 3000);
    },
  },
});

let lastLoggedErrorTime = 0;

redisClient.on("error", (err) => {
  if (err?.message?.includes("max requests limit exceeded")) {
    const now = Date.now();
    // Phạt Upstash limit, chỉ log 1 lần mỗi 5 phút (300000ms) để chống spam văng console
    if (now - lastLoggedErrorTime > 300000) {
      console.error("[Redis Limit] Upstash hết quota 500k/ngày, đang bỏ qua kết nối...");
      lastLoggedErrorTime = now;
    }
  } else {
    console.error("Redis error:", err);
  }
});

export const connectRedis = async () => {
  await redisClient.connect();
  console.log("Redis connected");
};

export default redisClient;