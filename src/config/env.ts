import dotenv from "dotenv";

dotenv.config();

function getEnv(name: string, defaultValue?: string): string {
  const value = process.env[name] ?? defaultValue;

  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  port: Number(getEnv("PORT", "3001")),
  nodeEnv: getEnv("NODE_ENV", "development"),

  mongodbUri: getEnv("MONGODB_URI"),
  mongodbDbName: getEnv("MONGODB_DB_NAME"),

  redisHost: getEnv("REDIS_HOST"),
  redisPort: Number(getEnv("REDIS_PORT", "6379"))
};