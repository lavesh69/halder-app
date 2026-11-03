import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { Logger } from '../utils/logger';

export class StorageService {
  private static s3Client: S3Client | null = null;

  private static getS3Client(): S3Client {
    if (!this.s3Client) {
      this.s3Client = new S3Client({
        region: env.AWS_REGION,
        endpoint: env.AWS_S3_ENDPOINT || undefined,
        credentials:
          env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
            ? {
                accessKeyId: env.AWS_ACCESS_KEY_ID,
                secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
              }
            : undefined,
        forcePathStyle: !!env.AWS_S3_ENDPOINT, // Required for MinIO or localstack
      });
    }
    return this.s3Client;
  }

  /**
   * Uploads file buffer to S3 or saves to local disk depending on STORAGE_PROVIDER
   */
  static async uploadBuffer(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string,
    folder: 'produce' | 'kyc' | 'avatars' = 'produce',
    baseUrl: string = env.PUBLIC_SERVER_URL
  ): Promise<string> {
    const ext = path.extname(originalFilename) || '.jpg';
    const filename = `${folder}/${uuidv4()}${ext}`;

    if (env.STORAGE_PROVIDER === 's3' && env.AWS_ACCESS_KEY_ID) {
      try {
        const client = this.getS3Client();
        const command = new PutObjectCommand({
          Bucket: env.AWS_S3_BUCKET,
          Key: filename,
          Body: buffer,
          ContentType: mimeType,
        });

        await client.send(command);

        if (env.AWS_S3_ENDPOINT) {
          // Custom CDN or R2 endpoint
          return `${env.AWS_S3_ENDPOINT}/${env.AWS_S3_BUCKET}/${filename}`;
        }
        return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${filename}`;
      } catch (err: any) {
        Logger.error('[StorageService] S3 upload failed, falling back to local storage', err);
      }
    }

    // Local Disk Fallback
    const localDir = path.join(process.cwd(), 'uploads', folder);
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }

    const localPath = path.join(localDir, path.basename(filename));
    fs.writeFileSync(localPath, buffer);

    return `${baseUrl}/uploads/${folder}/${path.basename(filename)}`;
  }

  /**
   * Generates a pre-signed PUT URL for direct client-to-S3 uploads
   */
  static async generatePresignedUploadUrl(
    filename: string,
    mimeType: string,
    folder: string = 'produce'
  ): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
    const ext = path.extname(filename) || '.jpg';
    const key = `${folder}/${uuidv4()}${ext}`;

    if (env.STORAGE_PROVIDER === 's3' && env.AWS_ACCESS_KEY_ID) {
      const client = this.getS3Client();
      const command = new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: key,
        ContentType: mimeType,
      });

      const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
      const fileUrl = env.AWS_S3_ENDPOINT
        ? `${env.AWS_S3_ENDPOINT}/${env.AWS_S3_BUCKET}/${key}`
        : `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;

      return { uploadUrl, fileUrl, key };
    }

    // Local Dev fallback pre-signed simulation
    return {
      uploadUrl: `${env.PUBLIC_SERVER_URL}/api/v1/uploads/images`,
      fileUrl: `${env.PUBLIC_SERVER_URL}/uploads/${key}`,
      key,
    };
  }
}
