import assert from 'assert';
import crypto from 'crypto';
import http from 'http';
import { app } from '../src/app';
import { Database } from '../src/db/database';
import { PaytmService } from '../src/services/paytmService';
import { GPayService } from '../src/services/gpayService';
import { env } from '../src/config/env';
import { CryptoUtil } from '../src/utils/crypto';

const TEST_PORT = 5099;
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

async function runMultiGatewaySuite() {
  console.log('\n=============================================================');
  console.log('💳 HALDER MULTI-GATEWAY SUITE: GPAY & PAYTM INTEGRATION');
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
    // Tier 1: Paytm Checksum Security & Computation
    // -------------------------------------------------------------
    console.log('--- TIER 1: Paytm Checksum Security & Cryptography ---');

    try {
      const testParams = {
        MID: 'TEST_MID_123',
        ORDER_ID: 'ORD_456',
        TXN_AMOUNT: '250.00',
      };
      const key = 'test_secret_key_123';
      const checksum = PaytmService.calculateChecksum(testParams, key);
      assert.strictEqual(typeof checksum, 'string');
      assert.strictEqual(checksum.length, 64, 'HMAC-SHA256 output must be 64 hex characters');

      const isValid = PaytmService.verifyChecksum(testParams, key, checksum);
      assert.strictEqual(isValid, true, 'Checksum verification must succeed on untampered data');

      const tamperedParams = { ...testParams, TXN_AMOUNT: '999.00' };
      const isTamperedValid = PaytmService.verifyChecksum(tamperedParams, key, checksum);
      assert.strictEqual(isTamperedValid, false, 'Checksum verification must fail on modified amount');
      pass('1. Paytm HMAC-SHA256 checksum calculation & timing-safe verification');
    } catch (e) {
      fail('1. Paytm Checksum calculation', e);
    }

    // -------------------------------------------------------------
    // Tier 2: Paytm Transaction Initiation
    // -------------------------------------------------------------
    console.log('\n--- TIER 2: Paytm Transaction Initiation (POST /api/v1/payments/paytm/initiate) ---');

    try {
      const initRes = await makeRequest('/api/v1/payments/paytm/initiate', {
        method: 'POST',
        body: {
          amount: 350.5,
          customerMobile: '9876543210',
        },
      });

      assert.strictEqual(initRes.status, 200);
      assert.strictEqual(initRes.body.success, true);
      assert.ok(initRes.body.data.txnToken.startsWith('PTM_TKN_'), 'txnToken must be generated');
      assert.ok(initRes.body.data.orderId.startsWith('PTM_ORD_'), 'orderId must be generated');
      assert.strictEqual(initRes.body.data.gateway, 'paytm');
      assert.strictEqual(initRes.body.data.amount, 350.5);
      pass('2. Paytm initiation returns 200 OK with valid txnToken and orderId');
    } catch (e) {
      fail('2. Paytm initiation check', e);
    }

    try {
      const negRes = await makeRequest('/api/v1/payments/paytm/initiate', {
        method: 'POST',
        body: { amount: -50 },
      });
      assert.strictEqual(negRes.status, 400);
      pass('3. Negative Paytm amount rejected with 400 Bad Request');
    } catch (e) {
      fail('3. Negative Paytm amount check', e);
    }

    // -------------------------------------------------------------
    // Tier 3: Paytm Status & Webhook
    // -------------------------------------------------------------
    console.log('\n--- TIER 3: Paytm Status & Webhook Processing ---');

    try {
      const statusRes = await makeRequest('/api/v1/payments/paytm/status/PTM_TEST_ORDER_99');
      assert.strictEqual(statusRes.status, 200);
      assert.strictEqual(statusRes.body.success, true);
      assert.strictEqual(statusRes.body.data.status, 'TXN_SUCCESS');
      pass('4. Paytm status query returns 200 OK');
    } catch (e) {
      fail('4. Paytm status query check', e);
    }

    try {
      // Create a dummy order to test webhook update
      const customer = Database.query<any>(`SELECT id, phone, name FROM users WHERE role = 'customer' LIMIT 1`)[0];
      const farmer = Database.query<any>(`SELECT id, user_id FROM farmer_profiles LIMIT 1`)[0];
      const testOrderId = `order-test-paytm-${Date.now()}`;

      Database.run(
        `INSERT INTO orders (id, order_number, customer_id, farmer_id, total_amount, subtotal, delivery_address, customer_phone, customer_name, farmer_name, farm_name, farmer_phone, payment_method, payment_status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          testOrderId,
          `HLD-ORD-PTM-${Date.now()}`,
          customer.id,
          farmer.id,
          420.0,
          420.0,
          'Test Address',
          customer.phone || '9876543210',
          customer.name,
          'Test Farmer',
          'Test Farm',
          '9999999999',
          'paytm',
          'pending',
          `PaytmTxn: PTM-REF-${Date.now()}`,
        ]
      );

      const webhookRes = await makeRequest('/api/v1/payments/paytm/webhook', {
        method: 'POST',
        body: {
          ORDERID: testOrderId,
          TXNID: `PTM-TXN-${Date.now()}`,
          STATUS: 'TXN_SUCCESS',
          RESPCODE: '01',
        },
      });

      assert.strictEqual(webhookRes.status, 200);
      assert.strictEqual(webhookRes.body.success, true);

      // Verify DB update
      const updated = Database.get<any>(`SELECT payment_status, payment_method FROM orders WHERE id = ?`, [testOrderId]);
      assert.strictEqual(updated.payment_status, 'paid');
      assert.strictEqual(updated.payment_method, 'paytm');
      pass('5. Paytm webhook callback marks order payment_status = paid and payment_method = paytm');
    } catch (e) {
      fail('5. Paytm webhook update check', e);
    }

    // -------------------------------------------------------------
    // Tier 4: Google Pay UPI Intent & Deep Link Generation
    // -------------------------------------------------------------
    console.log('\n--- TIER 4: Google Pay (GPay) UPI Intent Generation ---');

    try {
      const gpayRes = await makeRequest('/api/v1/payments/gpay/initiate', {
        method: 'POST',
        body: {
          amount: 520,
          customerMobile: '9876543210',
          farmerUpiId: 'kisan.ramesh@okaxis',
          farmerName: 'Ramesh Singh',
        },
      });

      assert.strictEqual(gpayRes.status, 200);
      assert.strictEqual(gpayRes.body.success, true);
      assert.strictEqual(gpayRes.body.data.gateway, 'gpay');
      assert.ok(gpayRes.body.data.gpayUri.startsWith('tez://upi/pay'), 'Google Pay Tez intent URL must be generated');
      assert.ok(gpayRes.body.data.gpayUri.includes('kisan.ramesh%40okaxis'));
      assert.ok(gpayRes.body.data.standardUpiUri.startsWith('upi://pay'));
      pass('6. Google Pay initiation returns 200 OK with valid tez:// intent URL and standard UPI URI');
    } catch (e) {
      fail('6. Google Pay initiation check', e);
    }

    try {
      const zeroGPay = await makeRequest('/api/v1/payments/gpay/initiate', {
        method: 'POST',
        body: { amount: 0 },
      });
      assert.strictEqual(zeroGPay.status, 400);
      pass('7. Zero Google Pay amount rejected with 400 Bad Request');
    } catch (e) {
      fail('7. Zero GPay amount check', e);
    }

    // -------------------------------------------------------------
    // Tier 5: Google Pay Payment Verification
    // -------------------------------------------------------------
    console.log('\n--- TIER 5: Google Pay Verification (POST /api/v1/payments/gpay/verify) ---');

    try {
      const customer = Database.query<any>(`SELECT id, phone, name FROM users WHERE role = 'customer' LIMIT 1`)[0];
      const farmer = Database.query<any>(`SELECT id, user_id FROM farmer_profiles LIMIT 1`)[0];
      const gpayOrderId = `order-test-gpay-${Date.now()}`;

      Database.run(
        `INSERT INTO orders (id, order_number, customer_id, farmer_id, total_amount, subtotal, delivery_address, customer_phone, customer_name, farmer_name, farm_name, farmer_phone, payment_method, payment_status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          gpayOrderId,
          `HLD-ORD-GPAY-${Date.now()}`,
          customer.id,
          farmer.id,
          310.0,
          310.0,
          'Test Address',
          customer.phone || '9876543210',
          customer.name,
          'Test Farmer',
          'Test Farm',
          '9999999999',
          'gpay',
          'pending',
          `GPayRef: GPAY-${Date.now()}`,
        ]
      );

      const verifyRes = await makeRequest('/api/v1/payments/gpay/verify', {
        method: 'POST',
        body: {
          orderId: gpayOrderId,
          txnRef: 'GPAY-REF-CONFIRMED',
        },
      });

      assert.strictEqual(verifyRes.status, 200);
      assert.strictEqual(verifyRes.body.success, true);
      assert.strictEqual(verifyRes.body.data.status, 'PAID');

      const updated = Database.get<any>(`SELECT payment_status, payment_method FROM orders WHERE id = ?`, [gpayOrderId]);
      assert.strictEqual(updated.payment_status, 'paid');
      assert.strictEqual(updated.payment_method, 'gpay');
      pass('8. Google Pay verify updates order payment_status = paid and payment_method = gpay');
    } catch (e) {
      fail('8. Google Pay verify check', e);
    }

    // -------------------------------------------------------------
    // Tier 6: Direct Order Creation with GPay & Paytm
    // -------------------------------------------------------------
    console.log('\n--- TIER 6: Direct Order Creation with GPay & Paytm ---');

    try {
      const products = Database.query<any>(`SELECT id, price FROM products LIMIT 1`);
      const customer = Database.query<any>(`SELECT id, phone, name, email FROM users WHERE role = 'customer' LIMIT 1`)[0];
      const token = CryptoUtil.generateToken({
        userId: customer.id,
        role: 'customer',
        email: customer.email || 'customer@test.com',
      });

      // 9. Order with paymentMethod = 'gpay'
      const gpayOrderRes = await makeRequest('/api/v1/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          items: [{ productId: products[0].id, quantity: 1 }],
          deliveryAddress: 'Green Glen Layout, Bellandur, Bengaluru',
          customerPhone: customer.phone || '9876543210',
          paymentMethod: 'gpay',
          farmerTip: 15,
        },
      });

      assert.strictEqual(gpayOrderRes.status, 201);
      const createdGPay = Array.isArray(gpayOrderRes.body.data) ? gpayOrderRes.body.data[0] : gpayOrderRes.body.data;
      assert.strictEqual(createdGPay.payment_method, 'gpay');
      assert.strictEqual(createdGPay.payment_status, 'paid');
      pass('9. Order placed with paymentMethod = gpay succeeds with 201 Created and payment_status = paid');

      // 10. Order with paymentMethod = 'paytm'
      const paytmOrderRes = await makeRequest('/api/v1/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          items: [{ productId: products[0].id, quantity: 1 }],
          deliveryAddress: 'Green Glen Layout, Bellandur, Bengaluru',
          customerPhone: customer.phone || '9876543210',
          paymentMethod: 'paytm',
          farmerTip: 20,
        },
      });

      assert.strictEqual(paytmOrderRes.status, 201);
      const createdPaytm = Array.isArray(paytmOrderRes.body.data) ? paytmOrderRes.body.data[0] : paytmOrderRes.body.data;
      assert.strictEqual(createdPaytm.payment_method, 'paytm');
      assert.strictEqual(createdPaytm.payment_status, 'paid');
      pass('10. Order placed with paymentMethod = paytm succeeds with 201 Created and payment_status = paid');
    } catch (e) {
      fail('9 & 10. Direct order creation check', e);
    }
  } finally {
    server.close();
  }

  console.log('\n=============================================================');
  console.log(`💳 MULTI-GATEWAY SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMultiGatewaySuite().catch((err) => {
  console.error('Fatal multi-gateway test error:', err);
  process.exit(1);
});
