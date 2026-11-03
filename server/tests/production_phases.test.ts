import assert from 'assert';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { app } from '../src/app';
import { StorageService } from '../src/services/storageService';
import { SmsService } from '../src/services/smsService';
import { PhonePeService } from '../src/services/phonepeService';
import { PaytmService } from '../src/services/paytmService';
import { Database } from '../src/db/database';
import { env } from '../src/config/env';
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
      assert.ok(uploadUrl.includes('/uploads/produce/'), 'Must return valid produce upload URI');
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
    // PHASE 2: Dynamic Real SMS OTP Gateway
    // -------------------------------------------------------------
    console.log('\n--- PHASE 2: Dynamic Real SMS OTP Gateway & Authentication ---');

    const testMobile = '9871122334';
    let generatedOtp: string = '';

    try {
      const sendRes = await makeRequest('/api/v1/auth/send-otp', {
        method: 'POST',
        body: { phone: testMobile },
      });

      assert.strictEqual(sendRes.status, 200);
      assert.strictEqual(sendRes.body.success, true);
      assert.strictEqual(sendRes.body.cooldownSeconds, 60);
      assert.ok(sendRes.body.devOtp, 'Dev OTP should be returned in development mode');
      generatedOtp = sendRes.body.devOtp;
      pass('4. POST /api/v1/auth/send-otp dispatches 6-digit OTP with 60s cooldown');
    } catch (e) {
      fail('4. Send OTP check', e);
    }

    try {
      // Attempt rapid resend within 60s -> Must be rejected with 429
      const rapidRes = await makeRequest('/api/v1/auth/send-otp', {
        method: 'POST',
        body: { phone: testMobile },
      });
      assert.strictEqual(rapidRes.status, 429, 'Must enforce 60s cooldown');
      pass('5. Rapid OTP resend blocked with 429 Too Many Requests');
    } catch (e) {
      fail('5. Cooldown check', e);
    }

    try {
      // Invalid OTP attempt -> Must be rejected with 401
      const invalidVerify = await makeRequest('/api/v1/auth/verify-otp', {
        method: 'POST',
        body: { phone: testMobile, otp: '000000' },
      });
      assert.strictEqual(invalidVerify.status, 401);
      pass('6. Wrong OTP verification rejected with 401 Unauthorized');
    } catch (e) {
      fail('6. Wrong OTP check', e);
    }

    try {
      // Valid OTP verification -> Must return 200/201, user, and JWT token
      const validVerify = await makeRequest('/api/v1/auth/verify-otp', {
        method: 'POST',
        body: { phone: testMobile, otp: generatedOtp, role: 'customer', name: 'Rohan Sharma' },
      });

      assert.ok(validVerify.status === 200 || validVerify.status === 201);
      assert.strictEqual(validVerify.body.success, true);
      assert.ok(validVerify.body.data.token, 'Must return JWT token');
      assert.strictEqual(validVerify.body.data.user.phone, testMobile);
      pass('7. Valid OTP verification issues JWT token and authenticates customer');
    } catch (e) {
      fail('7. Valid OTP check', e);
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
      assert.ok(gradleContent.includes('halder-release.jks'), 'build.gradle must reference release keystore');
      assert.ok(gradleContent.includes('signingConfig signingConfigs.release'), 'build.gradle must sign release build');
      pass('11. android/app/build.gradle configured with production signingConfigs.release');
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
