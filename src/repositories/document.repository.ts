import { type Collection, ObjectId } from "mongodb";
import { getMongoDb } from "../config/mongo.js";
import { COLLECTIONS } from "../config/collections.js";
import type { DocumentEntity, DocumentStatus } from "../types/document.types.js";

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
    .sort({ createdAt: 1 })
    .toArray();
}

export async function getDocumentById(
  documentId: string
): Promise<DocumentEntity | null> {
  const collection = getDocumentCollection();

  return collection.findOne({
    _id: new ObjectId(documentId)
  });
}

export async function attachFileToDocument(
  documentId: string,
  fileId: ObjectId
): Promise<void> {
  const collection = getDocumentCollection();

  await collection.updateOne(
    { _id: new ObjectId(documentId) },
    {
      $set: {
        fileId,
        updatedAt: new Date()
      }
    }
  );
}

export async function updateDocumentStatus(
  documentId: string,
  status: DocumentStatus
): Promise<void> {
  const collection = getDocumentCollection();
  const currentDocument = await getDocumentById(documentId);

  if (!currentDocument) {
    throw new Error("Document not found");
  }

  const now = new Date();

  const updatePayload: Partial<DocumentEntity> = {
    status,
    updatedAt: now
  };

  if (status === "processing" && !currentDocument.startedAt) {
    updatePayload.startedAt = now;
  }

  if (status === "completed" || status === "failed") {
    updatePayload.completedAt = now;
  }

  if (status === "completed") {
    updatePayload.errorMessage = null;
  }

  await collection.updateOne(
    { _id: new ObjectId(documentId) },
    {
      $set: updatePayload
    }
  );
}

export async function incrementDocumentRetryCount(
  documentId: string
): Promise<void> {
  const collection = getDocumentCollection();

  await collection.updateOne(
    { _id: new ObjectId(documentId) },
    {
      $inc: {
        retryCount: 1
      },
      $set: {
        updatedAt: new Date()
      }
    }
  );
}

export async function setDocumentError(
  documentId: string,
  errorMessage: string
): Promise<void> {
  const collection = getDocumentCollection();

  await collection.updateOne(
    { _id: new ObjectId(documentId) },
    {
      $set: {
        errorMessage,
        updatedAt: new Date()
      }
    }
  );
}