import { Job, Worker } from "bullmq";
import { defaultWorkerOptions } from "../config/bull.js";
import {
  attachFileToDocument,
  getDocumentsByBatchId,
  updateDocumentStatus
} from "../repositories/document.repository.js";
import { updateBatchProgress } from "../repositories/batch.repository.js";
import type { DocumentGenerationJobData } from "../queues/document.queue.js";
import { connectMongo } from "../config/mongo.js";
import { generateDocumentPdfBuffer } from "../services/pdf.service.js";
import { storePdfFileInGridFs } from "../services/gridfs.service.js";

async function processDocumentJob(
  job: Job<DocumentGenerationJobData>
): Promise<void> {
  const { batchId, documentId, userId } = job.data;

  console.log(`Processing document ${documentId} for user ${userId}`);

  try {
    await updateDocumentStatus(documentId, "processing");

    {
      const documents = await getDocumentsByBatchId(batchId);
      await updateBatchProgress(batchId, documents);
    }

    const pdfBuffer = await generateDocumentPdfBuffer({
      batchId,
      documentId,
      userId
    });

    const fileId = await storePdfFileInGridFs({
      filename: `document-${documentId}.pdf`,
      buffer: pdfBuffer,
      contentType: "application/pdf"
    });

    await attachFileToDocument(documentId, fileId);

    await updateDocumentStatus(documentId, "completed");

    {
      const documents = await getDocumentsByBatchId(batchId);
      await updateBatchProgress(batchId, documents);
    }

    console.log(`Document ${documentId} completed`);
  } catch (error) {
    await updateDocumentStatus(documentId, "failed");

    {
      const documents = await getDocumentsByBatchId(batchId);
      await updateBatchProgress(batchId, documents);
    }

    throw error;
  }
}

async function startWorker(): Promise<void> {
  await connectMongo();

  const worker = new Worker<DocumentGenerationJobData>(
    "document-generation",
    processDocumentJob,
    defaultWorkerOptions
  );

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on("failed", (job, error) => {
    console.error(`Job ${job?.id} failed:`, error.message);
  });

  console.log("Document worker started");
}

void startWorker();