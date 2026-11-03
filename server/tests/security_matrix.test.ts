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

async function runSecurityMatrix() {
  console.log('\n=============================================================');
  console.log('🛡️  HALDER ZERO-TRUST IDOR & SECURITY MATRIX VERIFICATION');
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
    // SETUP TEST ENTITIES
    // -------------------------------------------------------------
    const now = new Date().toISOString();

    // 1. Customer A (Aman) & Customer B (Rohit)
    const custA_id = 'user-cust-1';
    const custB_id = `user-sec-cust-b-${Date.now()}`;
    const custB_halder = `HAL-CUS-99990001`;
    Database.run(
      `INSERT OR REPLACE INTO users (id, halder_id, name, email, phone, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, 'Rohit Verma', ?, ?, 'hash', 'customer', 'active', ?, ?)`,
      [custB_id, custB_halder, `rohit.${Date.now()}@test.in`, `+91 ${Math.floor(9000000000 + Math.random() * 999999999)}`, now, now]
    );

    // 2. Farmer A (Rajesh) & Farmer B (Amit)
    const farmerA_id = 'user-farm-1';
    const farmerA_profile = 'farmer-1';
    const farmerB_id = 'user-farm-2';
    const farmerB_profile = 'farmer-2';

    // 3. Admin (Vikram)
    const admin_id = 'user-adm-1';

    // Generate authenticated JWT tokens directly via CryptoUtil
    const tokenCustA = CryptoUtil.generateToken({ userId: custA_id, role: 'customer', email: 'aman@halder.com' });
    const tokenCustB = CryptoUtil.generateToken({ userId: custB_id, role: 'customer', email: 'rohit@test.in' });
    const tokenFarmerA = CryptoUtil.generateToken({ userId: farmerA_id, role: 'farmer', email: 'rajesh@greenvalley.in', farmerProfileId: farmerA_profile });
    const tokenFarmerB = CryptoUtil.generateToken({ userId: farmerB_id, role: 'farmer', email: 'amit@sunrisefarms.in', farmerProfileId: farmerB_profile });

    // Seed private entities for tests
    // Order owned by Customer A and Farmer A
    const orderA_id = `ord-sec-a-${Date.now()}`;
    Database.run(
      `INSERT INTO orders (
        id, order_number, customer_id, farmer_id, order_status,
        total_amount, subtotal, delivery_fee, farmer_tip, delivery_address,
        city, postal_code, customer_phone, customer_name, farmer_name,
        farm_name, farmer_phone, payment_method, created_at, updated_at
      ) VALUES (?, 'HD-SEC-' || abs(random()), ?, ?, 'placed', 250, 200, 30, 20, 'Dehradun', 'Dehradun', '248001', '+91 9876543210', 'Aman Sharma', 'Rajesh Kumar', 'Green Valley Farm', '+91 9876543211', 'cod', ?, ?)`,
      [orderA_id, custA_id, farmerA_profile, now, now]
    );

    // Product owned by Farmer A
    const prodA_id = 'prod-1'; // owned by farmer-1

    // -------------------------------------------------------------
    // TEST 1: Customer B tries to view Customer A's private order
    // -------------------------------------------------------------
    console.log('--- 1. Order Isolation & IDOR Protection ---');
    const custB_view_orderA = await request(`/orders/${orderA_id}`, { token: tokenCustB });
    assert('Customer B cannot view Customer A private order (403)', custB_view_orderA.status === 403);

    // Customer A CAN view their own order
    const custA_view_orderA = await request(`/orders/${orderA_id}`, { token: tokenCustA });
    assert('Customer A can view their own order (200)', custA_view_orderA.status === 200);

    // Farmer A (seller) CAN view the order
    const farmerA_view_orderA = await request(`/orders/${orderA_id}`, { token: tokenFarmerA });
    assert('Farmer A (assigned seller) can view the order (200)', farmerA_view_orderA.status === 200);

    // Farmer B (unrelated farmer) CANNOT view Customer A & Farmer A's order
    const farmerB_view_orderA = await request(`/orders/${orderA_id}`, { token: tokenFarmerB });
    assert('Farmer B (unrelated seller) cannot view order (403)', farmerB_view_orderA.status === 403);

    // -------------------------------------------------------------
    // TEST 2: Customer B tries to cancel Customer A's order
    // -------------------------------------------------------------
    const custB_cancel_orderA = await request(`/orders/${orderA_id}/status`, {
      method: 'PATCH',
      token: tokenCustB,
      body: { status: 'cancelled' },
    });
    assert('Customer B cannot cancel Customer A order (403)', custB_cancel_orderA.status === 403);

    // -------------------------------------------------------------
    // TEST 3: Customer tries to modify a Farmer's product
    // -------------------------------------------------------------
    console.log('\n--- 2. Product Ownership & Tampering Protection ---');
    const cust_edit_prod = await request(`/products/${prodA_id}`, {
      method: 'PATCH',
      token: tokenCustA,
      body: { price: 1 },
    });
    assert('Customer cannot modify farmer product (403)', cust_edit_prod.status === 403);

    // -------------------------------------------------------------
    // TEST 4: Farmer B tries to modify Farmer A's product
    // -------------------------------------------------------------
    const farmerB_edit_prodA = await request(`/products/${prodA_id}`, {
      method: 'PATCH',
      token: tokenFarmerB,
      body: { price: 5 },
    });
    assert("Farmer B cannot modify Farmer A product (403)", farmerB_edit_prodA.status === 403);

    // Farmer B tries to delete Farmer A's product
    const farmerB_delete_prodA = await request(`/products/${prodA_id}`, {
      method: 'DELETE',
      token: tokenFarmerB,
    });
    assert("Farmer B cannot delete Farmer A product (403)", farmerB_delete_prodA.status === 403);

    // -------------------------------------------------------------
    // TEST 5: Financial & Earnings Privacy
    // -------------------------------------------------------------
    console.log('\n--- 3. Financial & Earnings Privacy ---');
    // Customer tries to view Farmer A earnings
    const cust_view_earnings = await request(`/farmers/${farmerA_profile}/earnings`, {
      token: tokenCustA,
    });
    assert('Customer cannot view farmer private earnings (403)', cust_view_earnings.status === 403);

    // Farmer B tries to view Farmer A earnings
    const farmerB_view_farmerA_earnings = await request(`/farmers/${farmerA_profile}/earnings`, {
      token: tokenFarmerB,
    });
    assert('Farmer B cannot view Farmer A earnings (403)', farmerB_view_farmerA_earnings.status === 403);

    // Farmer A CAN view their own earnings
    const farmerA_view_own_earnings = await request(`/farmers/${farmerA_profile}/earnings`, {
      token: tokenFarmerA,
    });
    assert('Farmer A can view their own earnings (200)', farmerA_view_own_earnings.status === 200);

    // -------------------------------------------------------------
    // TEST 6: Privilege Escalation & Admin Endpoints
    // -------------------------------------------------------------
    console.log('\n--- 4. Administrative RBAC Isolation ---');
    // Customer accessing Admin overview
    const cust_admin = await request('/admin/overview', { token: tokenCustA });
    assert('Customer accessing Admin overview blocked (403)', cust_admin.status === 403);

    // Farmer accessing Admin overview
    const farmer_admin = await request('/admin/overview', { token: tokenFarmerA });
    assert('Farmer accessing Admin overview blocked (403)', farmer_admin.status === 403);

    // Farmer toggling Emergency Kill Switch
    const farmer_killswitch = await request('/admin/kill-switch', {
      method: 'POST',
      token: tokenFarmerA,
      body: { feature: 'ai_advisory', state: false },
    });
    assert('Farmer modifying Emergency Kill Switch blocked (403)', farmer_killswitch.status === 403);

    // -------------------------------------------------------------
    // TEST 7: Private Chat Conversation Isolation
    // -------------------------------------------------------------
    console.log('\n--- 5. Chat & Communication Isolation ---');
    const convA_id = `conv-sec-a-${Date.now()}`;
    Database.run(
      `INSERT OR REPLACE INTO conversations (id, customer_id, farmer_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [convA_id, custA_id, farmerA_profile, now, now]
    );

    // Customer B (not participant) tries to read Customer A conversation
    const custB_read_chat = await request(`/chat/conversations/${convA_id}/messages`, {
      token: tokenCustB,
    });
    assert('Unrelated Customer B cannot access private conversation (403)', custB_read_chat.status === 403);

    // Farmer B (not participant) tries to send message in Customer A & Farmer A conversation
    const farmerB_send_chat = await request(`/chat/conversations/${convA_id}/messages`, {
      method: 'POST',
      token: tokenFarmerB,
      body: { message: 'Malicious injection' },
    });
    assert('Unrelated Farmer B cannot inject messages into private conversation (403)', farmerB_send_chat.status === 403);

    // -------------------------------------------------------------
    // TEST 8: Private In-App Notification Isolation
    // -------------------------------------------------------------
    console.log('\n--- 6. Notification Privacy & Scoping ---');
    const notifA_id = `notif-sec-a-${Date.now()}`;
    Database.run(
      `INSERT INTO notifications (id, user_id, recipient_role, type, title, message, is_read, created_at)
       VALUES (?, ?, 'customer', 'system', 'Confidential Alert', 'Private message for A', 0, ?)`,
      [notifA_id, custA_id, now]
    );

    // Customer B queries notifications - must NOT contain Customer A's notification
    const custB_notifs = await request('/notifications', { token: tokenCustB });
    const hasLeakedNotif = Array.isArray(custB_notifs.json.data) &&
      custB_notifs.json.data.some((n: any) => n.id === notifA_id);
    assert('Customer B notifications query does not leak Customer A notifications', !hasLeakedNotif);

    // -------------------------------------------------------------
    // TEST 9: Review Tampering
    // -------------------------------------------------------------
    console.log('\n--- 7. Review & Harvest Integrity ---');
    // Customer B tries to submit a review for Customer A's delivered order
    const custB_fake_review = await request('/reviews', {
      method: 'POST',
      token: tokenCustB,
      body: {
        orderId: orderA_id,
        rating: 1,
        review: 'Fake negative review by competitor',
      },
    });
    assert('Customer B cannot submit review for another customer order (403)', custB_fake_review.status === 403);

    // Clean up temporary test order & conversation
    Database.run('DELETE FROM orders WHERE id = ?', [orderA_id]);
    Database.run('DELETE FROM conversations WHERE id = ?', [convA_id]);
    Database.run('DELETE FROM notifications WHERE id = ?', [notifA_id]);
    Database.run('DELETE FROM users WHERE id = ?', [custB_id]);

  } catch (err) {
    console.error('Security Matrix Error:', err);
    failed++;
  } finally {
    server.close();
    console.log('\n=============================================================');
    console.log(`🛡️  SECURITY MATRIX SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('=============================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runSecurityMatrix();
