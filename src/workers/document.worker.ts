import { Job, Worker } from "bullmq";
import { defaultWorkerOptions } from "../config/bull.js";
import { logger } from "../config/logger.js";
import {
  batchProcessingDurationSeconds,
  documentsFailedTotal,
  documentsGeneratedTotal,
  documentProcessingDurationSeconds
} from "../config/metrics.js";
import { closeMongo, connectMongo } from "../config/mongo.js";
import { closeRedis } from "../config/redis.js";
import {
  updateDocumentQueueMetrics
} from "../queues/document.queue.js";
import type { DocumentGenerationJobData } from "../queues/document.queue.js";
import {
  getBatchById,
  updateBatchProgress
} from "../repositories/batch.repository.js";
import {
  attachFileToDocument,
  getDocumentsByBatchId,
  incrementDocumentRetryCount,
  setDocumentError,
  updateDocumentStatus
} from "../repositories/document.repository.js";
import { storePdfFileInGridFs } from "../services/gridfs.service.js";
import { generateDocumentPdfBuffer } from "../services/pdf.service.js";
import { withTimeout } from "../utils/promise.js";
import { startWorkerMetricsServer } from "./worker-metrics-server.js";

let worker: Worker<DocumentGenerationJobData> | null = null;
let isShuttingDown = false;

async function refreshBatchProgress(batchId: string): Promise<void> {
  const documents = await getDocumentsByBatchId(batchId);
  await updateBatchProgress(batchId, documents);

  const batch = await getBatchById(batchId);

  if (
    batch &&
    (batch.status === "completed" || batch.status === "failed") &&
    batch.startedAt &&
    batch.completedAt
  ) {
    const durationSeconds =
      (batch.completedAt.getTime() - batch.startedAt.getTime()) / 1000;

    if (durationSeconds >= 0) {
      batchProcessingDurationSeconds.observe(durationSeconds);
    }
  }
}

async function processDocumentJob(
  job: Job<DocumentGenerationJobData>
): Promise<void> {
  const { batchId, documentId, userId } = job.data;
  const documentStartTime = Date.now();

  logger.info(
    {
      jobId: job.id,
      batchId,
      documentId,
      userId,
      attemptsMade: job.attemptsMade
    },
    "Processing document job"
  );

  await updateDocumentStatus(documentId, "processing");
  await refreshBatchProgress(batchId);
  await updateDocumentQueueMetrics();

  try {
    const fileId = await withTimeout(
      (async () => {
        const pdfBuffer = await generateDocumentPdfBuffer({
          batchId,
          documentId,
          userId
        });

        return storePdfFileInGridFs({
          filename: `document-${documentId}.pdf`,
          buffer: pdfBuffer,
          contentType: "application/pdf"
        });
      })(),
      5000,
      "PDF generation timed out after 5 seconds"
    );

    await attachFileToDocument(documentId, fileId);
    await updateDocumentStatus(documentId, "completed");
    await refreshBatchProgress(batchId);

    documentsGeneratedTotal.inc();
    documentProcessingDurationSeconds.observe(
      (Date.now() - documentStartTime) / 1000
    );

    logger.info(
      {
        jobId: job.id,
        batchId,
        documentId,
        userId,
        fileId: String(fileId)
      },
      "Document job completed"
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown processing error";

    await incrementDocumentRetryCount(documentId);
    await setDocumentError(documentId, errorMessage);

    const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

    if (isLastAttempt) {
      await updateDocumentStatus(documentId, "failed");
      await refreshBatchProgress(batchId);
      documentsFailedTotal.inc();
      documentProcessingDurationSeconds.observe(
        (Date.now() - documentStartTime) / 1000
      );
    }

    logger.error(
      {
        err: error,
        jobId: job.id,
        batchId,
        documentId,
        userId,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        isLastAttempt
      },
      "Document job failed"
    );

    throw error;
  } finally {
    await updateDocumentQueueMetrics();
  }
}

async function startWorker(): Promise<void> {
  await connectMongo();
  startWorkerMetricsServer(3002);

  worker = new Worker<DocumentGenerationJobData>(
    "document-generation",
    processDocumentJob,
    defaultWorkerOptions
  );

  worker.on("completed", async (job) => {
    logger.info({ jobId: job.id }, "Worker job completed");
    await updateDocumentQueueMetrics();
  });

  worker.on("failed", async (job, error) => {
    logger.error(
      {
        err: error,
        jobId: job?.id
      },
      "Worker job failed"
    );
    await updateDocumentQueueMetrics();
  });

  await updateDocumentQueueMetrics();
  logger.info("Document worker started");
}

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn({ signal }, "Worker shutdown already in progress");
    return;
  }

  isShuttingDown = true;

  try {
    logger.info({ signal }, "Worker graceful shutdown started");

    if (worker) {
      await worker.close();
      logger.info("Worker closed");
    }

    await closeMongo();
    logger.info("MongoDB connection closed");

    await closeRedis();
    logger.info("Redis connection closed");

    logger.info("Worker graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, "Error during worker graceful shutdown");
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void startWorker();