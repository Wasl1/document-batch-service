import express, { Request, Response } from "express";
import { metricsRegistry } from "../config/metrics.js";
import { logger } from "../config/logger.js";

export function startWorkerMetricsServer(port = 3002): void {
  const app = express();

  app.get("/metrics", async (_req: Request, res: Response) => {
    try {
      res.setHeader("Content-Type", metricsRegistry.contentType);
      res.status(200).send(await metricsRegistry.metrics());
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to get metrics"
      });
    }
  });

  app.listen(port, () => {
    logger.info({ port }, "Worker metrics server started");
  });
}