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
  nodeEnv: getEnv("NODE_ENV", "development")
};