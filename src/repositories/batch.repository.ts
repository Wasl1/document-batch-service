import { ObjectId, type Collection } from "mongodb";
import { getMongoDb } from "../config/mongo.js";
import { COLLECTIONS } from "../config/collections.js";
import type { Batch } from "../types/batch.types.js";

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