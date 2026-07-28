import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: process.env.S3_REGION || "eu-west-1",
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
});

console.log("ENDPOINT:", process.env.S3_ENDPOINT);
console.log("REGION:", process.env.S3_REGION);
console.log("BUCKET:", process.env.S3_BUCKET);
console.log("ACCESS_KEY_ID:", process.env.S3_ACCESS_KEY_ID);

try {
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: "diagnose-test.txt",
      Body: Buffer.from("test"),
      ContentType: "text/plain",
    })
  );
  console.log("UPLOAD OK");
} catch (err) {
  console.log("UPLOAD FEHLER:", err.name, "-", err.message);
  if (err.$metadata) console.log("HTTP STATUS:", err.$metadata.httpStatusCode);
}
