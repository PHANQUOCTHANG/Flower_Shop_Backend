import redisClient from "@/config/redis";

export const getCache = async <T>(key: string): Promise<T | null> => {
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};

export const setCache = async (
  key: string,
  value: any,
  ttl = 300
) => {
  await redisClient.set(key, JSON.stringify(value), {
    EX: ttl,
  });
};

export const deleteCache = async (key: string) => {
  await redisClient.del(key);
};

export const deleteCacheByPattern = async (pattern: string) => {
  const keys = await redisClient.keys(pattern); // scan tất cả key khớp pattern
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
};