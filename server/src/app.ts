import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';

export const app = express();

// Security Headers & Content Security Policy
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://*.trycloudflare.com',
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://images.unsplash.com',
          'https://*.trycloudflare.com',
        ],
        connectSrc: [
          "'self'",
          'https://*.trycloudflare.com',
          'ws:',
          'wss:',
        ],
        frameSrc: ["'self'",],
        frameAncestors: ["'none'"], // Strict Clickjacking prevention
        objectSrc: ["'none'"],
        upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
      },
    },
    frameguard: { action: 'deny' },
    xContentTypeOptions: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// CORS Policy
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('CORS request blocked from origin: ' + origin));
      }
    },
    credentials: true,
  })
);

// Body & Cookie Parsers (10MB limit for secure image uploads)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate Limiting on API
app.use('/api', apiLimiter);

// Serve static uploads with nosniff and isolated CSP
app.use(
  '/uploads',
  express.static(env.UPLOAD_DIR, {
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'");
    },
  })
);

// Root Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', app: 'HALDER Backend API' });
});

// Mount Versioned API
app.use('/api/v1', apiRouter);

// Centralized Error Handler
app.use(errorHandler);
