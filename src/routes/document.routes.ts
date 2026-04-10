import { Router } from "express";
import { createDocumentBatch, getDocumentBatchById, getGeneratedDocumentById } from "../controllers/document.controller.js";

const documentRouter = Router();

documentRouter.post("/batch", createDocumentBatch);
documentRouter.get("/batch/:batchId", getDocumentBatchById);
documentRouter.get("/:documentId", getGeneratedDocumentById);

export default documentRouter;