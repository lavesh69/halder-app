import type { ChatAttachmentItem, ChatMessageStatus, ChatReplyPreview } from '../types';

export interface ChatWsMessage {
  id: string;
  conversation_id?: string;
  conversationId?: string;
  sender_id?: string;
  senderId?: string;
  sender_role?: 'user' | 'farmer' | 'admin';
  senderRole?: 'user' | 'farmer' | 'admin';
  message: string;
  client_msg_id?: string | null;
  clientMessageId?: string | null;
  status?: ChatMessageStatus;
  delivered_at?: string | null;
  deliveredAt?: string | null;
  read_at?: string | null;
  readAt?: string | null;
  edited_at?: string | null;
  editedAt?: string | null;
  deleted_at?: string | null;
  deletedAt?: string | null;
  reply_to_id?: string | null;
  replyToId?: string | null;
  replyTo?: ChatReplyPreview | null;
  attachments?: ChatAttachmentItem[];
  created_at?: string;
  createdAt?: string;
  error?: string;
  localOnly?: boolean;
}

export interface OutboxQueueItem {
  clientMessageId: string;
  conversationId: string;
  senderId: string;
  senderRole: 'user' | 'farmer' | 'admin';
  message: string;
  replyToId?: string | null;
  replyTo?: ChatReplyPreview | null;
  attachmentIds?: string[];
  attachments?: ChatAttachmentItem[];
  status: 'sending' | 'failed';
  error?: string;
  createdAt: string;
  attempts: number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

const STATUS_RANK: Record<ChatMessageStatus, number> = {
  failed: 0,
  sending: 1,
  sent: 2,
  delivered: 3,
  read: 4,
};

export function generateClientMessageId(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return `cmsg-${globalThis.crypto.randomUUID()}`;
  }
  return `cmsg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function deriveMessageStatus(raw: any): ChatMessageStatus {
  if (raw?.status === 'failed') return 'failed';
  if (raw?.status === 'sending' || raw?.localOnly) return 'sending';
  if (raw?.read_at || raw?.readAt || raw?.status === 'read') return 'read';
  if (raw?.delivered_at || raw?.deliveredAt || raw?.status === 'delivered') return 'delivered';
  return 'sent';
}

export function pickHigherStatus(a?: ChatMessageStatus, b?: ChatMessageStatus): ChatMessageStatus {
  const sA = a || 'sent';
  const sB = b || 'sent';
  return STATUS_RANK[sA] >= STATUS_RANK[sB] ? sA : sB;
}

export function normalizeMessage(msg: any): ChatWsMessage {
  const convId = msg.conversation_id || msg.conversationId || '';
  const senderId = msg.sender_id || msg.senderId || '';
  const senderRole = msg.sender_role || msg.senderRole || 'user';
  const deliveredAt = msg.delivered_at !== undefined ? msg.delivered_at : (msg.deliveredAt ?? null);
  const readAt = msg.read_at !== undefined ? msg.read_at : (msg.readAt ?? null);
  const editedAt = msg.edited_at !== undefined ? msg.edited_at : (msg.editedAt ?? null);
  const deletedAt = msg.deleted_at !== undefined ? msg.deleted_at : (msg.deletedAt ?? null);
  const replyToId = msg.reply_to_id !== undefined ? msg.reply_to_id : (msg.replyToId ?? null);
  const clientMsgId = msg.client_msg_id !== undefined ? msg.client_msg_id : (msg.clientMessageId ?? null);
  const createdAt = msg.created_at || msg.createdAt || new Date().toISOString();

  let attachments: ChatAttachmentItem[] = [];
  if (Array.isArray(msg.attachments)) {
    attachments = msg.attachments;
  } else if (typeof msg.attachments_json === 'string' && msg.attachments_json.trim()) {
    try {
      const parsed = JSON.parse(msg.attachments_json);
      if (Array.isArray(parsed)) attachments = parsed;
    } catch {
      attachments = [];
    }
  }

  return {
    id: msg.id || clientMsgId || generateClientMessageId(),
    conversation_id: convId,
    conversationId: convId,
    sender_id: senderId,
    senderId,
    sender_role: senderRole,
    senderRole,
    message: typeof msg.message === 'string' ? msg.message : (typeof msg.text === 'string' ? msg.text : ''),
    client_msg_id: clientMsgId,
    clientMessageId: clientMsgId,
    status: deriveMessageStatus({ ...msg, delivered_at: deliveredAt, read_at: readAt }),
    delivered_at: deliveredAt,
    deliveredAt,
    read_at: readAt,
    readAt,
    edited_at: editedAt,
    editedAt,
    deleted_at: deletedAt,
    deletedAt,
    reply_to_id: replyToId,
    replyToId,
    replyTo: msg.replyTo ?? null,
    attachments: deletedAt ? [] : attachments,
    created_at: createdAt,
    createdAt,
    error: msg.error,
    localOnly: Boolean(msg.localOnly),
  };
}

export function mergeMessages(
  existing: ChatWsMessage[],
  incoming: ChatWsMessage[]
): ChatWsMessage[] {
  const byKey = new Map<string, ChatWsMessage>();
  const clientKeyToId = new Map<string, string>();

  const upsert = (rawMsg: ChatWsMessage) => {
    const msg = normalizeMessage(rawMsg);
    const clientKey = msg.clientMessageId || msg.client_msg_id || undefined;
    const mappedExistingId = clientKey ? clientKeyToId.get(clientKey) : undefined;
    const lookupKey = byKey.has(msg.id)
      ? msg.id
      : mappedExistingId && byKey.has(mappedExistingId)
        ? mappedExistingId
        : clientKey && byKey.has(clientKey)
          ? clientKey
          : msg.id;

    const prev = byKey.get(lookupKey);
    if (!prev) {
      byKey.set(msg.id, msg);
      if (clientKey) clientKeyToId.set(clientKey, msg.id);
      return;
    }

    // Upgrade optimistic entry -> server entry cleanly without losing stronger status or reply/attachment context
    if (lookupKey !== msg.id) {
      byKey.delete(lookupKey);
    }

    const useIncomingAsTruth = !msg.localOnly;
    const status = msg.status === 'failed' && prev.localOnly && msg.localOnly
      ? 'failed'
      : useIncomingAsTruth
        ? pickHigherStatus(
            prev.localOnly ? undefined : prev.status,
            msg.status
          )
        : pickHigherStatus(prev.status, msg.status);

    const merged: ChatWsMessage = {
      ...prev,
      ...msg,
      id: useIncomingAsTruth ? msg.id : prev.id,
      clientMessageId: clientKey || prev.clientMessageId || null,
      client_msg_id: clientKey || prev.client_msg_id || null,
      status,
      deliveredAt: msg.deliveredAt || prev.deliveredAt || null,
      delivered_at: msg.delivered_at || prev.delivered_at || null,
      readAt: msg.readAt || prev.readAt || null,
      read_at: msg.read_at || prev.read_at || null,
      editedAt: msg.editedAt || prev.editedAt || null,
      edited_at: msg.edited_at || prev.edited_at || null,
      deletedAt: msg.deletedAt || prev.deletedAt || null,
      deleted_at: msg.deleted_at || prev.deleted_at || null,
      replyTo: msg.replyTo ?? prev.replyTo ?? null,
      attachments:
        msg.deletedAt || prev.deletedAt
          ? []
          : msg.attachments && msg.attachments.length > 0
            ? msg.attachments
            : prev.attachments || [],
      error: useIncomingAsTruth ? undefined : msg.error,
      localOnly: useIncomingAsTruth ? false : Boolean(msg.localOnly || prev.localOnly),
    };

    byKey.set(merged.id, merged);
    if (merged.clientMessageId) {
      clientKeyToId.set(merged.clientMessageId, merged.id);
    }
  };

  for (const m of existing) upsert(m);
  for (const m of incoming) upsert(m);

  return Array.from(byKey.values()).sort((a, b) => {
    const tA = new Date(a.createdAt || a.created_at || 0).getTime();
    const tB = new Date(b.createdAt || b.created_at || 0).getTime();
    if (tA !== tB) return tA - tB;
    return String(a.id).localeCompare(String(b.id));
  });
}

function getStorage(custom?: StorageLike | null): StorageLike | null {
  if (custom) return custom;
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  return null;
}

export function getOutboxStorageKey(conversationId: string): string {
  return `halder-chat-outbox-${conversationId}`;
}

export function getCacheStorageKey(conversationId: string): string {
  return `halder-chat-cache-${conversationId}`;
}

export function loadOutboxQueue(conversationId: string, storage?: StorageLike | null): OutboxQueueItem[] {
  const store = getStorage(storage);
  if (!store || !conversationId) return [];
  try {
    const raw = store.getItem(getOutboxStorageKey(conversationId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOutboxQueue(
  conversationId: string,
  items: OutboxQueueItem[],
  storage?: StorageLike | null
): void {
  const store = getStorage(storage);
  if (!store || !conversationId) return;
  try {
    if (items.length === 0 && store.removeItem) {
      store.removeItem(getOutboxStorageKey(conversationId));
    } else {
      store.setItem(getOutboxStorageKey(conversationId), JSON.stringify(items.slice(-50)));
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function upsertOutboxItem(
  conversationId: string,
  item: OutboxQueueItem,
  storage?: StorageLike | null
): OutboxQueueItem[] {
  const current = loadOutboxQueue(conversationId, storage);
  const idx = current.findIndex((x) => x.clientMessageId === item.clientMessageId);
  const next = idx >= 0
    ? current.map((x, i) => (i === idx ? { ...x, ...item } : x))
    : [...current, item];
  saveOutboxQueue(conversationId, next, storage);
  return next;
}

export function removeOutboxItem(
  conversationId: string,
  clientMessageId: string,
  storage?: StorageLike | null
): OutboxQueueItem[] {
  const current = loadOutboxQueue(conversationId, storage);
  const next = current.filter((x) => x.clientMessageId !== clientMessageId);
  saveOutboxQueue(conversationId, next, storage);
  return next;
}

export function outboxItemToMessage(item: OutboxQueueItem): ChatWsMessage {
  return normalizeMessage({
    id: item.clientMessageId,
    conversationId: item.conversationId,
    senderId: item.senderId,
    senderRole: item.senderRole,
    message: item.message,
    clientMessageId: item.clientMessageId,
    status: item.status,
    replyToId: item.replyToId || null,
    replyTo: item.replyTo || null,
    attachments: item.attachments || [],
    createdAt: item.createdAt,
    error: item.error,
    localOnly: true,
  });
}

export function loadCachedMessages(conversationId: string, storage?: StorageLike | null): ChatWsMessage[] {
  const store = getStorage(storage);
  if (!store || !conversationId) return [];
  try {
    const raw = store.getItem(getCacheStorageKey(conversationId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeMessage) : [];
  } catch {
    return [];
  }
}

export function saveCachedMessages(
  conversationId: string,
  messages: ChatWsMessage[],
  storage?: StorageLike | null
): void {
  const store = getStorage(storage);
  if (!store || !conversationId) return;
  try {
    const serverOnly = messages.filter((m) => !m.localOnly).slice(-60);
    store.setItem(getCacheStorageKey(conversationId), JSON.stringify(serverOnly));
  } catch {
    // Ignore storage quota errors
  }
}

export function computeBackoffDelayMs(attempt: number, baseMs = 1000, maxMs = 30000): number {
  const clampedAttempt = Math.max(0, Math.min(12, attempt));
  return Math.min(maxMs, Math.round(baseMs * Math.pow(2, clampedAttempt)));
}

export function isNonRetryableError(err: any): boolean {
  const status = err?.status || err?.statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500 && status !== 408 && status !== 429) {
    return true;
  }
  const msg = String(err?.message || '').toLowerCase();
  return (
    msg.includes('not a participant') ||
    msg.includes('validation error') ||
    msg.includes('forbidden') ||
    msg.includes('not found') ||
    msg.includes('cannot exceed')
  );
}
