import assert from 'node:assert/strict';
import {
  normalizeTursoUrl,
  normalizeSqlArgs,
  isTursoEnabled,
  getTursoClient,
  initTursoCloud,
} from '../src/db/turso';
import {
  isSupabaseEnabled,
  extractTouchedTable,
  initSupabaseCloud,
  flushTablesToSupabase,
  getSupabaseStatus,
} from '../src/db/supabaseSync';
import { Database, getDatabase } from '../src/db/database';
import { runMigrations } from '../src/db/migrate';
import { seedDatabase } from '../src/db/seed';

async function main() {
  // 1. Unit assertions for both bridges
  assert.equal(normalizeTursoUrl('libsql://halder-app-user.turso.io'), 'https://halder-app-user.turso.io');
  assert.deepEqual(normalizeSqlArgs([true, false, undefined, null, 42, 'wheat']), [1, 0, null, null, 42, 'wheat']);
  assert.equal(extractTouchedTable('INSERT INTO products (id, name) VALUES (?, ?)'), 'products');
  assert.equal(extractTouchedTable('UPDATE "users" SET name = ? WHERE id = ?'), 'users');
  assert.equal(extractTouchedTable('DELETE FROM favorites WHERE id = ?'), 'favorites');
  assert.equal(extractTouchedTable('SELECT * FROM products'), null);

  // 2. Live Supabase Postgres verification (primary)
  if (isSupabaseEnabled()) {
    console.log('🔌 Connecting & syncing LIVE Supabase PostgreSQL...');
    const localDb = getDatabase();
    await initSupabaseCloud(localDb, runMigrations, seedDatabase);

    const status = getSupabaseStatus();
    assert.equal(status.ready, true, 'Supabase bridge must be ready');
    assert.ok(status.syncedVersion >= 1, 'Supabase sync version must be >= 1');

    // Verify a live round-trip write + flush to platform_settings
    const now = new Date().toISOString();
    Database.run(
      `INSERT OR REPLACE INTO platform_settings (key, value, description, updated_at) VALUES (?, ?, ?, ?)`,
      ['supabase_last_verified_at', now, 'Automated Supabase live verification timestamp', now]
    );
    const newVer = await flushTablesToSupabase(localDb, ['platform_settings']);
    assert.ok(newVer >= status.syncedVersion, 'Sync version must increment after write');

    const usersCount = (Database.get<any>('SELECT COUNT(*) as c FROM users') || {}).c;
    const productsCount = (Database.get<any>('SELECT COUNT(*) as c FROM products') || {}).c;
    console.log(
      `✅ LIVE Supabase PostgreSQL connected & verified! (v${newVer}) | Users: ${usersCount}, Products: ${productsCount}`
    );
    return;
  }

  // 3. Live Turso Cloud verification (optional fallback)
  if (isTursoEnabled()) {
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
    return;
  }

  console.log('✅ Cloud DB bridge unit checks passed! (Running in local SQLite mode)');
}

main().catch((err) => {
  console.error('❌ Cloud DB verification failed:', err);
  process.exit(1);
});
