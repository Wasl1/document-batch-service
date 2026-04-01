import { type Collection, ObjectId } from "mongodb";
import { getMongoDb } from "../config/mongo.js";
import { COLLECTIONS } from "../config/collections.js";
import type { DocumentEntity } from "../types/document.types.js";

function getDocumentCollection(): Collection<DocumentEntity> {
  return getMongoDb().collection<DocumentEntity>(COLLECTIONS.documents);
}

export async function createManyDocuments(
  documents: DocumentEntity[]
): Promise<DocumentEntity[]> {
  const collection = getDocumentCollection();

  const result = await collection.insertMany(documents);

  return documents.map((document, index) => ({
    ...document,
    _id: result.insertedIds[index]
  }));
}

export async function getDocumentsByBatchId(
  batchId: string
): Promise<DocumentEntity[]> {
  const collection = getDocumentCollection();

  return collection
    .find({
      batchId: new ObjectId(batchId)
    })
    .toArray();
}