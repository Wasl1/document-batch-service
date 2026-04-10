import { ObjectId, type Collection } from "mongodb";
import { getMongoDb } from "../config/mongo.js";
import { COLLECTIONS } from "../config/collections.js";
import type { Batch, BatchStatus } from "../types/batch.types.js";
import type { DocumentEntity } from "../types/document.types.js";

function getBatchCollection(): Collection<Batch> {
  return getMongoDb().collection<Batch>(COLLECTIONS.batches);
}

export async function createBatch(batch: Batch): Promise<Batch> {
  const collection = getBatchCollection();

  const result = await collection.insertOne(batch);

  return {
    ...batch,
    _id: result.insertedId
  };
}

export async function getBatchById(batchId: string): Promise<Batch | null> {
  const collection = getBatchCollection();

  return collection.findOne({
    _id: new ObjectId(batchId)
  });
}

export async function updateBatchProgress(
  batchId: string,
  documents: DocumentEntity[]
): Promise<void> {
  const collection = getBatchCollection();
  const batch = await getBatchById(batchId);

  if (!batch) {
    throw new Error("Batch not found");
  }

  const processedCount = documents.filter(
    (document) => document.status === "completed" || document.status === "failed"
  ).length;

  const successCount = documents.filter(
    (document) => document.status === "completed"
  ).length;

  const failedCount = documents.filter(
    (document) => document.status === "failed"
  ).length;

  const hasProcessing = documents.some(
    (document) => document.status === "processing"
  );

  const totalDocuments = documents.length;

  let status: BatchStatus = "pending";

  if (processedCount === totalDocuments && failedCount === 0) {
    status = "completed";
  } else if (processedCount === totalDocuments && failedCount > 0) {
    status = "failed";
  } else if (hasProcessing || processedCount > 0) {
    status = "processing";
  }

  const now = new Date();

  const updatePayload: Partial<Batch> = {
    status,
    processedCount,
    successCount,
    failedCount,
    updatedAt: now
  };

  if (status === "processing" && !batch.startedAt) {
    updatePayload.startedAt = now;
  }

  if (status === "completed" || status === "failed") {
    updatePayload.completedAt = now;
  }

  await collection.updateOne(
    { _id: new ObjectId(batchId) },
    {
      $set: updatePayload
    }
  );
}