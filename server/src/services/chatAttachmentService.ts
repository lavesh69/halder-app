import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { env } from '../config/env';
import { Logger } from '../utils/logger';
import {
  ALLOWED_CHAT_EXTENSIONS,
  ALLOWED_CHAT_MIME_TYPES,
  MAX_CHAT_FILE_SIZE_BYTES,
} from '../config/constants';

export interface StoredChatAttachment {
  id: string;
  conversationId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

const MIME_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

function sanitizeFilename(name: string): string {
  const base = path.basename(name || 'attachment').replace(/[\0<>:"/\\|?*]/g, '_').trim();
  return (base || 'attachment').slice(0, 140);
}

function getPrivateChatRootDir(): string {
  return process.env.VERCEL
    ? path.join('/tmp', 'chat_private')
    : path.resolve(env.UPLOAD_DIR, '..', 'chat_private');
}

/**
 * Verifies real binary file headers to prevent MIME/extension spoofing.
 */
export function verifyAttachmentMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (!buffer || buffer.length === 0) return false;

  switch (mimeType) {
    case 'image/jpeg':
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case 'image/png':
      return (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    case 'image/webp':
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    case 'image/gif': {
      const hdr = buffer.subarray(0, 6).toString('ascii');
      return hdr === 'GIF87a' || hdr === 'GIF89a';
    }
    case 'application/pdf':
      return buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
    case 'application/msword':
      return (
        buffer.length >= 4 &&
        buffer[0] === 0xd0 &&
        buffer[1] === 0xcf &&
        buffer[2] === 0x11 &&
        buffer[3] === 0xe0
      );
    case 'text/plain':
      // Reject binary NUL bytes in plain text uploads
      return !buffer.includes(0);
    default:
      return false;
  }
}

export class ChatAttachmentService {
  /**
   * Validates, stores privately, and persists metadata for a conversation attachment.
   * Never creates a DB record unless file persistence succeeds.
   */
  static async saveAttachment(params: {
    conversationId: string;
    uploaderId: string;
    file: Express.Multer.File;
  }): Promise<StoredChatAttachment> {
    const { conversationId, uploaderId, file } = params;

    if (!file || !file.buffer || file.buffer.length === 0) {
      throw AppError.badRequest('Uploaded attachment file is empty.');
    }

    if (file.size > MAX_CHAT_FILE_SIZE_BYTES || file.buffer.length > MAX_CHAT_FILE_SIZE_BYTES) {
      throw AppError.badRequest('Attachment exceeds the 10 MB maximum file size limit.');
    }

    const rawName = file.originalname || 'file';
    if (rawName.includes('..') || rawName.includes('/') || rawName.includes('\\')) {
      throw AppError.badRequest('Invalid file name characters detected.', 'PATH_TRAVERSAL_BLOCKED');
    }

    const mimeType = (file.mimetype || '').toLowerCase();
    if (!ALLOWED_CHAT_MIME_TYPES.includes(mimeType as any)) {
      throw AppError.badRequest(
        `Unsupported attachment type: ${mimeType}. Allowed: JPEG, PNG, WEBP, GIF, PDF, TXT, DOC, DOCX.`,
        'INVALID_FILE_TYPE'
      );
    }

    const ext = path.extname(rawName).toLowerCase();
    if (!ALLOWED_CHAT_EXTENSIONS.includes(ext as any) || !MIME_EXTENSIONS[mimeType]?.includes(ext)) {
      throw AppError.badRequest(
        `File extension "${ext || 'none'}" does not match MIME type ${mimeType}.`,
        'INVALID_FILE_EXTENSION'
      );
    }

    if (!verifyAttachmentMagicBytes(file.buffer, mimeType)) {
      throw AppError.badRequest(
        'File contents do not match the declared attachment type.',
        'INVALID_FILE_SIGNATURE'
      );
    }

    const attachmentId = `att-${uuidv4()}`;
    const safeName = sanitizeFilename(rawName);
    const storedKey = path.posix.join(conversationId, `${attachmentId}${ext}`);

    let storedLocally = false;
    let cloudStorageUrl = '';

    // 1. Optional durable cloud storage when Supabase Storage is configured
    const supabaseUrl = (process.env.SUPABASE_URL || env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
    const supabaseKey = (process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '').trim();
    if (supabaseUrl && supabaseKey) {
      try {
        const uploadEndpoint = `${supabaseUrl}/storage/v1/object/halder-media/chat-private/${storedKey}`;
        const uploadRes = await fetch(uploadEndpoint, {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': mimeType,
          },
          body: new Uint8Array(file.buffer),
        });
        if (uploadRes.ok) {
          cloudStorageUrl = uploadEndpoint;
        } else {
          const errText = await uploadRes.text().catch(() => '');
          Logger.warn(`[ChatAttachment] Cloud upload notice (${uploadRes.status}): ${errText}`);
        }
      } catch (err: any) {
        Logger.warn(`[ChatAttachment] Cloud storage error: ${err?.message || err}`);
      }
    }

    // 2. Private filesystem persistence (strictly outside public static /uploads)
    try {
      const targetDir = path.join(getPrivateChatRootDir(), conversationId);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const fullPath = path.join(targetDir, `${attachmentId}${ext}`);
      fs.writeFileSync(fullPath, file.buffer);
      storedLocally = true;
    } catch (fsErr: any) {
      Logger.error('[ChatAttachment] Private disk write failed', fsErr);
    }

    if (!storedLocally && !cloudStorageUrl) {
      throw new AppError(
        'Attachment storage failed. Please retry uploading the file.',
        500,
        'ATTACHMENT_STORAGE_FAILED'
      );
    }

    const now = new Date().toISOString();
    Database.run(
      `INSERT INTO chat_attachments (
        id, conversation_id, message_id, uploader_id, original_name,
        stored_key, mime_type, size_bytes, storage_url, created_at
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
      [
        attachmentId,
        conversationId,
        uploaderId,
        safeName,
        storedKey,
        mimeType,
        file.buffer.length,
        cloudStorageUrl,
        now,
      ]
    );

    return {
      id: attachmentId,
      conversationId,
      filename: safeName,
      mimeType,
      sizeBytes: file.buffer.length,
      url: `/api/v1/chat/conversations/${conversationId}/attachments/${attachmentId}`,
    };
  }

  /**
   * Reads an attachment belonging strictly to the given conversation.
   */
  static async getAttachmentContent(params: {
    conversationId: string;
    attachmentId: string;
  }): Promise<{ buffer: Buffer; mimeType: string; filename: string; sizeBytes: number }> {
    const record = Database.get<any>(
      'SELECT * FROM chat_attachments WHERE id = ? AND conversation_id = ?',
      [params.attachmentId, params.conversationId]
    );

    if (!record) {
      throw AppError.notFound('Attachment not found in this conversation.');
    }

    const rootDir = path.resolve(getPrivateChatRootDir());
    const localPath = path.resolve(rootDir, ...String(record.stored_key).split('/'));
    if (!localPath.startsWith(rootDir)) {
      throw AppError.forbidden('Invalid attachment path.');
    }

    if (fs.existsSync(localPath)) {
      const buffer = fs.readFileSync(localPath);
      return {
        buffer,
        mimeType: record.mime_type,
        filename: record.original_name,
        sizeBytes: record.size_bytes,
      };
    }

    // Fallback to cloud storage URL (using Supabase credentials when configured)
    if (record.storage_url) {
      const supabaseKey = (process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '').trim();
      const headers: Record<string, string> = {};
      if (supabaseKey) {
        headers.apikey = supabaseKey;
        headers.Authorization = `Bearer ${supabaseKey}`;
      }
      const res = await fetch(record.storage_url, { headers });
      if (res.ok) {
        const arrBuf = await res.arrayBuffer();
        return {
          buffer: Buffer.from(arrBuf),
          mimeType: record.mime_type,
          filename: record.original_name,
          sizeBytes: record.size_bytes,
        };
      }
    }

    throw AppError.notFound('Attachment binary could not be retrieved from storage.');
  }
}
