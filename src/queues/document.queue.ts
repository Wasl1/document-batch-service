import { Queue } from "bullmq";
import { defaultQueueOptions } from "../config/bull.js";
import { queueSizeGauge } from "../config/metrics.js";

export interface DocumentGenerationJobData {
  batchId: string;
  documentId: string;
  userId: string;
}

export const documentQueue = new Queue<DocumentGenerationJobData>(
  "document-generation",
  defaultQueueOptions
);

export async function updateDocumentQueueMetrics(): Promise<void> {
  const counts = await documentQueue.getJobCounts(
    "waiting",
    "delayed",
    "active",
    "paused"
  );

  const totalQueueSize =
    (counts.waiting ?? 0) +
    (counts.delayed ?? 0) +
    (counts.active ?? 0) +
    (counts.paused ?? 0);

  queueSizeGauge.set(totalQueueSize);
}

export async function enqueueDocumentGenerationJob(
  data: DocumentGenerationJobData
): Promise<void> {
  await documentQueue.add("generate-document", data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000
    },
    removeOnComplete: true,
    removeOnFail: false
  });

  await updateDocumentQueueMetrics();
}

export async function getDocumentQueueHealth(): Promise<{
  name: string;
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
}> {
  const counts = await documentQueue.getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed",
    "paused"
  );

  return {
    name: documentQueue.name,
    counts: {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      paused: counts.paused ?? 0
    }
  };
}