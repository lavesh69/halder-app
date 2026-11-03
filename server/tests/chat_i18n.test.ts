import http from 'http';
import { app } from '../src/app';
import { initChatSocket } from '../src/websocket/chatSocket';
import { Database } from '../src/db/database';
import { CryptoUtil } from '../src/utils/crypto';
import { enTranslations, hiTranslations, paTranslations, mrTranslations, bnTranslations } from '../../src/i18n';

const PORT = 5096;
const BASE_URL = `http://localhost:${PORT}/api/v1`;
const WS_URL = `ws://localhost:${PORT}/ws`;

let server: http.Server;
let wss: any;

// Helper: HTTP REST client
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

// Helper: Managed WebSocket client for testing
interface WsClientInstance {
  ws: WebSocket;
  messages: any[];
  waitForEvent: (
    eventType: string,
    timeoutMs?: number,
    predicate?: (msg: any) => boolean
  ) => Promise<any>;
  send: (payload: any) => void;
  close: () => Promise<void>;
  clearMessages: () => void;
}

function createWsClient(url: string, token?: string): Promise<WsClientInstance> {
  return new Promise((resolve, reject) => {
    const fullUrl = token ? `${url}?token=${token}` : url;
    const ws = new WebSocket(fullUrl);
    const messages: any[] = [];
    const eventWaiters: Array<{
      eventType: string;
      predicate?: (msg: any) => boolean;
      resolve: (data: any) => void;
      reject: (err: any) => void;
      timer: NodeJS.Timeout;
    }> = [];

    const matches = (eventType: string, data: any, predicate?: (msg: any) => boolean) => {
      const type = data.type || data.event;
      const typeMatch =
        eventType === '*' ||
        type === eventType ||
        (eventType.startsWith('chat:') && type === eventType.slice(5)) ||
        (typeof type === 'string' && type.startsWith('chat:') && eventType === type.slice(5));

      if (!typeMatch) return false;
      return predicate ? predicate(data) : true;
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data.toString());
        // Check if any registered waiter is waiting for this event
        const waiterIdx = eventWaiters.findIndex((w) => matches(w.eventType, data, w.predicate));

        if (waiterIdx !== -1) {
          const waiter = eventWaiters.splice(waiterIdx, 1)[0];
          clearTimeout(waiter.timer);
          waiter.resolve(data);
        } else {
          // No active waiter: buffer in unconsumed messages
          messages.push(data);
        }
      } catch (err) {
        console.error('WS JSON parse error:', err);
      }
    };

    ws.onopen = () => {
      resolve({
        ws,
        messages,
        clearMessages: () => {
          messages.length = 0;
        },
        waitForEvent: (eventType: string, timeoutMs = 6000, predicate?: (msg: any) => boolean) => {
          // Check if already in buffered messages
          const existingIdx = messages.findIndex((m) => matches(eventType, m, predicate));
          if (existingIdx !== -1) {
            const matched = messages.splice(existingIdx, 1)[0];
            return Promise.resolve(matched);
          }

          return new Promise((res, rej) => {
            const timer = setTimeout(() => {
              rej(
                new Error(
                  `Timeout waiting for WS event '${eventType}' after ${timeoutMs}ms. Buffered: ${JSON.stringify(
                    messages
                  )}`
                )
              );
            }, timeoutMs);
            eventWaiters.push({ eventType, predicate, resolve: res, reject: rej, timer });
          });
        },
        send: (payload: any) => {
          ws.send(JSON.stringify(payload));
        },
        close: () => {
          return new Promise<void>((res) => {
            if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
              res();
            } else {
              ws.onclose = () => res();
              ws.close();
            }
          });
        },
      });
    };

    ws.onerror = (err: Event) => {
      reject(new Error(`WebSocket connection error: ${JSON.stringify(err)}`));
    };
  });
}

async function runChatAndI18nTests() {
  console.log('\n=============================================================');
  console.log('🌾 HALDER REAL-TIME CHAT (WEBSOCKET) & 5-LANGUAGE I18N SUITE');
  console.log('=============================================================\n');

  server = http.createServer(app);
  wss = initChatSocket(server);

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      console.log(`[Test Server] Live on http://localhost:${PORT} | ws://localhost:${PORT}/ws\n`);
      resolve();
    });
  });

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

  // Track created entities for cleanup
  const createdUsers: string[] = [];
  const createdFarmerProfiles: string[] = [];
  const createdProducts: string[] = [];
  const createdConversations: string[] = [];
  const activeWsClients: WsClientInstance[] = [];

  try {
    const now = new Date().toISOString();
    const timestamp = Date.now();

    // =============================================================
    // SETUP TEST ENTITIES IN SQLITE
    // =============================================================
    console.log('--- Setting up Test Entities in SQLite ---');

    // 1. Customer A (Aman Sharma)
    const custA_id = `user-chat-cust-a-${timestamp}`;
    const custA_halder = `HAL-CUS-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const custA_email = `aman.chat.${timestamp}@halder.com`;
    const custA_phone = `+91 ${Math.floor(9000000000 + Math.random() * 999999999)}`;
    Database.run(
      `INSERT INTO users (id, halder_id, name, email, phone, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, 'Aman Sharma', ?, ?, 'hashpass123', 'customer', 'active', ?, ?)`,
      [custA_id, custA_halder, custA_email, custA_phone, now, now]
    );
    createdUsers.push(custA_id);

    // 2. Farmer A (Rajesh Rawat - Himalayan Orchards)
    const farmerA_id = `user-chat-farm-a-${timestamp}`;
    const farmerA_profile = `farmer-chat-a-${timestamp}`;
    const farmerA_halder = `HAL-FRM-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const farmerA_email = `rajesh.chat.${timestamp}@orchard.in`;
    const farmerA_phone = `+91 ${Math.floor(9000000000 + Math.random() * 999999999)}`;
    Database.run(
      `INSERT INTO users (id, halder_id, name, email, phone, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, 'Rajesh Rawat', ?, ?, 'hashpass123', 'farmer', 'active', ?, ?)`,
      [farmerA_id, farmerA_halder, farmerA_email, farmerA_phone, now, now]
    );
    Database.run(
      `INSERT INTO farmer_profiles (id, user_id, farm_name, description, location, city, verification_status, rating, total_orders, joined_year, created_at, updated_at)
       VALUES (?, ?, 'Himalayan Organic Orchards', 'Fresh Apples & Pears', 'Chamba Valley', 'Tehri Garhwal', 'verified', 4.9, 120, 2022, ?, ?)`,
      [farmerA_profile, farmerA_id, now, now]
    );
    createdUsers.push(farmerA_id);
    createdFarmerProfiles.push(farmerA_profile);

    // 3. Product A (Shimla Royal Delicious Apples)
    const prodA_id = `prod-chat-a-${timestamp}`;
    Database.run(
      `INSERT OR IGNORE INTO categories (id, name, slug, emoji, image, created_at)
       VALUES ('cat-fruits', 'Fresh Fruits', 'fruits', '🍎', 'https://images.unsplash.com/apple', ?)`,
      [now]
    );
    Database.run(
      `INSERT INTO products (id, farmer_id, category_id, name, slug, description, price, unit, available_quantity, is_organic, available_today, location, city, image, status, moderation_status, created_at, updated_at)
       VALUES (?, ?, 'cat-fruits', 'Shimla Royal Delicious Apples', 'shimla-royal-apples', 'Sweet crisp organic mountain apples', 120.0, 'kg', 500, 1, 1, 'Chamba Valley', 'Tehri Garhwal', 'https://images.unsplash.com/apple', 'active', 'approved', ?, ?)`,
      [prodA_id, farmerA_profile, now, now]
    );
    createdProducts.push(prodA_id);

    // 4. Customer B (Rohit Verma - Unauthorized Attacker / Third Party)
    const custB_id = `user-chat-cust-b-${timestamp}`;
    const custB_halder = `HAL-CUS-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const custB_email = `rohit.attacker.${timestamp}@test.in`;
    const custB_phone = `+91 ${Math.floor(9000000000 + Math.random() * 999999999)}`;
    Database.run(
      `INSERT INTO users (id, halder_id, name, email, phone, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, 'Rohit Verma', ?, ?, 'hashpass123', 'customer', 'active', ?, ?)`,
      [custB_id, custB_halder, custB_email, custB_phone, now, now]
    );
    createdUsers.push(custB_id);

    // 5. Farmer B (Amit Singh - Unauthorized Farmer)
    const farmerB_id = `user-chat-farm-b-${timestamp}`;
    const farmerB_profile = `farmer-chat-b-${timestamp}`;
    const farmerB_halder = `HAL-FRM-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const farmerB_email = `amit.attacker.${timestamp}@sunrise.in`;
    const farmerB_phone = `+91 ${Math.floor(9000000000 + Math.random() * 999999999)}`;
    Database.run(
      `INSERT INTO users (id, halder_id, name, email, phone, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, 'Amit Singh', ?, ?, 'hashpass123', 'farmer', 'active', ?, ?)`,
      [farmerB_id, farmerB_halder, farmerB_email, farmerB_phone, now, now]
    );
    Database.run(
      `INSERT INTO farmer_profiles (id, user_id, farm_name, description, location, city, verification_status, rating, total_orders, joined_year, created_at, updated_at)
       VALUES (?, ?, 'Sunrise Farm', 'Wheat & Mustard', 'Doiwala', 'Dehradun', 'verified', 4.7, 45, 2023, ?, ?)`,
      [farmerB_profile, farmerB_id, now, now]
    );
    createdUsers.push(farmerB_id);
    createdFarmerProfiles.push(farmerB_profile);

    // Generate JWT Tokens
    const tokenCustA = CryptoUtil.generateToken({ userId: custA_id, role: 'customer', email: custA_email });
    const tokenFarmerA = CryptoUtil.generateToken({ userId: farmerA_id, role: 'farmer', email: farmerA_email, farmerProfileId: farmerA_profile });
    const tokenCustB = CryptoUtil.generateToken({ userId: custB_id, role: 'customer', email: custB_email });
    const tokenFarmerB = CryptoUtil.generateToken({ userId: farmerB_id, role: 'farmer', email: farmerB_email, farmerProfileId: farmerB_profile });

    console.log('Entities initialized successfully.\n');

    // =============================================================
    // TIER 1 — FEATURE COVERAGE (HAPPY PATH)
    // =============================================================
    console.log('=== TIER 1: FEATURE COVERAGE (HAPPY PATH) ===');

    // 1. test_conversation_create_and_fetch
    let convA_id = '';
    const createConvRes = await request('/chat/conversations', {
      method: 'POST',
      token: tokenCustA,
      body: { farmerId: farmerA_profile, productId: prodA_id },
    });
    assert('1. Create conversation between verified customer & farmer', createConvRes.status === 200 && createConvRes.json?.success === true && !!createConvRes.json?.data?.id, `status=${createConvRes.status}`);
    convA_id = createConvRes.json?.data?.id;
    if (convA_id) createdConversations.push(convA_id);

    // Verify idempotency: Calling again with same customer and farmer returns the same conversation
    const idempotentConvRes = await request('/chat/conversations', {
      method: 'POST',
      token: tokenCustA,
      body: { farmerId: farmerA_profile, productId: prodA_id },
    });
    assert('1b. Conversation creation is strictly idempotent', idempotentConvRes.status === 200 && idempotentConvRes.json?.data?.id === convA_id, `receivedId=${idempotentConvRes.json?.data?.id}`);

    // Fetch conversation list
    const listConvRes = await request('/chat/conversations', {
      method: 'GET',
      token: tokenCustA,
    });
    const foundInList = listConvRes.json?.data?.some((c: any) => c.id === convA_id && c.otherParty?.farmName === 'Himalayan Organic Orchards');
    assert('1c. Fetch conversations list includes participant and product details', listConvRes.status === 200 && foundInList, `listCount=${listConvRes.json?.data?.length}`);

    // 2. test_rest_message_send
    const sendCustMsgRes = await request(`/chat/conversations/${convA_id}/messages`, {
      method: 'POST',
      token: tokenCustA,
      body: { message: 'Namaste Rajesh ji, are the Shimla Apples freshly harvested today?' },
    });
    assert('2a. Customer sends message via REST API (201 Created)', sendCustMsgRes.status === 201 && sendCustMsgRes.json?.data?.senderRole === 'user' && sendCustMsgRes.json?.data?.message.includes('Shimla Apples'), `status=${sendCustMsgRes.status}`);

    const sendFarmerMsgRes = await request(`/chat/conversations/${convA_id}/messages`, {
      method: 'POST',
      token: tokenFarmerA,
      body: { message: 'Ji haan Aman ji, freshly harvested this morning at 6 AM!' },
    });
    assert('2b. Farmer replies via REST API (201 Created)', sendFarmerMsgRes.status === 201 && sendFarmerMsgRes.json?.data?.senderRole === 'farmer' && sendFarmerMsgRes.json?.data?.senderId === farmerA_id, `status=${sendFarmerMsgRes.status}`);

    // 3. test_db_persistence
    const dbMessages = Database.query<any>(
      'SELECT id, conversation_id, sender_id, sender_role, message, created_at, read_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [convA_id]
    );
    const dbConv = Database.get<any>('SELECT * FROM conversations WHERE id = ?', [convA_id]);
    assert(
      '3. SQLite direct persistence validates messages, foreign keys, and updated timestamps',
      dbMessages.length === 2 &&
        dbMessages[0].sender_id === custA_id &&
        dbMessages[0].sender_role === 'user' &&
        dbMessages[1].sender_id === farmerA_id &&
        dbMessages[1].sender_role === 'farmer' &&
        !!dbConv.updated_at,
      `dbCount=${dbMessages.length}`
    );

    // 4. test_websocket_connection_and_auth
    const wsClientA = await createWsClient(WS_URL, tokenCustA);
    activeWsClients.push(wsClientA);
    const initialConnectedEvent = await wsClientA.waitForEvent('connected', 3000);
    assert(
      '4a. WebSocket handshake establishes with JWT authentication',
      initialConnectedEvent?.status === 'connected' && initialConnectedEvent?.authenticated === true && initialConnectedEvent?.user?.id === custA_id,
      `auth=${initialConnectedEvent?.authenticated}`
    );

    wsClientA.send({ type: 'chat:join', conversationId: convA_id });
    const joinedEvent = await wsClientA.waitForEvent('chat:joined', 3000);
    assert('4b. WebSocket joins conversation room successfully', joinedEvent?.conversationId === convA_id && joinedEvent?.success === true);

    // 5. test_5_language_dictionaries_exist
    const dicts = {
      en: enTranslations,
      hi: hiTranslations,
      pa: paTranslations,
      mr: mrTranslations,
      bn: bnTranslations,
    };
    const allDictsValid = Object.entries(dicts).every(([lang, dict]) => {
      const keysCount = Object.keys(dict).length;
      return typeof dict === 'object' && keysCount >= 180;
    });
    assert('5. All 5 language dictionaries (en, hi, pa, mr, bn) exist and contain valid translation mappings', allDictsValid, `enCount=${Object.keys(enTranslations).length}`);

    // =============================================================
    // TIER 2 — BOUNDARY & SECURITY ISOLATION
    // =============================================================
    console.log('\n=== TIER 2: BOUNDARY & SECURITY ISOLATION ===');

    // 6. test_idor_unauthorized_customer_read
    const idorCustRead = await request(`/chat/conversations/${convA_id}/messages`, {
      method: 'GET',
      token: tokenCustB,
    });
    assert('6. IDOR: Unauthorized Customer B blocked from reading Conversation A (403 Forbidden)', idorCustRead.status === 403, `status=${idorCustRead.status}`);

    // 7. test_idor_unauthorized_customer_send
    const idorCustSend = await request(`/chat/conversations/${convA_id}/messages`, {
      method: 'POST',
      token: tokenCustB,
      body: { message: 'Malicious customer message injection attempt' },
    });
    assert('7. IDOR: Unauthorized Customer B blocked from posting to Conversation A (403 Forbidden)', idorCustSend.status === 403, `status=${idorCustSend.status}`);

    // 8. test_idor_unauthorized_farmer_read
    const idorFarmerRead = await request(`/chat/conversations/${convA_id}/messages`, {
      method: 'GET',
      token: tokenFarmerB,
    });
    assert('8. IDOR: Unauthorized Farmer B blocked from reading Conversation A (403 Forbidden)', idorFarmerRead.status === 403, `status=${idorFarmerRead.status}`);

    // 9. test_idor_unauthorized_farmer_send
    const idorFarmerSend = await request(`/chat/conversations/${convA_id}/messages`, {
      method: 'POST',
      token: tokenFarmerB,
      body: { message: 'Malicious farmer message injection attempt' },
    });
    assert('9. IDOR: Unauthorized Farmer B blocked from posting to Conversation A (403 Forbidden)', idorFarmerSend.status === 403, `status=${idorFarmerSend.status}`);

    // 10. test_unauthenticated_requests
    const noTokenList = await request('/chat/conversations', { method: 'GET' });
    const invalidTokenRead = await request(`/chat/conversations/${convA_id}/messages`, {
      method: 'GET',
      token: 'invalid.jwt.token.signature',
    });
    const invalidTokenSend = await request(`/chat/conversations/${convA_id}/messages`, {
      method: 'POST',
      token: 'invalid.jwt.token.signature',
      body: { message: 'Hello' },
    });
    assert(
      '10. Missing or invalid JWT tokens rejected with 401 Unauthorized',
      noTokenList.status === 401 && invalidTokenRead.status === 401 && invalidTokenSend.status === 401,
      `noToken=${noTokenList.status}, invalidRead=${invalidTokenRead.status}`
    );

    // 11. test_empty_or_oversized_messages
    const emptyMsgRes = await request(`/chat/conversations/${convA_id}/messages`, {
      method: 'POST',
      token: tokenCustA,
      body: { message: '' },
    });
    const whitespaceMsgRes = await request(`/chat/conversations/${convA_id}/messages`, {
      method: 'POST',
      token: tokenCustA,
      body: { message: '      ' },
    });
    const oversizedMsgRes = await request(`/chat/conversations/${convA_id}/messages`, {
      method: 'POST',
      token: tokenCustA,
      body: { message: 'A'.repeat(2500) },
    });
    assert(
      '11. Blank, whitespace-only, and oversized (>2000 chars) messages rejected with 400 Bad Request',
      emptyMsgRes.status === 400 && whitespaceMsgRes.status === 400 && oversizedMsgRes.status === 400,
      `empty=${emptyMsgRes.status}, whitespace=${whitespaceMsgRes.status}, oversized=${oversizedMsgRes.status}`
    );

    // =============================================================
    // TIER 3 — REAL-TIME WEBSOCKET & STATE SYNCHRONIZATION
    // =============================================================
    console.log('\n=== TIER 3: REAL-TIME WEBSOCKET & STATE SYNCHRONIZATION ===');

    // Connect Farmer A WebSocket client
    const wsClientFarmerA = await createWsClient(WS_URL, tokenFarmerA);
    activeWsClients.push(wsClientFarmerA);
    await wsClientFarmerA.waitForEvent('connected', 3000);
    wsClientFarmerA.send({ type: 'chat:join', conversationId: convA_id });
    await wsClientFarmerA.waitForEvent('chat:joined', 3000);

    // 12. test_websocket_live_message_delivery (Customer WS -> Farmer WS)
    const wsLiveMessagePromise = wsClientFarmerA.waitForEvent('chat:message', 5000);
    wsClientA.send({
      type: 'chat:send',
      conversationId: convA_id,
      message: 'Rajesh ji, do you also have Organic Kinnow available in 20kg crates?',
    });
    const receivedLiveMsg = await wsLiveMessagePromise;
    assert(
      '12. Customer sends via WebSocket -> Farmer receives instant real-time chat:message broadcast',
      receivedLiveMsg?.conversationId === convA_id &&
        receivedLiveMsg?.message?.includes('Organic Kinnow') &&
        receivedLiveMsg?.senderRole === 'user',
      `receivedText=${receivedLiveMsg?.message}`
    );

    // 13. test_rest_to_websocket_sync (Customer REST -> Farmer WS)
    const restSyncPromise = wsClientFarmerA.waitForEvent(
      'chat:message',
      5000,
      (m) => m.message && m.message.includes('REST to WebSocket real-time live synchronization')
    );
    await request(`/chat/conversations/${convA_id}/messages`, {
      method: 'POST',
      token: tokenCustA,
      body: { message: 'Testing REST to WebSocket real-time live synchronization bridge' },
    });
    const receivedRestBridgeMsg = await restSyncPromise;
    assert(
      '13. REST API message dispatch triggers instantaneous WebSocket live broadcast to connected peers',
      receivedRestBridgeMsg?.conversationId === convA_id &&
        receivedRestBridgeMsg?.message.includes('REST to WebSocket real-time live synchronization'),
      `receivedText=${receivedRestBridgeMsg?.message}`
    );

    // 14. test_typing_indicator_broadcast
    const typingTruePromise = wsClientFarmerA.waitForEvent(
      'chat:typing',
      4000,
      (m) => m.isTyping === true && m.userId === custA_id
    );
    wsClientA.send({
      type: 'chat:typing',
      conversationId: convA_id,
      isTyping: true,
    });
    const typingTrueEvent = await typingTruePromise;

    const typingFalsePromise = wsClientFarmerA.waitForEvent(
      'chat:typing',
      4000,
      (m) => m.isTyping === false && m.userId === custA_id
    );
    wsClientA.send({
      type: 'chat:typing',
      conversationId: convA_id,
      isTyping: false,
    });
    const typingFalseEvent = await typingFalsePromise;

    assert(
      '14. Live typing indicator events (chat:typing true/false) broadcast bidirectionally across conversation rooms',
      typingTrueEvent?.isTyping === true &&
        typingTrueEvent?.userId === custA_id &&
        typingFalseEvent?.isTyping === false,
      `tTrue=${typingTrueEvent?.isTyping}, tFalse=${typingFalseEvent?.isTyping}`
    );

    // 15. test_read_receipt_update
    const readReceiptPromise = wsClientA.waitForEvent(
      'chat:read',
      4000,
      (m) => m.conversationId === convA_id && !!m.readAt
    );
    const markReadRes = await request(`/chat/conversations/${convA_id}/read`, {
      method: 'PATCH',
      token: tokenFarmerA,
    });
    const receivedReadEvent = await readReceiptPromise;

    // Verify in SQLite
    const unreadMessagesCust = Database.query<any>(
      'SELECT id, read_at FROM messages WHERE conversation_id = ? AND sender_id = ? AND read_at IS NULL',
      [convA_id, custA_id]
    );

    assert(
      '15. Read receipt update persists read_at timestamp in SQLite and broadcasts chat:read to sender',
      markReadRes.status === 200 &&
        unreadMessagesCust.length === 0 &&
        receivedReadEvent?.conversationId === convA_id &&
        !!receivedReadEvent?.readAt,
      `unreadRemaining=${unreadMessagesCust.length}, readAt=${receivedReadEvent?.readAt}`
    );

    // 16. test_unread_badge_counting
    // Send 3 distinct unread messages from Customer A to Farmer A
    await request(`/chat/conversations/${convA_id}/messages`, {
      method: 'POST',
      token: tokenCustA,
      body: { message: 'Unread badge test message 1' },
    });
    await request(`/chat/conversations/${convA_id}/messages`, {
      method: 'POST',
      token: tokenCustA,
      body: { message: 'Unread badge test message 2' },
    });
    await request(`/chat/conversations/${convA_id}/messages`, {
      method: 'POST',
      token: tokenCustA,
      body: { message: 'Unread badge test message 3' },
    });

    const farmerListBeforeRead = await request('/chat/conversations', {
      method: 'GET',
      token: tokenFarmerA,
    });
    const convBeforeRead = farmerListBeforeRead.json?.data?.find((c: any) => c.id === convA_id);

    // Mark read
    await request(`/chat/conversations/${convA_id}/read`, {
      method: 'PATCH',
      token: tokenFarmerA,
    });

    const farmerListAfterRead = await request('/chat/conversations', {
      method: 'GET',
      token: tokenFarmerA,
    });
    const convAfterRead = farmerListAfterRead.json?.data?.find((c: any) => c.id === convA_id);

    assert(
      '16. Unread counter accurately calculates unread badge counts (Count=3 -> Marked Read -> Count=0)',
      convBeforeRead?.unreadCount === 3 && convAfterRead?.unreadCount === 0,
      `before=${convBeforeRead?.unreadCount}, after=${convAfterRead?.unreadCount}`
    );

    // =============================================================
    // TIER 4 — REAL-WORLD APPLICATION & I18N DICTIONARY PARITY
    // =============================================================
    console.log('\n=== TIER 4: REAL-WORLD APPLICATION & I18N DICTIONARY PARITY ===');

    // 17. test_dictionary_key_parity_5_languages
    const enKeys = Object.keys(enTranslations);
    const nonEnLangs: Record<string, any> = {
      hi: hiTranslations,
      pa: paTranslations,
      mr: mrTranslations,
      bn: bnTranslations,
    };

    let totalMissingKeys = 0;
    const parityReport: Record<string, number> = {};

    for (const [langCode, dict] of Object.entries(nonEnLangs)) {
      const missing = enKeys.filter((k) => !(k in dict) || dict[k] === undefined || dict[k] === null || dict[k] === '');
      parityReport[langCode] = missing.length;
      totalMissingKeys += missing.length;
      if (missing.length > 0) {
        console.error(`    [Missing in ${langCode}]:`, missing.slice(0, 5));
      }
    }

    assert(
      '17. 5-Language dictionary key parity: 100% key parity with 0 missing or empty keys across (en, hi, pa, mr, bn)',
      totalMissingKeys === 0 && enKeys.length >= 200,
      `enKeyTotal=${enKeys.length}, missingByLang=${JSON.stringify(parityReport)}`
    );

    // 18. test_dictionary_domain_coverage
    const requiredDomainKeys = [
      // Navigation & Common
      'nav.buyer',
      'nav.farmer',
      'nav.orders',
      'nav.cart',
      'nav.profile',
      'nav.notifications',
      'common.save',
      'common.cancel',
      // Search & 300km Geo Radius Filter
      'search.placeholder',
      'search.trending_produce',
      'geo.radius_title',
      'geo.radius_300km',
      'geo.radius_label',
      'geo.freshness_guarantee',
      'geo.hyperlocal',
      // Catalog & Mandi Price Benchmark Comparison
      'catalog.title',
      'catalog.fresh_harvest',
      'catalog.organic_certified',
      'mandi.mandi_price',
      'mandi.farmer_price',
      'mandi.savings_badge',
      'mandi.benchmark_comparison',
      // Cart, Checkout & 100% Direct Farmer Settlement
      'cart.title',
      'checkout.title',
      'checkout.upi_instant',
      'checkout.place_order',
      'settlement.direct_badge',
      'settlement.direct_desc',
      'settlement.farmer_earns',
      'settlement.zero_commission',
      // 100% Kisan Direct Delivery Guarantee Badge
      'guarantee.badge_title',
      'guarantee.freshness_promise',
      'guarantee.no_middleman',
      // Live Order Tracking
      'orders.title',
      'tracking.title',
      'tracking.harvested',
      'tracking.in_transit',
      'tracking.delivered',
      // Farmer Earnings & Bank/UPI Settlement Modal
      'earnings.title',
      'earnings.available_balance',
      'earnings.withdraw_btn',
      'bank.modal_title',
      'bank.upi_option',
      'bank.bank_option',
      'bank.account_number',
      'bank.ifsc_code',
      // Kisan KYC Certification & Trust Verification
      'kyc.title',
      'kyc.certified_kisan',
      'kyc.verified_badge',
      'kyc.doc_aadhaar',
      'kyc.doc_kcc',
      'kyc.doc_land',
      // Real-Time Chat UI
      'chat.title',
      'chat.type_a_message',
      'chat.typing',
      'chat.read',
      'chat.unread_messages',
      // Language Switcher Options
      'language.select_language',
      'language.en',
      'language.hi',
      'language.pa',
      'language.mr',
      'language.bn',
    ];

    let missingDomainKeys = 0;
    for (const key of requiredDomainKeys) {
      if (!enTranslations[key as keyof typeof enTranslations]) {
        missingDomainKeys++;
        console.error(`    [Missing domain key]: ${key}`);
      }
    }

    assert(
      '18. Domain coverage spans nav, search, 300km geo, catalog, Mandi badges, checkout, guarantee, tracking, earnings, KYC, chat',
      missingDomainKeys === 0,
      `checkedKeys=${requiredDomainKeys.length}, missing=${missingDomainKeys}`
    );

    // 19. test_e2e_customer_farmer_order_inquiry_flow
    console.log('--- Executing Comprehensive E2E Customer-Farmer Produce Inquiry Journey ---');

    // Fresh Customer & Farmer for E2E Flow
    const e2eCustId = `user-e2e-cust-${timestamp}`;
    const e2eFarmerUserId = `user-e2e-farmer-${timestamp}`;
    const e2eFarmerProfileId = `farmer-e2e-prof-${timestamp}`;
    const e2eProdId = `prod-e2e-${timestamp}`;

    Database.run(
      `INSERT INTO users (id, halder_id, name, email, phone, password_hash, role, status, created_at, updated_at)
       VALUES (?, 'HAL-CUS-E2E001', 'Pooja Hegde', 'pooja.e2e@halder.com', '+91 9111122222', 'hash', 'customer', 'active', ?, ?)`,
      [e2eCustId, now, now]
    );
    Database.run(
      `INSERT INTO users (id, halder_id, name, email, phone, password_hash, role, status, created_at, updated_at)
       VALUES (?, 'HAL-FRM-E2E001', 'Harpreet Singh', 'harpreet.e2e@punjabfarm.in', '+91 9333344444', 'hash', 'farmer', 'active', ?, ?)`,
      [e2eFarmerUserId, now, now]
    );
    Database.run(
      `INSERT INTO farmer_profiles (id, user_id, farm_name, description, location, city, verification_status, rating, total_orders, joined_year, created_at, updated_at)
       VALUES (?, ?, 'Green Punjab Organic Farm', 'Organic Basmati & Kinnow', 'Ludhiana G.T. Road', 'Ludhiana', 'verified', 5.0, 310, 2021, ?, ?)`,
      [e2eFarmerProfileId, e2eFarmerUserId, now, now]
    );
    Database.run(
      `INSERT INTO products (id, farmer_id, category_id, name, slug, description, price, unit, available_quantity, is_organic, available_today, location, city, image, status, moderation_status, created_at, updated_at)
       VALUES (?, ?, 'cat-fruits', 'Fresh Golden Kinnow', 'golden-kinnow', 'Juicy vitamin C rich harvest', 65.0, 'kg', 1200, 1, 1, 'Ludhiana G.T. Road', 'Ludhiana', 'https://images.unsplash.com/kinnow', 'active', 'approved', ?, ?)`,
      [e2eProdId, e2eFarmerProfileId, now, now]
    );

    createdUsers.push(e2eCustId, e2eFarmerUserId);
    createdFarmerProfiles.push(e2eFarmerProfileId);
    createdProducts.push(e2eProdId);

    const tokenE2ECust = CryptoUtil.generateToken({ userId: e2eCustId, role: 'customer', email: 'pooja.e2e@halder.com' });
    const tokenE2EFarmer = CryptoUtil.generateToken({
      userId: e2eFarmerUserId,
      role: 'farmer',
      email: 'harpreet.e2e@punjabfarm.in',
      farmerProfileId: e2eFarmerProfileId,
    });

    // Step 1: Customer creates conversation linked to Kinnow product
    const e2eConvRes = await request('/chat/conversations', {
      method: 'POST',
      token: tokenE2ECust,
      body: { farmerId: e2eFarmerProfileId, productId: e2eProdId },
    });
    const e2eConvId = e2eConvRes.json?.data?.id;
    if (e2eConvId) createdConversations.push(e2eConvId);

    // Step 2: Open WebSocket connections for both parties
    const e2eWsCust = await createWsClient(WS_URL, tokenE2ECust);
    const e2eWsFarmer = await createWsClient(WS_URL, tokenE2EFarmer);
    activeWsClients.push(e2eWsCust, e2eWsFarmer);

    await e2eWsCust.waitForEvent('connected', 3000);
    await e2eWsFarmer.waitForEvent('connected', 3000);

    e2eWsCust.send({ type: 'chat:join', conversationId: e2eConvId });
    e2eWsFarmer.send({ type: 'chat:join', conversationId: e2eConvId });

    await e2eWsCust.waitForEvent('chat:joined', 3000);
    await e2eWsFarmer.waitForEvent('chat:joined', 3000);

    // Step 3: Customer starts typing inquiry
    const farmerTypingP1 = e2eWsFarmer.waitForEvent('chat:typing', 3000, (m) => m.isTyping === true);
    e2eWsCust.send({ type: 'chat:typing', conversationId: e2eConvId, isTyping: true });
    const fReceivedTyping1 = await farmerTypingP1;

    // Step 4: Customer sends bulk inquiry message
    const farmerMsgP1 = e2eWsFarmer.waitForEvent('chat:message', 4000);
    e2eWsCust.send({
      type: 'chat:send',
      conversationId: e2eConvId,
      message: 'Sat Sri Akal Harpreet ji! We need 100 kg Golden Kinnow for our juice bar. Can you deliver within 24 hours?',
    });
    const fReceivedMsg1 = await farmerMsgP1;

    // Step 5: Customer stops typing
    e2eWsCust.send({ type: 'chat:typing', conversationId: e2eConvId, isTyping: false });

    // Step 6: Farmer starts typing response
    const custTypingP2 = e2eWsCust.waitForEvent('chat:typing', 3000, (m) => m.isTyping === true);
    e2eWsFarmer.send({ type: 'chat:typing', conversationId: e2eConvId, isTyping: true });
    const cReceivedTyping2 = await custTypingP2;

    // Step 7: Farmer sends response confirming harvest and delivery
    const custMsgP2 = e2eWsCust.waitForEvent(
      'chat:message',
      4000,
      (m) => m.message && m.message.includes('harvest directly at 5 AM')
    );
    e2eWsFarmer.send({
      type: 'chat:send',
      conversationId: e2eConvId,
      message: 'Sat Sri Akal Pooja ji! Absolutely, we will harvest directly at 5 AM tomorrow morning and deliver within 300km guaranteed.',
    });
    const cReceivedMsg2 = await custMsgP2;

    // Step 8: Farmer stops typing
    e2eWsFarmer.send({ type: 'chat:typing', conversationId: e2eConvId, isTyping: false });

    // Step 9: Customer marks conversation read
    const farmerReadP = e2eWsFarmer.waitForEvent('chat:read', 4000);
    await request(`/chat/conversations/${e2eConvId}/read`, {
      method: 'PATCH',
      token: tokenE2ECust,
    });
    const fReceivedRead = await farmerReadP;

    // Step 10: Verify full E2E state in SQLite database
    const e2eDbMessages = Database.query<any>(
      'SELECT id, sender_role, message, read_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [e2eConvId]
    );


    assert(
      '19. End-to-end customer-farmer produce negotiation flow completes with WS live messaging, typing indicators, read receipts, and state persistence',
      fReceivedTyping1?.isTyping === true &&
        fReceivedMsg1?.message.includes('100 kg Golden Kinnow') &&
        cReceivedTyping2?.isTyping === true &&
        cReceivedMsg2?.message.includes('harvest directly at 5 AM') &&
        fReceivedRead?.conversationId === e2eConvId &&
        e2eDbMessages.length === 2 &&
        !!e2eDbMessages[1].read_at,
      `dbMsgs=${e2eDbMessages.length}, farmerReadAt=${e2eDbMessages[1]?.read_at}`
    );

  } catch (err: any) {
    console.error('\n❌ Unhandled Exception in Chat/i18n Test Suite:', err);
    failed++;
  } finally {
    // -------------------------------------------------------------
    // TEARDOWN & RESOURCE CLEANUP
    // -------------------------------------------------------------
    console.log('\n--- Cleaning up Test Resources ---');

    for (const client of activeWsClients) {
      try {
        await client.close();
      } catch {}
    }

    try {
      for (const convId of createdConversations) {
        Database.run('DELETE FROM messages WHERE conversation_id = ?', [convId]);
        Database.run('DELETE FROM conversations WHERE id = ?', [convId]);
      }
      for (const prodId of createdProducts) {
        Database.run('DELETE FROM products WHERE id = ?', [prodId]);
      }
      for (const fpId of createdFarmerProfiles) {
        Database.run('DELETE FROM farmer_profiles WHERE id = ?', [fpId]);
      }
      for (const uId of createdUsers) {
        Database.run('DELETE FROM users WHERE id = ?', [uId]);
      }
    } catch (cleanupErr) {
      console.warn('Database cleanup warning:', cleanupErr);
    }

    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('[Test Server] Closed successfully.');
        resolve();
      });
    });

    console.log('\n=============================================================');
    console.log(`🌾 CHAT & I18N TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('=============================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  }
}

runChatAndI18nTests();
