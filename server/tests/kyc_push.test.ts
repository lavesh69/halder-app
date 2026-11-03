import { app } from '../src/app';
import { Database } from '../src/db/database';
import { CryptoUtil } from '../src/utils/crypto';

const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

let server: any;

async function request(endpoint: string, options: {
  method?: string;
  token?: string;
  body?: any;
} = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const status = res.status;
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return { status, json };
}

async function runKycAndPushTests() {
  console.log('\n=============================================================');
  console.log('📄 HALDER FARMER KYC & MOBILE BACKGROUND PUSH (FCM) TEST');
  console.log('=============================================================\n');

  server = app.listen(PORT);

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, extra?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${extra ? `(${extra})` : ''}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // 1. Seed Test Farmer & Admin Users
    // -------------------------------------------------------------
    console.log('--- 1. Seed Users & Setup Tokens ---');
    const farmerUserId = `user-kyc-${Date.now()}`;
    const farmerProfileId = `farmer-kyc-${Date.now()}`;
    const adminUserId = `admin-kyc-${Date.now()}`;
    const now = new Date().toISOString();

    Database.run(
      `INSERT INTO users (id, halder_id, name, phone, email, password_hash, role, status, created_at, updated_at)
       VALUES (?, 'HAL-FRM-88880001', 'Test Kisan KYC', '+91 8888000001', 'kisan.kyc@halder.com', 'passhash', 'farmer', 'active', ?, ?)`,
      [farmerUserId, now, now]
    );

    Database.run(
      `INSERT INTO farmer_profiles (
        id, user_id, farm_name, description, location, city, verification_status,
        rating, total_orders, joined_year, created_at, updated_at
      ) VALUES (?, ?, 'Organic Valley Farm', 'Organic Harvest', 'Rishikesh Rd', 'Dehradun', 'pending', 5.0, 0, 2024, ?, ?)`,
      [farmerProfileId, farmerUserId, now, now]
    );

    Database.run(
      `INSERT INTO users (id, halder_id, name, phone, email, password_hash, role, status, created_at, updated_at)
       VALUES (?, 'HAL-ADM-88880001', 'Test Superadmin', '+91 8888000002', 'superadmin.kyc@halder.com', 'passhash', 'admin', 'active', ?, ?)`,
      [adminUserId, now, now]
    );

    const farmerToken = CryptoUtil.generateToken({
      userId: farmerUserId,
      role: 'farmer',
      email: 'kisan.kyc@halder.com',
      farmerProfileId,
    });

    const adminToken = CryptoUtil.generateToken({
      userId: adminUserId,
      role: 'admin',
      email: 'superadmin.kyc@halder.com',
    });

    const farmerBToken = CryptoUtil.generateToken({
      userId: 'user-farm-2',
      role: 'farmer',
      email: 'priya@halder.com',
      farmerProfileId: 'farmer-2',
    });

    // -------------------------------------------------------------
    // 2. Test Farmer KYC Submission & Validation
    // -------------------------------------------------------------
    console.log('\n--- 2. Farmer KYC Submission & Document Validation ---');

    // Reject bad document type
    const badDocTypeRes = await request(`/farmers/${farmerProfileId}/kyc`, {
      method: 'POST',
      token: farmerToken,
      body: {
        documentType: 'invalid_doc',
        documentNumber: '12345678',
        documentUrl: 'https://example.com/doc.jpg',
      },
    });
    assert('Invalid document type rejected (400)', badDocTypeRes.status === 400);

    // Reject missing document number
    const missingNumRes = await request(`/farmers/${farmerProfileId}/kyc`, {
      method: 'POST',
      token: farmerToken,
      body: {
        documentType: 'aadhaar',
        documentNumber: '12', // too short
        documentUrl: 'https://example.com/doc.jpg',
      },
    });
    assert('Short/missing document number rejected (400)', missingNumRes.status === 400);

    // Reject missing document URL
    const missingUrlRes = await request(`/farmers/${farmerProfileId}/kyc`, {
      method: 'POST',
      token: farmerToken,
      body: {
        documentType: 'aadhaar',
        documentNumber: '5420-1234-5678',
        documentUrl: '',
      },
    });
    assert('Missing document certificate URL rejected (400)', missingUrlRes.status === 400);

    // Submit valid Aadhaar Card KYC
    const validKycRes = await request(`/farmers/${farmerProfileId}/kyc`, {
      method: 'POST',
      token: farmerToken,
      body: {
        documentType: 'aadhaar',
        documentNumber: '5420-1234-5678',
        documentUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600',
      },
    });
    assert('Valid Aadhaar KYC accepted with 201 Created', validKycRes.status === 201);
    assert('Status is marked pending review', validKycRes.json.data.verificationStatus === 'pending');

    // Verify KYC status retrieval
    const getKycRes = await request(`/farmers/${farmerProfileId}/kyc`, {
      token: farmerToken,
    });
    assert('GET /farmers/:id/kyc returns 200 OK', getKycRes.status === 200);
    assert('Document number is masked for privacy', getKycRes.json.data.documentNumber.startsWith('••••••••'));
    assert('Document type returned accurately', getKycRes.json.data.documentType === 'aadhaar');

    // IDOR check: Farmer B cannot submit KYC for Farmer A
    const idorKycRes = await request(`/farmers/${farmerProfileId}/kyc`, {
      method: 'POST',
      token: farmerBToken,
      body: {
        documentType: 'kisan_credit_card',
        documentNumber: 'KCC-9845012',
        documentUrl: 'https://example.com/kcc.jpg',
      },
    });
    assert('Farmer B cannot submit KYC for Farmer A (403 Forbidden)', idorKycRes.status === 403);

    // -------------------------------------------------------------
    // 3. Admin KYC Queue & Review Workflow
    // -------------------------------------------------------------
    console.log('\n--- 3. Admin KYC Verification Review ---');

    // Admin lists pending submissions
    const pendingListRes = await request('/admin/kyc/pending', {
      token: adminToken,
    });
    assert('Admin can fetch pending KYC queue (200 OK)', pendingListRes.status === 200);
    const foundInQueue = pendingListRes.json.data.find((f: any) => f.id === farmerProfileId);
    assert('Farmer appears in pending queue', Boolean(foundInQueue));
    assert('Document proof details visible to admin', foundInQueue?.kyc_document_number === '5420-1234-5678');

    // Non-admin blocked from KYC queue
    const nonAdminQueueRes = await request('/admin/kyc/pending', {
      token: farmerToken,
    });
    assert('Non-admin cannot access admin KYC queue (403 Forbidden)', nonAdminQueueRes.status === 403);

    // Admin approval
    const approveRes = await request(`/admin/farmers/${farmerProfileId}/kyc`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        decision: 'verified',
      },
    });
    assert('Admin approval sets verification_status = verified (200 OK)', approveRes.status === 200 && approveRes.json.data.verificationStatus === 'verified');

    // Verify DB updated
    const farmerDb = Database.get<any>('SELECT verification_status FROM farmer_profiles WHERE id = ?', [farmerProfileId]);
    assert('Farmer profile status in DB is verified', farmerDb.verification_status === 'verified');

    // Verify Notification generated for farmer
    const farmerNotifs = Database.query<any>('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [farmerUserId]);
    assert('Farmer received KYC verification notification', farmerNotifs.some((n: any) => n.title.includes('Verified')));

    // -------------------------------------------------------------
    // 4. Mobile Background Push Notifications (FCM / Device Tokens)
    // -------------------------------------------------------------
    console.log('\n--- 4. Mobile Device Push Token Registration & Push Triggers ---');

    // Register Web token
    const regWebTokenRes = await request('/notifications/device-token', {
      method: 'POST',
      token: farmerToken,
      body: {
        token: 'fcm-token-web-' + Date.now(),
        platform: 'web',
        deviceName: 'Chrome on Desktop',
      },
    });
    assert('Register web device push token returns 201 Created', regWebTokenRes.status === 201);

    // Register Android mobile token
    const regAndroidTokenRes = await request('/notifications/device-token', {
      method: 'POST',
      token: farmerToken,
      body: {
        token: 'fcm-token-android-' + Date.now(),
        platform: 'android',
        deviceName: 'Samsung Galaxy A54 (Capacitor Android)',
      },
    });
    assert('Register android mobile device token returns 201 Created', regAndroidTokenRes.status === 201);

    // Verify tokens saved in DB
    const tokens = Database.query<any>('SELECT * FROM device_tokens WHERE user_id = ? AND active = 1', [farmerUserId]);
    assert('Both Web and Android device tokens saved in DB', tokens.length === 2);

    // Test send push notification trigger
    const testPushRes = await request('/notifications/test-push', {
      method: 'POST',
      token: farmerToken,
      body: {
        title: '🔔 Harvest Dispatch Alert',
        message: 'Your order #HD9901 has been dispatched via Kisan Fleet.',
      },
    });
    assert('POST /notifications/test-push succeeds (200 OK)', testPushRes.status === 200);
    assert('Push notification inserted into notifications table', testPushRes.json.data.title.includes('Harvest Dispatch'));

    // Clean up test data
    Database.run('DELETE FROM device_tokens WHERE user_id = ?', [farmerUserId]);
    Database.run('DELETE FROM notifications WHERE user_id = ?', [farmerUserId]);
    Database.run('DELETE FROM farmer_profiles WHERE id = ?', [farmerProfileId]);
    Database.run('DELETE FROM users WHERE id IN (?, ?)', [farmerUserId, adminUserId]);

  } catch (err) {
    console.error('KYC and Push Test Error:', err);
    failed++;
  } finally {
    console.log('\n=============================================================');
    console.log(`📄 KYC & PUSH SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('=============================================================\n');
    try {
      server.closeAllConnections?.();
      server.close();
    } catch {}
    process.exit(failed > 0 ? 1 : 0);
  }
}

runKycAndPushTests();
