import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { ALLOWED_IMAGE_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../config/constants';
import { AppError } from '../utils/errors';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(env.UPLOAD_DIR)) {
      fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
    }
    cb(null, env.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Completely ignore user-controlled filename to prevent path traversal
    const safeExt = MIME_TO_EXT[file.mimetype] || '.jpg';
    const safeName = `img-${uuidv4()}${safeExt}`;
    cb(null, safeName);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 1. Path traversal check in original name
  if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
    return cb(
      AppError.badRequest('Invalid file name characters detected.', 'PATH_TRAVERSAL_BLOCKED') as any,
      false
    );
  }

  // 2. MIME type verification
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype as any)) {
    return cb(
      AppError.badRequest(
        `Invalid file format: ${file.mimetype}. Allowed formats: JPEG, PNG, WEBP.`,
        'INVALID_FILE_TYPE'
      ) as any,
      false
    );
  }

  // 3. Extension allowlist check
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(
      AppError.badRequest(
        `File extension ${ext} does not match allowed image extensions.`,
        'INVALID_FILE_EXTENSION'
      ) as any,
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
  fileFilter,
});
