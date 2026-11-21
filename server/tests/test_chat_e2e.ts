import { Database } from '../src/db/database';
import http from 'http';
import { app } from '../src/app';

const PORT = 5097;
let server: http.Server;
const BASE_URL = `http://127.0.0.1:${PORT}/api/v1`;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  ❌ [FAIL]: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  ✅ [PASS]: ${msg}`);
}

async function request(path: string, options: { method?: string; body?: any; token?: string } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

async function run() {
  console.log('======================================================');
  console.log('HALDER — Bidirectional Live Chat & Messaging E2E Test');
  console.log('======================================================\n');

  server = app.listen(PORT);
  await new Promise((resolve) => setTimeout(resolve, 800));

  const ts = Date.now().toString().slice(-6);

  try {
    // 1. Register User 1 (Customer / Buyer)
    const user1Email = `buyer_${ts}@halder.test`;
    const user1Phone = `9810${ts.padStart(6, '0')}`;
    const user1Username = `buyer_${ts}`;
    const regBuyer = await request('/auth/register', {
      method: 'POST',
      body: {
        username: user1Username,
        name: `Aman Sharma ${ts}`,
        email: user1Email,
        phone: user1Phone,
        password: 'Password@2026!',
        role: 'customer',
      },
    });
    const buyerToken = regBuyer.json?.data?.token || regBuyer.json?.token;
    const buyerUser = regBuyer.json?.data?.user || regBuyer.json?.user;
    assert(regBuyer.status === 201 && !!buyerToken, 'Register User 1 (Customer / Buyer)');

    // 2. Register User 2 (Farmer / Seller)
    const user2Email = `farmer_${ts}@halder.test`;
    const user2Phone = `9820${ts.padStart(6, '0')}`;
    const user2Username = `farmer_${ts}`;
    const regFarmer = await request('/auth/register', {
      method: 'POST',
      body: {
        username: user2Username,
        name: `Ramesh Negi ${ts}`,
        email: user2Email,
        phone: user2Phone,
        password: 'Password@2026!',
        role: 'farmer',
      },
    });
    const farmerToken = regFarmer.json?.data?.token || regFarmer.json?.token;
    const farmerUser = regFarmer.json?.data?.user || regFarmer.json?.user;
    assert(regFarmer.status === 201 && !!farmerToken, 'Register User 2 (Farmer / Seller)');

    // Resolve farmer profile for User 2
    const farmerProfile = Database.get<any>('SELECT * FROM farmer_profiles WHERE user_id = ?', [farmerUser.id]);
    assert(!!farmerProfile, 'Farmer profile exists in SQLite database');

    // 3. User 1 initiates chat with User 2
    const createConv = await request('/chat/conversations', {
      method: 'POST',
      token: buyerToken,
      body: {
        farmerId: farmerProfile.id,
      },
    });
    assert(createConv.status === 200 && !!createConv.json?.data?.id, 'User 1 initiates chat with User 2');
    const convId = createConv.json.data.id;

    // 4. User 1 sends a message to User 2
    const msgText1 = 'Bhai kya Pahadi Tamatar available hai aaj?';
    const sendMsg1 = await request(`/chat/conversations/${convId}/messages`, {
      method: 'POST',
      token: buyerToken,
      body: {
        message: msgText1,
      },
    });
    assert(sendMsg1.status === 201 && sendMsg1.json?.data?.message === msgText1, 'User 1 sends message to User 2');

    // 5. User 2 checks their conversation list (Must show incoming conversation with unreadCount = 1)
    const farmerConvs = await request('/chat/conversations', {
      method: 'GET',
      token: farmerToken,
    });
    assert(farmerConvs.status === 200 && Array.isArray(farmerConvs.json?.data), 'User 2 fetches conversations list');
    const foundConvForFarmer = farmerConvs.json.data.find((c: any) => c.id === convId);
    assert(!!foundConvForFarmer, 'User 2 sees the incoming conversation in their inbox');
    assert(foundConvForFarmer?.unreadCount === 1, 'User 2 has unreadCount = 1 for the new message');
    assert(foundConvForFarmer?.lastMessage?.message === msgText1, 'Conversation shows correct lastMessage snippet');
    assert(foundConvForFarmer?.otherParty?.name.includes('Aman'), 'otherParty correctly resolved to Buyer Aman');

    // 6. User 2 opens the chat and reads the message history
    const farmerMessages = await request(`/chat/conversations/${convId}/messages`, {
      method: 'GET',
      token: farmerToken,
    });
    assert(farmerMessages.status === 200 && Array.isArray(farmerMessages.json?.data), 'User 2 retrieves message history');
    assert(farmerMessages.json.data.length === 1 && farmerMessages.json.data[0].message === msgText1, 'User 2 sees User 1\'s message text');
    assert(farmerMessages.json.data[0].sender_id === buyerUser.id, 'Message sender_id accurately reflects Buyer');

    // 7. User 2 marks conversation messages as read
    const markRead = await request(`/chat/conversations/${convId}/read`, {
      method: 'POST',
      token: farmerToken,
    });
    assert(markRead.status === 200 && markRead.json?.success === true, 'User 2 marks messages as read');

    // 8. User 2 replies back to User 1
    const msgText2 = 'Haan Aman bhai, 50kg bilkul taaza subah ka toda hua available hai!';
    const sendMsg2 = await request(`/chat/conversations/${convId}/messages`, {
      method: 'POST',
      token: farmerToken,
      body: {
        message: msgText2,
      },
    });
    assert(sendMsg2.status === 201 && sendMsg2.json?.data?.message === msgText2, 'User 2 sends reply to User 1');

    // 9. User 1 fetches message history and receives User 2's reply
    const buyerMessages = await request(`/chat/conversations/${convId}/messages`, {
      method: 'GET',
      token: buyerToken,
    });
    assert(buyerMessages.status === 200 && buyerMessages.json?.data?.length === 2, 'User 1 fetches updated message history (2 messages)');
    assert(buyerMessages.json.data[1].message === msgText2, 'User 1 successfully sees User 2\'s reply');
    assert(buyerMessages.json.data[1].sender_id === farmerUser.id, 'Reply sender_id accurately reflects Farmer');

    // 10. Check User 1's conversation list (unreadCount = 1 from Farmer)
    const buyerConvs = await request('/chat/conversations', {
      method: 'GET',
      token: buyerToken,
    });
    const foundConvForBuyer = buyerConvs.json.data.find((c: any) => c.id === convId);
    assert(!!foundConvForBuyer && foundConvForBuyer.unreadCount === 1, 'User 1 inbox reflects 1 unread reply from Farmer');

    // 11. Customer-to-Customer (Classifieds) Chat Test
    const user3Email = `seller_buyer_${ts}@halder.test`;
    const user3Phone = `9830${ts.padStart(6, '0')}`;
    const user3Username = `seller_buyer_${ts}`;
    const regSellerBuyer = await request('/auth/register', {
      method: 'POST',
      body: {
        username: user3Username,
        name: `Rohit Verma ${ts}`,
        email: user3Email,
        phone: user3Phone,
        password: 'Password@2026!',
        role: 'customer',
      },
    });
    const sellerBuyerToken = regSellerBuyer.json?.data?.token || regSellerBuyer.json?.token;
    const sellerBuyerUser = regSellerBuyer.json?.data?.user || regSellerBuyer.json?.user;
    assert(regSellerBuyer.status === 201 && !!sellerBuyerToken, 'Register User 3 (Customer selling item)');

    // Buyer 1 initiates chat with Customer 3 (seller) using their user ID
    const createC2C = await request('/chat/conversations', {
      method: 'POST',
      token: buyerToken,
      body: {
        farmerId: sellerBuyerUser.id,
      },
    });
    assert(createC2C.status === 200 && !!createC2C.json?.data?.id, 'Buyer 1 initiates chat with Seller Customer 3');
    const c2cConvId = createC2C.json.data.id;

    // Buyer 1 sends message to Seller Customer 3
    const c2cMsg = 'Bhai Rohit, kya aapka basmati rice available hai?';
    const sendC2C = await request(`/chat/conversations/${c2cConvId}/messages`, {
      method: 'POST',
      token: buyerToken,
      body: { message: c2cMsg },
    });
    assert(sendC2C.status === 201 && sendC2C.json?.data?.message === c2cMsg, 'Buyer 1 sends message to Seller Customer 3');

    // Seller Customer 3 fetches their conversation list
    const sellerConvs = await request('/chat/conversations', {
      method: 'GET',
      token: sellerBuyerToken,
    });
    const foundC2C = sellerConvs.json?.data?.find((c: any) => c.id === c2cConvId);
    assert(!!foundC2C, 'Seller Customer 3 sees incoming chat in their conversation inbox');
    assert(foundC2C?.type === 'selling', 'Conversation categorized as "selling" for seller customer');
    assert(foundC2C?.unreadCount === 1, 'Seller Customer 3 has unreadCount = 1');

    console.log('\n------------------------------------------------------');
    console.log('🎉 ALL 18 CHAT & MESSAGING TESTS PASSED WITH 100% SUCCESS!');
    console.log('------------------------------------------------------\n');
  } finally {
    // Cleanup test users and conversations
    try {
      Database.run('DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE customer_id IN (SELECT id FROM users WHERE email LIKE ?))', [`%${ts}%`]);
      Database.run('DELETE FROM conversations WHERE customer_id IN (SELECT id FROM users WHERE email LIKE ?)', [`%${ts}%`]);
      Database.run('DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?)', [`%${ts}%`]);
      Database.run('DELETE FROM farmer_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?)', [`%${ts}%`]);
      Database.run('DELETE FROM users WHERE email LIKE ?', [`%${ts}%`]);
    } catch {}

    if (server) {
      server.close();
    }
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
