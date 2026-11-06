import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (!dbInstance) {
    let dbPath = env.DB_PATH;

    // Support Vercel serverless writable storage (/tmp)
    if (process.env.VERCEL) {
      const tmpPath = path.join('/tmp', 'halder.db');
      if (!fs.existsSync(tmpPath)) {
        const sourcePath = path.resolve(process.cwd(), 'server', 'halder.db');
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, tmpPath);
        }
      }
      dbPath = tmpPath;
    }

    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    dbInstance = new DatabaseSync(dbPath);
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA synchronous = NORMAL;');
    dbInstance.exec('PRAGMA cache_size = -64000;');
    dbInstance.exec('PRAGMA mmap_size = 268435456;');
    dbInstance.exec('PRAGMA temp_store = MEMORY;');
    dbInstance.exec('PRAGMA busy_timeout = 10000;');
  }
  return dbInstance;
}

export class Database {
  static getDB(): DatabaseSync {
    return getDatabase();
  }

  static query<T = any>(sql: string, params: (string | number | null | boolean | Buffer)[] = []): T[] {
    const db = getDatabase();
    const stmt = db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  static get<T = any>(sql: string, params: (string | number | null | boolean | Buffer)[] = []): T | undefined {
    const db = getDatabase();
    const stmt = db.prepare(sql);
    return stmt.get(...params) as T | undefined;
  }

  static run(sql: string, params: (string | number | null | boolean | Buffer)[] = []): { changes: number; lastInsertRowid: number | bigint } {
    const db = getDatabase();
    const stmt = db.prepare(sql);
    return stmt.run(...params);
  }

  static transaction<T>(callback: () => T): T {
    const db = getDatabase();
    db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
      const result = callback();
      db.exec('COMMIT;');
      return result;
    } catch (error) {
      db.exec('ROLLBACK;');
      throw error;
    }
  }
}
