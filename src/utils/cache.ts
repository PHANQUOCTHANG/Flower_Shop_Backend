import redisClient from "@/config/redis";

export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`[Redis Error - getCache] key: ${key}`, error);
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
    console.error(`[Redis Error - setCache] key: ${key}`, error);
  }
};

export const deleteCache = async (key: string) => {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error(`[Redis Error - deleteCache] key: ${key}`, error);
  }
};

export const deleteCacheByPattern = async (pattern: string) => {
  try {
    const keys = await redisClient.keys(pattern); // scan tất cả key khớp pattern
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error(`[Redis Error - deleteCacheByPattern] pattern: ${pattern}`, error);
  }
};