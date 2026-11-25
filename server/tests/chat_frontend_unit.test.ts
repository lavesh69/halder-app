import {
  type ChatWsMessage,
  type StorageLike,
  computeBackoffDelayMs,
  deriveMessageStatus,
  generateClientMessageId,
  isNonRetryableError,
  loadCachedMessages,
  loadOutboxQueue,
  mergeMessages,
  normalizeMessage,
  outboxItemToMessage,
  removeOutboxItem,
  saveCachedMessages,
  upsertOutboxItem,
} from '../../src/hooks/chatSocketUtils';

class MemoryStorage implements StorageLike {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

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

function runFrontendTests() {
  console.log('\n🧪 HALDHAR CHAT FRONTEND QUEUE & STATE SUITE\n');

  const store = new MemoryStorage();
  const convA = 'conv-frontend-a';
  const convB = 'conv-frontend-b';

  // 1. Unique clientMessageId generation
  const id1 = generateClientMessageId();
  const id2 = generateClientMessageId();
  check('generateClientMessageId creates distinct IDs', Boolean(id1 && id2 && id1 !== id2 && id1.startsWith('cmsg-')));

  // 2. Optimistic message starts in sending state & never pretends to be sent/delivered
  const outItem = {
    clientMessageId: id1,
    conversationId: convA,
    senderId: 'user-1',
    senderRole: 'user' as const,
    message: 'Offline test order inquiry',
    status: 'sending' as const,
    createdAt: '2026-01-01T10:00:00.000Z',
    attempts: 0,
  };
  upsertOutboxItem(convA, outItem, store);
  const optMsg = outboxItemToMessage(outItem);
  check(
    'Optimistic outbox item enters sending state without deliveredAt/readAt',
    optMsg.status === 'sending' && optMsg.localOnly === true && optMsg.id === id1
  );

  // 3. Failed state persists cleanly across reload & never overwrites server cache as delivered
  upsertOutboxItem(
    convA,
    { ...outItem, status: 'failed', error: 'Network offline', attempts: 1 },
    store
  );
  const reloadedQueue = loadOutboxQueue(convA, store);
  check(
    'Failed queued message persists with explicit error across reload',
    reloadedQueue.length === 1 && reloadedQueue[0].status === 'failed' && reloadedQueue[0].error === 'Network offline'
  );

  // 4. Server confirmation (REST or WS) merges into optimistic item via clientMessageId without duplicates
  const serverConfirmed = normalizeMessage({
    id: 'msg-server-999',
    conversation_id: convA,
    sender_id: 'user-1',
    sender_role: 'user',
    message: 'Offline test order inquiry',
    client_msg_id: id1,
    status: 'sent',
    created_at: '2026-01-01T10:00:02.000Z',
  });
  const merged = mergeMessages([outboxItemToMessage(reloadedQueue[0])], [serverConfirmed]);
  check(
    'mergeMessages upgrades optimistic entry in-place by clientMessageId without duplication',
    merged.length === 1 &&
      merged[0].id === 'msg-server-999' &&
      merged[0].status === 'sent' &&
      merged[0].localOnly === false &&
      !merged[0].error
  );

  removeOutboxItem(convA, id1, store);
  check('removeOutboxItem clears acknowledged message from queue', loadOutboxQueue(convA, store).length === 0);

  // 5. Status ranking never downgrades read -> delivered or sent
  const readMsg: ChatWsMessage = normalizeMessage({
    id: 'msg-server-999',
    conversationId: convA,
    senderId: 'user-1',
    senderRole: 'user',
    message: 'Offline test order inquiry',
    status: 'read',
    deliveredAt: '2026-01-01T10:00:03.000Z',
    readAt: '2026-01-01T10:00:05.000Z',
    createdAt: '2026-01-01T10:00:02.000Z',
  });
  const staleDeliveredPayload = normalizeMessage({
    id: 'msg-server-999',
    conversationId: convA,
    senderId: 'user-1',
    senderRole: 'user',
    message: 'Offline test order inquiry',
    status: 'sent',
    createdAt: '2026-01-01T10:00:02.000Z',
  });
  const monotonicMerged = mergeMessages([readMsg], [staleDeliveredPayload]);
  check(
    'Status progression is strictly monotonic (read never regresses to sent)',
    monotonicMerged[0].status === 'read' && Boolean(monotonicMerged[0].readAt)
  );

  // 6. Conversation switching isolates cache and outbox completely
  saveCachedMessages(convA, monotonicMerged, store);
  upsertOutboxItem(
    convB,
    { ...outItem, clientMessageId: id2, conversationId: convB, message: 'Message in conv B' },
    store
  );
  check(
    'Conversation cache & outbox remain isolated per conversationId',
    loadCachedMessages(convA, store).length === 1 &&
      loadOutboxQueue(convA, store).length === 0 &&
      loadCachedMessages(convB, store).length === 0 &&
      loadOutboxQueue(convB, store).length === 1
  );

  // 7. Exponential backoff bounds & non-retryable 4xx detection
  check(
    'Exponential backoff doubles safely and caps at 30000ms',
    computeBackoffDelayMs(0) === 1000 &&
      computeBackoffDelayMs(1) === 2000 &&
      computeBackoffDelayMs(4) === 16000 &&
      computeBackoffDelayMs(8) === 30000
  );
  check(
    'Non-retryable validation/forbidden errors detected accurately vs transient network errors',
    isNonRetryableError({ status: 403, message: 'Forbidden' }) === true &&
      isNonRetryableError({ status: 400, message: 'Validation error' }) === true &&
      isNonRetryableError({ message: 'Failed to fetch' }) === false
  );

  // 8. deriveMessageStatus accuracy
  check(
    'deriveMessageStatus resolves all 5 states cleanly',
    deriveMessageStatus({ status: 'failed' }) === 'failed' &&
      deriveMessageStatus({ status: 'sending', localOnly: true }) === 'sending' &&
      deriveMessageStatus({ status: 'sent' }) === 'sent' &&
      deriveMessageStatus({ delivered_at: '2026-01-01T00:00:00Z' }) === 'delivered' &&
      deriveMessageStatus({ read_at: '2026-01-01T00:00:01Z' }) === 'read'
  );

  console.log(`\n📊 CHAT FRONTEND UNIT SUITE: ${passed} PASSED, ${failed} FAILED\n`);
  if (failed > 0) process.exit(1);
}

runFrontendTests();
