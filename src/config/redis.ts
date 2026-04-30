import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const isSecure = redisUrl.startsWith("rediss://");

const redisClient = createClient({
  url: redisUrl,
  socket: isSecure
    ? { tls: true, rejectUnauthorized: false }
    : undefined,
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

export const connectRedis = async () => {
  await redisClient.connect();
  console.log("Redis connected");
};

export default redisClient;