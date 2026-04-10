import { Queue } from "bullmq";
import { defaultQueueOptions } from "../config/bull.js";

export interface DocumentGenerationJobData {
  batchId: string;
  documentId: string;
  userId: string;
}

export const documentQueue = new Queue<DocumentGenerationJobData>(
  "document-generation",
  defaultQueueOptions
);

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
}