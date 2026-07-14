import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

function getClient() {
  return new S3Client({
    region: process.env.S3_REGION || "eu-west-1",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });
}

function getBucket() {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET ist nicht konfiguriert.");
  return bucket;
}

export function buildStorageKey(prefix: string, originalFileName: string) {
  const safeName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${prefix}/${randomUUID()}-${safeName}`;
}

export async function uploadFile(key: string, body: Buffer, contentType: string) {
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function downloadFile(key: string): Promise<{ body: Buffer; contentType?: string }> {
  const client = getClient();
  const result = await client.send(new GetObjectCommand({ Bucket: getBucket(), Key: key }));
  const stream = result.Body as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return { body: Buffer.concat(chunks), contentType: result.ContentType };
}

export async function deleteFile(key: string) {
  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
}
