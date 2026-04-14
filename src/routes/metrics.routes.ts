import { Router } from "express";
import { getMetrics } from "../controllers/metrics.controller.js";

const metricsRouter = Router();

/**
 * @swagger
 * /api/metrics:
 *   get:
 *     summary: Get Prometheus metrics for the API process
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Prometheus metrics output
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
metricsRouter.get("/", getMetrics);

export default metricsRouter;