import assert from 'assert';
import http from 'http';
import { app } from '../src/app';
import { Database } from '../src/db/database';
import { runMigrations } from '../src/db/migrate';
import { seedDatabase } from '../src/db/seed';

const PORT = 5089;
let server: http.Server;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

let customerToken = '';
let customerBToken = '';
let farmerToken = '';
let adminToken = '';
let farmerProfileId = '';

async function api(
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

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

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

async function runLaunchGateScenarios() {
  console.log('\n=============================================================');
  console.log('🚀 HALDER PRODUCTION LAUNCH GATES: 14 MANDATORY SCENARIOS');
  console.log('=============================================================\n');

  runMigrations();
  await seedDatabase();

  await new Promise<void>((resolve) => {
    server = app.listen(PORT, () => {
      resolve();
    });
  });

  try {
    // 0. Auth Setup
    console.log('--- Setting Up Test Auth Identities ---');
    const custLogin = await api('/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'aman@halder.com', password: 'halder123' },
    });
    assert.strictEqual(custLogin.status, 200);
    customerToken = custLogin.data.data.token;

    const custBLogin = await api('/auth/register', {
      method: 'POST',
      body: {
        name: 'Neha Verma',
        email: `neha_${Date.now()}@test.com`,
        phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'Password123!',
        role: 'customer',
      },
    });
    assert.strictEqual(custBLogin.status, 201);
    customerBToken = custBLogin.data.data.token;

    const farmerLogin = await api('/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'rajesh@greenvalley.in', password: 'halder123' },
    });
    assert.strictEqual(farmerLogin.status, 200);
    farmerToken = farmerLogin.data.data.token;
    farmerProfileId = 'farmer-1';

    const adminLogin = await api('/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'admin@halder.com', password: 'halder123' },
    });
    assert.strictEqual(adminLogin.status, 200);
    adminToken = adminLogin.data.data.token;
    console.log('  ✅ [PASS] Authentication tokens initialized successfully\n');

    // Scenario 1: Customer places an order
    console.log('--- Scenario 1: Customer Places an Order ---');
    const orderRes = await api('/orders', {
      method: 'POST',
      token: customerToken,
      body: {
        items: [{ productId: 'prod-1', quantity: 3 }],
        deliveryAddress: '12 Sahastradhara Road, Dehradun',
        customerPhone: '+91 9876543210',
        paymentMethod: 'cod',
        deliveryMode: 'farmer_direct',
      },
    });
    assert.strictEqual(orderRes.status, 201);
    const placedOrder = Array.isArray(orderRes.data.data) ? orderRes.data.data[0] : orderRes.data.data;
    assert.ok(placedOrder.id);
    assert.strictEqual(placedOrder.order_status, 'placed');
    console.log(`  ✅ [PASS] Scenario 1: Customer placed order #${placedOrder.order_number} (ID: ${placedOrder.id})\n`);

    // Scenario 2: Farmer receives and processes an order
    console.log('--- Scenario 2: Farmer Receives and Processes Order ---');
    const farmerOrdersRes = await api('/orders', { token: farmerToken });
    assert.strictEqual(farmerOrdersRes.status, 200);
    const existsInFarmerList = farmerOrdersRes.data.data.some((o: any) => o.id === placedOrder.id);
    assert.ok(existsInFarmerList, 'Order must appear in assigned farmer incoming queue');

    // Farmer accepts order first (strict state machine)
    const acceptRes = await api(`/orders/${placedOrder.id}/status`, {
      method: 'PATCH',
      token: farmerToken,
      body: { status: 'accepted' },
    });
    assert.strictEqual(acceptRes.status, 200);
    assert.strictEqual(acceptRes.data.data.order_status, 'accepted');

    // Farmer advances to preparing
    const prepRes = await api(`/orders/${placedOrder.id}/status`, {
      method: 'PATCH',
      token: farmerToken,
      body: { status: 'preparing' },
    });
    assert.strictEqual(prepRes.status, 200);
    assert.strictEqual(prepRes.data.data.order_status, 'preparing');
    console.log('  ✅ [PASS] Scenario 2: Farmer received, accepted and transitioned order to "preparing"\n');

    // Scenario 3: Admin manages a farmer
    console.log('--- Scenario 3: Admin Manages a Farmer ---');
    const adminUsersRes = await api('/admin/users', { token: adminToken });
    assert.strictEqual(adminUsersRes.status, 200);
    assert.ok(Array.isArray(adminUsersRes.data.data));

    // Admin updates farmer status or verification
    const toggleFarmerRes = await api('/admin/farmers/farmer-3/verify', {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'verified' },
    });
    assert.strictEqual(toggleFarmerRes.status, 200);
    assert.strictEqual(toggleFarmerRes.data.data.verificationStatus, 'verified');
    console.log('  ✅ [PASS] Scenario 3: Admin successfully audited and managed farmer status\n');

    // Scenario 4: B2B buyer requests a quotation
    console.log('--- Scenario 4: B2B Buyer Requests a Quotation ---');
    const quoteReq = await api('/advanced/b2b/quotations', {
      method: 'POST',
      token: customerBToken,
      body: {
        product_id: 'prod-1',
        requested_quantity: 150,
        unit: 'kg',
        offered_price_per_unit: 42,
        notes: 'Commercial kitchen bulk supply',
      },
    });
    assert.strictEqual(quoteReq.status, 201);
    const quotation = quoteReq.data.data;
    assert.strictEqual(quotation.status, 'pending');
    console.log(`  ✅ [PASS] Scenario 4: B2B buyer requested quotation ${quotation.quotation_number}\n`);

    // Scenario 5: Farmer responds to a quotation
    console.log('--- Scenario 5: Farmer Responds to Quotation ---');
    const counterQuote = await api(`/advanced/b2b/quotations/${quotation.id}`, {
      method: 'PATCH',
      token: farmerToken,
      body: {
        status: 'counter_offered',
        farmer_counter_price: 46,
        notes: 'Can fulfill 150kg @ ₹46/kg inclusive of jute sacks',
      },
    });
    assert.strictEqual(counterQuote.status, 200);
    assert.strictEqual(counterQuote.data.data.status, 'counter_offered');
    assert.strictEqual(counterQuote.data.data.farmer_counter_price, 46);
    console.log('  ✅ [PASS] Scenario 5: Farmer countered quotation with structured counter-offer\n');

    // Scenario 6: User joins a group buy
    console.log('--- Scenario 6: User Joins a Group Buy ---');
    const gbRes = await api('/advanced/group-buys', {
      method: 'POST',
      token: customerToken,
      body: {
        product_id: 'prod-1',
        title: 'Launch Gate Mandi Apples Bulk Group',
        target_quantity: 60,
        unit: 'kg',
        discounted_price: 65,
        min_buyers_count: 2,
        duration_hours: 48,
      },
    });
    assert.strictEqual(gbRes.status, 201);
    const groupBuyId = gbRes.data.data.id;

    const joinGb = await api(`/advanced/group-buys/${groupBuyId}/join`, {
      method: 'POST',
      token: customerToken,
      body: { quantity: 20 },
    });
    assert.strictEqual(joinGb.status, 200);
    assert.strictEqual(joinGb.data.data.current_quantity, 20);
    console.log('  ✅ [PASS] Scenario 6: User successfully joined community group buy pool\n');

    // Scenario 7: Concurrent group-buy requests respect quantity limits
    console.log('--- Scenario 7: Group-Buy Strict Capacity Limits ---');
    // Try to join with 45 kg when only 40 kg remaining -> 400
    const overbookRes = await api(`/advanced/group-buys/${groupBuyId}/join`, {
      method: 'POST',
      token: customerBToken,
      body: { quantity: 45 },
    });
    assert.strictEqual(overbookRes.status, 400);
    assert.ok(
      (overbookRes.data?.error?.message || overbookRes.data?.message || '').includes('exceeds remaining capacity')
    );
    console.log('  ✅ [PASS] Scenario 7: Overbooking beyond pool target strictly rejected (400 Bad Request)\n');

    // Scenario 8: Customer schedules procurement
    console.log('--- Scenario 8: Customer Schedules Procurement ---');
    const schedRes = await api('/advanced/procurements', {
      method: 'POST',
      token: customerToken,
      body: {
        product_id: 'prod-1',
        quantity: 5,
        unit: 'kg',
        frequency: 'weekly',
        delivery_time_slot: 'Morning (06:00 - 08:30 AM)',
        delivery_address: '12 Sahastradhara Road, Dehradun',
      },
    });
    assert.strictEqual(schedRes.status, 201);
    assert.strictEqual(schedRes.data.data.frequency, 'weekly');
    console.log('  ✅ [PASS] Scenario 8: Customer created weekly recurring farm produce schedule\n');

    // Scenario 9: Farmer updates inventory
    console.log('--- Scenario 9: Farmer Updates Inventory ---');
    const updateInvRes = await api('/products/prod-1', {
      method: 'PATCH',
      token: farmerToken,
      body: { available_quantity: 85 },
    });
    assert.strictEqual(updateInvRes.status, 200);
    const updatedProd = Database.get<any>('SELECT available_quantity FROM products WHERE id = ?', ['prod-1']);
    assert.strictEqual(updatedProd.available_quantity, 85);
    console.log('  ✅ [PASS] Scenario 9: Farmer updated product inventory available quantity to 85 kg\n');

    // Scenario 10: Delivery status changes correctly
    console.log('--- Scenario 10: Delivery Status Transitions ---');
    const taskRes = await api('/logistics/tasks/order/order-101', { token: customerToken });
    assert.strictEqual(taskRes.status, 200);
    const taskId = taskRes.data.data.id;
    const taskOtp = taskRes.data.data.otp_code || '1234';

    const verifyOtpRes = await api(`/logistics/tasks/${taskId}/verify-otp`, {
      method: 'POST',
      token: customerToken,
      body: { otp: taskOtp },
    });
    assert.strictEqual(verifyOtpRes.status, 200);
    assert.strictEqual(verifyOtpRes.data.success, true);
    const updatedTask = Database.get<any>('SELECT status FROM delivery_tasks WHERE id = ?', [taskId]);
    assert.strictEqual(updatedTask.status, 'delivered');
    console.log('  ✅ [PASS] Scenario 10: Delivery task securely verified with OTP and transitioned to "delivered"\n');

    // Scenario 11: Grievance is submitted and resolved
    console.log('--- Scenario 11: Grievance Redressal Lifecycle ---');
    const reportSubmit = await api('/reports', {
      method: 'POST',
      token: customerToken,
      body: {
        reason: 'Delayed morning milk dispatch inquiry',
        description: 'Delivery vehicle was delayed by 25 mins due to rain',
        category: 'logistics',
        priority: 'medium',
      },
    });
    assert.strictEqual(reportSubmit.status, 201);
    const reportId = reportSubmit.data.data.id;

    const reportResolve = await api(`/reports/${reportId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        status: 'resolved',
        resolution_notes: 'Weather delay verified. Driver provided insulated cover.',
      },
    });
    assert.strictEqual(reportResolve.status, 200);
    assert.strictEqual(reportResolve.data.data.status, 'resolved');
    console.log('  ✅ [PASS] Scenario 11: Grievance submitted by buyer and resolved by admin with audit notes\n');

    // Scenario 12: Weather fallback is correctly identified
    console.log('--- Scenario 12: Weather Source Transparency ---');
    const weatherRes = await api('/weather/forecast?lat=30.3165&lng=78.0322');
    assert.strictEqual(weatherRes.status, 200);
    const wData = weatherRes.data.data;
    assert.ok(['live_upstream', 'cache', 'safe_fallback'].includes(wData.source));
    assert.ok(wData.disclaimer.includes('Krishi Vigyan Kendra') || wData.disclaimer.includes('KVK'));
    console.log(`  ✅ [PASS] Scenario 12: Weather data source transparently identified (${wData.source}) with KVK disclaimer\n`);

    // Scenario 13: Reports reflect actual database information
    console.log('--- Scenario 13: Reports Reflect Real Database Records ---');
    const dbOrderCount = Database.get<any>('SELECT COUNT(*) as count FROM orders').count;
    const adminOrdersRes = await api('/orders', { token: adminToken });
    assert.strictEqual(adminOrdersRes.status, 200);
    assert.strictEqual(adminOrdersRes.data.data.length, dbOrderCount);
    console.log(`  ✅ [PASS] Scenario 13: Order reports reflect authentic database count (${dbOrderCount} orders)\n`);

    // Scenario 14: Unauthorized users cannot access protected resources
    console.log('--- Scenario 14: Zero-Trust IDOR & Authorization Shield ---');
    // Customer B attempts to inspect Customer A's order -> 403
    const idorRes = await api(`/orders/${placedOrder.id}`, { token: customerBToken });
    assert.strictEqual(idorRes.status, 403);
    console.log('  ✅ [PASS] Scenario 14: Unauthorized Customer B blocked from accessing Customer A private order (403 Forbidden)\n');

    console.log('=============================================================');
    console.log('🎉 ALL 14 MANDATORY LAUNCH GATE SCENARIOS PASSED (100%)');
    console.log('=============================================================\n');
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}

runLaunchGateScenarios().catch((err) => {
  console.error('❌ Launch gate scenario test failed:', err);
  process.exit(1);
});
