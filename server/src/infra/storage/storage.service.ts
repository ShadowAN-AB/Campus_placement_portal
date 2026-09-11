import { Injectable } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../config/env";

@Injectable()
export class StorageService {
  private readonly diskRoot = path.resolve(process.cwd(), "uploads");
  private readonly s3?: S3Client;

  constructor() {
    if (env.storageBackend === "s3") {
      this.s3 = new S3Client({
        region: env.s3.region,
        endpoint: env.s3.endpoint,
        forcePathStyle: Boolean(env.s3.endpoint),
        credentials: {
          accessKeyId: env.s3.accessKeyId,
          secretAccessKey: env.s3.secretAccessKey,
        },
      });
    }
  }

  async put(key: string, body: Buffer, contentType: string) {
    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: env.s3.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
      return key;
    }
    const full = path.join(this.diskRoot, key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
    return key;
  }

  async getBuffer(key: string): Promise<Buffer> {
    if (this.s3) {
      const res = await this.s3.send(new GetObjectCommand({ Bucket: env.s3.bucket, Key: key }));
      const bytes = await res.Body?.transformToByteArray();
      return Buffer.from(bytes ?? []);
    }
    return readFile(path.join(this.diskRoot, key));
  }
}
