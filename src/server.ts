// Load env before anything else
import 'dotenv/config';

import app from './app';
import { env } from '@/config/env';
import { disconnectDatabase } from '@/config/database';

const server = app.listen(env.port, () => {
  console.log(`\n🚀 Server running on http://localhost:${env.port}`);
  console.log(`   Mode: ${env.nodeEnv}`);
  console.log(`   API:  http://localhost:${env.port}/api/v1\n`);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received — shutting down gracefully...`);

  server.close(async () => {
    console.log('HTTP server closed.');
    await disconnectDatabase();
    console.log('Database disconnected. Goodbye.');
    process.exit(0);
  });

  // Force-kill if graceful shutdown takes too long
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason);
  // In production you might want to exit; in dev, keep running.
  if (env.nodeEnv === 'production') process.exit(1);
});
