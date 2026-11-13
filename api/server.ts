import { app } from '../server/src/app';
import { seedDatabase } from '../server/src/db/seed';

// Trust Vercel reverse proxy headers for rate limiting and IP tracking
app.set('trust proxy', 1);

let initialized = false;
let initPromise: Promise<void> | null = null;

async function ensureInitialized() {
  if (initialized) return;
  if (!initPromise) {
    initPromise = seedDatabase()
      .then(() => {
        initialized = true;
      })
      .catch((err) => {
        console.warn('[Vercel Serverless] Auto DB seed warning:', err);
        initialized = true; // prevent retry storm
      });
  }
  return initPromise;
}

export default async function handler(req: any, res: any) {
  await ensureInitialized();
  return app(req, res);
}
