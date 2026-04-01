import { ObjectId } from "mongodb";

export type DocumentStatus = "pending" | "processing" | "completed" | "failed";

export interface DocumentEntity {
  _id?: ObjectId;
  batchId: ObjectId;
  userId: string;
  status: DocumentStatus;
  retryCount: number;
  fileId?: ObjectId | null;
  errorMessage?: string | null;
  createdAt: Date;
  startedAt?: Date | null;
  updatedAt: Date;
  completedAt?: Date | null;
}