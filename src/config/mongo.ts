import { Db, MongoClient } from "mongodb";
import { env } from "./env.js";

let mongoClient: MongoClient | null = null;
let database: Db | null = null;

export async function connectMongo(): Promise<Db> {
  if (database) {
    return database;
  }

  mongoClient = new MongoClient(env.mongodbUri);
  await mongoClient.connect();

  database = mongoClient.db(env.mongodbDbName);

  console.log("MongoDB connected");

  return database;
}

export function getMongoDb(): Db {
  if (!database) {
    throw new Error("MongoDB is not connected");
  }

  return database;
}

export async function closeMongo(): Promise<void> {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    database = null;
    console.log("MongoDB connection closed");
  }
}