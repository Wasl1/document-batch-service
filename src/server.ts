import { Server } from "node:http";
import app from "./app.js";
import { env } from "./config/env.js";
import { initializeDatabase } from "./config/init-db.js";
import { logger } from "./config/logger.js";
import { closeMongo, connectMongo } from "./config/mongo.js";
import { closeRedis, connectRedis } from "./config/redis.js";
import { closeDocumentQueue } from "./queues/document.queue.js";

let server: Server | null = null;
let isShuttingDown = false;

async function startServer(): Promise<void> {
  try {
    logger.info("Starting server");

    await connectMongo();
    logger.info("MongoDB connected");

    await initializeDatabase();
    logger.info("MongoDB indexes initialized");

    connectRedis();
    logger.info("Redis connection initialized");

    server = app.listen(env.port, () => {
      logger.info({ port: env.port }, "Server is running");
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to start server");
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn({ signal }, "Shutdown already in progress");
    return;
  }

  isShuttingDown = true;

  try {
    logger.info({ signal }, "Graceful shutdown started");

    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });

      logger.info("HTTP server closed");
    }

    await closeDocumentQueue();
    logger.info("Document queue closed");

    await closeMongo();
    logger.info("MongoDB connection closed");

    await closeRedis();
    logger.info("Redis connection closed");

    logger.info("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, "Error during graceful shutdown");
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void startServer();