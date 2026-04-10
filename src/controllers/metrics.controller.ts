import { Request, Response } from "express";
import { metricsRegistry } from "../config/metrics.js";

export async function getMetrics(_req: Request, res: Response): Promise<void> {
  try {
    res.setHeader("Content-Type", metricsRegistry.contentType);
    res.status(200).send(await metricsRegistry.metrics());
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to get metrics"
    });
  }
}