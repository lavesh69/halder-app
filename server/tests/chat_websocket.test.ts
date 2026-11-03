import http from 'http';
import { WebSocket } from 'ws';
import { app } from '../src/app';
import { initChatSocket, ChatSocketService } from '../src/websocket/chatSocket';
import { seedDatabase } from '../src/db/seed';
import { Database } from '../src/db/database';

const TEST_PORT = 5099;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;
const WS_URL = `ws://localhost:${TEST_PORT}/ws`;

let server: http.Server;
let custToken: string;
let custId: string;
let farmerToken: string;
let farmerUserId: string;
let farmerProfileId: string;
let unrelatedCustToken: string;
let unrelatedCustId: string;

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

class TestWsClient {
  public ws: WebSocket;
  private messageQueue: any[] = [];
  private listeners: { predicate: (msg: any) => boolean; resolve: (msg: any) => void; timer: any }[] = [];

  constructor(url: string) {
    this.ws = new WebSocket(url);

    this.ws.on('message', (data) => {
      let parsed: any;
      try {
        parsed = JSON.parse(data.toString('utf-8'));
      } catch {
        parsed = data.toString('utf-8');
      }

      // Check if any registered listener matches this incoming message
      const listenerIndex = this.listeners.findIndex((l) => l.predicate(parsed));
      if (listenerIndex !== -1) {
        const listener = this.listeners.splice(listenerIndex, 1)[0];
        clearTimeout(listener.timer);
        listener.resolve(parsed);
      } else {
        this.messageQueue.push(parsed);
      }
    });
  }

  waitForOpen(): Promise<void> {
    if (this.ws.readyState === WebSocket.OPEN) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.ws.on('open', () => resolve());
      this.ws.on('error', (err) => reject(err));
    });
  }

  send(data: any) {
    this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
  }

  waitForMessage(predicate: (msg: any) => boolean = () => true, timeoutMs = 4000): Promise<any> {
    const queueIndex = this.messageQueue.findIndex(predicate);
    if (queueIndex !== -1) {
      return Promise.resolve(this.messageQueue.splice(queueIndex, 1)[0]);
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.listeners.findIndex((l) => l.timer === timer);
        if (idx !== -1) this.listeners.splice(idx, 1);
        reject(new Error(`WebSocket message wait timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.listeners.push({ predicate, resolve, timer });
    });
  }

  close() {
    this.ws.close();
  }
}

async function runChatTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING WEBSOCKET & REST CHAT VERIFICATION SUITE');
  console.log('======================================================\n');

  await seedDatabase();

  server = http.createServer(app);
  initChatSocket(server);

  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`[Test Server] Live on ${BASE_URL} and ${WS_URL}\n`);
      resolve();
    });
  });

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
    // SETUP: Generate Tokens & Accounts
    // ----------------------------------------------------
    console.log('--- 1. Authentication & Setup ---');
    const custLogin = await request('/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'aman@halder.com', password: 'halder123' },
    });
    assert('Customer Aman Sharma login success (200)', custLogin.status === 200);
    custToken = custLogin.json.data.token;
    custId = custLogin.json.data.user.id;

    const farmLogin = await request('/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'rajesh@greenvalley.in', password: 'halder123' },
    });
    assert('Farmer Rajesh Kumar login success (200)', farmLogin.status === 200);
    farmerToken = farmLogin.json.data.token;
    farmerUserId = farmLogin.json.data.user.id;
    farmerProfileId = farmLogin.json.data.user.farmerProfileId || 'farmer-1';

    // Unrelated Customer
    const unrelatedLogin = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Snooping Stranger',
        email: `snooper_${Date.now()}@test.com`,
        phone: `+91 ${Math.floor(6000000000 + Math.random() * 3000000000)}`,
        password: 'password123',
        role: 'customer',
      },
    });
    assert('Unrelated Customer registration success (201)', unrelatedLogin.status === 201);
    unrelatedCustToken = unrelatedLogin.json.data.token;
    unrelatedCustId = unrelatedLogin.json.data.user.id;

    // ----------------------------------------------------
    // REST API CHAT ENDPOINTS
    // ----------------------------------------------------
    console.log('\n--- 2. REST API Chat Endpoints ---');

    // Create / get conversation between Aman and Farmer Rajesh
    const createConvRes = await request('/chat/conversations', {
      method: 'POST',
      token: custToken,
      body: {
        farmerId: farmerProfileId,
        productId: 'prod-1',
      },
    });
    assert('POST /chat/conversations: Customer creates/retrieves conversation with Farmer',
      createConvRes.status === 200 || createConvRes.status === 201
    );
    const convId = createConvRes.json.data.id || createConvRes.json.id;
    assert('Conversation ID generated and returned', !!convId);

    // List user conversations
    const listConvRes = await request('/chat/conversations', {
      token: custToken,
    });
    assert('GET /chat/conversations: Customer lists active conversations with other party details',
      listConvRes.status === 200 &&
      Array.isArray(listConvRes.json.data) &&
      listConvRes.json.data.some((c: any) => c.id === convId && c.otherParty?.role === 'farmer')
    );

    // Send REST Message (Customer -> Farmer)
    const sendMsgRes = await request(`/chat/conversations/${convId}/messages`, {
      method: 'POST',
      token: custToken,
      body: { message: 'Namaste Rajesh ji! Are fresh tomatoes available for delivery today?' },
    });
    assert('POST /chat/conversations/:id/messages: Customer sends message successfully (201)',
      sendMsgRes.status === 201 && !!sendMsgRes.json.data.id
    );
    const msgId1 = sendMsgRes.json.data.id;

    // Fetch Message History
    const getMsgsRes = await request(`/chat/conversations/${convId}/messages`, {
      token: custToken,
    });
    assert('GET /chat/conversations/:id/messages: Returns message history',
      getMsgsRes.status === 200 &&
      Array.isArray(getMsgsRes.json.data) &&
      getMsgsRes.json.data.some((m: any) => m.id === msgId1)
    );

    // REST IDOR: Unrelated Customer cannot view messages
    const idorGetRes = await request(`/chat/conversations/${convId}/messages`, {
      token: unrelatedCustToken,
    });
    assert('IDOR Protection: Unrelated user blocked from reading messages (403)', idorGetRes.status === 403);

    // REST IDOR: Unrelated Customer cannot send message
    const idorSendRes = await request(`/chat/conversations/${convId}/messages`, {
      method: 'POST',
      token: unrelatedCustToken,
      body: { message: 'Hacked message injection' },
    });
    assert('IDOR Protection: Unrelated user blocked from sending messages (403)', idorSendRes.status === 403);

    // Mark messages as read via REST
    const markReadRes = await request(`/chat/conversations/${convId}/read`, {
      method: 'PATCH',
      token: farmerToken,
    });
    assert('PATCH /chat/conversations/:id/read: Farmer marks messages as read (200)',
      markReadRes.status === 200 && markReadRes.json.success === true
    );

    // Verify read receipt in DB
    const dbMsg = Database.get<any>('SELECT read_at FROM messages WHERE id = ?', [msgId1]);
    assert('Message read_at timestamp persisted in SQLite', !!dbMsg.read_at);

    // ----------------------------------------------------
    // WEBSOCKET REAL-TIME LIVE CHAT TESTS
    // ----------------------------------------------------
    console.log('\n--- 3. WebSocket Real-Time Live Messaging & Typing ---');

    // Connect Customer WS with token in query string
    const custWs = new TestWsClient(`${WS_URL}?token=${custToken}`);
    await custWs.waitForOpen();
    const custInitMsg = await custWs.waitForMessage((m) => m.type === 'connected');
    assert('Customer WebSocket connected and authenticated via handshake',
      custInitMsg.type === 'connected' && custInitMsg.authenticated === true
    );

    // Connect Farmer WS
    const farmWs = new TestWsClient(`${WS_URL}?token=${farmerToken}`);
    await farmWs.waitForOpen();
    const farmInitMsg = await farmWs.waitForMessage((m) => m.type === 'connected');
    assert('Farmer WebSocket connected and authenticated via handshake',
      farmInitMsg.type === 'connected' && farmInitMsg.authenticated === true
    );

    // Customer joins conversation room
    custWs.send({ type: 'chat:join', conversationId: convId });
    const custJoinAck = await custWs.waitForMessage((m) => m.type === 'chat:joined');
    assert('Customer joins conversation room (chat:joined ack received)',
      custJoinAck.type === 'chat:joined' && custJoinAck.conversationId === convId
    );

    // Farmer joins conversation room
    farmWs.send({ type: 'chat:join', conversationId: convId });
    const farmJoinAck = await farmWs.waitForMessage((m) => m.type === 'chat:joined');
    assert('Farmer joins conversation room (chat:joined ack received)',
      farmJoinAck.type === 'chat:joined' && farmJoinAck.conversationId === convId
    );

    // WebSocket IDOR Test: Unrelated Customer attempts to join conversation room
    const snoopWs = new TestWsClient(`${WS_URL}?token=${unrelatedCustToken}`);
    await snoopWs.waitForOpen();
    await snoopWs.waitForMessage((m) => m.type === 'connected');
    snoopWs.send({ type: 'chat:join', conversationId: convId });
    const snoopJoinAck = await snoopWs.waitForMessage((m) => m.type === 'chat:error');
    assert('WebSocket Zero-Trust IDOR: Non-participant blocked from joining room with FORBIDDEN',
      snoopJoinAck.type === 'chat:error' && snoopJoinAck.code === 'FORBIDDEN'
    );
    snoopWs.close();

    // Farmer sends typing indicator -> Customer receives it
    farmWs.send({
      type: 'chat:typing',
      conversationId: convId,
      isTyping: true,
    });
    const typingEvent = await custWs.waitForMessage((m) => m.type === 'chat:typing');
    assert('Farmer broadcasts typing indicator -> Customer receives chat:typing event',
      typingEvent.type === 'chat:typing' &&
      typingEvent.conversationId === convId &&
      typingEvent.isTyping === true &&
      typingEvent.userId === farmerUserId
    );

    // Farmer sends live message -> Customer receives it in real-time
    const farmerReplyText = 'Ji Aman! Fresh harvest tomatoes are available, dispatched within 45 mins!';
    farmWs.send({
      type: 'chat:send',
      conversationId: convId,
      message: farmerReplyText,
    });

    const receivedLiveMsg = await custWs.waitForMessage((m) => m.type === 'chat:message');
    assert('Farmer sends live message -> Customer receives chat:message broadcast in real-time',
      receivedLiveMsg.type === 'chat:message' &&
      receivedLiveMsg.message === farmerReplyText &&
      receivedLiveMsg.senderRole === 'farmer'
    );

    // Verify the live message was persisted in SQLite
    const persistedMsg = Database.get<any>(
      'SELECT id, message, sender_role FROM messages WHERE conversation_id = ? AND message = ?',
      [convId, farmerReplyText]
    );
    assert('Live WebSocket message persisted into SQLite messages table',
      !!persistedMsg && persistedMsg.sender_role === 'farmer'
    );

    // Customer marks message as read over WebSocket -> Farmer receives read receipt
    custWs.send({
      type: 'chat:read',
      conversationId: convId,
    });
    const readReceiptEvent = await farmWs.waitForMessage((m) => m.type === 'chat:read');
    assert('Customer sends chat:read -> Farmer receives chat:read receipt event',
      readReceiptEvent.type === 'chat:read' &&
      readReceiptEvent.conversationId === convId &&
      !!readReceiptEvent.readAt
    );

    // Clean up WebSockets
    custWs.close();
    farmWs.close();

    // ----------------------------------------------------
    // CONVERSATIONS UNREAD COUNT VERIFICATION
    // ----------------------------------------------------
    console.log('\n--- 4. Unread Badge Count Accuracy ---');
    // Send a message from Customer to Farmer
    await request(`/chat/conversations/${convId}/messages`, {
      method: 'POST',
      token: custToken,
      body: { message: 'Great, please pack 5kg fresh.' },
    });

    // Farmer fetches conversations list -> unreadCount should be >= 1
    const farmConvList = await request('/chat/conversations', {
      token: farmerToken,
    });
    const convForFarmer = farmConvList.json.data.find((c: any) => c.id === convId);
    assert('Farmer conversation list displays accurate unread badge count (unreadCount > 0)',
      !!convForFarmer && convForFarmer.unreadCount >= 1
    );

    // Farmer marks read
    await request(`/chat/conversations/${convId}/read`, {
      method: 'POST',
      token: farmerToken,
    });

    const farmConvListAfterRead = await request('/chat/conversations', {
      token: farmerToken,
    });
    const convForFarmerAfter = farmConvListAfterRead.json.data.find((c: any) => c.id === convId);
    assert('After read receipt, unreadCount drops to 0',
      !!convForFarmerAfter && convForFarmerAfter.unreadCount === 0
    );

  } catch (err: any) {
    console.error('Test error:', err);
    failed++;
  } finally {
    try {
      Database.run('DELETE FROM conversations');
    } catch {}
    server.close();
    console.log('\n======================================================');
    console.log(`📊 CHAT TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');
    if (failed > 0) process.exit(1);
  }
}

runChatTests();
