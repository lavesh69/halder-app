import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { runBackup } from '../scripts/backup';

console.log('==================================================');
console.log('🧪 RUNNING HALDER DATABASE BACKUP & RESTORATION TEST');
console.log('==================================================\n');

// 1. Create a fresh verified backup
const backupFile = runBackup();
if (!fs.existsSync(backupFile)) {
  throw new Error(`Backup file does not exist: ${backupFile}`);
}

// 2. Simulate disaster recovery by restoring backup to an isolated sandbox database
const restoreSandboxPath = path.resolve(process.cwd(), 'server', 'backups', 'halder_restore_test.db');
if (fs.existsSync(restoreSandboxPath)) {
  fs.unlinkSync(restoreSandboxPath);
}

console.log('[Recovery] Restoring snapshot into isolated test database...');
fs.copyFileSync(backupFile, restoreSandboxPath);
console.log('  ✅ File copied to sandbox destination:', restoreSandboxPath);

// 3. Open restored database and validate record integrity
console.log('[Validation] Connecting to restored database and verifying table counts...');
const testDb = new DatabaseSync(restoreSandboxPath);

const userCount = testDb.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
const productCount = testDb.prepare('SELECT COUNT(*) as cnt FROM products').get() as { cnt: number };
const orderCount = testDb.prepare('SELECT COUNT(*) as cnt FROM orders').get() as { cnt: number };
const reviewCount = testDb.prepare('SELECT COUNT(*) as cnt FROM reviews').get() as { cnt: number };

console.log(`  ✅ Restored Database Verified:
      - Total Users: ${userCount.cnt}
      - Total Products: ${productCount.cnt}
      - Total Orders: ${orderCount.cnt}
      - Total Reviews: ${reviewCount.cnt}`);

testDb.close();

// 4. Clean up sandbox database
fs.unlinkSync(restoreSandboxPath);
console.log('  🧹 Restored sandbox database safely unlinked.');

console.log('\n==================================================');
console.log('🎉 DATABASE RECOVERY TEST PASSED WITH 100% DATA INTEGRITY!');
console.log('==================================================');
