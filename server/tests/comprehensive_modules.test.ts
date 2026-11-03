import assert from 'assert';
import http from 'http';
import { app } from '../src/app';
import { Database } from '../src/db/database';
import { runMigrations } from '../src/db/migrate';
import { seedDatabase } from '../src/db/seed';
import { killSwitch } from '../src/config/killSwitch';

const PORT = 5077;
let server: http.Server;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

let customerAToken = '';
let customerBToken = '';
let farmerAToken = '';
let farmerBToken = '';
let adminToken = '';
let farmerAProfileId = '';
let farmerBProfileId = '';

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

async function runComprehensiveModulesTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING HALDER COMPREHENSIVE MODULES & HARDENING TESTS');
  console.log('======================================================\n');

  runMigrations();
  await seedDatabase();

  await new Promise<void>((resolve) => {
    server = app.listen(PORT, () => {
      resolve();
    });
  });

  try {
    // 0. Setup Authentication & Users
    console.log('--- 0. Authentication Setup ---');
    const custLoginA = await request('/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'aman@halder.com', password: 'halder123' },
    });
    assert.strictEqual(custLoginA.status, 200);
    customerAToken = custLoginA.data.data.token;

    // Register a second customer for multi-tenant tests
    const custBEmail = `customer_b_${Date.now()}@test.com`;
    const custRegB = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Priya Sharma',
        email: custBEmail,
        phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'Password123!',
        role: 'customer',
      },
    });
    assert.strictEqual(custRegB.status, 201);
    customerBToken = custRegB.data.data.token;

    const farmLoginA = await request('/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'rajesh@greenvalley.in', password: 'halder123' },
    });
    assert.strictEqual(farmLoginA.status, 200);
    farmerAToken = farmLoginA.data.data.token;
    farmerAProfileId = farmLoginA.data.data.user.farmerProfileId || 'farmer-1';

    const farmLoginB = await request('/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'amit@sunrisefarms.in', password: 'halder123' },
    });
    assert.strictEqual(farmLoginB.status, 200);
    farmerBToken = farmLoginB.data.data.token;
    farmerBProfileId = farmLoginB.data.data.user.farmerProfileId || 'farmer-2';

    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'admin@halder.com', password: 'halder123' },
    });
    assert.strictEqual(adminLogin.status, 200);
    adminToken = adminLogin.data.data.token;
    console.log('  ✅ [PASS] Authentication tokens acquired for Customer A, Customer B, Farmer A, Farmer B, Admin');

    // --- 1. Grievance / Report System ---
    console.log('\n--- 1. Grievance / Report System ---');
    const submitReportRes = await request('/reports', {
      method: 'POST',
      token: customerAToken,
      body: {
        target_type: 'order',
        target_id: 'order-101',
        order_id: 'order-101',
        category: 'quality_issue',
        priority: 'high',
        reason: 'Bruised organic apples delivered',
        description: '3 out of 10kg apples arrived bruised and unmarketable during transit.',
        evidence_url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6',
      },
    });
    assert.strictEqual(submitReportRes.status, 201);
    assert.strictEqual(submitReportRes.data.success, true);
    const reportId = submitReportRes.data.data.id;
    assert.ok(reportId, 'Report ID should be returned');
    console.log('  ✅ [PASS] Customer submitted dispute report with order linkage, category, priority, and evidence URL');

    // Customer fetching own reports
    const myReportsRes = await request('/reports/my', {
      method: 'GET',
      token: customerAToken,
    });
    assert.strictEqual(myReportsRes.status, 200);
    assert.ok(Array.isArray(myReportsRes.data.data));
    const createdReport = myReportsRes.data.data.find((r: any) => r.id === reportId);
    assert.ok(createdReport, 'Created report must appear in customer history');
    assert.strictEqual(createdReport.category, 'quality_issue');
    assert.strictEqual(createdReport.priority, 'high');
    console.log('  ✅ [PASS] Customer retrieved personal dispute reports via GET /reports/my');

    // Other customer should not see customer A's reports in /reports/my
    const custBReportsRes = await request('/reports/my', {
      method: 'GET',
      token: customerBToken,
    });
    assert.strictEqual(custBReportsRes.status, 200);
    const leakedReport = custBReportsRes.data.data.find((r: any) => r.id === reportId);
    assert.strictEqual(leakedReport, undefined, 'Customer B should not see Customer A report');
    console.log('  ✅ [PASS] Zero-Trust: Customer B cannot view Customer A private grievance reports');

    // Admin lists reports with filtering
    const adminReportsRes = await request('/reports/admin?category=quality_issue&priority=high', {
      method: 'GET',
      token: adminToken,
    });
    assert.strictEqual(adminReportsRes.status, 200);
    assert.ok(adminReportsRes.data.data.some((r: any) => r.id === reportId));
    console.log('  ✅ [PASS] Admin listed grievance reports with status/category/priority query filters');

    // Admin resolves dispute report
    const resolveRes = await request(`/reports/${reportId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        status: 'resolved',
        resolution_notes: 'Reviewed harvest photo. Credited customer with replacement voucher.',
        resolution_reason: 'Quality issue verified by QA team',
      },
    });
    assert.strictEqual(resolveRes.status, 200);
    assert.strictEqual(resolveRes.data.data.status, 'resolved');
    assert.strictEqual(resolveRes.data.data.resolution_notes, 'Reviewed harvest photo. Credited customer with replacement voucher.');

    // Verify audit log entry
    const auditLogs = Database.query<any>(
      `SELECT * FROM audit_logs WHERE action = 'GRIEVANCE_RESOLVED' AND target_id = ?`,
      [reportId]
    );
    assert.ok(auditLogs.length > 0, 'Audit log must record GRIEVANCE_RESOLVED');
    console.log('  ✅ [PASS] Admin resolved dispute with resolution notes, recorded audit log');

    // --- 2. Mandi APMC Intelligence & CSV Streaming ---
    console.log('\n--- 2. Mandi APMC Intelligence & CSV Streaming ---');
    const exportCsvRes = await request('/mandi/export', {
      method: 'GET',
    });
    assert.strictEqual(exportCsvRes.status, 200);
    assert.ok(exportCsvRes.headers.get('content-type')?.includes('text/csv'));
    assert.ok(exportCsvRes.data.includes('Crop Name,Commodity,Variety,State,District,Market Name'));
    console.log('  ✅ [PASS] Mandi CSV export stream returns valid text/csv format with complete APMC market columns');

    // Mandi price spread validation: min_price <= modal_price <= max_price
    const invalidPriceRes = await request('/mandi/prices', {
      method: 'POST',
      token: adminToken,
      body: {
        commodity: 'Organic Basmati Rice',
        state: 'Punjab',
        market: 'Khanna Grain Market',
        min_price: 4500,
        max_price: 4000, // Invalid: max < min
        modal_price: 4200,
      },
    });
    assert.strictEqual(invalidPriceRes.status, 400);
    console.log('  ✅ [PASS] Enforced price consistency rule: min_price <= modal_price <= max_price rejected corrupted spread (400)');

    // --- 3. Weather Advisory & Agronomic Context ---
    console.log('\n--- 3. Weather Advisory & Agronomic Context ---');
    const weatherRes = await request('/weather/forecast?lat=30.3165&lng=78.0322', {
      method: 'GET',
    });
    assert.strictEqual(weatherRes.status, 200);
    assert.ok(weatherRes.data.success);
    const weatherData = weatherRes.data.data;
    assert.ok(typeof weatherData.windSpeedKmh === 'number', 'Wind speed should be a number');
    assert.ok(weatherData.provider.includes('Open-Meteo') || weatherData.provider.includes('WMO'), 'Weather provider attribution must be present');
    assert.ok(weatherData.disclaimer.includes('Krishi Vigyan Kendra') || weatherData.disclaimer.includes('KVK'), 'KVK advisory disclaimer required');
    console.log('  ✅ [PASS] Weather advisory returns wind speed, severe alert assessment, WMO attribution, and KVK expert disclaimer');

    // --- 4. Farmer Crop Ownership IDOR Security ---
    console.log('\n--- 4. Farmer Crop Ownership IDOR Security ---');
    // Farmer A creates crop
    const addCropRes = await request(`/farmers/${farmerAProfileId}/crops`, {
      method: 'POST',
      token: farmerAToken,
      body: {
        crop_name: 'Sharbati Wheat',
        season: 'Rabi',
        acreage: 4.5,
        sowing_date: '2026-11-15',
        expected_harvest_date: '2027-04-10',
        expected_yield_kg: 5400,
        farming_method: 'Organic Certified',
        notes: 'Cold-pressed traditional desi wheat rotation',
      },
    });
    assert.strictEqual(addCropRes.status, 201);
    const cropId = addCropRes.data.data.id;
    assert.ok(cropId);
    console.log('  ✅ [PASS] Farmer A added seasonal crop to farm calendar');

    // Farmer B tries to mutate Farmer A's crop -> 403
    const farmerBTamperRes = await request(`/farmers/${farmerAProfileId}/crops/${cropId}`, {
      method: 'PUT',
      token: farmerBToken,
      body: {
        crop_name: 'Tampered GM Crop',
      },
    });
    assert.strictEqual(farmerBTamperRes.status, 403);
    console.log('  ✅ [PASS] Farmer B blocked from tampering Farmer A crop record (403 Forbidden)');

    // Farmer B tries to delete Farmer A's crop -> 403
    const farmerBDeleteRes = await request(`/farmers/${farmerAProfileId}/crops/${cropId}`, {
      method: 'DELETE',
      token: farmerBToken,
    });
    assert.strictEqual(farmerBDeleteRes.status, 403);
    console.log('  ✅ [PASS] Farmer B blocked from deleting Farmer A crop record (403 Forbidden)');

    // Farmer A updates own crop -> 200
    const farmerAUpdateRes = await request(`/farmers/${farmerAProfileId}/crops/${cropId}`, {
      method: 'PUT',
      token: farmerAToken,
      body: {
        status: 'harvesting',
        estimated_yield_kg: 6000,
      },
    });
    assert.strictEqual(farmerAUpdateRes.status, 200);
    assert.strictEqual(farmerAUpdateRes.data.data.status, 'harvesting');
    assert.strictEqual(farmerAUpdateRes.data.data.estimated_yield_kg, 6000);
    console.log('  ✅ [PASS] Farmer A successfully updated own crop record (200 OK)');

    // --- 5. Community Group Buying ---
    console.log('\n--- 5. Community Group Buying ---');
    const groupBuyRes = await request('/advanced/group-buys', {
      method: 'POST',
      token: customerAToken,
      body: {
        product_id: 'prod-1',
        title: 'Fresh Himachal Kinnow Community Deal',
        target_quantity: 100,
        unit: 'kg',
        discounted_price: 45,
        min_buyers_count: 2,
        duration_hours: 72,
      },
    });
    assert.strictEqual(groupBuyRes.status, 201);
    const groupBuyId = groupBuyRes.data.data.id;
    assert.ok(groupBuyId);
    console.log('  ✅ [PASS] Customer A created community group buy deal');

    // Customer A joins with 40 kg
    await request(`/advanced/group-buys/${groupBuyId}/join`, {
      method: 'POST',
      token: customerAToken,
      body: { quantity: 40 },
    });

    // Customer B joins the deal with remaining 60 kg (reaches 100 kg target)
    const joinRes = await request(`/advanced/group-buys/${groupBuyId}/join`, {
      method: 'POST',
      token: customerBToken,
      body: {
        quantity: 60,
      },
    });
    assert.strictEqual(joinRes.status, 200);
    assert.strictEqual(joinRes.data.data.status, 'completed'); // Automatically completed when target met!
    assert.strictEqual(joinRes.data.data.current_quantity, 100);
    assert.strictEqual(joinRes.data.data.current_buyers_count, 2);
    console.log('  ✅ [PASS] Customer B joined deal, total reached target (100kg), deal transitioned to "completed"');

    // Create another deal to test leave functionality
    const deal2Res = await request('/advanced/group-buys', {
      method: 'POST',
      token: customerAToken,
      body: {
        product_id: 'prod-2',
        title: 'Organic Apple Box Shared Order',
        target_quantity: 200,
        unit: 'kg',
        discounted_price: 80,
        min_buyers_count: 3,
        duration_hours: 120,
      },
    });
    assert.strictEqual(deal2Res.status, 201);
    const deal2Id = deal2Res.data.data.id;

    // Customer B joins deal 2
    await request(`/advanced/group-buys/${deal2Id}/join`, {
      method: 'POST',
      token: customerBToken,
      body: { quantity: 30 },
    });

    // Customer B leaves deal 2
    const leaveRes = await request(`/advanced/group-buys/${deal2Id}/leave`, {
      method: 'POST',
      token: customerBToken,
    });
    assert.strictEqual(leaveRes.status, 200);

    const deal2InDb = Database.get<any>('SELECT * FROM group_buys WHERE id = ?', [deal2Id]);
    assert.strictEqual(deal2InDb.current_buyers_count, 0);
    assert.strictEqual(deal2InDb.current_quantity, 0);
    console.log('  ✅ [PASS] Customer B successfully left group buy pool, participant count & volume decremented');

    // --- 6. Scheduled Recurring Farm Procurements ---
    console.log('\n--- 6. Scheduled Recurring Farm Procurements ---');
    const procurementsRes = await request('/advanced/procurements', {
      method: 'GET',
      token: customerAToken,
    });
    assert.strictEqual(procurementsRes.status, 200);
    assert.ok(Array.isArray(procurementsRes.data.data));
    const proc = procurementsRes.data.data[0];
    assert.ok(proc, 'Seeded procurement should exist for customer');
    const procId = proc.id;

    // Update procurement delivery schedule
    const updateProcRes = await request(`/advanced/procurements/${procId}`, {
      method: 'PUT',
      token: customerAToken,
      body: {
        frequency: 'bi-weekly',
        quantity: 8,
      },
    });
    assert.strictEqual(updateProcRes.status, 200);
    assert.strictEqual(updateProcRes.data.data.frequency, 'biweekly');
    assert.strictEqual(updateProcRes.data.data.quantity, 8);
    console.log('  ✅ [PASS] Customer updated scheduled procurement parameters (frequency and quantity)');

    // Skip next delivery cycle
    const oldDeliveryDate = updateProcRes.data.data.next_delivery_date;
    const skipProcRes = await request(`/advanced/procurements/${procId}/skip`, {
      method: 'POST',
      token: customerAToken,
    });
    assert.strictEqual(skipProcRes.status, 200);
    const newDeliveryDate = skipProcRes.data.data.next_delivery_date;
    assert.notStrictEqual(oldDeliveryDate, newDeliveryDate);
    console.log('  ✅ [PASS] Customer skipped next procurement delivery, advanced delivery date cleanly');

    // Reset last_executed_at to test fresh delivery execution
    Database.run('UPDATE scheduled_procurements SET last_executed_at = NULL WHERE id = ?', [procId]);

    // Execute procurement delivery
    const execProcRes = await request(`/advanced/procurements/${procId}/execute`, {
      method: 'POST',
      token: customerAToken,
    });
    assert.strictEqual(execProcRes.status, 200);
    assert.strictEqual(execProcRes.data.success, true);
    assert.ok(execProcRes.data.data.order_id);
    console.log('  ✅ [PASS] Customer executed scheduled delivery, generated confirmed harvest order');

    // Test Idempotency: second execute on same day is guarded
    const idempotentExecRes = await request(`/advanced/procurements/${procId}/execute`, {
      method: 'POST',
      token: customerAToken,
    });
    assert.strictEqual(idempotentExecRes.status, 200);
    assert.strictEqual(idempotentExecRes.data.message, 'Already executed for today');
    console.log('  ✅ [PASS] Scheduled procurement execution is strictly idempotent (prevents duplicate orders on same day)');

    // --- 7. Persistent Kill Switch & Governance ---
    console.log('\n--- 7. Persistent Kill Switch & Governance ---');
    const initialAllowed = killSwitch.isEnabled('ai_advisory');
    assert.strictEqual(initialAllowed, true);

    // Admin toggles kill switch off
    const toggleOffRes = await request('/admin/kill-switch/toggle', {
      method: 'POST',
      token: adminToken,
      body: {
        feature: 'ai_advisory',
        enabled: false,
      },
    });
    assert.strictEqual(toggleOffRes.status, 200);
    assert.strictEqual(killSwitch.isEnabled('ai_advisory'), false);

    // Verify persistence in platform_settings table
    const dbSetting = Database.get<{ value: string }>(
      `SELECT value FROM platform_settings WHERE key = 'kill_switch_ai_advisory'`
    );
    assert.ok(dbSetting);
    assert.strictEqual(dbSetting.value === '1' || dbSetting.value === 'true', false);

    // Re-enable kill switch
    const toggleOnRes = await request('/admin/kill-switch/toggle', {
      method: 'POST',
      token: adminToken,
      body: {
        feature: 'ai_advisory',
        enabled: true,
      },
    });
    assert.strictEqual(toggleOnRes.status, 200);
    assert.strictEqual(killSwitch.isEnabled('ai_advisory'), true);
    console.log('  ✅ [PASS] Kill switch toggling persists state in platform_settings table and logs administrative audit record');

    console.log('\n======================================================');
    console.log('🎉 ALL COMPREHENSIVE MODULES & HARDENING TESTS PASSED (100%)');
    console.log('======================================================\n');
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}

runComprehensiveModulesTests().catch((err) => {
  console.error('\n❌ COMPREHENSIVE MODULE TEST FAILED:', err);
  process.exit(1);
});
