import { app } from '../src/app';
import { Database } from '../src/db/database';
import { CryptoUtil } from '../src/utils/crypto';
import { v4 as uuidv4 } from 'uuid';

const PORT = 5098;
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

async function runFarmerEarningsTests() {
  console.log('\n=============================================================');
  console.log('🌾 HALDER REAL FARMER EARNINGS & BANK/UPI SETTLEMENT TEST');
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
    // 1. Setup Test Farmer & Seed Delivered Orders
    // -------------------------------------------------------------
    console.log('--- 1. Seed Real Delivered Orders for Test Farmer ---');
    const farmerUserId = `user-farmer-earn-${Date.now()}`;
    const farmerProfileId = `farmer-earn-${Date.now()}`;
    const farmerHalderId = `HAL-FRM-${Math.floor(90000000 + Math.random() * 9000000)}`;
    const farmerPhone = `+91 9999${Math.floor(100000 + Math.random() * 900000)}`;
    const farmerEmail = `kisan.earn.${Date.now()}@halder.com`;
    const now = new Date().toISOString();

    Database.run(
      `INSERT INTO users (id, halder_id, name, phone, email, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, 'Test Kisan Earn', ?, ?, 'testpasshash123', 'farmer', 'active', ?, ?)`,
      [farmerUserId, farmerHalderId, farmerPhone, farmerEmail, now, now]
    );

    Database.run(
      `INSERT INTO farmer_profiles (
        id, user_id, farm_name, description, location, city, verification_status,
        rating, total_orders, joined_year, created_at, updated_at
      ) VALUES (?, ?, 'Kisan Green Farm', 'Organic Farm', 'Doon Agro', 'Dehradun', 'verified', 5.0, 3, 2024, ?, ?)`,
      [farmerProfileId, farmerUserId, now, now]
    );

    const farmerToken = CryptoUtil.generateToken({
      userId: farmerUserId,
      role: 'farmer',
      email: 'kisan.earn@halder.com',
      farmerProfileId,
    });

    // Seed 2 delivered orders: Order 1 = ₹350 (subtotal 300, delivery 40, tip 10), Order 2 = ₹250 (subtotal 225, delivery 25, tip 0)
    const order1Id = `order-earn-1-${Date.now()}`;
    const order2Id = `order-earn-2-${Date.now()}`;

    Database.run(
      `INSERT INTO orders (
        id, order_number, customer_id, farmer_id, total_amount, subtotal,
        delivery_fee, farmer_tip, delivery_address, customer_phone,
        customer_name, farmer_name, farm_name, farmer_phone, payment_method, payment_status,
        order_status, created_at, updated_at
      ) VALUES (?, '#HD8001', 'user-cust-1', ?, 350.0, 300.0, 40.0, 10.0, 'Doon Rd', '+91 9876543210', 'Aman', 'Test Kisan Earn', 'Kisan Green Farm', '+91 9999000001', 'upi', 'paid', 'delivered', ?, ?)`,
      [order1Id, farmerProfileId, now, now]
    );

    Database.run(
      `INSERT INTO orders (
        id, order_number, customer_id, farmer_id, total_amount, subtotal,
        delivery_fee, farmer_tip, delivery_address, customer_phone,
        customer_name, farmer_name, farm_name, farmer_phone, payment_method, payment_status,
        order_status, created_at, updated_at
      ) VALUES (?, '#HD8002', 'user-cust-1', ?, 250.0, 225.0, 25.0, 0.0, 'Doon Rd', '+91 9876543210', 'Aman', 'Test Kisan Earn', 'Kisan Green Farm', '+91 9999000001', 'cod', 'paid', 'delivered', ?, ?)`,
      [order2Id, farmerProfileId, now, now]
    );

    // -------------------------------------------------------------
    // 2. Test Dynamic Earnings API
    // -------------------------------------------------------------
    console.log('\n--- 2. Verify Live Calculated Earnings Endpoint ---');
    const earnRes = await request(`/farmers/${farmerProfileId}/earnings`, {
      token: farmerToken,
    });

    assert('GET /earnings returns 200 OK', earnRes.status === 200);
    const earnData = earnRes.json.data;
    assert('Delivered orders count matches seeded (2 orders)', earnData.totalDeliveredCount === 2);
    assert('Lifetime earnings correctly aggregates (350 + 250 = ₹600)', earnData.lifetimeEarnings === 600);
    assert('100% Kisan Delivery fee earned aggregates (40 + 25 = ₹65)', earnData.totalDeliveryFeeEarned === 65);
    assert('Customer tips earned aggregates (₹10)', earnData.totalTipsReceived === 10);
    assert('Today earnings matches ₹600', earnData.todayEarnings === 600);
    assert('Available balance is ₹600 before withdrawals', earnData.availableBalance === 600);
    assert('Weekly breakdown returns 7-day trend array', Array.isArray(earnData.weeklyBreakdown) && earnData.weeklyBreakdown.length === 7);
    assert('Bank details initially not configured', earnData.bankDetails.isConfigured === false);

    // -------------------------------------------------------------
    // 3. Test Bank & UPI Settings Setup & Validation
    // -------------------------------------------------------------
    console.log('\n--- 3. Bank & UPI Payout Settings & Validation ---');

    // Reject invalid IFSC
    const badIfscRes = await request(`/farmers/${farmerProfileId}/payout-settings`, {
      method: 'PUT',
      token: farmerToken,
      body: {
        bankIfsc: 'BAD_IFSC_123',
      },
    });
    assert('Bad IFSC rejected with 400 Bad Request', badIfscRes.status === 400);

    // Reject invalid UPI
    const badUpiRes = await request(`/farmers/${farmerProfileId}/payout-settings`, {
      method: 'PUT',
      token: farmerToken,
      body: {
        upiId: 'no_at_sign_upi',
      },
    });
    assert('Bad UPI ID format rejected with 400 Bad Request', badUpiRes.status === 400);

    // Save valid UPI and Bank details
    const goodSettingsRes = await request(`/farmers/${farmerProfileId}/payout-settings`, {
      method: 'PUT',
      token: farmerToken,
      body: {
        upiId: 'testkisan@sbi',
        bankAccountName: 'Test Kisan Earn',
        bankName: 'State Bank of India',
        bankAccountNumber: '987654321012',
        bankIfsc: 'SBIN0001234',
      },
    });
    assert('Valid Bank & UPI settings accepted with 200 OK', goodSettingsRes.status === 200);
    assert('Bank details flagged as configured', goodSettingsRes.json.data.isConfigured === true);
    assert('Saved UPI ID matches', goodSettingsRes.json.data.upiId === 'testkisan@sbi');

    // -------------------------------------------------------------
    // 4. Test Real Withdrawal & Balance Settlement
    // -------------------------------------------------------------
    console.log('\n--- 4. Real Withdrawal Request & Available Balance Check ---');

    // Reject overdrawing
    const overdrawRes = await request(`/farmers/${farmerProfileId}/withdraw`, {
      method: 'POST',
      token: farmerToken,
      body: {
        amount: 1500, // Available is only 600
      },
    });
    assert('Withdrawal exceeding available balance rejected with 400 Bad Request', overdrawRes.status === 400);

    // Successful partial withdrawal of ₹300
    const withdrawRes = await request(`/farmers/${farmerProfileId}/withdraw`, {
      method: 'POST',
      token: farmerToken,
      body: {
        amount: 300,
        method: 'upi',
      },
    });
    assert('Valid withdrawal processed with 201 Created', withdrawRes.status === 201);
    assert('Withdrawal reference generated (SETTLE-HLD-XXXXXX)', withdrawRes.json.data.reference.startsWith('SETTLE-HLD-'));
    assert('Available balance decremented accurately to ₹300', withdrawRes.json.data.availableBalance === 300);

    // Re-verify earnings reflects remaining balance
    const updatedEarnRes = await request(`/farmers/${farmerProfileId}/earnings`, {
      token: farmerToken,
    });
    assert('Earnings available balance updated in DB to ₹300', updatedEarnRes.json.data.availableBalance === 300);
    assert('Total withdrawn records ₹300', updatedEarnRes.json.data.totalWithdrawn === 300);
    assert('Payout ledger contains the processed transaction', updatedEarnRes.json.data.payoutLedger.length >= 1);

    // -------------------------------------------------------------
    // 5. Zero-Trust Security: Farmer B cannot withdraw Farmer A funds
    // -------------------------------------------------------------
    console.log('\n--- 5. Zero-Trust Security & Authorization ---');
    const farmerBToken = CryptoUtil.generateToken({
      userId: 'user-farm-2',
      role: 'farmer',
      email: 'priya@halder.com',
      farmerProfileId: 'farmer-2',
    });

    const unauthorizedWithdrawRes = await request(`/farmers/${farmerProfileId}/withdraw`, {
      method: 'POST',
      token: farmerBToken,
      body: { amount: 100 },
    });
    assert('Farmer B cannot withdraw Farmer A funds (403 Forbidden)', unauthorizedWithdrawRes.status === 403);

    const unauthorizedSettingsRes = await request(`/farmers/${farmerProfileId}/payout-settings`, {
      method: 'PUT',
      token: farmerBToken,
      body: { upiId: 'attacker@upi' },
    });
    assert('Farmer B cannot alter Farmer A payout settings (403 Forbidden)', unauthorizedSettingsRes.status === 403);

    // Clean up temporary test records
    Database.run('DELETE FROM payout_records WHERE farmer_id = ?', [farmerProfileId]);
    Database.run('DELETE FROM orders WHERE id IN (?, ?)', [order1Id, order2Id]);
    Database.run('DELETE FROM farmer_profiles WHERE id = ?', [farmerProfileId]);
    Database.run('DELETE FROM users WHERE id = ?', [farmerUserId]);

  } catch (err) {
    console.error('Farmer Earnings Test Error:', err);
    failed++;
  } finally {
    server.close();
    console.log('\n=============================================================');
    console.log(`🌾 FARMER EARNINGS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('=============================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runFarmerEarningsTests();
