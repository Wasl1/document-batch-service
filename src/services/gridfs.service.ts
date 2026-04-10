import { ObjectId } from "mongodb";
import { Readable } from "node:stream";
import { getGridFsBucket } from "../config/mongo.js";

export interface StorePdfFileInput {
  filename: string;
  buffer: Buffer;
  contentType?: string;
}

export async function storePdfFileInGridFs(
  input: StorePdfFileInput
): Promise<ObjectId> {
  return new Promise((resolve, reject) => {
    const bucket = getGridFsBucket();

    const uploadStream = bucket.openUploadStream(input.filename, {
      metadata: {
        contentType: input.contentType ?? "application/pdf"
      }
    });

    const readableStream = Readable.from(input.buffer);

    readableStream.pipe(uploadStream);

    uploadStream.on("finish", () => {
      resolve(uploadStream.id as ObjectId);
    });

    uploadStream.on("error", (error) => {
      reject(error);
    });
  });
}

export function openPdfDownloadStream(fileId: ObjectId) {
  const bucket = getGridFsBucket();
  return bucket.openDownloadStream(fileId);
}