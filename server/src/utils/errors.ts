export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(msg: string, code = 'BAD_REQUEST', details?: any) {
    return new AppError(msg, 400, code, details);
  }

  static unauthorized(msg = 'Authentication required', code = 'UNAUTHORIZED') {
    return new AppError(msg, 401, code);
  }

  static forbidden(msg = 'Permission denied', code = 'FORBIDDEN') {
    return new AppError(msg, 403, code);
  }

  static notFound(msg = 'Resource not found', code = 'NOT_FOUND') {
    return new AppError(msg, 404, code);
  }

  static conflict(msg: string, code = 'CONFLICT') {
    return new AppError(msg, 409, code);
  }

  static tooManyRequests(msg = 'Too many requests, please slow down', code = 'TOO_MANY_REQUESTS') {
    return new AppError(msg, 429, code);
  }

  static internal(msg = 'Internal server error', code = 'INTERNAL_ERROR') {
    return new AppError(msg, 500, code);
  }
}
