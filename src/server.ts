import app from "./app.js";
import { env } from "./config/env.js";
import { closeMongo, connectMongo } from "./config/mongo.js";
import { closeRedis, connectRedis } from "./config/redis.js";

async function startServer(): Promise<void> {
  try {
    await connectMongo();
    connectRedis();

    app.listen(env.port, () => {
      console.log(`Server is running on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  try {
    await closeMongo();
    await closeRedis();
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

void startServer();