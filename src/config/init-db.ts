import { getMongoDb } from "./mongo.js";
import { COLLECTIONS } from "./collections.js";

export async function initializeDatabase(): Promise<void> {
  const db = getMongoDb();

  await db.collection(COLLECTIONS.batches).createIndex({ createdAt: -1 });
  await db.collection(COLLECTIONS.batches).createIndex({ status: 1 });

  await db.collection(COLLECTIONS.documents).createIndex({ batchId: 1 });
  await db.collection(COLLECTIONS.documents).createIndex({ status: 1 });
  await db.collection(COLLECTIONS.documents).createIndex({ userId: 1 });

  console.log("MongoDB indexes initialized");
}