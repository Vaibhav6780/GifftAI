import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import crypto from "node:crypto";
import { env } from "../config/env";

// MinIO is S3-API-compatible; forcePathStyle is required since MinIO doesn't support
// virtual-hosted-style bucket addressing (bucket.endpoint.com) by default.
const client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
});

export interface UploadedObject {
  fileKey: string;
  fileUrl: string;
}

/** Uploads inbound platform attachment bytes (WhatsApp/Instagram/Telegram media) to object storage. */
export async function uploadObject(params: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  /** Path prefix, e.g. "lead-attachments/telegram". */
  prefix: string;
}): Promise<UploadedObject> {
  const fileKey = `${params.prefix}/${crypto.randomUUID()}-${params.fileName}`;

  await client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: fileKey,
      Body: params.buffer,
      ContentType: params.mimeType,
    }),
  );

  return { fileKey, fileUrl: `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${fileKey}` };
}
