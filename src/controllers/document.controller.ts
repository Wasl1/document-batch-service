import { Request, Response } from "express";
import { createBatchWithDocuments } from "../services/batch.service.js";

export async function createDocumentBatch(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { userIds } = req.body as { userIds?: unknown };

    if (!Array.isArray(userIds)) {
      res.status(400).json({
        success: false,
        message: "userIds must be an array"
      });
      return;
    }

    if (userIds.length === 0) {
      res.status(400).json({
        success: false,
        message: "userIds must not be empty"
      });
      return;
    }

    if (userIds.length > 1000) {
      res.status(400).json({
        success: false,
        message: "userIds must contain at most 1000 items"
      });
      return;
    }

    const invalidUserId = userIds.find(
      (userId) => typeof userId !== "string" || userId.trim() === ""
    );

    if (invalidUserId !== undefined) {
      res.status(400).json({
        success: false,
        message: "Each userId must be a non-empty string"
      });
      return;
    }

    const normalizedUserIds = userIds.map((userId) => String(userId).trim());
    const uniqueUserIds = [...new Set(normalizedUserIds)];

    const result = await createBatchWithDocuments({
      userIds: uniqueUserIds
    });

    res.status(201).json({
      success: true,
      message: "Batch created successfully",
      data: {
        batchId: result.batch._id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error"
    });
  }
}