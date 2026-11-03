import http from 'http';
import { WebSocket, RawData } from 'ws';
import jwt from 'jsonwebtoken';
import { app } from '../src/app';
import { initChatSocket, ChatSocketService } from '../src/websocket/chatSocket';
import { Database } from '../src/db/database';
import { CryptoUtil } from '../src/utils/crypto';
import { env } from '../src/config/env';

const TEST_PORT = 5110;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;
const WS_URL = `ws://localhost:${TEST_PORT}/ws`;

let server: http.Server;
let wss: any;

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details?: string;
}

const testResults: TestResult[] = [];

function assertTest(suite: string, name: string, condition: boolean, details?: string) {
  testResults.push({ suite, name, passed: condition, details });
  if (condition) {
    console.log(`  ✅ [PASS] [${suite}] ${name}`);
  } else {
    console.error(`  ❌ [FAIL] [${suite}] ${name} ${details ? `(${details})` : ''}`);
  }
}

// Managed WebSocket helper for stress testing
class ManagedWsClient {
  public ws: WebSocket;
  public messages: any[] = [];
  public errors: any[] = [];
  private eventListeners: Array<{
    eventType: string;
    predicate?: (data: any) => boolean;
    resolve: (data: any) => void;
    reject: (err: any) => void;
    timer: NodeJS.Timeout;
  }> = [];

  constructor(url: string, token?: string) {
    const fullUrl = token ? `${url}?token=${token}` : url;
    this.ws = new WebSocket(fullUrl);

    this.ws.on('message', (data: RawData) => {
      try {
        const parsed = JSON.parse(data.toString('utf-8'));
        const type = parsed.type || parsed.event;

        const listenerIdx = this.eventListeners.findIndex((l) => {
          const typeMatch =
            l.eventType === '*' ||
            type === l.eventType ||
            (l.eventType.startsWith('chat:') && type === l.eventType.slice(5)) ||
            (typeof type === 'string' && type.startsWith('chat:') && l.eventType === type.slice(5));
          return typeMatch && (l.predicate ? l.predicate(parsed) : true);
        });

        if (listenerIdx !== -1) {
          const l = this.eventListeners.splice(listenerIdx, 1)[0];
          clearTimeout(l.timer);
          l.resolve(parsed);
        } else {
          this.messages.push(parsed);
        }
      } catch (e) {
        this.messages.push({ raw: data.toString('utf-8') });
      }
    });

    this.ws.on('error', (err) => {
      this.errors.push(err);
    });
  }

  waitForOpen(timeoutMs = 4000): Promise<void> {
    if (this.ws.readyState === WebSocket.OPEN) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('WS connection timeout')), timeoutMs);
      this.ws.on('open', () => {
        clearTimeout(timer);
        resolve();
      });
      this.ws.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  waitForEvent(eventType: string, timeoutMs = 4000, predicate?: (data: any) => boolean): Promise<any> {
    const existingIdx = this.messages.findIndex((m) => {
      const type = m.type || m.event;
      const typeMatch =
        eventType === '*' ||
        type === eventType ||
        (eventType.startsWith('chat:') && type === eventType.slice(5)) ||
        (typeof type === 'string' && type.startsWith('chat:') && eventType === type.slice(5));
      return typeMatch && (predicate ? predicate(m) : true);
    });

    if (existingIdx !== -1) {
      return Promise.resolve(this.messages.splice(existingIdx, 1)[0]);
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.eventListeners.findIndex((l) => l.timer === timer);
        if (idx !== -1) this.eventListeners.splice(idx, 1);
        reject(new Error(`Timeout waiting for event '${eventType}' after ${timeoutMs}ms. Buffered: ${JSON.stringify(this.messages)}`));
      }, timeoutMs);

      this.eventListeners.push({ eventType, predicate, resolve, reject, timer });
    });
  }

  send(data: any) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
        resolve();
      } else {
        this.ws.on('close', () => resolve());
        this.ws.close();
      }
    });
  }
}

// REST request helper
async function restRequest(endpoint: string, options: {
  method?: string;
  token?: string;
  body?: any;
  headers?: Record<string, string>;
} = {}) {
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
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
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

async function runAdversarialStressSuite() {
  console.log('========================================================================');
  console.log('⚔️  HALDER REAL-TIME CHAT ADVERSARIAL PENETRATION & STRESS HARNESS');
  console.log('========================================================================\n');

  server = http.createServer(app);
  wss = initChatSocket(server);

  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`[Adversarial Test Server] Live on http://localhost:${TEST_PORT} | ws://localhost:${TEST_PORT}/ws\n`);
      resolve();
    });
  });

  // Track database cleanup
  const cleanupUsers: string[] = [];
  const cleanupFarmers: string[] = [];
  const cleanupProducts: string[] = [];
  const cleanupConversations: string[] = [];
  const activeSockets: ManagedWsClient[] = [];

  try {
    const timestamp = Date.now();
    const now = new Date().toISOString();

    // ========================================================================
    // SETUP: Create Valid and Adversarial Entities in SQLite
    // ========================================================================
    console.log('--- Setting Up Tenant Entities in SQLite ---');

    // Tenant 1: Customer Alpha (Aman) & Farmer Alpha (Rajesh)
    const custAlphaId = `user-adv-cust-a-${timestamp}`;
    const custAlphaEmail = `aman.alpha.${timestamp}@halder.com`;
    Database.run(
      `INSERT INTO users (id, halder_id, name, email, phone, password_hash, role, status, created_at, updated_at)
       VALUES (?, 'HAL-CUS-A1', 'Aman Alpha', ?, '+91 9800000001', 'hashpass', 'customer', 'active', ?, ?)`,
      [custAlphaId, custAlphaEmail, now, now]
    );
    cleanupUsers.push(custAlphaId);

    const farmerAlphaUserId = `user-adv-farm-a-${timestamp}`;
    const farmerAlphaProfileId = `farmer-adv-prof-a-${timestamp}`;
    const farmerAlphaEmail = `rajesh.alpha.${timestamp}@orchard.in`;
    Database.run(
      `INSERT INTO users (id, halder_id, name, email, phone, password_hash, role, status, created_at, updated_at)
       VALUES (?, 'HAL-FRM-A1', 'Rajesh Alpha', ?, '+91 9800000002', 'hashpass', 'farmer', 'active', ?, ?)`,
      [farmerAlphaUserId, farmerAlphaEmail, now, now]
    );
    Database.run(
      `INSERT INTO farmer_profiles (id, user_id, farm_name, description, location, city, verification_status, rating, total_orders, joined_year, created_at, updated_at)
       VALUES (?, ?, 'Alpha Orchards', 'Fresh Apples', 'Chamba Valley', 'Tehri Garhwal', 'verified', 4.9, 100, 2022, ?, ?)`,
      [farmerAlphaProfileId, farmerAlphaUserId, now, now]
    );
    cleanupUsers.push(farmerAlphaUserId);
    cleanupFarmers.push(farmerAlphaProfileId);

    // Tenant 2: Customer Beta (Attacker Bob) & Farmer Beta (Attacker Vikram)
    const custBetaId = `user-adv-cust-b-${timestamp}`;
    const custBetaEmail = `bob.beta.${timestamp}@attacker.com`;
    Database.run(
      `INSERT INTO users (id, halder_id, name, email, phone, password_hash, role, status, created_at, updated_at)
       VALUES (?, 'HAL-CUS-B2', 'Bob Attacker', ?, '+91 9800000003', 'hashpass', 'customer', 'active', ?, ?)`,
      [custBetaId, custBetaEmail, now, now]
    );
    cleanupUsers.push(custBetaId);

    const farmerBetaUserId = `user-adv-farm-b-${timestamp}`;
    const farmerBetaProfileId = `farmer-adv-prof-b-${timestamp}`;
    const farmerBetaEmail = `vikram.beta.${timestamp}@attackerfarm.in`;
    Database.run(
      `INSERT INTO users (id, halder_id, name, email, phone, password_hash, role, status, created_at, updated_at)
       VALUES (?, 'HAL-FRM-B2', 'Vikram Attacker', ?, '+91 9800000004', 'hashpass', 'farmer', 'active', ?, ?)`,
      [farmerBetaUserId, farmerBetaEmail, now, now]
    );
    Database.run(
      `INSERT INTO farmer_profiles (id, user_id, farm_name, description, location, city, verification_status, rating, total_orders, joined_year, created_at, updated_at)
       VALUES (?, ?, 'Beta Farm', 'Grain & Mustard', 'Roorkee', 'Haridwar', 'verified', 4.5, 30, 2023, ?, ?)`,
      [farmerBetaProfileId, farmerBetaUserId, now, now]
    );
    cleanupUsers.push(farmerBetaUserId);
    cleanupFarmers.push(farmerBetaProfileId);

    // Suspended User (for Auth checks)
    const suspendedUserId = `user-adv-suspended-${timestamp}`;
    Database.run(
      `INSERT INTO users (id, halder_id, name, email, phone, password_hash, role, status, created_at, updated_at)
       VALUES (?, 'HAL-CUS-SUS', 'Suspended Malicious User', 'suspended@evil.com', '+91 9800000005', 'hashpass', 'customer', 'suspended', ?, ?)`,
      [suspendedUserId, now, now]
    );
    cleanupUsers.push(suspendedUserId);

    // Product Alpha
    const prodAlphaId = `prod-adv-a-${timestamp}`;
    Database.run(
      `INSERT OR IGNORE INTO categories (id, name, slug, emoji, image, created_at)
       VALUES ('cat-fruits', 'Fruits', 'fruits', '🍎', 'https://img.unsplash.com', ?)`,
      [now]
    );
    Database.run(
      `INSERT INTO products (id, farmer_id, category_id, name, slug, description, price, unit, available_quantity, is_organic, available_today, location, city, image, status, moderation_status, created_at, updated_at)
       VALUES (?, ?, 'cat-fruits', 'Royal Apples Alpha', 'royal-apples-alpha', 'Crisp apples', 150.0, 'kg', 500, 1, 1, 'Chamba', 'Tehri', 'https://img.unsplash.com', 'active', 'approved', ?, ?)`,
      [prodAlphaId, farmerAlphaProfileId, now, now]
    );
    cleanupProducts.push(prodAlphaId);

    // Tokens
    const tokenCustAlpha = CryptoUtil.generateToken({ userId: custAlphaId, role: 'customer', email: custAlphaEmail });
    const tokenFarmerAlpha = CryptoUtil.generateToken({ userId: farmerAlphaUserId, role: 'farmer', email: farmerAlphaEmail, farmerProfileId: farmerAlphaProfileId });
    const tokenCustBeta = CryptoUtil.generateToken({ userId: custBetaId, role: 'customer', email: custBetaEmail });
    const tokenFarmerBeta = CryptoUtil.generateToken({ userId: farmerBetaUserId, role: 'farmer', email: farmerBetaEmail, farmerProfileId: farmerBetaProfileId });
    const tokenSuspended = CryptoUtil.generateToken({ userId: suspendedUserId, role: 'customer', email: 'suspended@evil.com' });

    // Create Conversation Alpha (Between Customer Alpha and Farmer Alpha)
    const convAlphaRes = await restRequest('/chat/conversations', {
      method: 'POST',
      token: tokenCustAlpha,
      body: { farmerId: farmerAlphaProfileId, productId: prodAlphaId },
    });
    const convAlphaId = convAlphaRes.json?.data?.id || convAlphaRes.json?.id;
    if (convAlphaId) cleanupConversations.push(convAlphaId);

    assertTest('Setup', 'Conversation Alpha initialized in SQLite', !!convAlphaId && convAlphaRes.status === 200);

    // ========================================================================
    // SUITE 1: CONCURRENCY & SUBSCRIPTION FLOODING ATTACK
    // ========================================================================
    console.log('\n--- Suite 1: Concurrency & Subscription Flooding Attack ---');

    // 1.1 Rapid concurrent WebSocket connection flood (30 parallel connections)
    const concurrentClients: ManagedWsClient[] = [];
    const connectPromises: Promise<void>[] = [];

    for (let i = 0; i < 30; i++) {
      const client = new ManagedWsClient(WS_URL, tokenCustAlpha);
      concurrentClients.push(client);
      activeSockets.push(client);
      connectPromises.push(client.waitForOpen());
    }

    await Promise.all(connectPromises);
    assertTest(
      'Concurrency Flood',
      'Handled 30 rapid concurrent WebSocket connections without drop or error',
      concurrentClients.every((c) => c.ws.readyState === WebSocket.OPEN),
      `Connected count: ${ChatSocketService.getConnectedClientsCount()}`
    );

    // 1.2 Room subscription flooding: 1 socket blasting 50 rapid chat:join requests for arbitrary/fake room IDs
    const floodClient = concurrentClients[0];
    for (let i = 0; i < 50; i++) {
      floodClient.send({ type: 'chat:join', conversationId: `conv-fake-${i}` });
    }
    // Give server 200ms to process
    await new Promise((r) => setTimeout(r, 200));
    assertTest(
      'Subscription Flood',
      'Server survived 50 rapid room subscription requests on non-existent rooms without crashing',
      floodClient.ws.readyState === WebSocket.OPEN
    );

    // 1.3 Parallel message broadcast storm: 10 clients sending simultaneous messages into Conversation Alpha
    const joinedClients = concurrentClients.slice(0, 10);
    for (const c of joinedClients) {
      c.send({ type: 'chat:join', conversationId: convAlphaId });
    }
    await new Promise((r) => setTimeout(r, 300));

    const broadcastSendPromises = joinedClients.map((c, idx) => {
      c.send({
        type: 'chat:send',
        conversationId: convAlphaId,
        message: `Concurrent stress message burst #${idx}`,
      });
    });
    await Promise.all(broadcastSendPromises);
    await new Promise((r) => setTimeout(r, 500));

    // Check that all messages are persisted in DB
    const persistedStressMsgs = Database.query<any>(
      'SELECT id FROM messages WHERE conversation_id = ? AND message LIKE ?',
      [convAlphaId, 'Concurrent stress message burst #%']
    );
    assertTest(
      'Parallel Broadcast',
      `All 10 parallel messages saved cleanly into SQLite under concurrent load (Found: ${persistedStressMsgs.length}/10)`,
      persistedStressMsgs.length === 10
    );

    // 1.4 Abrupt socket disconnect storm: Close all 30 sockets simultaneously
    const closePromises = concurrentClients.map((c) => c.close());
    await Promise.all(closePromises);
    await new Promise((r) => setTimeout(r, 200));

    assertTest(
      'Disconnect Storm',
      'All 30 flooded sockets disconnected cleanly and room references emptied',
      ChatSocketService.getConnectedClientsCount() === 0,
      `Remaining active sockets: ${ChatSocketService.getConnectedClientsCount()}`
    );

    // ========================================================================
    // SUITE 2: IDOR PENETRATION & CRYPTOGRAPHIC FORGERY
    // ========================================================================
    console.log('\n--- Suite 2: IDOR Penetration & Cryptographic Forgery ---');

    // 2.1 Forged JWT: Signed with incorrect secret
    const fakeSecretToken = jwt.sign(
      { userId: custAlphaId, role: 'customer', email: custAlphaEmail },
      'forged-malicious-secret-key-12345',
      { expiresIn: '1h' }
    );
    const fakeSecretWs = new ManagedWsClient(WS_URL, fakeSecretToken);
    activeSockets.push(fakeSecretWs);
    await fakeSecretWs.waitForOpen();
    const fakeSecretConnected = await fakeSecretWs.waitForEvent('connected', 2000);
    assertTest(
      'Forged JWT',
      'WebSocket rejects token signed with wrong secret (authenticated = false)',
      fakeSecretConnected?.authenticated === false
    );
    await fakeSecretWs.close();

    // 2.2 None algorithm JWT attack
    const noneAlgToken = jwt.sign(
      { userId: custAlphaId, role: 'customer', email: custAlphaEmail },
      '',
      { algorithm: 'none' as any }
    );
    const noneAlgWs = new ManagedWsClient(WS_URL, noneAlgToken);
    activeSockets.push(noneAlgWs);
    await noneAlgWs.waitForOpen();
    const noneAlgConnected = await noneAlgWs.waitForEvent('connected', 2000);
    assertTest(
      'None-Alg JWT',
      'WebSocket rejects alg:none token (authenticated = false)',
      noneAlgConnected?.authenticated === false
    );
    await noneAlgWs.close();

    // 2.3 Suspended User Token
    const suspendedWs = new ManagedWsClient(WS_URL, tokenSuspended);
    activeSockets.push(suspendedWs);
    await suspendedWs.waitForOpen();
    const suspendedConnected = await suspendedWs.waitForEvent('connected', 2000);
    assertTest(
      'Suspended User Auth',
      'WebSocket blocks suspended user from authenticating (authenticated = false)',
      suspendedConnected?.authenticated === false
    );
    await suspendedWs.close();

    // 2.4 Token for non-existent user ID
    const ghostToken = jwt.sign(
      { userId: 'user-non-existent-ghost-12345', role: 'customer', email: 'ghost@ghost.com' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const ghostWs = new ManagedWsClient(WS_URL, ghostToken);
    activeSockets.push(ghostWs);
    await ghostWs.waitForOpen();
    const ghostConnected = await ghostWs.waitForEvent('connected', 2000);
    assertTest(
      'Ghost User Auth',
      'WebSocket blocks non-existent DB user ID from authenticating (authenticated = false)',
      ghostConnected?.authenticated === false
    );
    await ghostWs.close();

    // 2.5 Cross-Tenant REST IDOR Penetration Attempts
    // Attacker Bob (Customer Beta) attempts to read Conversation Alpha messages
    const idorCustGet = await restRequest(`/chat/conversations/${convAlphaId}/messages`, {
      method: 'GET',
      token: tokenCustBeta,
    });
    assertTest(
      'REST IDOR Read (Customer)',
      'Attacker Customer B blocked from reading Conversation Alpha messages (403 Forbidden)',
      idorCustGet.status === 403
    );

    // Attacker Bob (Customer Beta) attempts to inject message into Conversation Alpha
    const idorCustPost = await restRequest(`/chat/conversations/${convAlphaId}/messages`, {
      method: 'POST',
      token: tokenCustBeta,
      body: { message: 'Injected cross-tenant payload from Bob' },
    });
    assertTest(
      'REST IDOR Inject (Customer)',
      'Attacker Customer B blocked from posting into Conversation Alpha (403 Forbidden)',
      idorCustPost.status === 403
    );

    // Attacker Bob (Customer Beta) attempts to mark read on Conversation Alpha
    const idorCustRead = await restRequest(`/chat/conversations/${convAlphaId}/read`, {
      method: 'PATCH',
      token: tokenCustBeta,
    });
    assertTest(
      'REST IDOR Read-Receipt (Customer)',
      'Attacker Customer B blocked from spoofing read receipt on Conversation Alpha (403 Forbidden)',
      idorCustRead.status === 403
    );

    // Attacker Vikram (Farmer Beta) attempts to read Conversation Alpha messages
    const idorFarmerGet = await restRequest(`/chat/conversations/${convAlphaId}/messages`, {
      method: 'GET',
      token: tokenFarmerBeta,
    });
    assertTest(
      'REST IDOR Read (Farmer)',
      'Attacker Farmer B blocked from reading Conversation Alpha messages (403 Forbidden)',
      idorFarmerGet.status === 403
    );

    // Attacker Vikram (Farmer Beta) attempts to inject message into Conversation Alpha
    const idorFarmerPost = await restRequest(`/chat/conversations/${convAlphaId}/messages`, {
      method: 'POST',
      token: tokenFarmerBeta,
      body: { message: 'Injected cross-tenant payload from Farmer Vikram' },
    });
    assertTest(
      'REST IDOR Inject (Farmer)',
      'Attacker Farmer B blocked from posting into Conversation Alpha (403 Forbidden)',
      idorFarmerPost.status === 403
    );

    // 2.6 Cross-Tenant WebSocket IDOR Penetration
    const wsBob = new ManagedWsClient(WS_URL, tokenCustBeta);
    activeSockets.push(wsBob);
    await wsBob.waitForOpen();
    await wsBob.waitForEvent('connected', 2000);

    // Bob attempts to join Conversation Alpha room
    wsBob.send({ type: 'chat:join', conversationId: convAlphaId });
    const bobJoinError = await wsBob.waitForEvent('chat:error', 2000);
    assertTest(
      'WS IDOR Room Join',
      'Attacker Bob blocked from joining room Alpha with FORBIDDEN error',
      bobJoinError?.code === 'FORBIDDEN' && bobJoinError?.conversationId === convAlphaId
    );

    // Bob attempts to send message to Conversation Alpha room
    wsBob.send({ type: 'chat:send', conversationId: convAlphaId, message: 'Malicious WS message injection' });
    const bobSendError = await wsBob.waitForEvent('chat:error', 2000);
    assertTest(
      'WS IDOR Message Send',
      'Attacker Bob blocked from sending WS message to Conversation Alpha with FORBIDDEN error',
      bobSendError?.code === 'FORBIDDEN'
    );

    // Bob attempts to spoof typing indicator into Conversation Alpha
    // Set up legitimate listener on Farmer Alpha's socket to verify Bob's typing event is NEVER received
    const wsFarmerAlpha = new ManagedWsClient(WS_URL, tokenFarmerAlpha);
    activeSockets.push(wsFarmerAlpha);
    await wsFarmerAlpha.waitForOpen();
    await wsFarmerAlpha.waitForEvent('connected', 2000);
    wsFarmerAlpha.send({ type: 'chat:join', conversationId: convAlphaId });
    await wsFarmerAlpha.waitForEvent('chat:joined', 2000);

    let rogueTypingReceived = false;
    const typingTimeoutPromise = new Promise((resolve) => {
      wsFarmerAlpha.waitForEvent('chat:typing', 1000).then(() => {
        rogueTypingReceived = true;
      }).catch(() => {
        rogueTypingReceived = false;
      }).finally(resolve);
    });

    wsBob.send({ type: 'chat:typing', conversationId: convAlphaId, isTyping: true });
    await typingTimeoutPromise;

    assertTest(
      'WS IDOR Typing Spoof',
      'Attacker Bob unauthorized typing event was strictly discarded (0 broadcast to room)',
      rogueTypingReceived === false
    );

    // Bob attempts to mark read on Conversation Alpha via WS
    const dbUnreadBefore = Database.query<any>(
      'SELECT id FROM messages WHERE conversation_id = ? AND read_at IS NULL',
      [convAlphaId]
    );
    wsBob.send({ type: 'chat:read', conversationId: convAlphaId });
    await new Promise((r) => setTimeout(r, 200));

    const dbUnreadAfter = Database.query<any>(
      'SELECT id FROM messages WHERE conversation_id = ? AND read_at IS NULL',
      [convAlphaId]
    );
    assertTest(
      'WS IDOR Read Receipt Spoof',
      'Attacker Bob unauthorized read event caused zero DB modifications',
      dbUnreadBefore.length === dbUnreadAfter.length
    );

    await wsBob.close();
    await wsFarmerAlpha.close();

    // ========================================================================
    // SUITE 3: MESSAGE PAYLOAD BOUNDARY & FUZZING ATTACKS
    // ========================================================================
    console.log('\n--- Suite 3: Message Payload Boundary & Fuzzing Attacks ---');

    // 3.1 Extreme Length Payload (>10,000 characters) via REST API
    const extremeLengthPayload = 'A'.repeat(15000);
    const oversizedRestRes = await restRequest(`/chat/conversations/${convAlphaId}/messages`, {
      method: 'POST',
      token: tokenCustAlpha,
      body: { message: extremeLengthPayload },
    });
    assertTest(
      'Extreme Payload (REST)',
      '15,000 character REST message rejected by Zod schema (400 Bad Request)',
      oversizedRestRes.status === 400
    );

    // 3.2 SQL Injection Payloads via REST and WebSocket
    const sqlInjections = [
      "' OR '1'='1",
      "'; DROP TABLE messages; --",
      "\" UNION SELECT id, password_hash, email FROM users --",
      "' AND 1=cast((SELECT count(*) FROM users) as int) --",
      "admin' --",
    ];

    for (const sqlPayload of sqlInjections) {
      const sqlRes = await restRequest(`/chat/conversations/${convAlphaId}/messages`, {
        method: 'POST',
        token: tokenCustAlpha,
        body: { message: sqlPayload },
      });

      assertTest(
        'SQL Injection Defense',
        `SQL injection attempt '${sqlPayload}' safely stored as literal text without syntax/drop error (201 Created)`,
        sqlRes.status === 201 && sqlRes.json?.data?.message === sqlPayload
      );
    }

    // Verify messages table is intact
    const msgTableCount = Database.get<{ count: number }>('SELECT COUNT(*) as count FROM messages');
    assertTest(
      'Database Table Integrity',
      'SQLite messages table remains 100% intact after DROP TABLE SQL injection attempts',
      (msgTableCount?.count || 0) > 0
    );

    // 3.3 XSS & Malicious Script Injection Payloads
    const xssPayloads = [
      {
        raw: '<script>alert("XSS")</script>Hello Farmer',
        expectedNotToContain: '<script>',
      },
      {
        raw: '<img src=x onerror="fetch(\'http://attacker.com\')">Fresh Mangoes',
        expectedNotToContain: 'onerror',
      },
      {
        raw: '<iframe src="javascript:alert(1)"></iframe>Organic Wheat',
        expectedNotToContain: '<iframe',
      },
      {
        raw: '<svg/onload=alert(1)>Golden Apples',
        expectedNotToContain: 'onload',
      },
      {
        raw: 'javascript:alert(document.domain)',
        expectedNotToContain: 'javascript:',
      },
    ];

    for (const xss of xssPayloads) {
      const xssRes = await restRequest(`/chat/conversations/${convAlphaId}/messages`, {
        method: 'POST',
        token: tokenCustAlpha,
        body: { message: xss.raw },
      });

      const sanitizedStored = xssRes.json?.data?.message || '';
      const containsDangerousPattern = sanitizedStored.toLowerCase().includes(xss.expectedNotToContain.toLowerCase());

      assertTest(
        'XSS Sanitization',
        `Payload '${xss.raw.slice(0, 30)}...' sanitized safely (Dangerous token '${xss.expectedNotToContain}' neutralized)`,
        xssRes.status === 201 && !containsDangerousPattern,
        `Sanitized Output: "${sanitizedStored}"`
      );
    }

    // 3.4 Null Byte Injection
    const nullByteMsg = 'Namaste\0Rajesh\0Ji\0Fresh Produce';
    const nullByteRes = await restRequest(`/chat/conversations/${convAlphaId}/messages`, {
      method: 'POST',
      token: tokenCustAlpha,
      body: { message: nullByteMsg },
    });
    assertTest(
      'Null Byte Neutralization',
      'Null bytes stripped cleanly from incoming message payload',
      nullByteRes.status === 201 && !nullByteRes.json?.data?.message.includes('\0') && nullByteRes.json?.data?.message.includes('NamasteRajeshJiFresh Produce')
    );

    // 3.5 Complex Multilingual, Unicode, RTL & Emoji Strings
    const complexUnicodeStrings = [
      '🌾 नमस्ते किसान भाई! क्या 50 किलो ताज़ा सेब उपलब्ध हैं? (Hindi Devanagari)',
      '🚜 ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ ਜੀ! ਸਾਨੂੰ ਤਾਜ਼ੇ ਕਿੰਨੂ ਚਾਹੀਦੇ ਹਨ। (Punjabi Gurmukhi)',
      '🍎 नमस्कार! आम्हाला सेंद्रिय हापूस आंबा हवा आहे. (Marathi)',
      '🌾 নমস্কার! আমাদের টাটকা ফল ও সবজি প্রয়োজন। (Bengali)',
      'مرحبا بكم في سوق المزارعين (Arabic RTL)',
      'שלום לחקלאי הישיר (Hebrew RTL)',
      '👨‍🌾 🚜 🌾 🥭 🍎 ⚡️ 🇮🇳 (Multi-grapheme emojis & ZWJ sequences)',
      'Bidirectional Override test: \u202Ereversed\u202C text',
    ];

    for (const uStr of complexUnicodeStrings) {
      const uRes = await restRequest(`/chat/conversations/${convAlphaId}/messages`, {
        method: 'POST',
        token: tokenCustAlpha,
        body: { message: uStr },
      });

      assertTest(
        'Unicode & RTL Integrity',
        `Unicode payload preserved without encoding corruption: "${uStr.slice(0, 35)}..."`,
        uRes.status === 201 && uRes.json?.data?.message === uStr
      );
    }

    // 3.6 Malformed WebSocket Frames & Non-JSON Payloads
    const rawWsClient = new ManagedWsClient(WS_URL, tokenCustAlpha);
    activeSockets.push(rawWsClient);
    await rawWsClient.waitForOpen();
    await rawWsClient.waitForEvent('connected', 2000);

    // Send broken JSON
    rawWsClient.send('{{bad_malformed_json:::');
    const badJsonError = await rawWsClient.waitForEvent('chat:error', 2000);
    assertTest(
      'Malformed WS JSON',
      'Server handles malformed JSON frame gracefully with BAD_REQUEST error without dropping socket',
      badJsonError?.code === 'BAD_REQUEST' && rawWsClient.ws.readyState === WebSocket.OPEN
    );

    // Send unrecognized event type
    rawWsClient.send({ type: 'unknown_alien_event_type', foo: 'bar' });
    const unknownEventAck = await rawWsClient.waitForEvent('chat:unknown_event', 2000);
    assertTest(
      'Unrecognized WS Event',
      'Server handles unrecognized event gracefully with chat:unknown_event',
      unknownEventAck?.receivedType === 'unknown_alien_event_type'
    );

    await rawWsClient.close();

    // ========================================================================
    // SUITE 4: DISCONNECT/RECONNECT STORM & MULTI-DEVICE PRESENCE
    // ========================================================================
    console.log('\n--- Suite 4: Disconnect/Reconnect Storm & Multi-Device Presence ---');

    // 4.1 Rapid Reconnect Storm: 15 sequential quick connect/disconnect iterations
    let reconnectSuccesses = 0;
    for (let i = 0; i < 15; i++) {
      const quickClient = new ManagedWsClient(WS_URL, tokenCustAlpha);
      await quickClient.waitForOpen();
      await quickClient.waitForEvent('connected', 2000);
      quickClient.send({ type: 'chat:join', conversationId: convAlphaId });
      await quickClient.waitForEvent('chat:joined', 2000);
      await quickClient.close();
      reconnectSuccesses++;
    }

    assertTest(
      'Reconnect Storm',
      `Completed 15 consecutive connect-join-disconnect cycles without socket leak (${reconnectSuccesses}/15)`,
      reconnectSuccesses === 15
    );

    // 4.2 Multi-Device Presence: Customer Alpha connects with 2 distinct devices simultaneously
    const dev1 = new ManagedWsClient(WS_URL, tokenCustAlpha);
    const dev2 = new ManagedWsClient(WS_URL, tokenCustAlpha);
    activeSockets.push(dev1, dev2);

    await Promise.all([dev1.waitForOpen(), dev2.waitForOpen()]);
    await Promise.all([dev1.waitForEvent('connected', 2000), dev2.waitForEvent('connected', 2000)]);

    dev1.send({ type: 'chat:join', conversationId: convAlphaId });
    dev2.send({ type: 'chat:join', conversationId: convAlphaId });
    await Promise.all([dev1.waitForEvent('chat:joined', 2000), dev2.waitForEvent('chat:joined', 2000)]);

    assertTest(
      'Multi-Device Presence',
      'User is online across 2 concurrent active socket sessions',
      ChatSocketService.isUserOnline(custAlphaId) === true
    );

    // Farmer sends a message -> BOTH Dev 1 and Dev 2 must receive it
    const wsFarmer = new ManagedWsClient(WS_URL, tokenFarmerAlpha);
    activeSockets.push(wsFarmer);
    await wsFarmer.waitForOpen();
    await wsFarmer.waitForEvent('connected', 2000);
    wsFarmer.send({ type: 'chat:join', conversationId: convAlphaId });
    await wsFarmer.waitForEvent('chat:joined', 2000);

    const dev1MsgPromise = dev1.waitForEvent('chat:message', 3000);
    const dev2MsgPromise = dev2.waitForEvent('chat:message', 3000);

    wsFarmer.send({
      type: 'chat:send',
      conversationId: convAlphaId,
      message: 'Multi-device sync verification broadcast',
    });

    const [msgDev1, msgDev2] = await Promise.all([dev1MsgPromise, dev2MsgPromise]);
    assertTest(
      'Multi-Device Fanout',
      'Both concurrent devices for Customer A received real-time broadcast message',
      msgDev1?.message?.includes('Multi-device sync') && msgDev2?.message?.includes('Multi-device sync')
    );

    // Close Dev 1 -> Customer A should STILL be online because Dev 2 is connected
    await dev1.close();
    await new Promise((r) => setTimeout(r, 100));
    assertTest(
      'Partial Disconnect Presence',
      'Closing 1 of 2 user sockets maintains user online presence (isUserOnline = true)',
      ChatSocketService.isUserOnline(custAlphaId) === true
    );

    // Close Dev 2 -> Customer A should now be OFFLINE
    await dev2.close();
    await new Promise((r) => setTimeout(r, 100));
    assertTest(
      'Full Disconnect Presence',
      'Closing all user sockets accurately transitions user to offline (isUserOnline = false)',
      ChatSocketService.isUserOnline(custAlphaId) === false
    );

    await wsFarmer.close();

  } catch (err: any) {
    console.error('\n❌ Unhandled Exception in Adversarial Stress Harness:', err);
    assertTest('Unhanded Error', 'No uncaught exceptions', false, err.message);
  } finally {
    // -------------------------------------------------------------
    // TEARDOWN
    // -------------------------------------------------------------
    console.log('\n--- Cleaning Up Adversarial Test Resources ---');

    for (const client of activeSockets) {
      try {
        await client.close();
      } catch {}
    }

    try {
      for (const convId of cleanupConversations) {
        Database.run('DELETE FROM messages WHERE conversation_id = ?', [convId]);
        Database.run('DELETE FROM conversations WHERE id = ?', [convId]);
      }
      for (const prodId of cleanupProducts) {
        Database.run('DELETE FROM products WHERE id = ?', [prodId]);
      }
      for (const fpId of cleanupFarmers) {
        Database.run('DELETE FROM farmer_profiles WHERE id = ?', [fpId]);
      }
      for (const uId of cleanupUsers) {
        Database.run('DELETE FROM users WHERE id = ?', [uId]);
      }
    } catch (cleanupErr) {
      console.warn('Database cleanup warning:', cleanupErr);
    }

    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('[Adversarial Test Server] Closed successfully.');
        resolve();
      });
    });

    const total = testResults.length;
    const passed = testResults.filter((r) => r.passed).length;
    const failed = testResults.filter((r) => !r.passed).length;

    console.log('\n========================================================================');
    console.log(`📊 ADVERSARIAL STRESS TEST SUMMARY: ${passed}/${total} PASSED (${((passed / total) * 100).toFixed(1)}%)`);
    console.log(`   Failed Assertions: ${failed}`);
    console.log('========================================================================\n');

    if (failed > 0) {
      console.error('❌ ADVERSARIAL VERDICT: REJECT');
      process.exit(1);
    } else {
      console.log('🏆 ADVERSARIAL VERDICT: APPROVE (Zero-Trust Security & Concurrency Intact)');
      process.exit(0);
    }
  }
}

runAdversarialStressSuite();
