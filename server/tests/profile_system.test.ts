import { app } from '../src/app';
import { Database } from '../src/db/database';
import { v4 as uuidv4 } from 'uuid';

const PORT = 5094;
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

async function runProfileSystemTests() {
  console.log('\n======================================================');
  console.log('HALDER — Comprehensive Profile System & IDOR Test Suite');
  console.log('======================================================\n');

  server = app.listen(PORT);
  // Wait brief moment for socket bind
  await new Promise((resolve) => setTimeout(resolve, 300));

  let passed = 0;
  let total = 0;

  function recordTest(name: string, ok: boolean, detail?: string) {
    total++;
    if (ok) {
      passed++;
      console.log(`  [PASS] #${total}: ${name}`);
    } else {
      console.error(`  [FAIL] #${total}: ${name} ${detail ? `(${detail})` : ''}`);
    }
  }

  try {
    // Generate unique test users
    const salt = Date.now().toString().slice(-6);
    const customerAData = {
      name: 'Test Customer A',
      email: `cust_a_${salt}@halder.test`,
      phone: `987000${salt}`,
      password: 'Password123!',
      role: 'customer' as const,
    };

    const customerBData = {
      name: 'Test Customer B',
      email: `cust_b_${salt}@halder.test`,
      phone: `987111${salt}`,
      password: 'Password123!',
      role: 'customer' as const,
    };

    const farmerAData = {
      name: 'Test Farmer A',
      email: `farm_a_${salt}@halder.test`,
      phone: `987222${salt}`,
      password: 'Password123!',
      role: 'farmer' as const,
      farmName: 'Organic Valley Test Farm',
      location: 'Dehradun Hills',
    };

    let tokenCustA = '';
    let tokenCustB = '';
    let tokenFarmA = '';
    let userCustAId = '';
    let userCustBId = '';
    let userFarmAId = '';
    let halderCustAId = '';
    let halderFarmAId = '';
    let farmerAProfileId = '';

    // 1. Register Customer A
    try {
      const res = await request('/auth/register', { method: 'POST', body: customerAData });
      const ok = res.status === 201 && res.json.data.user.halder_id?.startsWith('HAL-CUS-');
      tokenCustA = res.json.data.token;
      userCustAId = res.json.data.user.id;
      halderCustAId = res.json.data.user.halder_id;
      recordTest('Register Customer A with immutable HAL-CUS ID', ok);
    } catch (err: any) {
      recordTest('Register Customer A with immutable HAL-CUS ID', false, err.message);
    }

    // 2. Register Customer B
    try {
      const res = await request('/auth/register', { method: 'POST', body: customerBData });
      const ok = res.status === 201 && res.json.data.user.halder_id?.startsWith('HAL-CUS-');
      tokenCustB = res.json.data.token;
      userCustBId = res.json.data.user.id;
      recordTest('Register Customer B with separate HAL-CUS ID', ok);
    } catch (err: any) {
      recordTest('Register Customer B with separate HAL-CUS ID', false, err.message);
    }

    // 3. Register Farmer A
    try {
      const res = await request('/auth/register', { method: 'POST', body: farmerAData });
      const ok = res.status === 201 && res.json.data.user.halder_id?.startsWith('HAL-FRM-');
      tokenFarmA = res.json.data.token;
      userFarmAId = res.json.data.user.id;
      halderFarmAId = res.json.data.user.halder_id;
      farmerAProfileId =
        res.json.data.farmerProfile?.id ||
        Database.get<any>('SELECT id FROM farmer_profiles WHERE user_id = ?', [userFarmAId])?.id;
      recordTest('Register Farmer A with immutable HAL-FRM ID and profile', ok && Boolean(farmerAProfileId));
    } catch (err: any) {
      recordTest('Register Farmer A with immutable HAL-FRM ID and profile', false, err.message);
    }

    // 4. Customer Profile Fetch (GET /customers/me)
    try {
      const res = await request('/customers/me', { token: tokenCustA });
      const ok =
        res.status === 200 &&
        res.json.data.id === userCustAId &&
        res.json.data.halderId === halderCustAId &&
        res.json.data.notificationPreferences?.orders === true;
      recordTest('Customer A fetches own private profile', ok);
    } catch (err: any) {
      recordTest('Customer A fetches own private profile', false, err.message);
    }

    // 5. Customer Profile Update (PATCH /customers/me)
    try {
      const res = await request('/customers/me', {
        method: 'PATCH',
        token: tokenCustA,
        body: {
          name: 'Aman Sharma Updated',
          bio: 'Fresh Farm Produce Advocate',
        },
      });
      const ok =
        res.status === 200 &&
        res.json.data.name === 'Aman Sharma Updated' &&
        res.json.data.bio === 'Fresh Farm Produce Advocate';
      recordTest('Customer A updates personal name and bio', ok);
    } catch (err: any) {
      recordTest('Customer A updates personal name and bio', false, err.message);
    }

    // 6. Customer Tamper Prevention: Attempt to change halder_id or role
    try {
      await request('/customers/me', {
        method: 'PATCH',
        token: tokenCustA,
        body: {
          halder_id: 'HAL-ADM-99999999',
          role: 'admin',
        },
      });
      const checkUser = Database.get<any>('SELECT halder_id, role FROM users WHERE id = ?', [userCustAId]);
      const ok = checkUser.halder_id === halderCustAId && checkUser.role === 'customer';
      recordTest('Reject client-supplied halder_id or role elevation tampering', ok);
    } catch (err: any) {
      recordTest('Reject client-supplied halder_id or role elevation tampering', false, err.message);
    }

    // 7. Customer Profile Avatar Upload (POST /customers/me/avatar)
    try {
      const dummyBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const res = await request('/customers/me/avatar', {
        method: 'POST',
        token: tokenCustA,
        body: { avatar: dummyBase64 },
      });
      const ok = res.status === 200 && res.json.data.avatar === dummyBase64;
      recordTest('Customer A uploads persistent avatar image', ok);
    } catch (err: any) {
      recordTest('Customer A uploads persistent avatar image', false, err.message);
    }

    // 8. Reject invalid image MIME/format for avatar
    try {
      const res = await request('/customers/me/avatar', {
        method: 'POST',
        token: tokenCustA,
        body: { avatar: 'malicious_binary_executable_string' },
      });
      const ok = res.status === 400;
      recordTest('Reject invalid image MIME/format for avatar', ok);
    } catch (err: any) {
      recordTest('Reject invalid image MIME/format for avatar', false, err.message);
    }

    // 9. Customer Address Management: Add First Address (auto-promoted to default)
    let addrA1Id = '';
    try {
      const res = await request('/customers/me/addresses', {
        method: 'POST',
        token: tokenCustA,
        body: {
          label: 'Home',
          name: 'Aman Sharma',
          phone: '9876543210',
          houseBuilding: 'Flat 402, Pine Heights',
          streetLocality: 'Rajpur Road',
          city: 'Dehradun',
          state: 'Uttarakhand',
          postalCode: '248001',
          landmark: 'Clock Tower',
        },
      });
      const ok = res.status === 201 && res.json.data.is_default === 1;
      addrA1Id = res.json.data.id;
      recordTest('Create Customer A address #1 (auto-defaulted)', ok);
    } catch (err: any) {
      recordTest('Create Customer A address #1 (auto-defaulted)', false, err.message);
    }

    // 10. Add Second Address for Customer A (Work, marked isDefault: true)
    let addrA2Id = '';
    try {
      const res = await request('/customers/me/addresses', {
        method: 'POST',
        token: tokenCustA,
        body: {
          label: 'Work',
          name: 'Aman Sharma',
          phone: '9876543210',
          houseBuilding: 'Tech Park Tower B',
          streetLocality: 'Sahastradhara Road',
          city: 'Dehradun',
          state: 'Uttarakhand',
          postalCode: '248013',
          isDefault: true,
        },
      });
      const ok = res.status === 201 && res.json.data.is_default === 1;
      addrA2Id = res.json.data.id;
      recordTest('Create Customer A address #2 with isDefault: true', ok);
    } catch (err: any) {
      recordTest('Create Customer A address #2 with isDefault: true', false, err.message);
    }

    // 11. Verify Address #1 had default unset when Address #2 became default
    try {
      const res = await request('/customers/me/addresses', { token: tokenCustA });
      const addr1 = res.json.data.find((a: any) => a.id === addrA1Id);
      const addr2 = res.json.data.find((a: any) => a.id === addrA2Id);
      const ok = res.status === 200 && addr1.is_default === 0 && addr2.is_default === 1;
      recordTest('Atomically transfer default flag between multiple customer addresses', ok);
    } catch (err: any) {
      recordTest('Atomically transfer default flag between multiple customer addresses', false, err.message);
    }

    // 12. Strict IDOR Security: Customer B attempts to view Customer A's addresses
    try {
      const res = await request('/customers/me/addresses', { token: tokenCustB });
      const leaked = res.json.data.some((a: any) => a.customer_id === userCustAId);
      recordTest('Zero-Trust IDOR: Customer B cannot view Customer A saved addresses', !leaked && res.status === 200);
    } catch (err: any) {
      recordTest('Zero-Trust IDOR: Customer B cannot view Customer A saved addresses', false, err.message);
    }

    // 13. Strict IDOR Security: Customer B attempts to update Customer A's address
    try {
      const res = await request(`/customers/me/addresses/${addrA1Id}`, {
        method: 'PUT',
        token: tokenCustB,
        body: { houseBuilding: 'HACKED BUILDING' },
      });
      const ok = res.status === 403 || res.status === 404;
      recordTest('Zero-Trust IDOR: Customer B is blocked from modifying Customer A address (403/404)', ok);
    } catch (err: any) {
      recordTest('Zero-Trust IDOR: Customer B is blocked from modifying Customer A address', false, err.message);
    }

    // 14. Strict IDOR Security: Customer B attempts to delete Customer A's address
    try {
      const res = await request(`/customers/me/addresses/${addrA1Id}`, {
        method: 'DELETE',
        token: tokenCustB,
      });
      const ok = res.status === 403 || res.status === 404;
      recordTest('Zero-Trust IDOR: Customer B is blocked from deleting Customer A address', ok);
    } catch (err: any) {
      recordTest('Zero-Trust IDOR: Customer B is blocked from deleting Customer A address', false, err.message);
    }

    // 15. Set Default Address via Dedicated Endpoint (PATCH /addresses/:id/default)
    try {
      const res = await request(`/customers/me/addresses/${addrA1Id}/default`, {
        method: 'PATCH',
        token: tokenCustA,
      });
      const ok = res.status === 200 && res.json.data.is_default === 1;
      recordTest('Customer A restores Address #1 as primary default', ok);
    } catch (err: any) {
      recordTest('Customer A restores Address #1 as primary default', false, err.message);
    }

    // 16. Notification Preferences: GET & PATCH
    try {
      const updateRes = await request('/customers/me/settings', {
        method: 'PATCH',
        token: tokenCustA,
        body: { promos: true, chat: false },
      });
      const ok = updateRes.status === 200 && updateRes.json.data.promos === true && updateRes.json.data.chat === false;
      recordTest('Customer A updates granular notification preferences', ok);
    } catch (err: any) {
      recordTest('Customer A updates granular notification preferences', false, err.message);
    }

    // 17. Farmer Private Profile (GET /farmers/me/profile)
    try {
      const res = await request('/farmers/me/profile', { token: tokenFarmA });
      const ok =
        res.status === 200 &&
        res.json.data.userId === userFarmAId &&
        res.json.data.halderId === halderFarmAId &&
        res.json.data.farmName === 'Organic Valley Test Farm' &&
        res.json.data.bankDetails !== undefined;
      recordTest('Farmer A retrieves private profile including bank details', ok);
    } catch (err: any) {
      recordTest('Farmer A retrieves private profile including bank details', false, err.message);
    }

    // 18. Farmer Public Profile (GET /farmers/:id/public) - Zero Data Leakage
    try {
      const res = await request(`/farmers/${farmerAProfileId}/public`);
      const d = res.json.data;
      const ok =
        res.status === 200 &&
        d.name === 'Test Farmer A' &&
        d.halderId === halderFarmAId &&
        d.farmName === 'Organic Valley Test Farm' &&
        d.bankDetails === undefined &&
        d.bank_account_number === undefined &&
        d.upiId === undefined &&
        d.kyc_document_url === undefined;
      recordTest('Public Farmer Profile strips all sensitive banking, KYC, and financial data', ok);
    } catch (err: any) {
      recordTest('Public Farmer Profile strips all sensitive banking, KYC, and financial data', false, err.message);
    }

    // 19. Farmer Profile Update (PATCH /farmers/me/profile)
    try {
      const res = await request('/farmers/me/profile', {
        method: 'PATCH',
        token: tokenFarmA,
        body: {
          farmName: 'Organic Valley Test Estate',
          farmSizeAcres: 12.5,
          waterSource: 'Natural Himalayan Spring Water',
        },
      });
      const ok =
        res.status === 200 &&
        res.json.data.farmName === 'Organic Valley Test Estate' &&
        res.json.data.farmSizeAcres === 12.5 &&
        res.json.data.waterSource === 'Natural Himalayan Spring Water';
      recordTest('Farmer A updates farm practices and acreage', ok);
    } catch (err: any) {
      recordTest('Farmer A updates farm practices and acreage', false, err.message);
    }

    // 20. Non-Farmer Role Restriction on Farmer Private Profile
    try {
      const res = await request('/farmers/me/profile', { token: tokenCustA });
      const ok = res.status === 403;
      recordTest('Customer blocked from accessing farmer private management profile (403 Forbidden)', ok);
    } catch (err: any) {
      recordTest('Customer blocked from accessing farmer private management profile', false, err.message);
    }

    // 21. Password Change Workflow (POST /auth/change-password)
    try {
      const res = await request('/auth/change-password', {
        method: 'POST',
        token: tokenCustA,
        body: {
          currentPassword: 'Password123!',
          newPassword: 'BrandNewSecurePassword456!',
        },
      });
      const ok = res.status === 200 && res.json.data.message.includes('Password updated');
      recordTest('Customer A successfully changes password with bcrypt verification', ok);
    } catch (err: any) {
      recordTest('Customer A successfully changes password with bcrypt verification', false, err.message);
    }

    // 22. Verify Login with New Password
    try {
      const res = await request('/auth/login', {
        method: 'POST',
        body: {
          emailOrPhone: customerAData.email,
          password: 'BrandNewSecurePassword456!',
        },
      });
      const ok = res.status === 200 && Boolean(res.json.data.token);
      recordTest('Customer A logs in successfully with updated password', ok);
    } catch (err: any) {
      recordTest('Customer A logs in successfully with updated password', false, err.message);
    }

    // 23. Reject Login with Old Password
    try {
      const res = await request('/auth/login', {
        method: 'POST',
        body: {
          emailOrPhone: customerAData.email,
          password: 'Password123!',
        },
      });
      const ok = res.status === 401;
      recordTest('Old password is fully invalidated and rejected', ok);
    } catch (err: any) {
      recordTest('Old password is fully invalidated and rejected', false, err.message);
    }

    // 24. Account Deletion Workflow (POST /auth/delete-account)
    try {
      const res = await request('/auth/delete-account', {
        method: 'POST',
        token: tokenCustA,
        body: { password: 'BrandNewSecurePassword456!' },
      });
      const ok = res.status === 200;

      const userRecord = Database.get<any>('SELECT name, status, profile_image FROM users WHERE id = ?', [userCustAId]);
      const addrCount = Database.get<any>('SELECT COUNT(*) as cnt FROM customer_addresses WHERE customer_id = ?', [userCustAId])?.cnt;
      const profRecord = Database.get<any>('SELECT id FROM customer_profiles WHERE user_id = ?', [userCustAId]);

      const isPurged =
        userRecord.status === 'suspended' &&
        userRecord.name === 'Deleted Account' &&
        addrCount === 0 &&
        !profRecord;

      recordTest('Permanent account deletion purges personal data, addresses, and suspends user', ok && isPurged);
    } catch (err: any) {
      recordTest('Permanent account deletion purges personal data, addresses, and suspends user', false, err.message);
    }

    // 25. Deleted user cannot log in anymore
    try {
      const res = await request('/auth/login', {
        method: 'POST',
        body: {
          emailOrPhone: customerAData.email,
          password: 'BrandNewSecurePassword456!',
        },
      });
      const ok = res.status === 401;
      recordTest('Deleted / suspended account cannot authenticate again', ok);
    } catch (err: any) {
      recordTest('Deleted / suspended account cannot authenticate again', false, err.message);
    }

    // 26. Concurrency Stress Test: Parallel Address Creations for Customer B
    try {
      const promises = Array.from({ length: 6 }).map((_, idx) =>
        request('/customers/me/addresses', {
          method: 'POST',
          token: tokenCustB,
          body: {
            label: `Loc ${idx + 1}`,
            name: `Customer B Loc ${idx + 1}`,
            phone: '9871110000',
            houseBuilding: `Building ${idx + 1}`,
            streetLocality: 'Ring Road',
            city: 'Dehradun',
            state: 'Uttarakhand',
            postalCode: '248001',
          },
        })
      );

      const results = await Promise.all(promises);
      const allSuccessful = results.every((r) => r.status === 201);
      const countInDb = Database.get<any>(
        'SELECT COUNT(*) as cnt FROM customer_addresses WHERE customer_id = ?',
        [userCustBId]
      )?.cnt;

      recordTest('Concurrency Test: 6 parallel address creation requests succeed without DB lock contention', allSuccessful && countInDb >= 6);
    } catch (err: any) {
      recordTest('Concurrency Test: Parallel address creation', false, err.message);
    }

    console.log('\n------------------------------------------------------');
    console.log(`TOTAL PROFILE & SECURITY TESTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
    console.log('------------------------------------------------------\n');

    if (passed !== total) {
      process.exit(1);
    }
  } finally {
    if (server) {
      server.close();
    }
  }
}

runProfileSystemTests().catch((err) => {
  console.error('Test execution failed:', err);
  if (server) server.close();
  process.exit(1);
});
