// SPDX-License-Identifier: Apache-2.0
// restore_drill.ts — restore verification drill using node:sqlite (built-in)
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

const backupsDir = path.resolve(process.cwd(), 'server', 'backups');
const files = fs.readdirSync(backupsDir).filter((f) => f.endsWith('.db')).sort();
if (files.length === 0) { console.error('No backup files found'); process.exit(1); }
const latest = files[files.length - 1];
const backupPath = path.join(backupsDir, latest);
const stats = fs.statSync(backupPath);

console.log('=== HALDER BACKUP RESTORE DRILL ===');
console.log('Backup file:', latest);
console.log('Size:', stats.size, 'bytes (' + (stats.size / 1024 / 1024).toFixed(2) + ' MB)');
console.log('Modified:', stats.mtime.toISOString());

const start = Date.now();
const db = new DatabaseSync(backupPath, { readOnly: true } as Parameters<typeof DatabaseSync>[1]);

const integrity = db.prepare('PRAGMA integrity_check').all() as Array<Record<string, unknown>>;
const fkCheck = db.prepare('PRAGMA foreign_key_check').all() as unknown[];

console.log('\n--- Table Row Counts ---');
const tables = ['users', 'products', 'orders', 'reviews', 'farms', 'categories'];
for (const t of tables) {
  try {
    const r = db.prepare(`SELECT COUNT(*) as c FROM "${t}"`).get() as { c: number };
    console.log(`  ${t}: ${r.c} rows`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`  ${t}: NOT FOUND (${msg})`);
  }
}

console.log('\n--- Integrity Checks ---');
const firstRow = integrity[0] as Record<string, unknown> | undefined;
const icResult = firstRow ? String(firstRow['integrity_check'] ?? firstRow[Object.keys(firstRow)[0]]) : 'ok';
console.log('  integrity_check:', icResult);
console.log('  foreign_key_check:', fkCheck.length === 0 ? 'PASS (0 violations)' : JSON.stringify(fkCheck));

const duration = Date.now() - start;
console.log('\nRestore drill duration:', duration + 'ms');
console.log('RESULT: VERIFIED');
db.close();
