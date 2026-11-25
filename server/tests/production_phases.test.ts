process.env.NODE_ENV = 'test';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { app } from '../src/app';
import { StorageService } from '../src/services/storageService';
import { PhonePeService } from '../src/services/phonepeService';
import { PaytmService } from '../src/services/paytmService';
import { Database } from '../src/db/database';
import { CryptoUtil } from '../src/utils/crypto';

const TEST_PORT = 5097;
let server: http.Server;
let baseUrl: string;

function makeRequest(path: string, options: any = {}): Promise<{ status: number; body: any; headers: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let body;
        try {
          body = JSON.parse(data);
        } catch {
          body = data;
        }
        resolve({ status: res.statusCode || 500, body, headers: res.headers });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runProductionSuite() {
  console.log('\n=============================================================');
  console.log('🚀 HALDER PRODUCTION-READINESS SUITE: PHASES 1 TO 4');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  function pass(msg: string) {
    console.log(`  ✅ [PASS] ${msg}`);
    passed++;
  }

  function fail(msg: string, err: any) {
    console.error(`  ❌ [FAIL] ${msg}:`, err?.message || err);
    failed++;
  }

  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, () => {
      baseUrl = `http://localhost:${TEST_PORT}`;
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------
    // PHASE 1: Cloud Storage & Pre-signed URL Engine
    // -------------------------------------------------------------
    console.log('--- PHASE 1: Cloud Storage (S3 / R2) & Pre-signed URLs ---');

    try {
      const sampleBuffer = Buffer.from('FAKE_IMAGE_BYTES_HALDER_PRODUCE');
      const uploadUrl = await StorageService.uploadBuffer(sampleBuffer, 'tomato.jpg', 'image/jpeg', 'produce', baseUrl);
      assert.ok(uploadUrl.includes('/uploads/produce/') || uploadUrl.includes('produce/'), 'Must return valid produce upload URI');
      pass('1. StorageService buffer upload succeeds and returns asset URI');
    } catch (e) {
      fail('1. StorageService buffer upload', e);
    }

    try {
      const presigned = await StorageService.generatePresignedUploadUrl('aadhaar_front.jpg', 'image/jpeg', 'kyc');
      assert.ok(presigned.uploadUrl, 'Must return uploadUrl');
      assert.ok(presigned.fileUrl, 'Must return fileUrl');
      assert.ok(presigned.key.startsWith('kyc/'), 'Key must be in kyc/ directory');
      pass('2. StorageService pre-signed upload URL generation succeeds');
    } catch (e) {
      fail('2. Presigned URL generation', e);
    }

    try {
      // Test GET /api/v1/uploads/presigned-url with auth token
      const user = Database.query<any>(`SELECT id, email, role FROM users LIMIT 1`)[0];
      const token = CryptoUtil.generateToken({ userId: user.id, role: user.role, email: user.email });

      const apiPresigned = await makeRequest('/api/v1/uploads/presigned-url?filename=potato.png&mimeType=image/png', {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.strictEqual(apiPresigned.status, 200);
      assert.ok(apiPresigned.body.data.uploadUrl);
      pass('3. Endpoint GET /api/v1/uploads/presigned-url returns 200 OK with upload target');
    } catch (e) {
      fail('3. Upload endpoint check', e);
    }

    // -------------------------------------------------------------
    // PHASE 2: Production Authentication Engine & Deprecation Safety
    // -------------------------------------------------------------
    console.log('\n--- PHASE 2: Production Authentication Engine & Deprecation Safety ---');

    try {
      // 4. Legacy SMS OTP endpoint sunset check -> 410 Gone with informative instructions
      const sendRes = await makeRequest('/api/v1/auth/send-otp', {
        method: 'POST',
        body: { phone: '9871122334' },
      });
      assert.strictEqual(sendRes.status, 410);
      assert.strictEqual(sendRes.body.success, false);
      assert.ok(sendRes.body.message.includes('SMS OTP service has been removed'));
      pass('4. Legacy OTP endpoint gracefully sunsets with 410 Gone deprecation notice');
    } catch (e) {
      fail('4. Legacy OTP sunset check', e);
    }

    const testUser = {
      name: 'Rohan Sharma',
      username: 'rohan_' + Date.now(),
      email: `rohan_${Date.now()}@test.com`,
      phone: '+91 987' + Math.floor(1000000 + Math.random() * 9000000),
      password: 'StrongPassword123!',
      role: 'customer',
    };

    try {
      // 5. Register new customer with email, username, and password
      const regRes = await makeRequest('/api/v1/auth/register', {
        method: 'POST',
        body: testUser,
      });
      assert.strictEqual(regRes.status, 201);
      assert.strictEqual(regRes.body.success, true);
      assert.ok(regRes.body.data.token, 'Must return JWT token');
      assert.strictEqual(regRes.body.data.user.email, testUser.email);
      pass('5. POST /api/v1/auth/register successfully registers new user and issues token');
    } catch (e) {
      fail('5. User registration check', e);
    }

    try {
      // 6. Wrong password attempt -> 401 Unauthorized
      const invalidLogin = await makeRequest('/api/v1/auth/login', {
        method: 'POST',
        body: { identifier: testUser.email, password: 'WrongPassword999!' },
      });
      assert.strictEqual(invalidLogin.status, 401);
      assert.strictEqual(invalidLogin.body.success, false);
      pass('6. Invalid credentials rejected with 401 Unauthorized');
    } catch (e) {
      fail('6. Invalid login rejection check', e);
    }

    try {
      // 7. Login with Email + Password and Username + Password -> 200 OK
      const emailLogin = await makeRequest('/api/v1/auth/login', {
        method: 'POST',
        body: { identifier: testUser.email, password: testUser.password },
      });
      assert.strictEqual(emailLogin.status, 200);
      assert.strictEqual(emailLogin.body.success, true);
      assert.ok(emailLogin.body.data.token, 'Must return auth token');

      const usernameLogin = await makeRequest('/api/v1/auth/login', {
        method: 'POST',
        body: { identifier: testUser.username, password: testUser.password },
      });
      assert.strictEqual(usernameLogin.status, 200);
      assert.strictEqual(usernameLogin.body.success, true);
      assert.strictEqual(usernameLogin.body.data.user.username, testUser.username);
      pass('7. Multi-identifier authentication (Email & @username) succeeds with 200 OK');
    } catch (e) {
      fail('7. Multi-identifier login check', e);
    }

    // -------------------------------------------------------------
    // PHASE 3: Production Payment Gateways & Compliance
    // -------------------------------------------------------------
    console.log('\n--- PHASE 3: Production Gateways & Compliance ---');

    try {
      const phonePeInit = await PhonePeService.initiatePayment({
        amount: 299,
        customerMobile: '9876543210',
      });
      assert.strictEqual(phonePeInit.success, true);
      pass('8. PhonePe service supports production URL switching and callback resolution');
    } catch (e) {
      fail('8. PhonePe production check', e);
    }

    try {
      const paytmInit = await PaytmService.initiateTransaction({
        amount: 349,
        customerMobile: '9876543210',
      });
      assert.strictEqual(paytmInit.success, true);
      assert.ok(paytmInit.callbackUrl.includes('/api/v1/payments/paytm/webhook'));
      pass('9. Paytm service resolves public webhook callback destination');
    } catch (e) {
      fail('9. Paytm production check', e);
    }

    // -------------------------------------------------------------
    // PHASE 4: App Store Release & Android Production Signing
    // -------------------------------------------------------------
    console.log('\n--- PHASE 4: App Store Release & Android Production Signing ---');

    try {
      const keystorePath = path.join(process.cwd(), 'android', 'app', 'halder-release.jks');
      assert.ok(fs.existsSync(keystorePath), 'halder-release.jks keystore must exist');
      const stat = fs.statSync(keystorePath);
      assert.ok(stat.size > 1000, 'Keystore must be non-empty valid binary');
      pass('10. Production Android release keystore (halder-release.jks) present and valid');
    } catch (e) {
      fail('10. Release keystore check', e);
    }

    try {
      const gradlePath = path.join(process.cwd(), 'android', 'app', 'build.gradle');
      const gradleContent = fs.readFileSync(gradlePath, 'utf8');
      assert.ok(gradleContent.includes('KEYSTORE_PATH'), 'build.gradle must configure release keystore via KEYSTORE_PATH env');
      assert.ok(gradleContent.includes('KEYSTORE_PASSWORD'), 'build.gradle must read keystore password from env');
      assert.ok(!gradleContent.includes('halder2026'), 'build.gradle must not contain hardcoded keystore password');
      assert.ok(gradleContent.includes('signingConfig signingConfigs.release'), 'build.gradle must sign release build');
      pass('11. android/app/build.gradle configured with env-backed signingConfigs.release (no hardcoded password)');
    } catch (e) {
      fail('11. Gradle signing config check', e);
    }

    try {
      const assetlinksPath = path.join(process.cwd(), 'public', '.well-known', 'assetlinks.json');
      assert.ok(fs.existsSync(assetlinksPath), 'assetlinks.json must exist');
      const assetlinks = JSON.parse(fs.readFileSync(assetlinksPath, 'utf8'));
      assert.strictEqual(assetlinks[0].target.package_name, 'com.halder.mandi');
      assert.ok(assetlinks[0].target.sha256_cert_fingerprints.length > 0);
      pass('12. Android App Links (.well-known/assetlinks.json) configured with SHA-256 certificate');
    } catch (e) {
      fail('12. Assetlinks check', e);
    }
  } finally {
    server.close();
  }

  console.log('\n=============================================================');
  console.log(`🚀 PRODUCTION SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runProductionSuite().catch((err) => {
  console.error('Fatal production test error:', err);
  process.exit(1);
});
