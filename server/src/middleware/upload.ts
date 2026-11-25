import multer from 'multer';
import path from 'path';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_CHAT_MIME_TYPES,
  ALLOWED_CHAT_EXTENSIONS,
  MAX_CHAT_FILE_SIZE_BYTES,
} from '../config/constants';
import { AppError } from '../utils/errors';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Use memoryStorage so file buffers are kept in RAM without crashing on read-only serverless filesystems (e.g. Vercel)
const storage = multer.memoryStorage();

const buildFileFilter =
  (allowedMimes: readonly string[], allowedExts: readonly string[], invalidMsg: string) =>
  (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      return cb(
        AppError.badRequest('Invalid file name characters detected.', 'PATH_TRAVERSAL_BLOCKED') as any,
        false
      );
    }

    const mime = (file.mimetype || '').toLowerCase();
    if (!allowedMimes.includes(mime)) {
      return cb(AppError.badRequest(`${invalidMsg}: ${file.mimetype}`, 'INVALID_FILE_TYPE') as any, false);
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExts.includes(ext)) {
      return cb(
        AppError.badRequest(`File extension ${ext} is not allowed.`, 'INVALID_FILE_EXTENSION') as any,
        false
      );
    }

    cb(null, true);
  };

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 5,
  },
  fileFilter: buildFileFilter(
    ALLOWED_IMAGE_MIME_TYPES,
    ALLOWED_EXTENSIONS,
    'Invalid file format. Allowed formats: JPEG, PNG, WEBP'
  ),
});

export const chatAttachmentUpload = multer({
  storage,
  limits: {
    fileSize: MAX_CHAT_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: buildFileFilter(
    ALLOWED_CHAT_MIME_TYPES,
    ALLOWED_CHAT_EXTENSIONS,
    'Invalid attachment format. Allowed: JPEG, PNG, WEBP, GIF, PDF, TXT, DOC, DOCX'
  ),
});
