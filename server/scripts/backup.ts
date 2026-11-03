import fs from 'fs';
import path from 'path';
import { Database } from '../src/db/database';
import { env } from '../src/config/env';

export function runBackup(): string {
  console.log('[Backup] Initiating HALDER zero-downtime database snapshot...');

  const backupDir = path.resolve(process.cwd(), 'server', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Force WAL checkpoint to flush all pending transactions from WAL into main database
  const db = Database.getDB();
  db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  console.log('  ✅ WAL checkpoint complete (all pages synchronized)');

  // 2. Generate timestamped target backup file
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const targetFile = path.join(backupDir, `halder_backup_${ts}.db`);

  // 3. Copy database file safely
  fs.copyFileSync(env.DB_PATH, targetFile);
  const stats = fs.statSync(targetFile);
  console.log(`  ✅ Backup created successfully: ${targetFile} (${(stats.size / 1024).toFixed(1)} KB)`);

  // 4. Prune old backups (keep latest 10)
  const existingBackups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('halder_backup_') && f.endsWith('.db'))
    .map(f => path.join(backupDir, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  if (existingBackups.length > 10) {
    const toDelete = existingBackups.slice(10);
    toDelete.forEach(f => {
      fs.unlinkSync(f);
      console.log(`  🧹 Pruned old backup: ${path.basename(f)}`);
    });
  }

  return targetFile;
}

if (process.argv[1] === import.meta.filename) {
  try {
    runBackup();
    process.exit(0);
  } catch (err) {
    console.error('❌ Backup failed:', err);
    process.exit(1);
  }
}
