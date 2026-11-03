import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { Logger } from '../utils/logger';
import { env } from '../config/env';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  let statusCode = err.statusCode || 500;
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || undefined;

  if (err.name === 'MulterError') {
    statusCode = 400;
    errorCode = 'FILE_UPLOAD_ERROR';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Uploaded file exceeds 5MB size limit';
    }
  }

  // Mask unexpected internal database/server error messages in production
  const isClientSafe = err instanceof AppError || err.name === 'MulterError';
  if (!isClientSafe && env.NODE_ENV === 'production') {
    message = 'An unexpected internal error occurred. Please try again or contact support.';
    errorCode = 'INTERNAL_SERVER_ERROR';
    details = undefined;
  }

  Logger.error(`HTTP ${statusCode} - ${req.method} ${req.originalUrl}: ${err.message}`, err);

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      details,
      stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  });
}
