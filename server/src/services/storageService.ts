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
   * Uploads file buffer to Supabase Storage, S3, or local disk/DataURL
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

    // 1. Supabase Cloud Storage (Persistent public CDN for Vercel & Production)
    const supabaseUrl = (process.env.SUPABASE_URL || env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
    const supabaseKey = (process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '').trim();

    if (supabaseUrl && supabaseKey) {
      try {
        const uploadEndpoint = `${supabaseUrl}/storage/v1/object/halder-media/${filename}`;
        const uploadRes = await fetch(uploadEndpoint, {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': mimeType,
          },
          body: buffer,
        });

        if (uploadRes.ok) {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/halder-media/${filename}`;
          return publicUrl;
        }
        const errText = await uploadRes.text().catch(() => '');
        Logger.warn(`[StorageService] Supabase Storage upload notice (${uploadRes.status}): ${errText}`);
      } catch (err: any) {
        Logger.warn(`[StorageService] Supabase upload error: ${err?.message || err}`);
      }
    }

    // 2. AWS S3 Storage
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

    // 3. Vercel Serverless Fallback (Base64 data URL avoids read-only filesystem crash)
    if (process.env.VERCEL) {
      return `data:${mimeType};base64,${buffer.toString('base64')}`;
    }

    // 4. Local Disk Fallback (Node dev server)
    try {
      const localDir = path.join(process.cwd(), 'uploads', folder);
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }

      const localPath = path.join(localDir, path.basename(filename));
      fs.writeFileSync(localPath, buffer);

      return `${baseUrl}/uploads/${folder}/${path.basename(filename)}`;
    } catch {
      return `data:${mimeType};base64,${buffer.toString('base64')}`;
    }
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
