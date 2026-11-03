import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 15,
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    },
  },
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please slow down.',
    },
  },
});

export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'SEARCH_RATE_LIMIT_EXCEEDED',
      message: 'Search query rate limit reached. Please wait a few seconds.',
    },
  },
});

export const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'ORDER_RATE_LIMIT_EXCEEDED',
      message: 'Too many order attempts. Please wait a few minutes before placing another order.',
    },
  },
});

export const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'CHAT_RATE_LIMIT_EXCEEDED',
      message: 'You are sending messages too quickly. Please wait a moment.',
    },
  },
});

export const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'REVIEW_RATE_LIMIT_EXCEEDED',
      message: 'Review rate limit reached. Please try again later.',
    },
  },
});

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      message: 'Too many file uploads. Please wait before uploading more photos.',
    },
  },
});

export const aiWeatherLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 req/min
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AI_RATE_LIMIT_EXCEEDED',
      message: 'Weather and agro advisory rate limit reached. Please wait a minute before querying again.',
    },
  },
});

