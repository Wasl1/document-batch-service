import { Request, Response } from "express";
import { getBatchById } from "../repositories/batch.repository.js";
import { getDocumentsByBatchId } from "../repositories/document.repository.js";
import { createBatchWithDocuments } from "../services/batch.service.js";
import { isValidObjectId } from "../utils/object-id.js";
import { ObjectId } from "mongodb";
import { openPdfDownloadStream } from "../services/gridfs.service.js";
import { getDocumentById } from "../repositories/document.repository.js";
import { logger } from "../config/logger.js";

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

export async function getDocumentBatchById(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { batchId } = req.params;

    if (typeof batchId !== "string" || !isValidObjectId(batchId)) {
      res.status(400).json({
        success: false,
        message: "Invalid batchId"
      });
      return;
    }

    const batch = await getBatchById(batchId);

    if (!batch) {
      res.status(404).json({
        success: false,
        message: "Batch not found"
      });
      return;
    }

    const documents = await getDocumentsByBatchId(batchId);

    res.status(200).json({
      success: true,
      data: {
        batch: {
          id: batch._id,
          status: batch.status,
          userIds: batch.userIds,
          totalDocuments: batch.totalDocuments,
          processedCount: batch.processedCount,
          successCount: batch.successCount,
          failedCount: batch.failedCount,
          createdAt: batch.createdAt,
          updatedAt: batch.updatedAt,
          startedAt: batch.startedAt,
          completedAt: batch.completedAt
        },
        documents: documents.map((document) => ({
          id: document._id,
          batchId: document.batchId,
          userId: document.userId,
          status: document.status,
          retryCount: document.retryCount,
          fileId: document.fileId,
          errorMessage: document.errorMessage,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
          startedAt: document.startedAt,
          completedAt: document.completedAt
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error"
    });
  }
}

export async function getGeneratedDocumentById(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { documentId } = req.params;

    if (typeof documentId !== "string" || !isValidObjectId(documentId)) {
      res.status(400).json({
        success: false,
        message: "Invalid documentId"
      });
      return;
    }

    const document = await getDocumentById(documentId);

    if (!document) {
      res.status(404).json({
        success: false,
        message: "Document not found"
      });
      return;
    }

    if (!document.fileId) {
      res.status(404).json({
        success: false,
        message: "PDF file not found for this document"
      });
      return;
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="document-${documentId}.pdf"`
    );

    const downloadStream = openPdfDownloadStream(
      new ObjectId(String(document.fileId))
    );

    downloadStream.on("error", () => {
      if (!res.headersSent) {
        res.status(404).json({
          success: false,
          message: "Stored PDF file not found"
        });
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error"
    });
  }
}