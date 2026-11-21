import { AsyncLocalStorage } from 'node:async_hooks';
import { DatabaseSync } from 'node:sqlite';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

// ponytail: row-level table MERGE sync works cleanly up to ~10k-20k rows per table over HTTPS.
// Beyond that ceiling, migrate hot endpoints to direct Postgres SQL via pg / Supabase client.

export const SYNCED_TABLES = [
  'users',
  'identity_sequences',
  'auth_identities',
  'customer_profiles',
  'customer_addresses',
  'farmer_profiles',
  'categories',
  'products',
  'product_images',
  'conversations',
  'messages',
  'favorites',
  'notifications',
  'reviews',
  'reports',
  'saved_searches',
  'platform_settings',
  'audit_logs',
  'farm_crops',
  'farmer_subscriptions',
  'device_tokens',
  'inventory_audit_log',
  'orders',
  'order_items',
  'order_timeline',
  'carts',
  'cart_items',
  'negotiation_threads',
  'negotiation_messages',
  'buyer_requirements',
  'requirement_quotations',
] as const;

const SYNCED_TABLE_SET = new Set<string>(SYNCED_TABLES);

interface RequestSyncContext {
  touchedTables: Set<string>;
}

const syncStore = new AsyncLocalStorage<RequestSyncContext>();

let isHydrating = false;
let isSupabaseReady = false;
let localSyncedVersion = 0;
let lastVersionCheckAt = 0;
let initPromise: Promise<void> | null = null;
let activeTxTables: Set<string> | null = null;
let globalTouchedTables = new Set<string>();
let globalFlushScheduled = false;
let boundLocalDb: DatabaseSync | null = null;

const VERSION_CHECK_TTL_MS = 2000;

function getConfig() {
  const url = (process.env.SUPABASE_URL ?? env.SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
  const anonKey = (process.env.SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY ?? '').trim();
  const syncSecret = (process.env.SUPABASE_SYNC_SECRET ?? env.SUPABASE_SYNC_SECRET ?? '').trim();
  return { url, anonKey, syncSecret };
}

export function isSupabaseEnabled(): boolean {
  const { url, anonKey, syncSecret } = getConfig();
  return Boolean(url && anonKey && syncSecret);
}

export function getSupabaseStatus() {
  const { url } = getConfig();
  return {
    enabled: isSupabaseEnabled(),
    ready: isSupabaseReady,
    syncedVersion: localSyncedVersion,
    projectUrl: url || undefined,
    mode: isSupabaseEnabled() ? 'supabase-postgres' : 'local-sqlite',
  };
}

export function extractTouchedTable(sql: string): string | null {
  const match = sql.match(
    /^\s*(?:INSERT(?:\s+OR\s+\w+)?\s+INTO|REPLACE\s+INTO|UPDATE(?:\s+OR\s+\w+)?|DELETE\s+FROM)\s+(?:["`]?main["`]?\.)?["`]?([a-zA-Z_][a-zA-Z0-9_]*)["`]?/i
  );
  if (!match) return null;
  const tbl = match[1].toLowerCase();
  return SYNCED_TABLE_SET.has(tbl) ? tbl : null;
}

async function callSupabaseRpc<T>(fnName: string, body: Record<string, unknown>, maxRetries = 3): Promise<T> {
  const { url, anonKey } = getConfig();
  let attempt = 0;
  let lastError: any = null;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(`${url}/rest/v1/rpc/${fnName}`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Supabase RPC ${fnName} failed (${res.status}): ${text}`);
      }
      return (await res.json()) as T;
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        const backoffMs = attempt * 350;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError;
}

export function beginSupabaseTx(): void {
  if (!isSupabaseEnabled() || isHydrating) return;
  activeTxTables = new Set<string>();
}

export function commitSupabaseTx(): void {
  if (!activeTxTables) return;
  const committed = activeTxTables;
  activeTxTables = null;
  if (committed.size === 0) return;

  const store = syncStore.getStore();
  if (store) {
    for (const t of committed) store.touchedTables.add(t);
  } else {
    for (const t of committed) globalTouchedTables.add(t);
    scheduleGlobalFlush();
  }
}

export function rollbackSupabaseTx(): void {
  activeTxTables = null;
}

export function recordSupabaseWrite(sql: string): void {
  if (!isSupabaseEnabled() || isHydrating) return;
  const table = extractTouchedTable(sql);
  if (!table) return;

  if (activeTxTables) {
    activeTxTables.add(table);
    return;
  }

  const store = syncStore.getStore();
  if (store) {
    store.touchedTables.add(table);
  } else {
    globalTouchedTables.add(table);
    scheduleGlobalFlush();
  }
}

function scheduleGlobalFlush(): void {
  if (globalFlushScheduled || !boundLocalDb) return;
  globalFlushScheduled = true;
  queueMicrotask(() => {
    globalFlushScheduled = false;
    if (globalTouchedTables.size === 0 || !boundLocalDb) return;
    const tables = Array.from(globalTouchedTables);
    globalTouchedTables = new Set<string>();
    flushTablesToSupabase(boundLocalDb, tables).catch((err) => {
      console.error('[Supabase] Background flush failed:', err?.message || err);
    });
  });
}

function readTablesFromSqlite(localDb: DatabaseSync, tables: readonly string[]): Record<string, any[]> {
  const payload: Record<string, any[]> = {};
  for (const tbl of tables) {
    if (!SYNCED_TABLE_SET.has(tbl)) continue;
    try {
      const rows = localDb.prepare(`SELECT * FROM "${tbl}"`).all() as Record<string, any>[];
      payload[tbl] = rows.map((row) => {
        const clean: Record<string, any> = {};
        for (const [k, v] of Object.entries(row)) {
          clean[k] = typeof v === 'bigint' ? Number(v) : v;
        }
        return clean;
      });
    } catch {
      // Table may not exist in older local snapshot
    }
  }
  return payload;
}

export async function flushTablesToSupabase(localDb: DatabaseSync, tables: readonly string[]): Promise<number> {
  if (!isSupabaseEnabled() || tables.length === 0) return localSyncedVersion;
  const { syncSecret } = getConfig();

  const tableSet = new Set(tables);
  if (
    tableSet.has('carts') ||
    tableSet.has('customer_profiles') ||
    tableSet.has('farmer_profiles') ||
    tableSet.has('customer_addresses')
  ) {
    tableSet.add('users');
  }
  if (tableSet.has('cart_items')) {
    tableSet.add('carts');
  }
  if (tableSet.has('order_items') || tableSet.has('order_timeline')) {
    tableSet.add('orders');
    tableSet.add('users');
  }

  // Ensure tables are processed in strict foreign-key dependency order
  const orderedTables = SYNCED_TABLES.filter((t) => tableSet.has(t));
  if (orderedTables.length === 0) return localSyncedVersion;

  // If 'users' is included with dependent child tables, flush 'users' first to satisfy Postgres FK constraints
  if (orderedTables.includes('users') && orderedTables.length > 1) {
    const usersPayload = readTablesFromSqlite(localDb, ['users']);
    await callSupabaseRpc<number>('halder_sync_tables', {
      p_secret: syncSecret,
      p_tables: usersPayload,
    });
    const remainingTables = orderedTables.filter((t) => t !== 'users');
    const childPayload = readTablesFromSqlite(localDb, remainingTables);
    if (Object.keys(childPayload).length === 0) return localSyncedVersion;

    const newVersion = await callSupabaseRpc<number>('halder_sync_tables', {
      p_secret: syncSecret,
      p_tables: childPayload,
    });
    localSyncedVersion = Number(newVersion || localSyncedVersion + 1);
    lastVersionCheckAt = Date.now();
    return localSyncedVersion;
  }

  const payload = readTablesFromSqlite(localDb, orderedTables);
  if (Object.keys(payload).length === 0) return localSyncedVersion;

  const newVersion = await callSupabaseRpc<number>('halder_sync_tables', {
    p_secret: syncSecret,
    p_tables: payload,
  });
  localSyncedVersion = Number(newVersion || localSyncedVersion + 1);
  lastVersionCheckAt = Date.now();
  return localSyncedVersion;
}

function hydrateLocalSqlite(localDb: DatabaseSync, tablesData: Record<string, any[]>, version: number): void {
  isHydrating = true;
  try {
    localDb.exec('PRAGMA foreign_keys = OFF;');
    localDb.exec('BEGIN IMMEDIATE TRANSACTION;');

    for (const table of SYNCED_TABLES) {
      const rows = tablesData[table];
      if (!Array.isArray(rows)) continue;

      const localColsInfo = localDb.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[];
      if (localColsInfo.length === 0) continue;
      const localColSet = new Set(localColsInfo.map((c) => c.name));

      localDb.exec(`DELETE FROM "${table}";`);
      if (rows.length === 0) continue;

      // Deduplicate rows by known UNIQUE constraints to prevent hydration failure
      let cleanRows = rows;
      if (table === 'customer_profiles' || table === 'farmer_profiles') {
        const seen = new Map<string, any>();
        for (const r of rows) {
          if (r.user_id) seen.set(r.user_id, r);
        }
        cleanRows = Array.from(seen.values());
      } else if (table === 'auth_identities') {
        const seen = new Map<string, any>();
        for (const r of rows) {
          const key = `${r.provider}_${r.provider_user_id}`;
          seen.set(key, r);
        }
        cleanRows = Array.from(seen.values());
      } else if (table === 'users') {
        const seenId = new Map<string, any>();
        for (const r of rows) {
          if (r.id) seenId.set(r.id, r);
        }
        cleanRows = Array.from(seenId.values());
      }

      // Purge legacy mock seed items during hydration so platform starts clean
      const isLegacyMockId = (id: string, prefix: string) => new RegExp(`^${prefix}-\\d+$`).test(id);
      if (table === 'products') {
        cleanRows = cleanRows.filter((p) => !isLegacyMockId(p.id, 'prod'));
      } else if (table === 'users') {
        cleanRows = cleanRows.filter(
          (u) =>
            u.id === 'user-admin-1' ||
            (!/^user-(cust|farm|del)-\d+$/.test(u.id))
        );
      } else if (table === 'orders') {
        cleanRows = cleanRows.filter((o) => !isLegacyMockId(o.id, 'ord') && !isLegacyMockId(o.id, 'order'));
      } else if (table === 'reviews') {
        cleanRows = cleanRows.filter((r) => !isLegacyMockId(r.id, 'rev'));
      } else if (table === 'farmer_profiles') {
        cleanRows = cleanRows.filter((f) => !isLegacyMockId(f.id, 'farmer'));
      }

      if (cleanRows.length === 0) continue;

      const validCols = Object.keys(cleanRows[0]).filter((c) => localColSet.has(c));
      if (validCols.length === 0) continue;

      const colList = validCols.map((c) => `"${c}"`).join(', ');
      const placeholders = validCols.map(() => '?').join(', ');
      const insertStmt = localDb.prepare(`INSERT OR REPLACE INTO "${table}" (${colList}) VALUES (${placeholders})`);

      for (const row of cleanRows) {
        const values = validCols.map((col) => {
          const val = row[col];
          if (val === undefined) return null;
          if (typeof val === 'boolean') return val ? 1 : 0;
          return val;
        });
        try {
          insertStmt.run(...values);
        } catch (rowErr) {
          console.warn(`[Supabase] Hydrate row warning in "${table}":`, (rowErr as any)?.message || rowErr);
        }
      }
    }

    localDb.exec('COMMIT;');
    localDb.exec('PRAGMA foreign_keys = ON;');
    localSyncedVersion = version;
    lastVersionCheckAt = Date.now();
  } catch (err) {
    try {
      localDb.exec('ROLLBACK;');
      localDb.exec('PRAGMA foreign_keys = ON;');
    } catch {
      // Ignore rollback errors
    }
    throw err;
  } finally {
    isHydrating = false;
  }
}

export async function initSupabaseCloud(
  localDb: DatabaseSync,
  runLocalMigrations: () => void,
  runLocalSeed: () => Promise<void>
): Promise<void> {
  boundLocalDb = localDb;
  if (!isSupabaseEnabled()) return;
  if (isSupabaseReady) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { syncSecret } = getConfig();
    const snapshot = await callSupabaseRpc<{
      up_to_date: boolean;
      version: number;
      tables?: Record<string, any[]>;
    }>('halder_pull_snapshot', {
      p_secret: syncSecret,
      p_client_version: 0,
    });

    const remoteHasUsers = Array.isArray(snapshot.tables?.users) && snapshot.tables.users.length > 0;

    isHydrating = true;
    try {
      runLocalMigrations();

      if (!remoteHasUsers) {
        console.log('[Supabase] Fresh cloud Postgres detected — seeding clean HALDER data...');
        // Always start from a clean local state before seeding a brand-new cloud DB
        localDb.exec('PRAGMA foreign_keys = OFF;');
        const allLocalTables = localDb
          .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
          .all() as { name: string }[];
        for (const { name } of allLocalTables) {
          try {
            localDb.exec(`DELETE FROM "${name}";`);
          } catch {
            // ignore
          }
        }
        localDb.exec('PRAGMA foreign_keys = ON;');
        await runLocalSeed();
        await flushTablesToSupabase(localDb, SYNCED_TABLES);
        console.log(`[Supabase] Seeded & synced all 22 tables to Supabase Postgres (v${localSyncedVersion}).`);
      } else {
        hydrateLocalSqlite(localDb, snapshot.tables || {}, Number(snapshot.version || 1));
        console.log(`[Supabase] Hydrated local engine from Supabase Postgres (v${localSyncedVersion}).`);
      }
    } finally {
      isHydrating = false;
    }

    isSupabaseReady = true;
  })().catch((err) => {
    initPromise = null;
    console.error('[Supabase] Cloud initialization failed:', err?.message || err);
    throw err;
  });

  return initPromise;
}

let syncPromise: Promise<void> | null = null;

export async function syncFromSupabaseIfNeeded(localDb: DatabaseSync, forceCheck = false): Promise<void> {
  if (!isSupabaseEnabled() || !isSupabaseReady) return;
  const now = Date.now();
  if (!forceCheck && now - lastVersionCheckAt < VERSION_CHECK_TTL_MS) return;

  if (syncPromise) {
    return syncPromise;
  }

  syncPromise = (async () => {
    try {
      const { syncSecret } = getConfig();
      const snapshot = await callSupabaseRpc<{
        up_to_date: boolean;
        version: number;
        tables?: Record<string, any[]>;
      }>('halder_pull_snapshot', {
        p_secret: syncSecret,
        p_client_version: localSyncedVersion,
      });

      lastVersionCheckAt = Date.now();
      if (!snapshot.up_to_date && snapshot.tables) {
        hydrateLocalSqlite(localDb, snapshot.tables, Number(snapshot.version || 1));
      }
    } catch (err: any) {
      console.warn('[Supabase] Pre-request sync warning:', err?.message || err);
    } finally {
      syncPromise = null;
    }
  })();

  return syncPromise;
}

export function createSupabaseMiddleware(getLocalDb: () => DatabaseSync) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!isSupabaseEnabled()) {
      return next();
    }

    const localDb = getLocalDb();
    boundLocalDb = localDb;
    const isWriteMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase());

    syncFromSupabaseIfNeeded(localDb, isWriteMethod)
      .catch((err) => console.warn('[Supabase] Sync check warning:', err?.message || err))
      .finally(() => {
        const ctx: RequestSyncContext = { touchedTables: new Set<string>() };

        const origEnd = res.end.bind(res);
        let flushed = false;

        (res as any).end = function (...args: any[]) {
          if (flushed || ctx.touchedTables.size === 0) {
            return origEnd(...args);
          }
          flushed = true;
          const pendingTables = Array.from(ctx.touchedTables);
          ctx.touchedTables.clear();
          flushTablesToSupabase(localDb, pendingTables)
            .catch((err) => console.error('[Supabase] Write flush error:', err?.message || err))
            .finally(() => {
              origEnd(...args);
            });
          return res;
        };

        syncStore.run(ctx, () => {
          next();
        });
      });
  };
}
