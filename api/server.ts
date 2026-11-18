import { app } from '../server/src/app';
import { getDatabase } from '../server/src/db/database';
import { runMigrations } from '../server/src/db/migrate';
import { seedDatabase } from '../server/src/db/seed';
import { initTursoCloud, isTursoEnabled } from '../server/src/db/turso';
import { initSupabaseCloud, isSupabaseEnabled } from '../server/src/db/supabaseSync';

// Trust Vercel reverse proxy headers for rate limiting and IP tracking
app.set('trust proxy', 1);

let initialized = false;
let initPromise: Promise<void> | null = null;

async function ensureInitialized() {
  if (initialized) return;
  if (!initPromise) {
    const boot = isSupabaseEnabled()
      ? initSupabaseCloud(getDatabase(), runMigrations, seedDatabase)
      : isTursoEnabled()
      ? initTursoCloud(getDatabase(), runMigrations, seedDatabase)
      : seedDatabase();

    initPromise = boot
      .then(() => {
        initialized = true;
      })
      .catch(async (err) => {
        console.warn('[Vercel Serverless] Cloud DB init warning, falling back to local seed:', err);
        try {
          await seedDatabase();
        } catch {
          // Ignore fallback errors
        }
        initialized = true; // prevent retry storm
      });
  }
  return initPromise;
}

export default async function handler(req: any, res: any) {
  await ensureInitialized();
  return app(req, res);
}
