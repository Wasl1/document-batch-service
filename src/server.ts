import app from "./app.js";
import { env } from "./config/env.js";
import { initializeDatabase } from "./config/init-db.js";
import { logger } from "./config/logger.js";
import { closeMongo, connectMongo } from "./config/mongo.js";
import { closeRedis, connectRedis } from "./config/redis.js";

async function startServer(): Promise<void> {
  try {
    logger.info("Starting server");
    await connectMongo();
    logger.info("MongoDB connected");

    await initializeDatabase();
    logger.info("MongoDB indexes initialized");

    connectRedis();
    logger.info("Redis connection initialized");

    app.listen(env.port, () => {
      logger.info({ port: env.port }, "Server is running");
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to start server");
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  try {
    logger.info("Shutting down server");
    await closeMongo();
    await closeRedis();
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, "Error during shutdown");
    process.exit(1);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

void startServer();