import { ObjectId } from "mongodb";

export type BatchStatus = "pending" | "processing" | "completed" | "failed";

export interface Batch {
  _id?: ObjectId;
  status: BatchStatus;
  userIds: string[];
  totalDocuments: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
}