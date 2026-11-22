import { Database } from '../src/db/database';

export function cleanTestArtifacts() {
  // 1. Purge test ban records
  Database.run(`DELETE FROM banned_devices WHERE device_id LIKE 'test-%'`);

  // 2. Identify and purge test farmers created during testing
  const testPatterns = [
    'Ramesh Negi %',
    'Rohit Verma %',
    'Storage Test Farmer%',
    'Live Kisan Test%',
    '%test%@test.com',
    '%test_chat%',
    '%farmer_test_%',
    'buyer_test_%',
  ];

  for (const pattern of testPatterns) {
    Database.run(
      `DELETE FROM farmer_profiles WHERE user_id IN (SELECT id FROM users WHERE name LIKE ? OR email LIKE ?)`,
      [pattern, pattern]
    );
    Database.run(
      `DELETE FROM users WHERE name LIKE ? OR email LIKE ?`,
      [pattern, pattern]
    );
  }

  // Also remove duplicate timestamped test users (e.g. suresh_179533..., kishore_179533..., ramesh_058261...)
  Database.run(`DELETE FROM farmer_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%1795%' OR email LIKE 'ramesh_%@gmail.com' OR email LIKE '%@test.com')`);
  Database.run(`DELETE FROM users WHERE email LIKE '%1795%' OR email LIKE 'ramesh_%@gmail.com' OR email LIKE '%@test.com'`);

  console.log('Test artifacts and dummy accounts successfully cleaned up.');
}

if (process.argv[1]?.includes('clean_test_accounts')) {
  cleanTestArtifacts();
}
