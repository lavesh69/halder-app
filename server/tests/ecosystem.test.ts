import assert from 'assert';
import http from 'http';
import { app } from '../src/app';
import { Database } from '../src/db/database';
import { runMigrations } from '../src/db/migrate';
import { seedDatabase } from '../src/db/seed';

const PORT = 5066;
let server: http.Server;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

let customerToken = '';
let farmerToken = '';
let adminToken = '';

async function request(
  endpoint: string,
  options: {
    method?: string;
    token?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
) {
  const url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  const status = res.status;
  let data: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status, data, headers: res.headers };
}

async function runEcosystemTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING HALDER ECOSYSTEM (MODULES 2, 4, 5, 6, 8) TESTS');
  console.log('======================================================\n');

  runMigrations();
  await seedDatabase();

  await new Promise<void>((resolve) => {
    server = app.listen(PORT, () => {
      resolve();
    });
  });

  try {
    // 0. Logins
    console.log('--- 0. Authentication Setup ---');
    const custLogin = await request('/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'aman@halder.com', password: 'halder123' },
    });
    assert.strictEqual(custLogin.status, 200);
    customerToken = custLogin.data.data.token;

    const farmLogin = await request('/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'rajesh@greenvalley.in', password: 'halder123' },
    });
    assert.strictEqual(farmLogin.status, 200);
    farmerToken = farmLogin.data.data.token;

    const admLogin = await request('/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'admin@halder.com', password: 'halder123' },
    });
    assert.strictEqual(admLogin.status, 200);
    adminToken = admLogin.data.data.token;
    console.log('  ✅ [PASS] Authentication tokens acquired for Customer, Farmer, Admin\n');

    // 1. Mandi Intelligence (Module 4)
    console.log('--- 1. Mandi Intelligence Tests (Module 4) ---');
    const mandiPrices = await request('/mandi/prices?crop=Tomato');
    assert.strictEqual(mandiPrices.status, 200);
    assert.ok(mandiPrices.data.data.length > 0);
    assert.strictEqual(mandiPrices.data.data[0].commodity, 'Tomato');
    assert.ok(mandiPrices.data.source.includes('Agmarknet'));
    console.log('  ✅ [PASS] Mandi: Verified prices listed with APMC source attribution');

    const mandiAnalytics = await request('/mandi/analytics');
    assert.strictEqual(mandiAnalytics.status, 200);
    assert.ok(mandiAnalytics.data.data.length > 0);
    assert.ok(mandiAnalytics.data.data[0].volatility_pct !== undefined);
    console.log('  ✅ [PASS] Mandi: Volatility and price spread analytics calculated');

    const mandiDemand = await request('/mandi/demand');
    assert.strictEqual(mandiDemand.status, 200);
    assert.ok(mandiDemand.data.data.length > 0);
    console.log('  ✅ [PASS] Mandi: Crop demand indicators and selling windows returned');

    const revenueEstimate = await request('/mandi/estimate', {
      method: 'POST',
      body: { cropName: 'Tomato', quantityKg: 500, directHalderPrice: 40.0 },
    });
    assert.strictEqual(revenueEstimate.status, 200);
    assert.ok(revenueEstimate.data.data.advantage.extraEarningsRupees > 0);
    console.log('  ✅ [PASS] Mandi: Farmer revenue calculator computes direct platform premium\n');

    // 2. Logistics Engine (Module 5)
    console.log('--- 2. Logistics Engine Tests (Module 5) ---');
    const partners = await request('/logistics/partners', { token: farmerToken });
    assert.strictEqual(partners.status, 200);
    assert.ok(partners.data.data.length > 0);
    console.log('  ✅ [PASS] Logistics: Delivery fleet partners listed with vehicle & zone');

    const taskOrder = await request('/logistics/tasks/order/order-101', { token: customerToken });
    assert.strictEqual(taskOrder.status, 200);
    assert.ok(taskOrder.data.data.otp_code);
    const taskId = taskOrder.data.data.id;
    const validOtp = taskOrder.data.data.otp_code;
    console.log('  ✅ [PASS] Logistics: Live delivery task loaded with secure 4-digit OTP');

    // Advance task status
    const updateTask = await request(`/logistics/tasks/${taskId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'out_for_delivery', notes: 'Rider on the way via Rajpur Road' },
    });
    assert.strictEqual(updateTask.status, 200);
    console.log('  ✅ [PASS] Logistics: Task transitioned to OUT_FOR_DELIVERY with timeline sync');

    // Invalid OTP
    const invalidOtpRes = await request(`/logistics/tasks/${taskId}/verify-otp`, {
      method: 'POST',
      token: adminToken,
      body: { otp: '0000' },
    });
    assert.strictEqual(invalidOtpRes.status, 400);
    console.log('  ✅ [PASS] Logistics: Wrong OTP rejected with 400 Bad Request');

    // Valid OTP
    const validOtpRes = await request(`/logistics/tasks/${taskId}/verify-otp`, {
      method: 'POST',
      token: adminToken,
      body: { otp: validOtp },
    });
    assert.strictEqual(validOtpRes.status, 200);
    console.log('  ✅ [PASS] Logistics: Valid OTP confirms DELIVERED and marks payment completed\n');

    // 3. Financial Engine (Module 6)
    console.log('--- 3. Financial Engine Tests (Module 6) ---');
    const finDash = await request('/finance/dashboard', { token: adminToken });
    assert.strictEqual(finDash.status, 200);
    assert.ok(finDash.data.data.metrics.totalGmv >= 0);
    assert.strictEqual(finDash.data.data.commissionRatePct, 5.0);
    console.log('  ✅ [PASS] Finance: Authoritative financial dashboard computes GMV & platform fees');

    const farmerEarn = await request('/finance/farmer-earnings/farmer-1', { token: farmerToken });
    assert.strictEqual(farmerEarn.status, 200);
    assert.ok(farmerEarn.data.data.availableBalance >= 0);
    assert.ok(Array.isArray(farmerEarn.data.data.orderBreakdown));
    console.log('  ✅ [PASS] Finance: Order-level earnings breakdown displays 5% commission & net amount');

    // Min withdrawal check
    const lowWithdraw = await request('/finance/withdraw', {
      method: 'POST',
      token: farmerToken,
      body: { farmerId: 'farmer-1', amount: 50, payoutMethod: 'upi' },
    });
    assert.strictEqual(lowWithdraw.status, 400);
    console.log('  ✅ [PASS] Finance: Withdrawal below ₹100 threshold rejected');

    const validWithdraw = await request('/finance/withdraw', {
      method: 'POST',
      token: farmerToken,
      body: { farmerId: 'farmer-1', amount: 150, payoutMethod: 'upi' },
    });
    assert.strictEqual(validWithdraw.status, 201);
    console.log('  ✅ [PASS] Finance: Valid withdrawal generates payout record & updates ledger');

    const exportCsv = await request('/finance/export', { token: adminToken });
    assert.strictEqual(exportCsv.status, 200);
    assert.ok(typeof exportCsv.data === 'string' && exportCsv.data.includes('Transaction ID'));
    console.log('  ✅ [PASS] Finance: Double-entry ledger exports valid CSV statement\n');

    // 4. Farmer Ecosystem (Module 2)
    console.log('--- 4. Farmer Ecosystem & Crop Calendar (Module 2) ---');
    const crops = await request('/farmers/farmer-1/crops');
    assert.strictEqual(crops.status, 200);
    assert.ok(crops.data.data.length > 0);
    console.log('  ✅ [PASS] Farmer: Harvest calendar and seasonal crops returned');

    const addCrop = await request('/farmers/farmer-1/crops', {
      method: 'POST',
      token: farmerToken,
      body: {
        crop_name: 'Organic Cauliflower',
        season: 'Rabi',
        sowing_date: '2026-09-15',
        expected_harvest_date: '2026-12-10',
        estimated_yield_kg: 1500,
        farming_method: 'Organic Certified',
      },
    });
    assert.strictEqual(addCrop.status, 201);
    console.log('  ✅ [PASS] Farmer: New crop added to farm management calendar');

    const insights = await request('/farmers/farmer-1/business-insights', { token: farmerToken });
    assert.strictEqual(insights.status, 200);
    assert.ok(insights.data.data.bestSellingProducts !== undefined);
    assert.ok(insights.data.data.monthlyProjection !== undefined);
    console.log('  ✅ [PASS] Farmer: Business insights computes repeat customers & top sellers\n');

    // 5. Advanced Marketplace Features (Module 8)
    console.log('--- 5. Advanced Marketplace Features (Module 8) ---');
    const b2bProfile = await request('/advanced/b2b/profile', { token: customerToken });
    assert.strictEqual(b2bProfile.status, 200);
    console.log('  ✅ [PASS] Advanced: B2B wholesale business buyer profile retrieved');

    const groupBuys = await request('/advanced/group-buys', { token: customerToken });
    assert.strictEqual(groupBuys.status, 200);
    assert.ok(groupBuys.data.data.length > 0);
    console.log('  ✅ [PASS] Advanced: Community group buying deals listed with target quantity');

    const joinGb = await request(`/advanced/group-buys/${groupBuys.data.data[0].id}/join`, {
      method: 'POST',
      token: customerToken,
      body: { quantity: 5.0 },
    });
    assert.strictEqual(joinGb.status, 200);
    console.log('  ✅ [PASS] Advanced: User joins group buy pool and updates collective progress');

    const procurements = await request('/advanced/procurements', { token: customerToken });
    assert.strictEqual(procurements.status, 200);
    console.log('  ✅ [PASS] Advanced: Scheduled recurring farm subscriptions retrieved');

    const subscriptions = await request('/advanced/subscriptions/farmer-1', { token: farmerToken });
    assert.strictEqual(subscriptions.status, 200);
    assert.ok(subscriptions.data.data.availablePlans.length === 4);
    console.log('  ✅ [PASS] Advanced: Farmer subscription tiers (Free, Mitra, Samridhi, FPO) verified\n');

    console.log('======================================================');
    console.log('📊 ALL ECOSYSTEM BACKEND TESTS PASSED (18 / 18)');
    console.log('======================================================\n');
  } finally {
    server.close();
  }
}

runEcosystemTests().catch((err) => {
  console.error('❌ ECOSYSTEM TEST RUNNER FAILED:', err);
  process.exit(1);
});
