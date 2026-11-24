import http from 'http';
import { app } from './app';
import { env } from './config/env';
import { getDatabase } from './db/database';
import { runMigrations } from './db/migrate';
import { seedDatabase } from './db/seed';
import { initTursoCloud, getTursoStatus, isTursoEnabled } from './db/turso';
import { initSupabaseCloud, getSupabaseStatus, isSupabaseEnabled } from './db/supabaseSync';
import { initChatSocket } from './websocket/chatSocket';

export const server = http.createServer(app);

// Extreme-scale TCP connection tuning (prevents socket exhaustion and TIME_WAIT pile-up)
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.requestTimeout = 30000;
server.maxRequestsPerSocket = 0; // Unlimited requests per persistent keep-alive socket

// Attach real-time WebSocket chat server
export const wss = initChatSocket(server);

async function bootstrap() {
  try {
    console.log('[Bootstrap] Initializing HALDER production backend...');
    if (isSupabaseEnabled()) {
      await initSupabaseCloud(getDatabase(), runMigrations, seedDatabase);
    } else if (isTursoEnabled()) {
      await initTursoCloud(getDatabase(), runMigrations, seedDatabase);
    } else {
      await seedDatabase();
    }
    const sb = getSupabaseStatus();
    const turso = getTursoStatus();
    const dbLabel = sb.enabled
      ? `${sb.mode} (v${sb.syncedVersion})`
      : turso.enabled
      ? `${turso.mode} (v${turso.syncedVersion})`
      : 'local-sqlite';

    server.listen(env.PORT, '0.0.0.0', 65535, () => {
      console.log(`
==================================================
🌾 HALDER Backend API Server Live!
🌍 URL: http://localhost:${env.PORT}
💬 WebSocket: ws://localhost:${env.PORT}/ws
🗄️  Database: ${dbLabel}
🚀 Environment: ${env.NODE_ENV}
📦 Version: /api/v1
==================================================
      `);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown handling
function gracefulShutdown(signal: string) {
  console.log(`\n[Shutdown] Received ${signal}. Starting graceful shutdown...`);
  wss.close(() => {
    console.log('[Shutdown] Closed active WebSocket connections.');
  });

  server.close(() => {
    console.log('[Shutdown] HTTP server closed gracefully.');
    process.exit(0);
  });

  // Force shutdown after 10s if dangling handles remain
  setTimeout(() => {
    console.error('[Shutdown] Forcefully shutting down after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

bootstrap();
