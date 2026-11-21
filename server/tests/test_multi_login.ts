import { app } from '../src/app';

const PORT = 5099;
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

async function runMultiLoginTest() {
  console.log('\n======================================================');
  console.log('HALDER — Multi-Format Authentication Test (Username, Gmail, Phone)');
  console.log('======================================================\n');

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
    const salt = Date.now().toString().slice(-6);
    const testUser = {
      username: `kisan_${salt}`,
      name: 'Ramesh Singh',
      email: `ramesh_${salt}@gmail.com`,
      phone: `+91 9870${salt.padStart(6, '0')}`,
      password: 'MyPassword123!',
      role: 'farmer' as const,
      farmName: 'Ramesh Organic Nursery',
      location: 'Dehradun',
    };

    const tenDigitPhone = `9870${salt.padStart(6, '0')}`;
    const plus91NoSpace = `+91${tenDigitPhone}`;
    const plus91WithSpace = `+91 ${tenDigitPhone.slice(0, 5)} ${tenDigitPhone.slice(5)}`;

    // 1. Register User
    const reg = await request('/auth/register', {
      method: 'POST',
      body: testUser,
    });
    assertTest('Register test farmer with username, email, phone & password', reg.status === 201 && reg.json?.success === true, reg.json);

    // 2. Login by Username
    const loginByUsername = await request('/auth/login', {
      method: 'POST',
      body: {
        usernameOrEmail: testUser.username,
        password: testUser.password,
      },
    });
    assertTest(
      'Login by USERNAME (@' + testUser.username + ') with password',
      loginByUsername.status === 200 && loginByUsername.json?.data?.user?.email === testUser.email,
      loginByUsername.json
    );

    // 3. Login by Gmail / Email ID
    const loginByEmail = await request('/auth/login', {
      method: 'POST',
      body: {
        usernameOrEmail: testUser.email,
        password: testUser.password,
      },
    });
    assertTest(
      'Login by GMAIL / EMAIL (' + testUser.email + ') with password',
      loginByEmail.status === 200 && loginByEmail.json?.data?.user?.username === testUser.username,
      loginByEmail.json
    );

    // 4. Login by 10-Digit Phone Number (e.g. 9870XXXXXX)
    const loginBy10DigitPhone = await request('/auth/login', {
      method: 'POST',
      body: {
        phone: tenDigitPhone,
        password: testUser.password,
      },
    });
    assertTest(
      'Login by 10-DIGIT PHONE (' + tenDigitPhone + ') with password',
      loginBy10DigitPhone.status === 200 && loginBy10DigitPhone.json?.data?.user?.email === testUser.email,
      loginBy10DigitPhone.json
    );

    // 5. Login by Phone with +91 (no space e.g. +919870XXXXXX)
    const loginByPlus91NoSpace = await request('/auth/login', {
      method: 'POST',
      body: {
        usernameOrEmail: plus91NoSpace,
        password: testUser.password,
      },
    });
    assertTest(
      'Login by +91 PHONE (' + plus91NoSpace + ') with password',
      loginByPlus91NoSpace.status === 200 && loginByPlus91NoSpace.json?.data?.user?.email === testUser.email,
      loginByPlus91NoSpace.json
    );

    // 6. Login by Phone with +91 and spaces (+91 XXXXX XXXXX)
    const loginByPlus91WithSpace = await request('/auth/login', {
      method: 'POST',
      body: {
        emailOrPhone: plus91WithSpace,
        password: testUser.password,
      },
    });
    assertTest(
      'Login by SPACED PHONE (' + plus91WithSpace + ') with password',
      loginByPlus91WithSpace.status === 200 && loginByPlus91WithSpace.json?.data?.user?.email === testUser.email,
      loginByPlus91WithSpace.json
    );

    // 7. Reject wrong password on phone login
    const loginWrongPass = await request('/auth/login', {
      method: 'POST',
      body: {
        phone: tenDigitPhone,
        password: 'WrongPassword999!',
      },
    });
    assertTest(
      'Reject login with incorrect password',
      loginWrongPass.status === 401 && loginWrongPass.json?.success === false,
      loginWrongPass.json
    );

    console.log('\n------------------------------------------------------');
    console.log(`TOTAL MULTI-LOGIN TESTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
    console.log('------------------------------------------------------\n');

  } catch (err: any) {
    console.error('Fatal error during test:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    process.exit(process.exitCode || 0);
  }
}

runMultiLoginTest();
