import { QueueOptions, WorkerOptions } from "bullmq";
import { env } from "./env.js";

export const bullConnection = {
  host: env.redisHost,
  port: env.redisPort
};

export const defaultQueueOptions: QueueOptions = {
  connection: bullConnection
};

export const defaultWorkerOptions: WorkerOptions = {
  connection: bullConnection,
  concurrency: 5
};