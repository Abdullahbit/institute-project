import { Redis } from "@upstash/redis";
import { env, hasRedis } from "./env";

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!hasRedis()) return null;
  if (!redis) {
    redis = new Redis({
      url: env.upstashRedisUrl,
      token: env.upstashRedisToken,
    });
  }
  return redis;
}

const SCHEDULE_CACHE_TTL = 300;

export async function getCachedSchedule<T>(
  schoolId: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cache = getRedis();
  const key = `schedule:${schoolId}`;

  if (cache) {
    const hit = await cache.get<T>(key);
    if (hit) return hit;
  }

  const data = await fetcher();

  if (cache) {
    await cache.set(key, data, { ex: SCHEDULE_CACHE_TTL });
  }

  return data;
}

export async function invalidateScheduleCache(schoolId: string): Promise<void> {
  const cache = getRedis();
  if (cache) await cache.del(`schedule:${schoolId}`);
}
