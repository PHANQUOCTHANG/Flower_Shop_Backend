import redisClient from "@/config/redis";

let lastLoggedLimitError = 0;

const logRedisError = (context: string, error: any) => {
  const isLimitError = error?.message?.includes("max requests limit exceeded");
  
  if (isLimitError) {
    const now = Date.now();
    // Tránh bão console: chỉ log lỗi limit 1 lần mỗi 5 phút (300000ms)
    if (now - lastLoggedLimitError > 300000) {
      console.error(`[Redis Limit] ${context}: Upstash hết quota 500k/ngày, bỏ qua cache...`);
      lastLoggedLimitError = now;
    }
  } else {
    console.error(`[Redis Error] ${context}:`, error);
  }
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logRedisError(`getCache(${key})`, error);
    return null; // Fallback an toàn, coi như không hit cache
  }
};

export const setCache = async (
  key: string,
  value: any,
  ttl = 300
) => {
  try {
    await redisClient.set(key, JSON.stringify(value), {
      EX: ttl,
    });
  } catch (error) {
    logRedisError(`setCache(${key})`, error);
  }
};

export const deleteCache = async (key: string) => {
  try {
    await redisClient.del(key);
  } catch (error) {
    logRedisError(`deleteCache(${key})`, error);
  }
};

export const deleteCacheByPattern = async (pattern: string) => {
  try {
    // Dùng SCAN thay vì KEYS để tránh blocking Redis server khi có nhiều key
    // KEYS là blocking operation — nguy hiểm khi Redis có hàng triệu key (production)
    // node-redis v4: cursor là RedisArgument (string), bắt đầu từ "0"
    let cursor = "0";
    const keysToDelete: string[] = [];

    do {
      const result = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });
      cursor = result.cursor;
      keysToDelete.push(...result.keys);
    } while (cursor !== "0");

    if (keysToDelete.length > 0) {
      // Xóa theo batch 100 key để tránh pipeline quá lớn
      const batchSize = 100;
      for (let i = 0; i < keysToDelete.length; i += batchSize) {
        await redisClient.del(keysToDelete.slice(i, i + batchSize));
      }
    }
  } catch (error) {
    logRedisError(`deleteCacheByPattern(${pattern})`, error);
  }
};