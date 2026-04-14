import { Router } from "express";
import {
  createDocumentBatch,
  getDocumentBatchById,
  getGeneratedDocumentById
} from "../controllers/document.controller.js";

const documentRouter = Router();

/**
 * @swagger
 * /api/documents/batch:
 *   post:
 *     summary: Create a document generation batch
 *     tags: [Documents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBatchRequest'
 *     responses:
 *       201:
 *         description: Batch created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateBatchResponse'
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
documentRouter.post("/batch", createDocumentBatch);

/**
 * @swagger
 * /api/documents/batch/{batchId}:
 *   get:
 *     summary: Get batch details and related documents
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *         example: 69d8b1fda63d86e569c792c4
 *     responses:
 *       200:
 *         description: Batch found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BatchDetailsResponse'
 *       400:
 *         description: Invalid batchId
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Batch not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
documentRouter.get("/batch/:batchId", getDocumentBatchById);

/**
 * @swagger
 * /api/documents/{documentId}:
 *   get:
 *     summary: Download or stream a generated PDF document
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         example: 69d8b1fda63d86e569c792c6
 *     responses:
 *       200:
 *         description: PDF document stream
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid documentId
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Document or PDF not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
documentRouter.get("/:documentId", getGeneratedDocumentById);

export default documentRouter;