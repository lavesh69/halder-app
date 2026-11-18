import assert from 'node:assert/strict';
import {
  normalizeTursoUrl,
  normalizeSqlArgs,
  isTursoEnabled,
  getTursoClient,
  initTursoCloud,
  runWithTursoTestContext,
} from '../src/db/turso';
import { Database, getDatabase } from '../src/db/database';
import { runMigrations } from '../src/db/migrate';
import { seedDatabase } from '../src/db/seed';

async function main() {
  // 1. Unit assertions (always run, even without cloud credentials)
  assert.equal(
    normalizeTursoUrl('libsql://halder-app-user.turso.io'),
    'https://halder-app-user.turso.io',
    'libsql:// URL must normalize to https://'
  );
  assert.equal(
    normalizeTursoUrl('  https://halder-app-user.turso.io  '),
    'https://halder-app-user.turso.io',
    'https:// URL must trim cleanly'
  );
  assert.deepEqual(
    normalizeSqlArgs([true, false, undefined, null, 42, 'wheat']),
    [1, 0, null, null, 42, 'wheat'],
    'SQLite args must normalize booleans and undefined cleanly'
  );

  // 2. Verify transaction rollback isolation on local SQLite
  runMigrations();
  const prevUrl = process.env.TURSO_DATABASE_URL;
  const prevToken = process.env.TURSO_AUTH_TOKEN;

  if (!isTursoEnabled()) {
    // Temporarily toggle env to exercise write-queue + tx rollback logic locally
    process.env.TURSO_DATABASE_URL = 'libsql://unit-test.turso.io';
    process.env.TURSO_AUTH_TOKEN = 'unit-test-token';
    try {
      const { statements } = runWithTursoTestContext(() => {
        try {
          Database.transaction(() => {
            Database.run('SELECT 1');
            throw new Error('force rollback');
          });
        } catch {
          // expected rollback
        }
        Database.transaction(() => {
          Database.run('SELECT 2');
        });
      });
      assert.equal(statements.length, 1, 'Rolled-back transaction must NOT queue writes');
      assert.equal(statements[0].sql, 'SELECT 2', 'Committed transaction must queue its write');
    } finally {
      if (prevUrl === undefined) delete process.env.TURSO_DATABASE_URL;
      else process.env.TURSO_DATABASE_URL = prevUrl;
      if (prevToken === undefined) delete process.env.TURSO_AUTH_TOKEN;
      else process.env.TURSO_AUTH_TOKEN = prevToken;
    }
    console.log('✅ Local Turso bridge self-check passed! (Add TURSO_DATABASE_URL & TURSO_AUTH_TOKEN to .env to verify live cloud DB)');
    return;
  }

  // 3. Live Turso Cloud verification
  console.log('🔌 Testing LIVE Turso Cloud connection...');
  const client = getTursoClient()!;
  const ping = await client.execute('SELECT 1 as ok');
  assert.equal(Number(ping.rows[0]?.ok), 1, 'Turso ping failed');

  await initTursoCloud(getDatabase(), runMigrations, seedDatabase);

  const usersCount = await client.execute('SELECT COUNT(*) as cnt FROM users');
  const productsCount = await client.execute('SELECT COUNT(*) as cnt FROM products');
  console.log(
    `✅ LIVE Turso Cloud connected & synced! Users: ${usersCount.rows[0]?.cnt}, Products: ${productsCount.rows[0]?.cnt}`
  );
}

main().catch((err) => {
  console.error('❌ Turso verification failed:', err);
  process.exit(1);
});
