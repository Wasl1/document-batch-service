import { Router } from "express";
import { createDocumentBatch } from "../controllers/document.controller.js";

const documentRouter = Router();

documentRouter.post("/batch", createDocumentBatch);

export default documentRouter;