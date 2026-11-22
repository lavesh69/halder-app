import { Database } from '../src/db/database';

const tables = Database.query<{ name: string }>(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
);

console.log('--- DATABASE INVENTORY ---');
for (const t of tables) {
  const res = Database.get<{ c: number }>(`SELECT COUNT(*) as c FROM "${t.name}"`);
  console.log(`${t.name}: ${res?.c ?? 0}`);
}

const users = Database.query<any>('SELECT id, name, email, role FROM users');
console.log('\n--- USERS IN DB ---');
console.table(users);

const farmers = Database.query<any>('SELECT id, user_id, farm_name, city FROM farmer_profiles');
console.log('\n--- FARMERS IN DB ---');
console.table(farmers);
