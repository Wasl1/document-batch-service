import pinoHttp from "pino-http";
import { logger } from "../config/logger.js";

export const httpLogger = pinoHttp({
  logger,
  genReqId(req) {
    const requestId = req.headers["x-request-id"];
    return typeof requestId === "string"
      ? requestId
      : `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  },
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} completed with ${res.statusCode}`;
  },
  customErrorMessage(req, res, error) {
    return `${req.method} ${req.url} failed with ${res.statusCode}: ${error.message}`;
  }
});