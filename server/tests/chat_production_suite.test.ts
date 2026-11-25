import http from 'http';
import fs from 'fs';
import path from 'path';
import { WebSocket, RawData } from 'ws';
import { app } from '../src/app';
import { initChatSocket, ChatSocketService } from '../src/websocket/chatSocket';
import { Database } from '../src/db/database';
import { runMigrations } from '../src/db/migrate';
import { CryptoUtil } from '../src/utils/crypto';
import { CustomerProfileService } from '../src/services/customerProfileService';

const PORT = 5133;
const BASE_URL = `http://localhost:${PORT}/api/v1`;
const WS_URL = `ws://localhost:${PORT}/ws`;

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✅ [PASS] ${name}`);
  } else {
    failed++;
    console.error(`  ❌ [FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

class WsClient {
  public ws: WebSocket;
  private queue: any[] = [];
  private waiters: Array<{
    type: string;
    predicate?: (d: any) => boolean;
    resolve: (d: any) => void;
    timer: NodeJS.Timeout;
  }> = [];

  constructor(token?: string) {
    const url = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;
    this.ws = new WebSocket(url);
    this.ws.on('message', (raw: RawData) => {
      const msg = JSON.parse(raw.toString('utf-8'));
      const t = msg.type || msg.event;
      const idx = this.waiters.findIndex((w) => {
        const typeOk =
          w.type === '*' ||
          t === w.type ||
          (w.type.startsWith('chat:') && t === w.type.slice(5));
        return typeOk && (!w.predicate || w.predicate(msg));
      });
      if (idx !== -1) {
        const w = this.waiters.splice(idx, 1)[0];
        clearTimeout(w.timer);
        w.resolve(msg);
      } else {
        this.queue.push(msg);
      }
    });
  }

  waitForOpen(ms = 4000): Promise<void> {
    if (this.ws.readyState === WebSocket.OPEN) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('WS open timeout')), ms);
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

  waitForEvent(type: string, ms = 4000, predicate?: (d: any) => boolean): Promise<any> {
    const existingIdx = this.queue.findIndex((m) => {
      const t = m.type || m.event;
      const typeOk =
        type === '*' ||
        t === type ||
        (type.startsWith('chat:') && t === type.slice(5));
      return typeOk && (!predicate || predicate(m));
    });
    if (existingIdx !== -1) {
      return Promise.resolve(this.queue.splice(existingIdx, 1)[0]);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const i = this.waiters.findIndex((w) => w.timer === timer);
        if (i !== -1) this.waiters.splice(i, 1);
        reject(new Error(`Timeout waiting for ${type}. Queued: ${JSON.stringify(this.queue)}`));
      }, ms);
      this.waiters.push({ type, predicate, resolve, timer });
    });
  }

  send(payload: any) {
    this.ws.send(JSON.stringify(payload));
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.ws.readyState === WebSocket.CLOSED) return resolve();
      this.ws.on('close', () => resolve());
      this.ws.close();
    });
  }
}

async function api(endpoint: string, opts: { method?: string; token?: string; body?: any } = {}) {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json, res };
}

async function runSuite() {
  console.log('\n🧪 HALDHAR CHAT PRODUCTION VERIFICATION SUITE\n');
  runMigrations();

  const server = http.createServer(app);
  initChatSocket(server);
  await new Promise<void>((res) => server.listen(PORT, res));

  const ts = Date.now();
  const custId = `user-prod-cust-${ts}`;
  const farmerUserId = `user-prod-farm-${ts}`;
  const farmerProfId = `farmer-prod-prof-${ts}`;
  const attackerId = `user-prod-atk-${ts}`;
  const prodId = `prod-chat-${ts}`;
  const now = new Date().toISOString();

  const cleanupConvs: string[] = [];
  const sockets: WsClient[] = [];

  try {
    // Seed real users & farmer profile
    Database.run(
      `INSERT INTO users (id, halder_id, name, email, phone, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, 'Prod Customer', ?, ?, 'hash', 'customer', 'active', ?, ?)`,
      [custId, `HAL-PC-${ts}`, `pc.${ts}@halder.test`, `9111${String(ts).slice(-6)}`, now, now]
    );
    Database.run(
      `INSERT INTO users (id, halder_id, name, email, phone, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, 'Prod Farmer', ?, ?, 'hash', 'farmer', 'active', ?, ?)`,
      [farmerUserId, `HAL-PF-${ts}`, `pf.${ts}@halder.test`, `9222${String(ts).slice(-6)}`, now, now]
    );
    Database.run(
      `INSERT INTO farmer_profiles (id, user_id, farm_name, description, location, city, verification_status, rating, total_orders, joined_year, created_at, updated_at)
       VALUES (?, ?, 'Green Ridge Orchard', 'Fresh mountain harvest', 'Dharampur', 'Dehradun', 'verified', 4.8, 25, 2024, ?, ?)`,
      [farmerProfId, farmerUserId, now, now]
    );
    Database.run(
      `INSERT INTO users (id, halder_id, name, email, phone, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, 'Attacker User', ?, ?, 'hash', 'customer', 'active', ?, ?)`,
      [attackerId, `HAL-PA-${ts}`, `pa.${ts}@halder.test`, `9333${String(ts).slice(-6)}`, now, now]
    );
    Database.run(
      `INSERT OR IGNORE INTO categories (id, name, slug, emoji, image, created_at)
       VALUES ('cat-fruits', 'Fruits', 'fruits', '🍎', 'https://img.halder.test/cat.jpg', ?)`,
      [now]
    );
    Database.run(
      `INSERT INTO products (id, farmer_id, category_id, name, slug, description, price, unit, available_quantity, is_organic, available_today, location, city, image, status, moderation_status, created_at, updated_at)
       VALUES (?, ?, 'cat-fruits', 'Himalayan Fuji Apples', ?, 'Fresh apples', 120, 'kg', 100, 1, 1, 'Dharampur', 'Dehradun', 'https://img.halder.test/apple.jpg', 'active', 'approved', ?, ?)`,
      [prodId, farmerProfId, `apples-${ts}`, now, now]
    );

    const custToken = CryptoUtil.generateToken({ userId: custId, role: 'customer', email: `pc.${ts}@halder.test` });
    const farmerToken = CryptoUtil.generateToken({
      userId: farmerUserId,
      role: 'farmer',
      email: `pf.${ts}@halder.test`,
      farmerProfileId: farmerProfId,
    });
    const atkToken = CryptoUtil.generateToken({ userId: attackerId, role: 'customer', email: `pa.${ts}@halder.test` });

    // 1. Non-existent participant never creates synthetic user
    const usersBefore = Database.get<{ c: number }>('SELECT COUNT(*) as c FROM users')?.c || 0;
    const missingConvRes = await api('/chat/conversations', {
      method: 'POST',
      token: custToken,
      body: { farmerId: 'non-existent-farmer-xyz-999' },
    });
    const usersAfter = Database.get<{ c: number }>('SELECT COUNT(*) as c FROM users')?.c || 0;
    check(
      'Non-existent target returns 404 without synthetic user creation',
      missingConvRes.status === 404 && usersBefore === usersAfter,
      `status=${missingConvRes.status}, usersDelta=${usersAfter - usersBefore}`
    );

    // 2. Self-conversation rejected
    const selfConvRes = await api('/chat/conversations', {
      method: 'POST',
      token: farmerToken,
      body: { farmerId: farmerProfId },
    });
    check('Self-conversation attempt rejected (400/403)', selfConvRes.status >= 400);

    // 3. Valid conversation creation returns authentic DB partner fields
    const convRes = await api('/chat/conversations', {
      method: 'POST',
      token: custToken,
      body: { farmerId: farmerProfId, productId: prodId },
    });
    const convId = convRes.json?.data?.id;
    if (convId) cleanupConvs.push(convId);
    check(
      'Conversation created with real DB partner fields',
      convRes.status === 200 &&
        Boolean(convId) &&
        convRes.json?.data?.otherParty?.name === 'Prod Farmer' &&
        convRes.json?.data?.otherParty?.farmName === 'Green Ridge Orchard'
    );

    // 4. Pagination, incremental after sync & in-chat search
    for (let i = 1; i <= 7; i++) {
      await api(`/chat/conversations/${convId}/messages`, {
        method: 'POST',
        token: custToken,
        body: { message: `Batch message #${i} organic crate`, clientMessageId: `cmsg-batch-${ts}-${i}` },
      });
      await new Promise((r) => setTimeout(r, 15));
    }
    const page1 = await api(`/chat/conversations/${convId}/messages?limit=4`, { token: custToken });
    const page1Msgs = page1.json?.messages || [];
    const nextCursor = page1.json?.pagination?.nextCursor;
    const page2 = await api(
      `/chat/conversations/${convId}/messages?limit=4&before=${encodeURIComponent(nextCursor)}`,
      { token: custToken }
    );
    const page2Msgs = page2.json?.messages || [];
    const overlap = page1Msgs.filter((m1: any) => page2Msgs.some((m2: any) => m2.id === m1.id));
    check(
      'Cursor pagination returns non-overlapping chronological pages',
      page1.json?.pagination?.hasMore === true &&
        page1Msgs.length === 4 &&
        page2Msgs.length === 3 &&
        overlap.length === 0 &&
        page2Msgs[0].message.includes('#1') &&
        page1Msgs[3].message.includes('#7'),
      `p1=${page1Msgs.length}, p2=${page2Msgs.length}, overlap=${overlap.length}`
    );

    const searchRes = await api(`/chat/conversations/${convId}/messages?q=${encodeURIComponent('#5 organic')}`, {
      token: custToken,
    });
    check(
      'In-conversation search filters exact messages',
      searchRes.status === 200 &&
        searchRes.json?.messages?.length === 1 &&
        searchRes.json?.messages[0].message.includes('#5')
    );

    // 5. Idempotency across REST + WebSocket retries
    const idemKey = `cmsg-idem-${ts}`;
    const rest1 = await api(`/chat/conversations/${convId}/messages`, {
      method: 'POST',
      token: custToken,
      body: { message: 'Idempotent harvest order check', clientMessageId: idemKey },
    });
    const rest2 = await api(`/chat/conversations/${convId}/messages`, {
      method: 'POST',
      token: custToken,
      body: { message: 'Idempotent harvest order check', clientMessageId: idemKey },
    });
    const wsCust = new WsClient(custToken);
    sockets.push(wsCust);
    await wsCust.waitForOpen();
    await wsCust.waitForEvent('connected');
    wsCust.send({ type: 'chat:join', conversationId: convId });
    await wsCust.waitForEvent('chat:joined');
    wsCust.send({
      type: 'chat:send',
      conversationId: convId,
      message: 'Idempotent harvest order check',
      clientMessageId: idemKey,
    });
    const ackDup = await wsCust.waitForEvent('chat:ack');
    const idemRows = Database.query<any>(
      'SELECT id FROM messages WHERE conversation_id = ? AND client_msg_id = ?',
      [convId, idemKey]
    );
    check(
      'clientMessageId prevents duplicates across repeated REST & WS retries',
      rest1.json?.data?.id === rest2.json?.data?.id &&
        ackDup?.messageId === rest1.json?.data?.id &&
        Boolean(ackDup?.deduplicated) &&
        idemRows.length === 1
    );

    // 6. Status progression: offline recipient -> 'sent' -> farmer connects -> 'delivered' -> read -> 'read'
    const offlineMsgKey = `cmsg-offline-${ts}`;
    wsCust.send({
      type: 'chat:send',
      conversationId: convId,
      message: 'Waiting for farmer to come online',
      clientMessageId: offlineMsgKey,
    });
    const ackOffline = await wsCust.waitForEvent('chat:ack');
    check(
      'Message to offline recipient confirmed strictly as status="sent"',
      ackOffline?.status === 'sent' && !ackOffline?.message?.deliveredAt,
      `status=${ackOffline?.status}`
    );

    // Farmer connects -> Customer receives chat:delivered & farmer presence online
    const deliveredPromise = wsCust.waitForEvent('chat:delivered');
    const wsFarmer1 = new WsClient(farmerToken);
    sockets.push(wsFarmer1);
    await wsFarmer1.waitForOpen();
    await wsFarmer1.waitForEvent('connected');
    wsFarmer1.send({ type: 'chat:join', conversationId: convId });
    await wsFarmer1.waitForEvent('chat:joined');
    const deliveredEvt = await deliveredPromise;
    check(
      'Recipient coming online promotes pending messages to status="delivered" via WS broadcast',
      Boolean(deliveredEvt?.deliveredAt) &&
        Database.get<any>('SELECT status FROM messages WHERE client_msg_id = ?', [offlineMsgKey])?.status === 'delivered'
    );

    // Incremental recovery with `after` timestamp catches message sent after Batch #4
    const afterTs = page2Msgs[2].createdAt;
    const afterRes = await api(
      `/chat/conversations/${convId}/messages?after=${encodeURIComponent(afterTs)}`,
      { token: farmerToken }
    );
    check(
      'Incremental recovery (`after` param) returns missed messages without full reload',
      afterRes.status === 200 &&
        afterRes.json?.messages?.length >= 4 &&
        afterRes.json?.messages.every((m: any) => m.createdAt > afterTs)
    );

    // 7. Edit, Reply, Soft Delete + Authorization enforcement
    const msgToModifyId = ackOffline?.messageId;
    const editByOther = await api(`/chat/conversations/${convId}/messages/${msgToModifyId}`, {
      method: 'PATCH',
      token: farmerToken,
      body: { message: 'Hijacked edit' },
    });
    check('Recipient blocked from editing sender message (403)', editByOther.status === 403);

    const editOwnPromise = wsFarmer1.waitForEvent('chat:message_edited');
    const editByOwner = await api(`/chat/conversations/${convId}/messages/${msgToModifyId}`, {
      method: 'PATCH',
      token: custToken,
      body: { message: 'Edited message text' },
    });
    const editedBroadcast = await editOwnPromise;
    check(
      'Owner can edit own message with editedAt persisted & WS broadcast',
      editByOwner.status === 200 &&
        Boolean(editByOwner.json?.data?.editedAt) &&
        editedBroadcast?.message?.message === 'Edited message text'
    );

    const replyRes = await api(`/chat/conversations/${convId}/messages`, {
      method: 'POST',
      token: farmerToken,
      body: { message: 'Replying directly to you', replyToId: msgToModifyId },
    });
    check(
      'Reply message persists replyTo reference',
      replyRes.status === 201 && replyRes.json?.data?.replyTo?.id === msgToModifyId
    );

    // Delete message & read receipt check
    const delByOther = await api(`/chat/conversations/${convId}/messages/${msgToModifyId}`, {
      method: 'DELETE',
      token: farmerToken,
    });
    check('Non-author blocked from deleting message (403)', delByOther.status === 403);

    const delPromise = wsFarmer1.waitForEvent('chat:message_deleted');
    const delByOwner = await api(`/chat/conversations/${convId}/messages/${msgToModifyId}`, {
      method: 'DELETE',
      token: custToken,
    });
    const delEvt = await delPromise;
    check(
      'Soft delete clears content and broadcasts chat:message_deleted',
      delByOwner.status === 200 && Boolean(delByOwner.json?.data?.deletedAt) && delEvt?.messageId === msgToModifyId
    );

    // 8. Typing cleanup on abrupt disconnect
    const typingOffPromise = wsFarmer1.waitForEvent(
      'chat:typing',
      3000,
      (e) => e.isTyping === false
    );
    wsCust.send({ type: 'chat:typing', conversationId: convId, isTyping: true });
    await wsFarmer1.waitForEvent('chat:typing', 3000, (e) => e.isTyping === true);
    await wsCust.close();
    const stopTypingEvt = await typingOffPromise;
    check(
      'Disconnect automatically broadcasts chat:typing false cleanup',
      stopTypingEvt?.isTyping === false
    );

    // 9. Attachments: valid upload + authenticated download + IDOR + spoofed magic-bytes rejection
    const pngBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82,
    ]);
    const validForm = new FormData();
    validForm.append('file', new Blob([pngBytes], { type: 'image/png' }), 'crate.png');
    const upRes = await fetch(`${BASE_URL}/chat/conversations/${convId}/attachments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${custToken}` },
      body: validForm,
    });
    const upJson: any = await upRes.json();
    const attId = upJson?.data?.id;
    const attUrl = upJson?.data?.url;

    const dlCust = await fetch(`http://localhost:${PORT}${attUrl}`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    const dlBuf = Buffer.from(await dlCust.arrayBuffer());
    const dlAtk = await fetch(`http://localhost:${PORT}${attUrl}`, {
      headers: { Authorization: `Bearer ${atkToken}` },
    });
    const dlNoAuth = await fetch(`http://localhost:${PORT}${attUrl}`);

    check(
      'Valid attachment stored privately, downloadable by participant (exact bytes), blocked for outsiders & unauthenticated',
      upRes.status === 201 &&
        Boolean(attId) &&
        !attUrl.includes('/uploads/') &&
        dlCust.status === 200 &&
        dlBuf.equals(pngBytes) &&
        dlAtk.status === 403 &&
        dlNoAuth.status === 401,
      `up=${upRes.status}, dlCust=${dlCust.status}, dlAtk=${dlAtk.status}, noAuth=${dlNoAuth.status}`
    );

    // Send message linking attachment
    const attMsgRes = await api(`/chat/conversations/${convId}/messages`, {
      method: 'POST',
      token: custToken,
      body: { message: '', attachmentIds: [attId] },
    });
    check(
      'Message with attachment only links attachment cleanly',
      attMsgRes.status === 201 && attMsgRes.json?.data?.attachments?.[0]?.id === attId
    );

    // Spoofed magic bytes (plain text labeled image/png)
    const spoofForm = new FormData();
    spoofForm.append('file', new Blob([Buffer.from('not-a-real-png-binary-payload')], { type: 'image/png' }), 'fake.png');
    const spoofRes = await fetch(`${BASE_URL}/chat/conversations/${convId}/attachments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${custToken}` },
      body: spoofForm,
    });
    check('Spoofed magic bytes PNG upload rejected (400)', spoofRes.status === 400);

    // 10. Notifications: unified dispatch + sender exclusion + mute suppression + preference check
    const custNotifsBefore = Database.query<any>(
      "SELECT id FROM notifications WHERE user_id = ? AND type = 'chat'",
      [custId]
    ).length;
    const farmerNotifsBefore = Database.query<any>(
      "SELECT id FROM notifications WHERE user_id = ? AND type = 'chat'",
      [farmerUserId]
    ).length;

    // Customer mutes conversation -> Farmer sends message -> Customer gets 0 new notifications
    const muteRes = await api(`/chat/conversations/${convId}/mute`, {
      method: 'PATCH',
      token: custToken,
      body: { muted: true },
    });
    await api(`/chat/conversations/${convId}/messages`, {
      method: 'POST',
      token: farmerToken,
      body: { message: 'Muted notification check from farmer' },
    });
    const custNotifsAfterMute = Database.query<any>(
      "SELECT id FROM notifications WHERE user_id = ? AND type = 'chat'",
      [custId]
    ).length;
    const farmerNotifsAfterFarmerSend = Database.query<any>(
      "SELECT id FROM notifications WHERE user_id = ? AND type = 'chat'",
      [farmerUserId]
    ).length;

    check(
      'Muted conversation suppresses notification without failing delivery & sender never notified',
      muteRes.status === 200 &&
        custNotifsAfterMute === custNotifsBefore &&
        farmerNotifsAfterFarmerSend === farmerNotifsBefore
    );

    // Unmute & verify customer notification has deep-link conversation_id, then disable prefs.chat
    await api(`/chat/conversations/${convId}/mute`, {
      method: 'PATCH',
      token: custToken,
      body: { muted: false },
    });
    await api(`/chat/conversations/${convId}/messages`, {
      method: 'POST',
      token: farmerToken,
      body: { message: 'Unmuted notification deep link verify' },
    });
    const latestCustNotif = Database.get<any>(
      "SELECT conversation_id, message_id FROM notifications WHERE user_id = ? AND type = 'chat' ORDER BY created_at DESC LIMIT 1",
      [custId]
    );
    check(
      'Unmuted incoming message persists deep-linked notification',
      latestCustNotif?.conversation_id === convId && Boolean(latestCustNotif?.message_id)
    );

    CustomerProfileService.updateSettings(custId, { chat: false });
    const countBeforePrefOff = Database.query<any>(
      "SELECT id FROM notifications WHERE user_id = ? AND type = 'chat'",
      [custId]
    ).length;
    const prefMsgRes = await api(`/chat/conversations/${convId}/messages`, {
      method: 'POST',
      token: farmerToken,
      body: { message: 'Message when chat notifications disabled in preferences' },
    });
    const countAfterPrefOff = Database.query<any>(
      "SELECT id FROM notifications WHERE user_id = ? AND type = 'chat'",
      [custId]
    ).length;
    check(
      'Notification preference chat=false skips notification without breaking message send',
      prefMsgRes.status === 201 && countAfterPrefOff === countBeforePrefOff
    );

    // Cleanup uploaded private file directory on disk
    const privDir = path.resolve(process.cwd(), 'server', 'chat_private', convId);
    if (fs.existsSync(privDir)) {
      fs.rmSync(privDir, { recursive: true, force: true });
    }
  } finally {
    for (const s of sockets) {
      await s.close().catch(() => {});
    }
    for (const cid of cleanupConvs) {
      Database.run('DELETE FROM chat_attachments WHERE conversation_id = ?', [cid]);
      Database.run('DELETE FROM notifications WHERE conversation_id = ? OR user_id IN (?, ?, ?)', [
        cid,
        custId,
        farmerUserId,
        attackerId,
      ]);
      Database.run('DELETE FROM messages WHERE conversation_id = ?', [cid]);
      Database.run('DELETE FROM conversations WHERE id = ?', [cid]);
    }
    Database.run('DELETE FROM customer_profiles WHERE user_id IN (?, ?, ?)', [custId, farmerUserId, attackerId]);
    Database.run('DELETE FROM products WHERE id = ?', [prodId]);
    Database.run('DELETE FROM farmer_profiles WHERE id = ?', [farmerProfId]);
    Database.run('DELETE FROM users WHERE id IN (?, ?, ?)', [custId, farmerUserId, attackerId]);

    await new Promise<void>((res) => server.close(() => res()));
  }

  console.log(`\n📊 CHAT PRODUCTION SUITE: ${passed} PASSED, ${failed} FAILED\n`);
  if (failed > 0) process.exit(1);
}

runSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
