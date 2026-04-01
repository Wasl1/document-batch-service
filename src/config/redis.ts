import Redis from "ioredis";
import { env } from "./env.js";

let redis: Redis | null = null;

export function connectRedis(): Redis {
  if (redis) {
    return redis;
  }

  redis = new Redis({
    host: env.redisHost,
    port: env.redisPort,
    maxRetriesPerRequest: 3
  });

  redis.on("connect", () => {
    console.log("Redis connected");
  });

  redis.on("error", (error: Error) => {
    console.error("Redis error:", error.message);
  });

  return redis;
}

export function getRedis(): Redis {
  if (!redis) {
    throw new Error("Redis is not connected");
  }

  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    console.log("Redis connection closed");
  }
}