import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export async function GET(req: NextRequest) {
  if (req.headers.get("x-debug-key") !== process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const client = new S3Client({
    region: process.env.S3_REGION || "eu-west-1",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });

  const info = {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
  };

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: "diagnose-test.txt",
        Body: Buffer.from("test"),
        ContentType: "text/plain",
      })
    );
    return NextResponse.json({ ok: true, info });
  } catch (err) {
    const e = err as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
    return NextResponse.json({ ok: false, info, error: e.name, message: e.message, httpStatus: e.$metadata?.httpStatusCode });
  }
}
