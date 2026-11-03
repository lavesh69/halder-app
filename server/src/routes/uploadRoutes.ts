import { Router } from 'express';
import { upload } from '../middleware/upload';
import { authenticateUser } from '../middleware/auth';
import { AppError } from '../utils/errors';
import { uploadLimiter } from '../middleware/rateLimiter';
import { StorageService } from '../services/storageService';

const router = Router();

router.post('/images', authenticateUser, uploadLimiter, upload.array('photos', 5), async (req, res, next) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      throw AppError.badRequest('No image files uploaded');
    }

    const host = req.get('host');
    const protocol = req.protocol;
    const baseUrl = `${protocol}://${host}`;

    const uploadPromises = files.map(async (file) => {
      // If multer stored on disk, read buffer; if memory, file.buffer
      const buffer = file.buffer || (file.path ? require('fs').readFileSync(file.path) : Buffer.from([]));
      return StorageService.uploadBuffer(buffer, file.originalname, file.mimetype, 'produce', baseUrl);
    });

    const urls = await Promise.all(uploadPromises);

    res.status(201).json({
      success: true,
      data: {
        urls,
        primaryUrl: urls[0],
      },
    });
  } catch (err) {
    next(err);
  }
});

// Direct S3 Pre-signed Upload Endpoint
router.get('/presigned-url', authenticateUser, async (req, res, next) => {
  try {
    const { filename, mimeType, folder } = req.query;
    if (!filename || !mimeType) {
      throw AppError.badRequest('filename and mimeType are required query parameters.');
    }

    const presigned = await StorageService.generatePresignedUploadUrl(
      String(filename),
      String(mimeType),
      String(folder || 'produce')
    );

    res.status(200).json({
      success: true,
      data: presigned,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
