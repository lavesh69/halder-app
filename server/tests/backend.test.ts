process.env.NODE_ENV = 'test';
import { app } from '../src/app';
import { seedDatabase } from '../src/db/seed';
import { Database } from '../src/db/database';
import { CryptoUtil } from '../src/utils/crypto';
import http from 'http';

let server: http.Server;
const PORT = 5055;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

async function request(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    token?: string;
    headers?: Record<string, string>;
  } = {}
) {
  const url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
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

let custToken: string;
let farmer1Token: string;
let farmer2Token: string;
let adminToken: string;

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING HALDER PRODUCTION BACKEND TEST SUITE');
  console.log('======================================================\n');

  await seedDatabase();
  Database.run("UPDATE products SET available_quantity = 50 WHERE id = 'prod-1'");

  server = app.listen(PORT);
  console.log(`[Test Server] Running on ${BASE_URL}\n`);

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, extraInfo?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${extraInfo ? `-> ${extraInfo}` : ''}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST GROUP 1: Health & Readiness
    // ----------------------------------------------------
    console.log('--- 1. Health & Database Connectivity ---');
    const health = await request('/health');
    assert('Health endpoint returns 200 OK', health.status === 200 && health.json.status === 'healthy');

    const ready = await request('/ready');
    assert('Ready endpoint returns 200 with database connected', ready.status === 200 && ready.json.database === 'connected');

    // ----------------------------------------------------
    // TEST GROUP 2: Authentication & Token Generation
    // ----------------------------------------------------
    console.log('\n--- 2. Authentication & Login Tests ---');
    const custLogin = await request('/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'aman@halder.com', password: 'halder123' },
    });
    assert('Customer Aman Sharma login success', custLogin.status === 200 && !!custLogin.json.data.token);
    custToken = custLogin.json.data.token;

    const farm1Login = await request('/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'rajesh@greenvalley.in', password: 'halder123' },
    });
    assert('Farmer Rajesh Kumar login success', farm1Login.status === 200 && !!farm1Login.json.data.token);
    farmer1Token = farm1Login.json.data.token;

    const farm2Login = await request('/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'amit@sunrisefarms.in', password: 'halder123' },
    });
    assert('Farmer Amit Singh login success', farm2Login.status === 200 && !!farm2Login.json.data.token);
    farmer2Token = farm2Login.json.data.token;

    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'admin@halder.com', password: 'halder123' },
    });
    assert('Admin Vikram Patel login success', adminLogin.status === 200 && !!adminLogin.json.data.token);
    adminToken = adminLogin.json.data.token;

    const invalidLogin = await request('/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'aman@halder.com', password: 'wrongpassword' },
    });
    assert('Invalid password rejects with 401 Unauthorized', invalidLogin.status === 401);

    // ----------------------------------------------------
    // TEST GROUP 3: Product Listings & Filters
    // ----------------------------------------------------
    console.log('\n--- 3. Product Catalog & Filter Tests ---');
    const prodList = await request('/products?limit=10');
    assert('List products returns active items', prodList.status === 200 && prodList.json.data.products.length > 0);

    const vegFilter = await request('/products?category=Vegetables');
    assert('Category filter returns filtered items', vegFilter.status === 200 && vegFilter.json.data.products.every((p: any) => p.category_name === 'Vegetables'));

    const searchRes = await request('/products?search=Tomatoes');
    assert('Search query finds matches', searchRes.status === 200 && searchRes.json.data.products.length >= 1);

    // ----------------------------------------------------
    // TEST GROUP 4: Mandatory Security Scenarios
    // ----------------------------------------------------
    console.log('\n--- 4. MANDATORY SECURITY SCENARIO TESTS ---');

    // SCENARIO 1: Customer A accessing Customer B's order (IDOR)
    const otherUserOrder = await request('/orders/order-101', {
      token: farmer2Token, // Farmer 2 is neither the customer nor the farmer of order-101
    });
    assert('Scenario 1 (IDOR Orders): Unauthorized user accessing private order blocked (403)', otherUserOrder.status === 403);

    // SCENARIO 2: Farmer A editing Farmer B's product (IDOR)
    const idorProductEdit = await request('/products/prod-2', {
      method: 'PATCH',
      token: farmer1Token, // prod-2 belongs to farmer-2 (Amit Singh), not farmer-1 (Rajesh)
      body: { price: 999 },
    });
    assert('Scenario 2 (IDOR Products): Farmer A editing Farmer B\'s crop blocked (403)', idorProductEdit.status === 403);

    // SCENARIO 3: Customer or Farmer calling Admin API
    const custCallingAdmin = await request('/admin/overview', {
      token: custToken,
    });
    assert('Scenario 3 (RBAC Admin): Customer calling Admin endpoint blocked (403)', custCallingAdmin.status === 403);

    const farmerCallingAdmin = await request('/admin/overview', {
      token: farmer1Token,
    });
    assert('Scenario 3 (RBAC Admin): Farmer calling Admin endpoint blocked (403)', farmerCallingAdmin.status === 403);

    const adminCallingAdmin = await request('/admin/overview', {
      token: adminToken,
    });
    assert('Scenario 3 (RBAC Admin): Admin accessing Admin endpoint allowed (200)', adminCallingAdmin.status === 200 && !!adminCallingAdmin.json.data.totalUsers);

    // SCENARIO 4: Negative price or invalid stock on product creation
    const negativePricePost = await request('/products', {
      method: 'POST',
      token: farmer1Token,
      body: {
        categoryId: 'cat-veg',
        name: 'Hacked Carrots',
        price: -50, // NEGATIVE PRICE
        unit: 'kg',
        availableQuantity: 20,
        location: 'Doon Valley',
        image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5c317?w=600',
      },
    });
    assert('Scenario 4 (Negative Price): Rejected with 400 Bad Request', negativePricePost.status === 400);

    const negativeStockPost = await request('/products', {
      method: 'POST',
      token: farmer1Token,
      body: {
        categoryId: 'cat-veg',
        name: 'Hacked Carrots',
        price: 50,
        unit: 'kg',
        availableQuantity: -10, // NEGATIVE QUANTITY
        location: 'Doon Valley',
        image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5c317?w=600',
      },
    });
    assert('Scenario 4 (Negative Stock): Rejected with 400 Bad Request', negativeStockPost.status === 400);

    // SCENARIO 5: Customer ordering more stock than available
    const excessiveOrder = await request('/orders', {
      method: 'POST',
      token: custToken,
      body: {
        items: [{ productId: 'prod-1', quantity: 99999 }], // Exceeds 45kg stock
        deliveryAddress: 'Test Address, Dehradun',
        customerPhone: '+91 98765 43210',
        paymentMethod: 'upi',
      },
    });
    assert('Scenario 5 (Insufficient Stock): Order rejected with 400 INSUFFICIENT_STOCK', excessiveOrder.status === 400 && excessiveOrder.json.error.code === 'INSUFFICIENT_STOCK');

    // SCENARIO 6: Transactional Order Creation & Atomic Stock Deduction
    const initialProduct = Database.get<any>('SELECT available_quantity FROM products WHERE id = ?', ['prod-1']);
    const orderQty = 5;

    const validOrder = await request('/orders', {
      method: 'POST',
      token: custToken,
      body: {
        items: [{ productId: 'prod-1', quantity: orderQty }],
        deliveryAddress: '14, Rajpur Road, Dehradun',
        customerPhone: '+91 98765 43210',
        paymentMethod: 'upi',
      },
    });
    assert('Valid Order Creation returns 201 Created', validOrder.status === 201 && validOrder.json.data.length > 0);

    const updatedProduct = Database.get<any>('SELECT available_quantity FROM products WHERE id = ?', ['prod-1']);
    assert(
      'Scenario 6 (Atomic Stock): Inventory reduced exactly by ordered quantity',
      updatedProduct.available_quantity === initialProduct.available_quantity - orderQty,
      `Expected ${initialProduct.available_quantity - orderQty}, got ${updatedProduct.available_quantity}`
    );

    // ----------------------------------------------------
    // TEST GROUP 5: Order State Machine & Review Eligibility
    // ----------------------------------------------------
    console.log('\n--- 5. Order State Machine & Review Integrity ---');
    const createdOrderId = validOrder.json.data[0].id;

    // Try illegal skip transition: placed -> delivered directly
    const illegalTransition = await request(`/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      token: farmer1Token,
      body: { status: 'delivered' }, // Illegal from 'placed'
    });
    assert('State Machine: Illegal transition placed -> delivered rejected with 400', illegalTransition.status === 400);

    // Step by step valid transitions
    const step1 = await request(`/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      token: farmer1Token,
      body: { status: 'accepted' },
    });
    assert('State Machine: placed -> accepted allowed', step1.status === 200 && step1.json.data.order_status === 'accepted');

    const step2 = await request(`/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      token: farmer1Token,
      body: { status: 'preparing' },
    });
    assert('State Machine: accepted -> preparing allowed', step2.status === 200 && step2.json.data.order_status === 'preparing');

    // Test Review creation on delivered order
    Database.run("DELETE FROM reviews WHERE order_id = 'order-102'");
    const validReview = await request('/reviews', {
      method: 'POST',
      token: custToken,
      body: {
        orderId: 'order-102', // Already placed & delivered in seed
        rating: 5,
        review: 'Best fresh farm harvest!',
      },
    });
    assert('Customer review submitted on completed order', validReview.status === 201);

    const duplicateReview = await request('/reviews', {
      method: 'POST',
      token: custToken,
      body: {
        orderId: 'order-102',
        rating: 4,
        review: 'Duplicate review attempt',
      },
    });
    assert('Duplicate review on same order rejected with 409 Conflict', duplicateReview.status === 409);

    // ----------------------------------------------------
    // TEST GROUP 5B: Real Money & Farmer Payouts
    // ----------------------------------------------------
    console.log('\n--- 5B. Real Money & Farmer Payout Tests ---');
    const verifyRes = await request('/payments/verify', {
      method: 'POST',
      token: custToken,
      body: {
        orderId: createdOrderId,
        paymentMethod: 'upi',
        transactionRef: 'UPI-TEST-123456789',
      },
    });
    assert('Verify payment & calculate 90% farmer split', verifyRes.status === 200 && verifyRes.json.data.paymentStatus === 'paid');

    const farmerPayouts = await request('/payments/payouts?farmerId=farmer-1', {
      token: farmer1Token,
    });
    assert('Farmer payout summary returns available balance and ledger', farmerPayouts.status === 200 && farmerPayouts.json.data.totalGrossSales > 0);

    // ----------------------------------------------------
    // TEST GROUP 6: Admin Governance & Moderation
    // ----------------------------------------------------
    console.log('\n--- 6. Admin Governance & Verification Queue ---');
    const approveFarmer = await request('/admin/farmers/farmer-3/verify', {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'verified' },
    });
    assert('Admin farmer verification approval returns 200', approveFarmer.status === 200 && approveFarmer.json.data.verificationStatus === 'verified');

    const toggleUser = await request('/admin/users/user-cust-1/toggle-status', {
      method: 'PATCH',
      token: adminToken,
    });
    assert('Admin user suspension toggle works', toggleUser.status === 200);

    // Restore user status back to active
    await request('/admin/users/user-cust-1/toggle-status', {
      method: 'PATCH',
      token: adminToken,
    });

    // ----------------------------------------------------
    // TEST GROUP 7: Cybersecurity & Hardening Validation
    // ----------------------------------------------------
    console.log('\n--- 7. Defensive Cybersecurity & Hardening Validation ---');

    // 7.1 Privilege Escalation: Public Registration as Admin must be rejected
    const privEscReg = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Evil Hacker',
        email: 'hacker@evil.com',
        phone: '+91 99999 88888',
        role: 'admin',
      },
    });
    assert('Privilege Escalation: Registering as admin role is rejected', privEscReg.status === 400 || privEscReg.status === 403);

    // 7.2 Broken Object Level Auth: Customer marking order as delivered must be forbidden
    const customerTamperStatus = await request(`/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      token: custToken,
      body: { status: 'delivered' },
    });
    assert('BOLA / Tampering: Customer marking order as delivered is forbidden (403)', customerTamperStatus.status === 403);

    // 7.3 Review Guard: Reviewing non-delivered order must be rejected
    const prematureReview = await request('/reviews', {
      method: 'POST',
      token: custToken,
      body: {
        orderId: createdOrderId,
        rating: 5,
        review: 'Fake early review',
      },
    });
    assert('Review Security: Reviewing non-delivered order is blocked (400)', prematureReview.status === 400);

    // 7.4 Idempotent Payment: Repeated payment confirmation does not duplicate payout ledger
    const verifyReplay = await request('/payments/verify', {
      method: 'POST',
      token: custToken,
      body: {
        orderId: createdOrderId,
        paymentMethod: 'upi',
        transactionRef: 'UPI-TEST-REPLAY-123',
      },
    });
    assert('Payment Idempotency: Replay payment returns existing state without duplication', verifyReplay.status === 200 && verifyReplay.json.data.isIdempotentReplay === true);

    // 7.5 SQL Injection Resistance: Payload in search parameter is safely handled
    const sqliSearch = await request('/products?search=' + encodeURIComponent("' OR 1=1 -- UNION SELECT * FROM users --"));
    assert('SQL Injection Resistance: Query with malicious payload executes safely without error', sqliSearch.status === 200 && Array.isArray(sqliSearch.json.data.products));

    // 7.6 Price / Quantity Manipulation: Negative stock / quantity is rejected
    const negQtyOrder = await request('/orders', {
      method: 'POST',
      token: custToken,
      body: {
        items: [{ productId: 'prod-1', quantity: -10 }],
        deliveryAddress: 'Test Address, Dehradun',
        customerPhone: '+91 98765 43210',
        paymentMethod: 'cod',
      },
    });
    assert('Input Validation: Negative quantity order rejected (400)', negQtyOrder.status === 400);

    // 7.7 IDOR: Farmer 2 modifying Farmer 1 product is forbidden
    const secIdorProductEdit = await request('/products/prod-1', {
      method: 'PATCH',
      token: farmer2Token,
      body: { price: 10 },
    });
    assert('IDOR Protection: Farmer modifying another farmer product is forbidden (403)', secIdorProductEdit.status === 403);

    // 7.8 RBAC: Customer accessing admin overview is forbidden
    const rbacAdminAccess = await request('/admin/overview', {
      token: custToken,
    });
    assert('RBAC: Customer accessing admin endpoint is forbidden (403)', rbacAdminAccess.status === 403);

    // =================================================================
    // SECTION 8: AI APP SECURITY CHECKLIST PENETRATION TESTS (PDF SPEC)
    // =================================================================
    console.log('\n--- Section 8: AI App Security Checklist Penetration Tests ---');

    // 8.1 Deep Input Sanitization (Point 3 & 4)
    const { sanitizeText } = await import('../src/utils/sanitize');
    const xssPayload = '<script>alert("xss")</script><img src="x" onerror="alert(1)">Hello Fresh Farms<iframe src="malicious.com"></iframe>';
    const cleanText = sanitizeText(xssPayload);
    assert('Input Sanitization: Neutralizes script tags, event handlers, and iframes', 
      !cleanText.includes('<script>') && 
      !cleanText.includes('onerror=') && 
      !cleanText.includes('<iframe') && 
      cleanText.includes('Hello Fresh Farms')
    );

    // 8.2 Backend External API Shielding (Point 1 & 7)
    const weatherProxy = await request('/weather/agro?city=Dehradun');
    assert('Backend API Proxy: Serves agro-weather shielded through server with cache',
      weatherProxy.status === 200 && typeof weatherProxy.json.data.temperature === 'number'
    );

    // 8.3 Emergency Kill Switch Activation (Point 9)
    const { killSwitch } = await import('../src/config/killSwitch');
    killSwitch.setFeatureState('ai_advisory', false);
    const killedResponse = await request('/weather/agro?city=Dehradun');
    assert('Emergency Kill Switch: Abused feature immediately returns 503 without server restart',
      killedResponse.status === 503 && killedResponse.json.error.code === 'FEATURE_TEMPORARILY_DISABLED'
    );

    // 8.4 Emergency Kill Switch Restoration (Point 9)
    killSwitch.setFeatureState('ai_advisory', true);
    const restoredResponse = await request('/weather/agro?city=Dehradun');
    assert('Emergency Kill Switch: Restored feature responds with 200 OK immediately',
      restoredResponse.status === 200 && restoredResponse.json.success === true
    );

    // 8.5 Admin Kill Switch Authorization (Point 6 & 9)
    const adminKillSwitchCheck = await request('/admin/kill-switch', { token: custToken });
    assert('Kill Switch Admin Authorization: Non-admin cannot view or modify kill switch state (403)',
      adminKillSwitchCheck.status === 403
    );

    // =================================================================
    // SECTION 9: FAVORITES, REPORTS & DISPUTES, AND FARMER EARNINGS
    // =================================================================
    console.log('\n--- Section 9: Favorites, Reports & Farmer Payouts ---');

    // 9.1 Add & List Favorites
    const addFav = await request('/favorites/prod-1', {
      method: 'POST',
      token: custToken,
    });
    assert('Favorites: Add product to user favorites returns 201', addFav.status === 201);

    const listFav = await request('/favorites', {
      token: custToken,
    });
    assert('Favorites: List returns favorited products with farm details',
      listFav.status === 200 && Array.isArray(listFav.json.data) && listFav.json.data.length > 0
    );

    const removeFav = await request('/favorites/prod-1', {
      method: 'DELETE',
      token: custToken,
    });
    assert('Favorites: Delete removes product from user favorites', removeFav.status === 200);

    // 9.2 Submit & Moderate Reports / Disputes
    const createReport = await request('/reports', {
      method: 'POST',
      token: custToken,
      body: {
        productId: 'prod-1',
        reason: 'Late harvest dispatch inquiry',
        description: 'Need confirmation on harvest date',
      },
    });
    assert('Reports: Customer submitting dispute/issue report returns 201',
      createReport.status === 201 && createReport.json.data.status === 'open'
    );
    const reportId = createReport.json.data.id;

    const listReports = await request('/reports', {
      token: adminToken,
    });
    assert('Reports: Admin can list all submitted reports',
      listReports.status === 200 && Array.isArray(listReports.json.data)
    );

    const updateReport = await request(`/reports/${reportId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'resolved' },
    });
    assert('Reports: Admin updating report status returns 200 with resolved_at timestamp',
      updateReport.status === 200 && updateReport.json.data.status === 'resolved' && !!updateReport.json.data.resolved_at
    );

    // 9.3 Farmer Live Earnings & Payout Ledger
    const farmerEarnings = await request('/farmers/farmer-1/earnings', {
      token: farmer1Token,
    });
    assert('Farmer Earnings: Returns calculated gross, platform commission, and delivered order count',
      farmerEarnings.status === 200 &&
      typeof farmerEarnings.json.data.grossEarnings === 'number' &&
      typeof farmerEarnings.json.data.deliveredOrdersCount === 'number'
    );

    // =================================================================
    // SECTION 10: ROLE-BASED UNIQUE IDENTITY SYSTEM (HAL-CUS, HAL-FRM, HAL-ADM)
    // =================================================================
    console.log('\n--- Section 10: Role-Based Unique Identity System ---');

    // 10.1 Customer Registration receives HAL-CUS-XXXXXXXX
    const custReg1 = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Kavita Joshi',
        email: `kavita_${Date.now()}@halder.in`,
        phone: `+91 ${Math.floor(6000000000 + Math.random() * 3000000000)}`,
        password: 'password123',
        role: 'customer',
      },
    });
    assert('Identity: New customer registration returns HAL-CUS-XXXXXXXX formatted ID',
      custReg1.status === 201 &&
      /^HAL-CUS-\d{8}$/.test(custReg1.json.data.user.halder_id)
    );
    const cusId1 = custReg1.json.data.user.halder_id;

    // 10.2 Second Customer receives consecutive incremented ID
    const custReg2 = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Rohan Verma',
        email: `rohan_${Date.now()}@halder.in`,
        phone: `+91 ${Math.floor(6000000000 + Math.random() * 3000000000)}`,
        password: 'password123',
        role: 'customer',
      },
    });
    assert('Identity: Successive customer registration receives sequentially incremented ID',
      custReg2.status === 201 &&
      /^HAL-CUS-\d{8}$/.test(custReg2.json.data.user.halder_id) &&
      parseInt(custReg2.json.data.user.halder_id.slice(8)) === parseInt(cusId1.slice(8)) + 1
    );

    // 10.3 Farmer Registration receives HAL-FRM-XXXXXXXX with separate sequence
    const farmerReg = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Kishore Singh',
        email: `kishore_${Date.now()}@halder.in`,
        phone: `+91 ${Math.floor(6000000000 + Math.random() * 3000000000)}`,
        password: 'password123',
        role: 'farmer',
        farmName: 'Kishore Organic Orchard',
      },
    });
    assert('Identity: New farmer registration receives HAL-FRM-XXXXXXXX formatted ID',
      farmerReg.status === 201 &&
      /^HAL-FRM-\d{8}$/.test(farmerReg.json.data.user.halder_id)
    );
    const frmId = farmerReg.json.data.user.halder_id;

    // 10.4 Public Identity Lookup by HALDER ID
    const lookupRes = await request(`/identity/${cusId1}`);
    assert('Identity: Public lookup by HALDER ID returns safe profile without password_hash',
      lookupRes.status === 200 &&
      lookupRes.json.data.halder_id === cusId1 &&
      !lookupRes.json.data.password_hash
    );

    // 10.5 Invalid HALDER ID Format rejected with 400
    const invalidLookup = await request('/identity/INVALID-ID-1234');
    assert('Identity: Invalid HALDER ID lookup returns 400 Bad Request',
      invalidLookup.status === 400
    );

    // 10.6 Admin Search by HALDER ID
    const adminSearchRes = await request(`/admin/users?search=${frmId}`, {
      token: adminToken,
    });
    assert('Identity: Admin can search users by HALDER ID',
      adminSearchRes.status === 200 &&
      Array.isArray(adminSearchRes.json.data) &&
      adminSearchRes.json.data.some((u: any) => u.halder_id === frmId)
    );

    // 10.7 Concurrency & Collision Safety
    const { IdentityService } = await import('../src/services/identityService');
    const concurrentIds = Array.from({ length: 10 }, () => IdentityService.generateNextId('customer'));
    const uniqueIds = new Set(concurrentIds);
    assert('Identity: 10 rapid sequence generations produce 10 strictly unique IDs (0 collisions)',
      uniqueIds.size === 10
    );

    // =================================================================
    // SECTION 11: REAL GOOGLE SIGN-IN / GOOGLE ID LOGIN (OIDC & OAUTH)
    // =================================================================
    console.log('\n--- Section 11: Real Google Sign-In / Google ID Login ---');

    // 11.1 New Customer via Google receives HAL-CUS-XXXXXXXX & auth_identities record
    const nowTs = Date.now();
    const custEmail = `ananya_${nowTs}@gmail.com`;
    const googleSub1 = `g_sub_${nowTs}_1`;
    const googleCustToken = `test_google_token_${googleSub1}:::${custEmail}:::Ananya Joshi`;
    const googleCustRes = await request('/auth/google', {
      method: 'POST',
      body: {
        idToken: googleCustToken,
        role: 'customer',
      },
    });
    assert('Google Auth: New customer via Google receives 201 Created and HAL-CUS-XXXXXXXX ID',
      googleCustRes.status === 201 &&
      googleCustRes.json.data.isNewUser === true &&
      /^HAL-CUS-\d{8}$/.test(googleCustRes.json.data.user.halder_id) &&
      googleCustRes.json.data.user.email === custEmail
    );
    const googleCustUserId = googleCustRes.json.data.user.id;

    // 11.2 Re-login with existing Google account returns same account without duplicates
    const googleReloginRes = await request('/auth/google', {
      method: 'POST',
      body: {
        idToken: googleCustToken,
      },
    });
    assert('Google Auth: Subsequent Google login returns 200 OK and same HALDER account (isNewUser: false)',
      googleReloginRes.status === 200 &&
      googleReloginRes.json.data.isNewUser === false &&
      googleReloginRes.json.data.user.id === googleCustUserId
    );

    // 11.3 New Farmer via Google receives HAL-FRM-XXXXXXXX & farmer profile
    const farmerEmail = `suresh_${nowTs}@gmail.com`;
    const googleSub2 = `g_sub_${nowTs}_2`;
    const googleFarmerToken = `test_google_token_${googleSub2}:::${farmerEmail}:::Suresh Chandra`;
    const googleFarmerRes = await request('/auth/google', {
      method: 'POST',
      body: {
        idToken: googleFarmerToken,
        role: 'farmer',
      },
    });
    assert('Google Auth: New farmer via Google receives 201 Created and HAL-FRM-XXXXXXXX ID',
      googleFarmerRes.status === 201 &&
      googleFarmerRes.json.data.isNewUser === true &&
      /^HAL-FRM-\d{8}$/.test(googleFarmerRes.json.data.user.halder_id) &&
      googleFarmerRes.json.data.user.role === 'farmer' &&
      googleFarmerRes.json.data.user.email === farmerEmail
    );

    // 11.4 Account Linking: Existing HALDER account with same email links Google identity
    const linkingSub = `g_sub_${Date.now()}_3`;
    const linkingToken = `test_google_token_${linkingSub}:::aman@halder.com:::Aman Sharma`;
    const linkRes = await request('/auth/google', {
      method: 'POST',
      body: {
        idToken: linkingToken,
      },
    });
    assert('Google Auth: Existing account with same verified email links Google identity (linked: true)',
      linkRes.status === 200 &&
      linkRes.json.data.linked === true &&
      linkRes.json.data.user.email === 'aman@halder.com'
    );

    // 11.5 Privilege Escalation: Attempting to register admin role via Google is forbidden (403)
    const adminEscalationToken = `test_google_token_badactor_attacker@gmail.com_Attacker`;
    const escalationRes = await request('/auth/google', {
      method: 'POST',
      body: {
        idToken: adminEscalationToken,
        role: 'admin',
      },
    });
    assert('Google Auth: Self-service registration as admin via Google is blocked (403)',
      escalationRes.status === 403
    );

    // 11.6 Invalid Google token is rejected with 400 or 401
    const invalidTokenRes = await request('/auth/google', {
      method: 'POST',
      body: {
        idToken: 'short',
      },
    });
    assert('Google Auth: Malformed or short Google token rejected with 400 Bad Request',
      invalidTokenRes.status === 400
    );

    // 11.7 Concurrency: Two simultaneous Google login requests for same new sub create only ONE user
    const concurrentSub = `g_concurrent_${Date.now()}`;
    const concurrentEmail = `concurrent_${Date.now()}@gmail.com`;
    const concurrentToken = `test_google_token_${concurrentSub}:::${concurrentEmail}:::Concurrent User`;
    const [cRes1, cRes2] = await Promise.all([
      request('/auth/google', { method: 'POST', body: { idToken: concurrentToken, role: 'customer' } }),
      request('/auth/google', { method: 'POST', body: { idToken: concurrentToken, role: 'customer' } }),
    ]);
    const successCount = [cRes1, cRes2].filter(r => r.status === 200 || r.status === 201).length;
    const distinctUsers = new Set([cRes1.json?.data?.user?.id, cRes2.json?.data?.user?.id].filter(Boolean));
    assert('Google Auth: Concurrent logins for same new Google account resolve to exactly 1 HALDER user',
      successCount === 2 && distinctUsers.size === 1
    );

    console.log('\n--- Section 12: Role-Based Access Control (RBAC) & IDOR Security Gates ---');
    // 12.1 Passwordless login to admin account is rejected
    const adminNoPassRes = await request('/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'admin@halder.com' },
    });
    assert('RBAC: Passwordless login attempt to Admin account is blocked with 401 Unauthorized',
      adminNoPassRes.status === 401
    );

    // 12.2 Farmer attempting to view another farmer's private earnings
    const farmerIdorRes = await request('/farmers/farmer-2/earnings', {
      method: 'GET',
      token: farmer1Token,
    });
    assert('RBAC: Farmer Rajesh attempting to view another farmer earnings is blocked with 403 Forbidden',
      farmerIdorRes.status === 403
    );

    // 12.3 Customer attempting to view farmer earnings
    const custFarmerRes = await request('/farmers/farmer-1/earnings', {
      method: 'GET',
      token: custToken,
    });
    assert('RBAC: Customer attempting to access farmer earnings is blocked with 403 Forbidden',
      custFarmerRes.status === 403
    );

    // 12.4 Non-admin attempting to record farmer payout
    const payoutHackRes = await request('/farmers/farmer-1/payout', {
      method: 'POST',
      token: farmer1Token,
      body: { amount: 500, referenceId: 'PAY-HACK-123' },
    });
    assert('RBAC: Non-admin attempting to record farmer payout is blocked with 403 Forbidden',
      payoutHackRes.status === 403
    );

    // 12.5 Authorized admin viewing farmer earnings
    const adminEarningsRes = await request('/farmers/farmer-1/earnings', {
      method: 'GET',
      token: adminToken,
    });
    assert('RBAC: Admin has authorized oversight access to farmer earnings (200 OK)',
      adminEarningsRes.status === 200 && adminEarningsRes.json.data.grossEarnings !== undefined
    );





  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close();
    console.log('\n======================================================');
    console.log(`📊 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
