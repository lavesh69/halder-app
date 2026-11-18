import { AsyncLocalStorage } from 'node:async_hooks';
import type { DatabaseSync } from 'node:sqlite';
import { createClient, type Client, type InStatement, type InValue } from '@libsql/client/http';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

// ponytail: full-table snapshot hydration works smoothly up to ~15k-25k rows (<200ms over HTTP).
// Beyond ~50k rows, migrate hot read/write services to direct async @libsql/client/http queries.

export interface QueuedWrite {
  sql: string;
  args: InValue[];
}

interface RequestWriteContext {
  statements: QueuedWrite[];
}

const tursoWriteStore = new AsyncLocalStorage<RequestWriteContext>();

let tursoClient: Client | null = null;
let isHydrating = false;
let isTursoReady = false;
let localSyncedVersion = 0;
let lastVersionCheckAt = 0;
let initPromise: Promise<void> | null = null;
let activeTxBuffer: QueuedWrite[] | null = null;
let globalWriteQueue: QueuedWrite[] = [];
let globalFlushScheduled = false;

const VERSION_CHECK_TTL_MS = 2000;
const META_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS _turso_sync_meta (
    key TEXT PRIMARY KEY,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  )
`;

export function normalizeTursoUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('libsql://')) {
    return 'https://' + trimmed.slice('libsql://'.length);
  }
  return trimmed;
}

export function isTursoEnabled(): boolean {
  const url = process.env.TURSO_DATABASE_URL ?? env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN ?? env.TURSO_AUTH_TOKEN;
  return Boolean(url?.trim() && token?.trim());
}

export function getTursoClient(): Client | null {
  if (!isTursoEnabled()) return null;
  if (!tursoClient) {
    const rawUrl = (process.env.TURSO_DATABASE_URL ?? env.TURSO_DATABASE_URL)!;
    const authToken = (process.env.TURSO_AUTH_TOKEN ?? env.TURSO_AUTH_TOKEN)!.trim();
    tursoClient = createClient({
      url: normalizeTursoUrl(rawUrl),
      authToken,
    });
  }
  return tursoClient;
}

export function getTursoStatus() {
  return {
    enabled: isTursoEnabled(),
    ready: isTursoReady,
    syncedVersion: localSyncedVersion,
    mode: isTursoEnabled() ? 'turso-cloud' : 'local-sqlite',
  };
}

export function normalizeSqlArgs(
  params: (string | number | null | boolean | Buffer | Uint8Array | undefined)[] = []
): InValue[] {
  return params.map((p): InValue => {
    if (p === undefined || p === null) return null;
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (Buffer.isBuffer(p)) return new Uint8Array(p);
    return p;
  });
}

export function beginTursoTx(): void {
  if (!isTursoEnabled() || isHydrating) return;
  activeTxBuffer = [];
}

export function commitTursoTx(): void {
  if (!activeTxBuffer) return;
  const committed = activeTxBuffer;
  activeTxBuffer = null;
  if (committed.length === 0) return;

  const store = tursoWriteStore.getStore();
  if (store) {
    store.statements.push(...committed);
  } else {
    globalWriteQueue.push(...committed);
    scheduleGlobalFlush();
  }
}

export function rollbackTursoTx(): void {
  activeTxBuffer = null;
}

export function recordTursoWrite(
  sql: string,
  params: (string | number | null | boolean | Buffer | Uint8Array | undefined)[] = []
): void {
  if (!isTursoEnabled() || isHydrating) return;
  const entry: QueuedWrite = { sql, args: normalizeSqlArgs(params) };

  if (activeTxBuffer) {
    activeTxBuffer.push(entry);
    return;
  }

  const store = tursoWriteStore.getStore();
  if (store) {
    store.statements.push(entry);
  } else {
    globalWriteQueue.push(entry);
    scheduleGlobalFlush();
  }
}

function scheduleGlobalFlush(): void {
  if (globalFlushScheduled) return;
  globalFlushScheduled = true;
  queueMicrotask(() => {
    globalFlushScheduled = false;
    if (globalWriteQueue.length === 0) return;
    const toFlush = globalWriteQueue;
    globalWriteQueue = [];
    flushTursoStatements(toFlush).catch((err) => {
      console.error('[Turso] Background flush failed:', err?.message || err);
    });
  });
}

export async function flushTursoStatements(statements: QueuedWrite[]): Promise<void> {
  if (!statements.length) return;
  const client = getTursoClient();
  if (!client) return;

  const now = new Date().toISOString();
  const batch: InStatement[] = [
    ...statements.map((s) => ({ sql: s.sql, args: s.args })),
    {
      sql: `INSERT INTO _turso_sync_meta (key, version, updated_at) VALUES ('sync_version', 1, ?)
            ON CONFLICT(key) DO UPDATE SET version = version + 1, updated_at = excluded.updated_at`,
      args: [now],
    },
    {
      sql: `SELECT version FROM _turso_sync_meta WHERE key = 'sync_version'`,
      args: [],
    },
  ];

  const results = await client.batch(batch, 'write');
  const versionRes = results[results.length - 1];
  const newVersion = Number(versionRes?.rows?.[0]?.version ?? localSyncedVersion + 1);
  localSyncedVersion = newVersion;
  lastVersionCheckAt = Date.now();
}

export async function pullTursoToLocal(localDb: DatabaseSync): Promise<number> {
  const client = getTursoClient();
  if (!client) return 0;

  const tablesRes = await client.execute(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_turso_sync_meta'`
  );
  const remoteTables = tablesRes.rows.map((r) => String(r.name));

  // Discover local tables & columns so we only hydrate intersecting columns safely
  const localTableRows = localDb
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_turso_sync_meta'`)
    .all() as { name: string }[];
  const localTableSet = new Set(localTableRows.map((t) => t.name));

  const tablesToPull = remoteTables.filter((t) => localTableSet.has(t));
  if (tablesToPull.length === 0) return localSyncedVersion;

  const readBatch: InStatement[] = [
    ...tablesToPull.map((t) => ({ sql: `SELECT * FROM "${t}"`, args: [] as InValue[] })),
    { sql: `SELECT version FROM _turso_sync_meta WHERE key = 'sync_version'`, args: [] as InValue[] },
  ];

  const results = await client.batch(readBatch, 'read');
  const versionRow = results[results.length - 1]?.rows?.[0];
  const remoteVersion = Number(versionRow?.version ?? 1);

  isHydrating = true;
  try {
    localDb.exec('PRAGMA foreign_keys = OFF;');
    localDb.exec('BEGIN IMMEDIATE TRANSACTION;');

    for (let i = 0; i < tablesToPull.length; i++) {
      const table = tablesToPull[i];
      const rs = results[i];
      if (!rs) continue;

      const localColsInfo = localDb.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[];
      const localColSet = new Set(localColsInfo.map((c) => c.name));

      localDb.exec(`DELETE FROM "${table}";`);

      if (rs.rows.length === 0) continue;

      const validCols = rs.columns.filter((col) => localColSet.has(col));
      if (validCols.length === 0) continue;

      const colList = validCols.map((c) => `"${c}"`).join(', ');
      const placeholders = validCols.map(() => '?').join(', ');
      const insertStmt = localDb.prepare(`INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`);

      for (const row of rs.rows) {
        const values = validCols.map((col) => {
          const val = (row as Record<string, any>)[col];
          if (val === undefined) return null;
          if (typeof val === 'bigint') return Number(val);
          return val;
        });
        insertStmt.run(...values);
      }
    }

    localDb.exec('COMMIT;');
    localDb.exec('PRAGMA foreign_keys = ON;');
    localSyncedVersion = remoteVersion;
    lastVersionCheckAt = Date.now();
    return remoteVersion;
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

export async function pushLocalToTurso(localDb: DatabaseSync): Promise<void> {
  const client = getTursoClient();
  if (!client) return;

  // 1. Push all CREATE TABLE and CREATE INDEX DDL from local SQLite
  const ddlRows = localDb
    .prepare(
      `SELECT type, name, sql FROM sqlite_master
       WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name != '_turso_sync_meta'
       ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END`
    )
    .all() as { type: string; name: string; sql: string }[];

  const ddlStatements: InStatement[] = ddlRows.map((row) => {
    const idempotentSql = row.sql
      .replace(/^CREATE TABLE\s+(?!IF NOT EXISTS)/i, 'CREATE TABLE IF NOT EXISTS ')
      .replace(/^CREATE UNIQUE INDEX\s+(?!IF NOT EXISTS)/i, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
      .replace(/^CREATE INDEX\s+(?!IF NOT EXISTS)/i, 'CREATE INDEX IF NOT EXISTS ');
    return { sql: idempotentSql, args: [] };
  });

  if (ddlStatements.length > 0) {
    await client.batch(ddlStatements, 'write');
  }

  // 2. Push all seeded rows parent-first so foreign key constraints always satisfy cleanly
  const PARENT_PRIORITY = [
    'users',
    'identity_sequences',
    'auth_identities',
    'categories',
    'farmer_profiles',
    'customer_profiles',
    'customer_addresses',
    'products',
    'conversations',
    'orders',
    'carts',
  ];
  const tableRows = ddlRows
    .filter((r) => r.type === 'table')
    .map((r) => r.name)
    .sort((a, b) => {
      const ia = PARENT_PRIORITY.indexOf(a);
      const ib = PARENT_PRIORITY.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  const insertBatch: InStatement[] = [];

  for (const table of tableRows) {
    const rows = localDb.prepare(`SELECT * FROM "${table}"`).all() as Record<string, any>[];
    if (rows.length === 0) continue;

    const cols = Object.keys(rows[0]);
    const colList = cols.map((c) => `"${c}"`).join(', ');
    const placeholders = cols.map(() => '?').join(', ');
    const insertSql = `INSERT OR REPLACE INTO "${table}" (${colList}) VALUES (${placeholders})`;

    for (const row of rows) {
      const args = normalizeSqlArgs(cols.map((c) => row[c]));
      insertBatch.push({ sql: insertSql, args });
    }
  }

  const CHUNK_SIZE = 80;
  for (let i = 0; i < insertBatch.length; i += CHUNK_SIZE) {
    const chunk = insertBatch.slice(i, i + CHUNK_SIZE);
    await client.batch([{ sql: 'PRAGMA defer_foreign_keys = ON', args: [] }, ...chunk], 'write');
  }

  const now = new Date().toISOString();
  await client.execute({
    sql: `INSERT INTO _turso_sync_meta (key, version, updated_at) VALUES ('sync_version', 1, ?)
          ON CONFLICT(key) DO UPDATE SET version = version + 1, updated_at = excluded.updated_at`,
    args: [now],
  });

  const verRes = await client.execute(`SELECT version FROM _turso_sync_meta WHERE key = 'sync_version'`);
  localSyncedVersion = Number(verRes.rows[0]?.version ?? 1);
  lastVersionCheckAt = Date.now();
}

export async function initTursoCloud(
  localDb: DatabaseSync,
  runLocalMigrations: () => void,
  runLocalSeed: () => Promise<void>
): Promise<void> {
  if (!isTursoEnabled()) {
    await runLocalSeed();
    return;
  }

  if (isTursoReady) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const client = getTursoClient()!;
    await client.execute(META_TABLE_SQL);

    // Check if Turso already contains our users table with data
    const tableCheck = await client.execute(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='users'`
    );
    let remoteHasUsers = false;
    if (tableCheck.rows.length > 0) {
      const countRes = await client.execute(`SELECT COUNT(*) as cnt FROM users`);
      remoteHasUsers = Number(countRes.rows[0]?.cnt ?? 0) > 0;
    }

    isHydrating = true;
    try {
      if (!remoteHasUsers) {
        console.log('[Turso] Fresh cloud database detected — initializing schema & seed data...');
        await runLocalSeed();
        await pushLocalToTurso(localDb);
        console.log(`[Turso] Initial sync complete (v${localSyncedVersion}).`);
      } else {
        console.log('[Turso] Connected to persistent cloud database — hydrating local engine...');
        runLocalMigrations();
        await pullTursoToLocal(localDb);
        console.log(`[Turso] Hydrated local SQLite from Turso Cloud (v${localSyncedVersion}).`);
      }
    } finally {
      isHydrating = false;
    }

    isTursoReady = true;
  })().catch((err) => {
    initPromise = null;
    console.error('[Turso] Cloud initialization failed (falling back to local SQLite):', err?.message || err);
    throw err;
  });

  return initPromise;
}

export async function syncFromTursoIfNeeded(localDb: DatabaseSync, forceCheck = false): Promise<void> {
  if (!isTursoEnabled() || !isTursoReady) return;
  const now = Date.now();
  if (!forceCheck && now - lastVersionCheckAt < VERSION_CHECK_TTL_MS) return;

  const client = getTursoClient();
  if (!client) return;

  try {
    const res = await client.execute(`SELECT version FROM _turso_sync_meta WHERE key = 'sync_version'`);
    const remoteVersion = Number(res.rows[0]?.version ?? 1);
    lastVersionCheckAt = Date.now();

    if (remoteVersion !== localSyncedVersion) {
      await pullTursoToLocal(localDb);
    }
  } catch (err: any) {
    console.warn('[Turso] Sync check warning:', err?.message || err);
  }
}

export function createTursoMiddleware(getLocalDb: () => DatabaseSync) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!isTursoEnabled()) {
      return next();
    }

    const isWriteMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase());

    syncFromTursoIfNeeded(getLocalDb(), isWriteMethod)
      .catch((err) => console.warn('[Turso] Pre-request sync warning:', err?.message || err))
      .finally(() => {
        const ctx: RequestWriteContext = { statements: [] };

        // Intercept res.end so all queued DB writes are committed to Turso BEFORE responding
        const origEnd = res.end.bind(res);
        let flushed = false;

        (res as any).end = function (...args: any[]) {
          if (flushed || ctx.statements.length === 0) {
            return origEnd(...args);
          }
          flushed = true;
          const pending = ctx.statements.splice(0, ctx.statements.length);
          flushTursoStatements(pending)
            .catch((err) => console.error('[Turso] Write flush error:', err?.message || err))
            .finally(() => {
              origEnd(...args);
            });
          return res;
        };

        tursoWriteStore.run(ctx, () => {
          next();
        });
      });
  };
}

/** Test-only helper to inspect queued writes inside a callback */
export function runWithTursoTestContext<T>(fn: () => T): { result: T; statements: QueuedWrite[] } {
  const ctx: RequestWriteContext = { statements: [] };
  const result = tursoWriteStore.run(ctx, fn);
  return { result, statements: ctx.statements };
}
