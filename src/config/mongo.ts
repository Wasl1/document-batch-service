import { Db, GridFSBucket, MongoClient } from "mongodb";
import { env } from "./env.js";

let mongoClient: MongoClient | null = null;
let database: Db | null = null;
let gridFsBucket: GridFSBucket | null = null;

export async function connectMongo(): Promise<Db> {
  if (database) {
    return database;
  }

  mongoClient = new MongoClient(env.mongodbUri, {
    serverSelectionTimeoutMS: 5000
  });

  await mongoClient.connect();

  database = mongoClient.db(env.mongodbDbName);
  gridFsBucket = new GridFSBucket(database, {
    bucketName: "documents_fs"
  });

  console.log("MongoDB connected");

  return database;
}

export function getMongoDb(): Db {
  if (!database) {
    throw new Error("MongoDB is not connected");
  }

  return database;
}

export function getGridFsBucket(): GridFSBucket {
  if (!gridFsBucket) {
    throw new Error("GridFS bucket is not initialized");
  }

  return gridFsBucket;
}

export async function closeMongo(): Promise<void> {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    database = null;
    gridFsBucket = null;
    console.log("MongoDB connection closed");
  }
}