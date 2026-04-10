import { Job, Worker } from "bullmq";
import { defaultWorkerOptions } from "../config/bull.js";
import { getDocumentsByBatchId, updateDocumentStatus } from "../repositories/document.repository.js";
import { updateBatchProgress } from "../repositories/batch.repository.js";
import type { DocumentGenerationJobData } from "../queues/document.queue.js";
import { connectMongo } from "../config/mongo.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processDocumentJob(
  job: Job<DocumentGenerationJobData>
): Promise<void> {
  const { batchId, documentId, userId } = job.data;

  console.log(`Processing document ${documentId} for user ${userId}`);

  await updateDocumentStatus(documentId, "processing");

  {
    const documents = await getDocumentsByBatchId(batchId);
    await updateBatchProgress(batchId, documents);
  }

  await sleep(2000);

  await updateDocumentStatus(documentId, "completed");

  {
    const documents = await getDocumentsByBatchId(batchId);
    await updateBatchProgress(batchId, documents);
  }

  console.log(`Document ${documentId} completed`);
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