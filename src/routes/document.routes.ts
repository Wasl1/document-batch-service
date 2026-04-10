import { Router } from "express";
import { createDocumentBatch, getDocumentBatchById } from "../controllers/document.controller.js";

const documentRouter = Router();

documentRouter.post("/batch", createDocumentBatch);
documentRouter.get("/batch/:batchId", getDocumentBatchById);

export default documentRouter;