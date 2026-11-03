import assert from 'assert';
import crypto from 'crypto';
import http from 'http';
import { app } from '../src/app';
import { Database } from '../src/db/database';
import { PhonePeService } from '../src/services/phonepeService';
import { env } from '../src/config/env';
import { CryptoUtil } from '../src/utils/crypto';

const TEST_PORT = 5098;
let server: http.Server;
let baseUrl: string;

function makeRequest(path: string, options: any = {}): Promise<{ status: number; body: any; headers: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = options.headers || {};
    let body = options.body;

    if (body && typeof body === 'object') {
      body = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }

    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let parsedBody;
          try {
            parsedBody = JSON.parse(rawData);
          } catch {
            parsedBody = rawData;
          }
          resolve({ status: res.statusCode || 500, body: parsedBody, headers: res.headers });
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log('\n=============================================================');
  console.log('📱 HALDER PHONEPE PAYMENT GATEWAY INTEGRATION SUITE');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  function pass(desc: string) {
    passed++;
    console.log(`  ✅ [PASS] ${desc}`);
  }

  function fail(desc: string, err: any) {
    failed++;
    console.error(`  ❌ [FAIL] ${desc}:`, err.message || err);
  }

  server = app.listen(TEST_PORT);
  baseUrl = `http://localhost:${TEST_PORT}`;

  try {
    // -------------------------------------------------------------
    // Tier 1: Checksum & Cryptographic Security
    // -------------------------------------------------------------
    console.log('--- TIER 1: Checksum & Cryptographic Security ---');

    try {
      const payload = 'sample_base64_payload';
      const endpoint = '/pg/v1/pay';
      const saltKey = env.PHONEPE_SALT_KEY;
      const expectedSha256 = crypto.createHash('sha256').update(payload + endpoint + saltKey).digest('hex');
      const expectedChecksum = `${expectedSha256}###${env.PHONEPE_SALT_INDEX}`;

      const computed = PhonePeService.calculateChecksum(payload + endpoint + saltKey);
      assert.strictEqual(computed, expectedChecksum, 'Checksum must match PhonePe specification');
      pass('1. Checksum format complies with SHA256(payload + endpoint + salt)###index');
    } catch (e) {
      fail('1. Checksum generation', e);
    }

    try {
      const testString = 'test_payload_string';
      const validChecksum = PhonePeService.calculateChecksum(testString);
      const isMatch = PhonePeService.verifyChecksum(testString, validChecksum);
      assert.strictEqual(isMatch, true, 'Valid checksum must verify successfully');

      const isTampered = PhonePeService.verifyChecksum('tampered_string', validChecksum);
      assert.strictEqual(isTampered, false, 'Tampered payload must be rejected');
      pass('2. Timing-safe checksum verification accepts valid and rejects tampered strings');
    } catch (e) {
      fail('2. Timing-safe verification', e);
    }

    // -------------------------------------------------------------
    // Tier 2: Payment Initiation API
    // -------------------------------------------------------------
    console.log('\n--- TIER 2: Payment Initiation (POST /api/v1/payments/phonepe/initiate) ---');

    let testMerchantTxnId = '';

    try {
      const res = await makeRequest('/api/v1/payments/phonepe/initiate', {
        method: 'POST',
        body: {
          amount: 350,
          customerMobile: '9876543210',
          redirectUrl: 'http://localhost:5173/payment/callback',
        },
      });

      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.gateway, 'phonepe');
      assert.strictEqual(res.body.data.amount, 350);
      assert.strictEqual(res.body.data.amountInPaise, 35000);
      assert.ok(res.body.data.merchantTransactionId.startsWith('MT-HLD-'));
      assert.ok(res.body.data.redirectUrl.length > 0);

      testMerchantTxnId = res.body.data.merchantTransactionId;
      pass('3. Initiate PhonePe payment returns 200 OK with MT-HLD- reference and redirect URL');
    } catch (e) {
      fail('3. Initiate payment', e);
    }

    try {
      const res = await makeRequest('/api/v1/payments/phonepe/initiate', {
        method: 'POST',
        body: {
          amount: -50,
        },
      });
      assert.strictEqual(res.status, 400, 'Negative amount must return 400 Bad Request');
      pass('4. Negative payment amount rejected with 400 Bad Request');
    } catch (e) {
      fail('4. Negative amount check', e);
    }

    try {
      const res = await makeRequest('/api/v1/payments/phonepe/initiate', {
        method: 'POST',
        body: {
          amount: 0,
        },
      });
      assert.strictEqual(res.status, 400, 'Zero amount must return 400 Bad Request');
      pass('5. Zero payment amount rejected with 400 Bad Request');
    } catch (e) {
      fail('5. Zero amount check', e);
    }

    // -------------------------------------------------------------
    // Tier 3: Query Transaction Status
    // -------------------------------------------------------------
    console.log('\n--- TIER 3: Query Status (GET /api/v1/payments/phonepe/status/:id) ---');

    try {
      const res = await makeRequest(`/api/v1/payments/phonepe/status/${testMerchantTxnId}`);
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.merchantTransactionId, testMerchantTxnId);
      pass('6. Query PhonePe status returns 200 OK with transaction metadata');
    } catch (e) {
      fail('6. Query status', e);
    }

    // -------------------------------------------------------------
    // Tier 4: Server-to-Server Webhook Processing & Order Settlement
    // -------------------------------------------------------------
    console.log('\n--- TIER 4: Server Webhook Processing & DB Updates ---');

    // Seed test order for webhook testing
    const testOrderId = `order-phonepe-${Date.now()}`;
    const testWebhookTxnId = `MT-HLD-${Date.now()}-TEST`;
    const userRow = Database.get<any>(`SELECT id FROM users WHERE role = 'customer' LIMIT 1`);
    const customerId = userRow ? userRow.id : 'user-cust-1';

    Database.run(
      `INSERT INTO orders (
        id, order_number, customer_id, customer_name, customer_phone,
        farmer_id, farmer_name, farm_name, farmer_phone,
        delivery_address, subtotal, delivery_fee, farmer_tip, total_amount,
        payment_method, payment_status, order_status, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        testOrderId,
        `#HD${Math.floor(1000 + Math.random() * 9000)}`,
        customerId,
        'Simulated Buyer',
        '9876543210',
        'farmer-1',
        'Rajesh Kumar',
        'Green Valley Farm',
        '9876500000',
        'House 12, Civil Lines, Dehradun',
        300,
        25,
        10,
        335,
        'phonepe',
        'pending',
        'placed',
        `[PhonePeTxn: ${testWebhookTxnId}]`,
      ]
    );

    try {
      const webhookPayload = {
        success: true,
        code: 'PAYMENT_SUCCESS',
        message: 'Payment Successful',
        data: {
          merchantId: env.PHONEPE_MERCHANT_ID,
          merchantTransactionId: testWebhookTxnId,
          transactionId: `T${Date.now()}`,
          amount: 34000,
          state: 'COMPLETED',
          responseCode: 'SUCCESS',
        },
      };

      const base64Response = Buffer.from(JSON.stringify(webhookPayload)).toString('base64');
      const webhookChecksum = PhonePeService.calculateChecksum(base64Response + env.PHONEPE_SALT_KEY);

      const res = await makeRequest('/api/v1/payments/phonepe/webhook', {
        method: 'POST',
        headers: {
          'x-verify': webhookChecksum,
        },
        body: {
          response: base64Response,
        },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);

      // Verify SQLite state update
      const updatedOrder = Database.get<any>(`SELECT payment_status, payment_method FROM orders WHERE id = ?`, [
        testOrderId,
      ]);
      assert.strictEqual(updatedOrder.payment_status, 'paid', 'Order payment_status must update to paid');
      assert.strictEqual(updatedOrder.payment_method, 'phonepe', 'Order payment_method must be phonepe');
      pass('7. Webhook callback with valid signature marks order payment_status = paid');
    } catch (e) {
      fail('7. Webhook processing', e);
    }

    try {
      const invalidWebhookRes = await makeRequest('/api/v1/payments/phonepe/webhook', {
        method: 'POST',
        body: {
          malformed: true,
        },
      });
      assert.strictEqual(invalidWebhookRes.status, 400, 'Malformed webhook payload must return 400');
      pass('8. Malformed webhook payload rejected with 400 Bad Request');
    } catch (e) {
      fail('8. Malformed webhook check', e);
    }

    // -------------------------------------------------------------
    // Tier 5: Direct Order Creation with PhonePe
    // -------------------------------------------------------------
    console.log('\n--- TIER 5: Direct Order Creation with PhonePe ---');

    try {
      const products = Database.query<any>(`SELECT id, price FROM products LIMIT 1`);
      if (products.length > 0) {
        const prod = products[0];
        const users = Database.query<any>(`SELECT id, phone, name FROM users WHERE role = 'customer' LIMIT 1`);
        const customer = users[0];

        // Create auth token for user
        const token = CryptoUtil.generateToken({
          userId: customer.id,
          role: 'customer',
          email: customer.email || 'customer@test.com',
        });

        const orderRes = await makeRequest('/api/v1/orders', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: {
            items: [{ productId: prod.id, quantity: 2 }],
            deliveryAddress: 'House 5, Rajpur Road, Dehradun',
            customerPhone: customer.phone || '9876543210',
            paymentMethod: 'phonepe',
            farmerTip: 10,
          },
        });

        assert.strictEqual(orderRes.status, 201, `Expected 201, got ${orderRes.status}`);
        const createdOrder = Array.isArray(orderRes.body.data) ? orderRes.body.data[0] : orderRes.body.data;
        assert.strictEqual(createdOrder.payment_method, 'phonepe');
        assert.strictEqual(createdOrder.payment_status, 'paid');
        pass('9. Placing order with paymentMethod = phonepe succeeds with 201 Created and payment_status = paid');
      } else {
        pass('9. Skipping product test: no products in DB');
      }
    } catch (e) {
      fail('9. PhonePe order creation', e);
    }
  } finally {
    server.close();
  }

  console.log('\n=============================================================');
  console.log(`📱 PHONEPE SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
