import { app } from '../src/app';
import { Database } from '../src/db/database';

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

// 1x1 transparent PNG in base64 Data URL format for testing
const SAMPLE_AVATAR_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function runVerification() {
  console.log('\n=============================================================');
  console.log('HALDER — End-to-End Profile Information Persistence Test');
  console.log('=============================================================\n');

  server = app.listen(PORT);
  await new Promise((resolve) => setTimeout(resolve, 300));

  let passed = 0;
  let total = 0;

  function assertTest(name: string, ok: boolean, details?: any) {
    total++;
    if (ok) {
      passed++;
      console.log(`  [PASS] #${total}: ${name}`);
    } else {
      console.error(`  [FAIL] #${total}: ${name}`);
      if (details) console.error('         Details:', JSON.stringify(details));
      process.exitCode = 1;
    }
  }

  try {
    const timestamp = Date.now().toString().slice(-6);

    // =========================================================================
    // PART 1: CUSTOMER / BUYER PERSISTENCE VERIFICATION
    // =========================================================================
    console.log('--- 1. Testing Customer Profile Persistence ---');
    
    const customerEmail = `buyer_test_${timestamp}@halder.org`;
    const customerPhone = `9870${timestamp}`;
    const customerPassword = 'SecureBuyerPass123!';

    const regCust = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Initial Buyer Name',
        email: customerEmail,
        phone: customerPhone,
        password: customerPassword,
        role: 'customer',
      },
    });

    assertTest(
      'Register Customer account',
      regCust.status === 201 && regCust.json?.success === true,
      regCust.json
    );

    const custToken = regCust.json?.data?.token;
    const custUserId = regCust.json?.data?.user?.id;
    assertTest('Customer JWT token generated', Boolean(custToken && custUserId));

    // Upload Customer Avatar
    const uploadCustAvatar = await request('/customers/me/avatar', {
      method: 'POST',
      token: custToken,
      body: { avatar: SAMPLE_AVATAR_BASE64 },
    });

    assertTest(
      'Upload Customer profile picture (avatar)',
      uploadCustAvatar.status === 200 && uploadCustAvatar.json?.success === true,
      uploadCustAvatar.json
    );

    // Update Customer Profile Details
    const updatedCustName = 'Rohan Deshmukh';
    const updatedCustPhone = `9871${timestamp}`;
    const updatedCustBio = 'Organic produce enthusiast looking for fresh Pahadi apples and wild honey.';

    const updateCust = await request('/customers/me', {
      method: 'PATCH',
      token: custToken,
      body: {
        name: updatedCustName,
        phone: updatedCustPhone,
        bio: updatedCustBio,
      },
    });

    assertTest(
      'Update Customer name, phone, and bio via PATCH /customers/me',
      updateCust.status === 200 && updateCust.json?.success === true,
      updateCust.json
    );

    // Fetch Private Profile via API
    const getCust = await request('/customers/me', {
      method: 'GET',
      token: custToken,
    });

    const custData = getCust.json?.data;
    assertTest(
      'API GET /customers/me returns updated name',
      custData?.name === updatedCustName,
      { expected: updatedCustName, got: custData?.name }
    );
    assertTest(
      'API GET /customers/me returns updated phone',
      custData?.phone === updatedCustPhone,
      { expected: updatedCustPhone, got: custData?.phone }
    );
    assertTest(
      'API GET /customers/me returns updated bio',
      custData?.bio === updatedCustBio,
      { expected: updatedCustBio, got: custData?.bio }
    );
    assertTest(
      'API GET /customers/me returns updated avatar URL',
      Boolean(custData?.avatar && (custData.avatar.startsWith('http') || custData.avatar.startsWith('/uploads/') || custData.avatar.startsWith('data:'))),
      { avatar: custData?.avatar }
    );

    // Direct Database Table Verification for Customer
    const userRow = Database.get<any>('SELECT * FROM users WHERE id = ?', [custUserId]);
    const custProfRow = Database.get<any>('SELECT * FROM customer_profiles WHERE user_id = ?', [custUserId]);

    assertTest(
      'Direct DB Check: users.name updated in SQLite',
      userRow?.name === updatedCustName,
      userRow?.name
    );
    assertTest(
      'Direct DB Check: users.phone updated in SQLite',
      userRow?.phone === updatedCustPhone,
      userRow?.phone
    );
    assertTest(
      'Direct DB Check: users.profile_image contains avatar in SQLite',
      Boolean(userRow?.profile_image && (userRow.profile_image.startsWith('http') || userRow.profile_image.startsWith('/uploads/') || userRow.profile_image.startsWith('data:'))),
      { len: userRow?.profile_image?.length, avatar: userRow?.profile_image }
    );
    assertTest(
      'Direct DB Check: customer_profiles.bio updated in SQLite',
      custProfRow?.bio === updatedCustBio,
      custProfRow?.bio
    );
    assertTest(
      'Direct DB Check: customer_profiles.avatar contains avatar in SQLite',
      Boolean(custProfRow?.avatar && custProfRow.avatar === userRow?.profile_image),
      { len: custProfRow?.avatar?.length, avatar: custProfRow?.avatar }
    );

    // =========================================================================
    // PART 2: FARMER PERSISTENCE VERIFICATION
    // =========================================================================
    console.log('\n--- 2. Testing Farmer Profile Persistence ---');

    const farmerEmail = `farmer_test_${timestamp}@halder.org`;
    const farmerPhone = `9872${timestamp}`;
    const farmerPassword = 'SecureFarmerPass123!';

    const regFarm = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Initial Farmer Name',
        email: farmerEmail,
        phone: farmerPhone,
        password: farmerPassword,
        role: 'farmer',
        farmName: 'Initial Orchard',
        location: 'Doon Valley',
      },
    });

    assertTest(
      'Register Farmer account',
      regFarm.status === 201 && regFarm.json?.success === true,
      regFarm.json
    );

    const farmToken = regFarm.json?.data?.token;
    const farmUserId = regFarm.json?.data?.user?.id;
    assertTest('Farmer JWT token generated', Boolean(farmToken && farmUserId));

    // Upload Farmer Avatar
    const uploadFarmAvatar = await request('/farmers/me/avatar', {
      method: 'POST',
      token: farmToken,
      body: { avatar: SAMPLE_AVATAR_BASE64 },
    });

    assertTest(
      'Upload Farmer farm photo (avatar)',
      uploadFarmAvatar.status === 200 && uploadFarmAvatar.json?.success === true,
      uploadFarmAvatar.json
    );

    // Update Farmer Profile Details
    const updatedFarmOwnerName = 'Balwant Singh Negi';
    const updatedFarmPhone = `9873${timestamp}`;
    const updatedFarmName = 'Negi Organic Himalayan Agro Farm';
    const updatedFarmDesc = 'Pure organic Pahadi garlic, Kinnow, and chemical-free basmati rice.';
    const updatedFarmLocation = 'Mussoorie Foothills, Dehradun';
    const updatedFarmCity = 'Dehradun';
    const updatedFarmSize = 8.5;
    const updatedWaterSource = 'Natural Himalayan Spring Water';
    const updatedExperience = 15;

    const updateFarm = await request('/farmers/me/profile', {
      method: 'PATCH',
      token: farmToken,
      body: {
        name: updatedFarmOwnerName,
        phone: updatedFarmPhone,
        farmName: updatedFarmName,
        description: updatedFarmDesc,
        location: updatedFarmLocation,
        city: updatedFarmCity,
        farmSizeAcres: updatedFarmSize,
        waterSource: updatedWaterSource,
        experienceYears: updatedExperience,
      },
    });

    assertTest(
      'Update Farmer details via PATCH /farmers/me/profile',
      updateFarm.status === 200 && updateFarm.json?.success === true,
      updateFarm.json
    );

    // Fetch Private Farmer Profile via API
    const getFarm = await request('/farmers/me/profile', {
      method: 'GET',
      token: farmToken,
    });

    const farmData = getFarm.json?.data;
    assertTest(
      'API GET /farmers/me/profile returns updated owner name',
      farmData?.name === updatedFarmOwnerName,
      { expected: updatedFarmOwnerName, got: farmData?.name }
    );
    assertTest(
      'API GET /farmers/me/profile returns updated phone',
      farmData?.phone === updatedFarmPhone,
      { expected: updatedFarmPhone, got: farmData?.phone }
    );
    assertTest(
      'API GET /farmers/me/profile returns updated farmName',
      farmData?.farmName === updatedFarmName,
      { expected: updatedFarmName, got: farmData?.farmName }
    );
    assertTest(
      'API GET /farmers/me/profile returns updated description',
      farmData?.description === updatedFarmDesc,
      { expected: updatedFarmDesc, got: farmData?.description }
    );
    assertTest(
      'API GET /farmers/me/profile returns updated location',
      farmData?.location === updatedFarmLocation,
      { expected: updatedFarmLocation, got: farmData?.location }
    );
    assertTest(
      'API GET /farmers/me/profile returns updated city',
      farmData?.city === updatedFarmCity,
      { expected: updatedFarmCity, got: farmData?.city }
    );
    assertTest(
      'API GET /farmers/me/profile returns updated farmSizeAcres',
      farmData?.farmSizeAcres === updatedFarmSize,
      { expected: updatedFarmSize, got: farmData?.farmSizeAcres }
    );
    assertTest(
      'API GET /farmers/me/profile returns updated avatar URL',
      Boolean(farmData?.avatar && (farmData.avatar.startsWith('http') || farmData.avatar.startsWith('/uploads/') || farmData.avatar.startsWith('data:'))),
      { avatar: farmData?.avatar }
    );

    // Direct Database Table Verification for Farmer
    const farmUserRow = Database.get<any>('SELECT * FROM users WHERE id = ?', [farmUserId]);
    const farmProfRow = Database.get<any>('SELECT * FROM farmer_profiles WHERE user_id = ?', [farmUserId]);

    assertTest(
      'Direct DB Check: users.name updated for Farmer in SQLite',
      farmUserRow?.name === updatedFarmOwnerName,
      farmUserRow?.name
    );
    assertTest(
      'Direct DB Check: users.phone updated for Farmer in SQLite',
      farmUserRow?.phone === updatedFarmPhone,
      farmUserRow?.phone
    );
    assertTest(
      'Direct DB Check: users.profile_image contains avatar in SQLite',
      Boolean(farmUserRow?.profile_image && (farmUserRow.profile_image.startsWith('http') || farmUserRow.profile_image.startsWith('/uploads/') || farmUserRow.profile_image.startsWith('data:'))),
      { len: farmUserRow?.profile_image?.length, avatar: farmUserRow?.profile_image }
    );
    assertTest(
      'Direct DB Check: farmer_profiles.farm_name updated in SQLite',
      farmProfRow?.farm_name === updatedFarmName,
      farmProfRow?.farm_name
    );
    assertTest(
      'Direct DB Check: farmer_profiles.description updated in SQLite',
      farmProfRow?.description === updatedFarmDesc,
      farmProfRow?.description
    );
    assertTest(
      'Direct DB Check: farmer_profiles.location updated in SQLite',
      farmProfRow?.location === updatedFarmLocation,
      farmProfRow?.location
    );
    assertTest(
      'Direct DB Check: farmer_profiles.city updated in SQLite',
      farmProfRow?.city === updatedFarmCity,
      farmProfRow?.city
    );
    assertTest(
      'Direct DB Check: farmer_profiles.avatar contains avatar in SQLite',
      Boolean(farmProfRow?.avatar && farmProfRow.avatar === farmUserRow?.profile_image),
      { len: farmProfRow?.avatar?.length, avatar: farmProfRow?.avatar }
    );

    // =========================================================================
    // PART 3: ADMIN AUTHENTICATION & LOGOUT VERIFICATION
    // =========================================================================
    console.log('\n--- 3. Testing Admin Authentication & Logout Endpoint ---');

    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        usernameOrEmail: 'admin',
        password: 'HalderAdmin@2026!',
      },
    });

    assertTest(
      'Admin authenticates successfully with credentials',
      adminLogin.status === 200 && adminLogin.json?.success === true,
      adminLogin.json
    );

    const adminToken = adminLogin.json?.data?.token;
    assertTest(
      'Admin token has admin role permissions',
      adminLogin.json?.data?.user?.role === 'admin' && Boolean(adminToken),
      adminLogin.json?.data?.user
    );

    const adminLogout = await request('/auth/logout', {
      method: 'POST',
      token: adminToken,
    });

    assertTest(
      'POST /auth/logout invalidates session cleanly',
      adminLogout.status === 200 && adminLogout.json?.success === true,
      adminLogout.json
    );

    console.log('\n-------------------------------------------------------------');
    console.log(`TOTAL VERIFICATION TESTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
    console.log('-------------------------------------------------------------\n');

  } catch (err: any) {
    console.error('Fatal error during test run:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    process.exit(process.exitCode || 0);
  }
}

runVerification();
