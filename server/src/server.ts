import http from 'http';
import { app } from './app';
import { env } from './config/env';
import { seedDatabase } from './db/seed';
import { initChatSocket } from './websocket/chatSocket';

export const server = http.createServer(app);

// Attach real-time WebSocket chat server
export const wss = initChatSocket(server);

async function bootstrap() {
  try {
    console.log('[Bootstrap] Initializing HALDER production backend...');
    await seedDatabase();

    server.listen(env.PORT, '0.0.0.0', () => {
      console.log(`
==================================================
🌾 HALDER Backend API Server Live!
🌍 URL: http://localhost:${env.PORT}
💬 WebSocket: ws://localhost:${env.PORT}/ws
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
