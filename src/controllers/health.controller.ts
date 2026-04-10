import { Request, Response } from "express";
import { getMongoDb } from "../config/mongo.js";
import { getRedis } from "../config/redis.js";
import { getDocumentQueueHealth } from "../queues/document.queue.js";

export async function getHealth(_req: Request, res: Response): Promise<void> {
  const health = {
    mongodb: "down",
    redis: "down",
    queue: {
      status: "down",
      name: "document-generation",
      counts: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0
      }
    }
  };

  try {
    const mongoDb = getMongoDb();
    await mongoDb.command({ ping: 1 });
    health.mongodb = "up";
  } catch {
    health.mongodb = "down";
  }

  try {
    const redis = getRedis();
    const redisStatus = await redis.ping();
    health.redis = redisStatus === "PONG" ? "up" : "down";
  } catch {
    health.redis = "down";
  }

  try {
    const queueHealth = await getDocumentQueueHealth();

    health.queue = {
      status: "up",
      name: queueHealth.name,
      counts: queueHealth.counts
    };
  } catch {
    health.queue.status = "down";
  }

  const isHealthy =
    health.mongodb === "up" &&
    health.redis === "up" &&
    health.queue.status === "up";

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    message: isHealthy ? "API is healthy" : "API is unhealthy",
    services: health
  });
}