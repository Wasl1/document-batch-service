import { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger.js";

export function errorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(
    {
      err: error,
      requestId: req.id
    },
    "Unhandled error"
  );

  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
}