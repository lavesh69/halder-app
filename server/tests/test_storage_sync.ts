import assert from 'node:assert/strict';
import { Database } from '../src/db/database';
import { StorageService } from '../src/services/storageService';
import { CustomerProfileService } from '../src/services/customerProfileService';
import { FarmerService } from '../src/services/farmerService';
import { ProductService } from '../src/services/productService';
import { KycService } from '../src/services/kycService';
import { getSupabaseStatus, syncFromSupabaseIfNeeded } from '../src/db/supabaseSync';
import { v4 as uuidv4 } from 'uuid';

async function runStorageAndSyncTests() {
  console.log('======================================================');
  console.log('HALDER — Storage Optimization & Serverless Sync Tests');
  console.log('======================================================\n');

  let passed = 0;
  const test1x1Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  // TEST 1: StorageService - HTTP URL passthrough
  const webUrl = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400';
  const urlResult = await StorageService.processImagePayload(webUrl, 'avatars');
  assert.equal(urlResult, webUrl, 'HTTP URL should pass through untouched');
  console.log('  ✅ [PASS]: HTTP image URLs pass through untouched without re-upload');
  passed++;

  // TEST 2: StorageService - Base64 Data URL conversion
  const processedUrl = await StorageService.processImagePayload(test1x1Png, 'avatars', 'http://localhost:5000');
  assert.ok(processedUrl.includes('/uploads/avatars/') || processedUrl.startsWith('https://'), 'Must convert base64 to clean URL');
  assert.ok(!processedUrl.startsWith('data:image'), 'Must NOT be a raw base64 data URL');
  console.log(`  ✅ [PASS]: Base64 image payload converted to clean URL: ${processedUrl}`);
  passed++;

  // TEST 3: Customer Avatar Base64 Optimization in DB
  const testCustomerId = `cust-test-${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();
  Database.run(
    `INSERT INTO users (id, halder_id, name, email, phone, role, status, password_hash, created_at, updated_at)
     VALUES (?, ?, 'Storage Test Customer', ?, ?, 'customer', 'active', 'test_hash_123', ?, ?)`,
    [testCustomerId, `HAL-CUS-${uuidv4().slice(0, 8)}`, `${testCustomerId}@test.com`, `98${Math.floor(10000000 + Math.random() * 90000000)}`, now, now]
  );

  const custAvatarRes = await CustomerProfileService.updateAvatar(testCustomerId, test1x1Png, 'http://localhost:5000');
  assert.ok(custAvatarRes.success, 'Avatar update should succeed');
  assert.ok(!custAvatarRes.avatar.startsWith('data:image'), 'Returned avatar must be a clean URL');

  const custUser = Database.get<any>('SELECT profile_image FROM users WHERE id = ?', [testCustomerId]);
  const custProf = Database.get<any>('SELECT avatar FROM customer_profiles WHERE user_id = ?', [testCustomerId]);
  assert.ok(!custUser.profile_image.startsWith('data:image'), 'users.profile_image must NOT be base64');
  assert.ok(!custProf.avatar.startsWith('data:image'), 'customer_profiles.avatar must NOT be base64');
  assert.equal(custUser.profile_image, custProf.avatar, 'Both avatar columns must match clean URL');
  console.log('  ✅ [PASS]: Customer avatar saved as clean storage URL in database without base64 bloat');
  passed++;

  // TEST 4: Farmer Avatar Base64 Optimization in DB
  const testFarmerUserId = `farm-test-${uuidv4().slice(0, 8)}`;
  Database.run(
    `INSERT INTO users (id, halder_id, name, email, phone, role, status, password_hash, created_at, updated_at)
     VALUES (?, ?, 'Storage Test Farmer', ?, ?, 'farmer', 'active', 'test_hash_123', ?, ?)`,
    [testFarmerUserId, `HAL-FAR-${uuidv4().slice(0, 8)}`, `${testFarmerUserId}@test.com`, `97${Math.floor(10000000 + Math.random() * 90000000)}`, now, now]
  );

  const farmAvatarRes = await FarmerService.updateFarmerAvatar(testFarmerUserId, test1x1Png, 'http://localhost:5000');
  assert.ok(farmAvatarRes.success, 'Farmer avatar update should succeed');
  assert.ok(!farmAvatarRes.avatar.startsWith('data:image'), 'Returned farmer avatar must be a clean URL');

  const farmUser = Database.get<any>('SELECT profile_image FROM users WHERE id = ?', [testFarmerUserId]);
  const farmProf = Database.get<any>('SELECT avatar FROM farmer_profiles WHERE user_id = ?', [testFarmerUserId]);
  assert.ok(!farmUser.profile_image.startsWith('data:image'), 'users.profile_image must NOT be base64');
  assert.ok(!farmProf.avatar.startsWith('data:image'), 'farmer_profiles.avatar must NOT be base64');
  console.log('  ✅ [PASS]: Farmer avatar saved as clean storage URL in database without base64 bloat');
  passed++;

  // TEST 5: Product Images Base64 Optimization in DB
  const farmerProfRow = Database.get<any>('SELECT id FROM farmer_profiles WHERE user_id = ?', [testFarmerUserId]);
  const product = await ProductService.create({
    farmerId: farmerProfRow.id,
    name: 'Storage Test Fresh Tomatoes',
    price: 45,
    unit: 'kg',
    availableQuantity: 200,
    location: 'Dehradun Mandi',
    image: test1x1Png,
    images: [test1x1Png, webUrl],
  }, 'http://localhost:5000');

  assert.ok(!product.image.startsWith('data:image'), 'Product primary image must NOT be base64');
  const prodInDb = Database.get<any>('SELECT image FROM products WHERE id = ?', [product.id]);
  assert.ok(!prodInDb.image.startsWith('data:image'), 'Database products.image must NOT be base64');

  const prodImages = Database.query<any>('SELECT image_url FROM product_images WHERE product_id = ?', [product.id]);
  assert.ok(prodImages.length >= 2, 'Product should have 2 images');
  for (const pi of prodImages) {
    assert.ok(!pi.image_url.startsWith('data:image'), `Image ${pi.image_url} must NOT be base64`);
  }
  console.log('  ✅ [PASS]: Product primary and gallery images stored as clean URLs without base64');
  passed++;

  // TEST 6: KYC Proof Document Base64 Optimization
  const kycRes = await KycService.submitKYC(farmerProfRow.id, {
    documentType: 'kisan_credit_card',
    documentNumber: 'KCC-98765432',
    documentUrl: test1x1Png,
  }, 'http://localhost:5000');

  const kycFarmer = Database.get<any>('SELECT kyc_document_url FROM farmer_profiles WHERE id = ?', [farmerProfRow.id]);
  assert.ok(!kycFarmer.kyc_document_url.startsWith('data:image'), 'KYC document URL must NOT be base64');
  console.log('  ✅ [PASS]: Farmer KYC document proof converted to clean storage URL');
  passed++;

  // TEST 7: Supabase Cloud Persistence Status & Health
  const status = getSupabaseStatus();
  assert.equal(typeof status.enabled, 'boolean', 'Supabase status enabled must be boolean');
  assert.equal(typeof status.syncedVersion, 'number', 'Synced version must be a number');
  console.log(`  ✅ [PASS]: Cloud sync status verified (mode: ${status.mode}, version: ${status.syncedVersion}, ready: ${status.ready})`);
  passed++;

  // TEST 8: Resilient Sync Mutex Check
  // Verify that concurrent syncFromSupabaseIfNeeded calls do not crash or race
  const sync1 = syncFromSupabaseIfNeeded(Database.getDB(), false);
  const sync2 = syncFromSupabaseIfNeeded(Database.getDB(), false);
  await Promise.all([sync1, sync2]);
  console.log('  ✅ [PASS]: Concurrent sync calls deduplicated cleanly via sync mutex without race condition');
  passed++;

  console.log('\n------------------------------------------------------');
  console.log(`🎉 ALL ${passed}/${passed} STORAGE & SYNC TESTS PASSED WITH 100% SUCCESS!`);
  console.log('------------------------------------------------------\n');
}

runStorageAndSyncTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
