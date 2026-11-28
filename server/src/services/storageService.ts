import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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
          body: new Uint8Array(buffer),
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

    // 3. Vercel Serverless / Writable /tmp Fallback
    if (process.env.VERCEL) {
      try {
        const vTmpDir = path.join('/tmp', 'uploads', folder);
        if (!fs.existsSync(vTmpDir)) {
          fs.mkdirSync(vTmpDir, { recursive: true });
        }
        const vLocalPath = path.join(vTmpDir, path.basename(filename));
        fs.writeFileSync(vLocalPath, buffer);
        return `${baseUrl}/uploads/${folder}/${path.basename(filename)}`;
      } catch {
        return `data:${mimeType};base64,${buffer.toString('base64')}`;
      }
    }

    // 4. Local Disk Fallback (Node dev server / VPS / Docker / Railway)
    try {
      const localDir = path.join(env.UPLOAD_DIR, folder);
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
   * Automatically intercepts raw base64 or Data URLs, writes or uploads them to
   * cloud CDN / local media storage, and returns a clean image URL.
   * If already a web link (http:// or https://), returns it unchanged.
   */
  static async processImagePayload(
    imageData: string | undefined | null,
    folder: 'avatars' | 'produce' | 'kyc' = 'produce',
    baseUrl: string = env.PUBLIC_SERVER_URL
  ): Promise<string> {
    if (!imageData || typeof imageData !== 'string') {
      return '';
    }

    const trimmed = imageData.trim();
    if (!trimmed) return '';

    // If already an HTTP/HTTPS URL or static upload URL, keep as clean URL
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/uploads/') ||
      trimmed.startsWith('blob:')
    ) {
      return trimmed;
    }

    // Check if it's a base64 Data URL (e.g. data:image/jpeg;base64,...)
    const dataUrlMatch = trimmed.match(/^data:([^;]+);base64,(.+)$/s);
    if (!dataUrlMatch) {
      // If it doesn't match standard data URL, return trimmed
      return trimmed;
    }

    const mimeType = dataUrlMatch[1].toLowerCase();
    const base64Data = dataUrlMatch[2];
    const buffer = Buffer.from(base64Data, 'base64');

    let ext = '.jpg';
    if (mimeType.includes('png')) ext = '.png';
    else if (mimeType.includes('webp')) ext = '.webp';
    else if (mimeType.includes('gif')) ext = '.gif';
    else if (mimeType.includes('pdf')) ext = '.pdf';

    const cleanFilename = `${folder}-${uuidv4().slice(0, 12)}${ext}`;
    return await this.uploadBuffer(buffer, cleanFilename, mimeType, folder, baseUrl);
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
