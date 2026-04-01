import { ObjectId } from "mongodb";
import { createBatch } from "../repositories/batch.repository.js";
import { createManyDocuments } from "../repositories/document.repository.js";
import type { Batch } from "../types/batch.types.js";
import type { DocumentEntity } from "../types/document.types.js";

export interface CreateBatchInput {
  userIds: string[];
}

export async function createBatchWithDocuments(
  input: CreateBatchInput
): Promise<{ batch: Batch; documents: DocumentEntity[] }> {
  const now = new Date();

  const batchToCreate: Batch = {
    status: "pending",
    userIds: input.userIds,
    totalDocuments: input.userIds.length,
    processedCount: 0,
    successCount: 0,
    failedCount: 0,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null
  };

  const createdBatch = await createBatch(batchToCreate);

  if (!createdBatch._id) {
    throw new Error("Batch ID was not generated");
  }

  const documentsToCreate: DocumentEntity[] = input.userIds.map((userId) => ({
    batchId: createdBatch._id as ObjectId,
    userId,
    status: "pending",
    retryCount: 0,
    fileId: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null
  }));

  const createdDocuments = await createManyDocuments(documentsToCreate);

  return {
    batch: createdBatch,
    documents: createdDocuments
  };
}