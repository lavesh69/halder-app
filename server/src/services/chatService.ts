import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeText } from '../utils/sanitize';
import { NotificationService } from './notificationService';

export interface FormattedAttachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

export interface FormattedReplySnippet {
  id: string;
  senderId: string;
  senderRole: 'user' | 'farmer' | 'admin';
  message: string;
  deletedAt: string | null;
  hasAttachments: boolean;
}

export interface FormattedMessage {
  id: string;
  conversation_id: string;
  conversationId: string;
  sender_id: string;
  senderId: string;
  sender_role: 'user' | 'farmer' | 'admin';
  senderRole: 'user' | 'farmer' | 'admin';
  message: string;
  client_msg_id: string | null;
  clientMessageId: string | null;
  status: 'sent' | 'delivered' | 'read';
  delivered_at: string | null;
  deliveredAt: string | null;
  read_at: string | null;
  readAt: string | null;
  edited_at: string | null;
  editedAt: string | null;
  deleted_at: string | null;
  deletedAt: string | null;
  reply_to_id: string | null;
  replyToId: string | null;
  replyTo: FormattedReplySnippet | null;
  attachments: FormattedAttachment[];
  created_at: string;
  createdAt: string;
}

export interface ConversationParticipant {
  id: string;
  userId?: string;
  farmerProfileId?: string;
  name: string;
  phone?: string;
  avatar: string;
  farmName: string;
  city: string;
  location: string;
  halderId?: string;
  role: 'customer' | 'farmer' | 'admin';
  verificationStatus: string;
  rating: number | null;
  reviewsCount: number;
  isOnline: boolean;
  lastSeenAt: string | null;
}

const CONVERSATION_BASE_SELECT = `
  SELECT 
    c.id,
    c.customer_id,
    c.farmer_id,
    c.product_id,
    c.last_message_at,
    c.muted_by_customer,
    c.muted_by_farmer,
    c.created_at,
    c.updated_at,
    cu.id AS cust_user_id,
    cu.name AS cust_name,
    cu.phone AS cust_phone,
    cu.profile_image AS cust_avatar,
    cu.halder_id AS cust_halder_id,
    cu.last_seen_at AS cust_last_seen_at,
    fp.id AS farm_profile_id,
    fp.user_id AS farm_user_id,
    fp.farm_name AS farm_name,
    fp.location AS farm_location,
    fp.avatar AS farm_avatar,
    fp.city AS farm_city,
    fp.verification_status AS farm_verification_status,
    fp.rating AS farm_rating,
    fp.total_orders AS farm_total_orders,
    fu.name AS farm_owner_name,
    fu.phone AS farm_phone,
    fu.profile_image AS farm_user_avatar,
    fu.halder_id AS farm_halder_id,
    fu.last_seen_at AS farm_last_seen_at,
    p.name AS product_name,
    p.image AS product_image,
    p.unit AS product_unit,
    (
      SELECT COUNT(*) FROM messages um
      WHERE um.conversation_id = c.id AND um.sender_id != ? AND um.read_at IS NULL AND um.deleted_at IS NULL
    ) AS unread_count
  FROM conversations c
  LEFT JOIN users cu ON c.customer_id = cu.id
  LEFT JOIN farmer_profiles fp ON c.farmer_id = fp.id
  LEFT JOIN users fu ON fp.user_id = fu.id
  LEFT JOIN products p ON c.product_id = p.id
`;

function parseAttachments(raw: string | null | undefined): FormattedAttachment[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function formatMessageRow(m: any, replyMap?: Map<string, FormattedReplySnippet>): FormattedMessage {
  const isDeleted = Boolean(m.deleted_at);
  const status: 'sent' | 'delivered' | 'read' = m.read_at
    ? 'read'
    : m.delivered_at || m.status === 'delivered'
    ? 'delivered'
    : 'sent';

  const attachments = isDeleted ? [] : parseAttachments(m.attachments_json);
  const replyTo = m.reply_to_id && replyMap ? replyMap.get(m.reply_to_id) || null : null;

  return {
    id: m.id,
    conversation_id: m.conversation_id,
    conversationId: m.conversation_id,
    sender_id: m.sender_id,
    senderId: m.sender_id,
    sender_role: m.sender_role,
    senderRole: m.sender_role,
    message: isDeleted ? '' : m.message || '',
    client_msg_id: m.client_msg_id || null,
    clientMessageId: m.client_msg_id || null,
    status,
    delivered_at: m.delivered_at || null,
    deliveredAt: m.delivered_at || null,
    read_at: m.read_at || null,
    readAt: m.read_at || null,
    edited_at: m.edited_at || null,
    editedAt: m.edited_at || null,
    deleted_at: m.deleted_at || null,
    deletedAt: m.deleted_at || null,
    reply_to_id: m.reply_to_id || null,
    replyToId: m.reply_to_id || null,
    replyTo,
    attachments,
    created_at: m.created_at,
    createdAt: m.created_at,
  };
}

export class ChatService {
  private static buildReplyMap(rows: any[]): Map<string, FormattedReplySnippet> {
    const replyIds = Array.from(new Set(rows.map((r) => r.reply_to_id).filter(Boolean)));
    const map = new Map<string, FormattedReplySnippet>();
    if (replyIds.length === 0) return map;

    const placeholders = replyIds.map(() => '?').join(', ');
    const targets = Database.query<any>(
      `SELECT id, sender_id, sender_role, message, deleted_at, attachments_json
       FROM messages WHERE id IN (${placeholders})`,
      replyIds
    );
    for (const t of targets) {
      map.set(t.id, {
        id: t.id,
        senderId: t.sender_id,
        senderRole: t.sender_role,
        message: t.deleted_at ? '' : t.message || '',
        deletedAt: t.deleted_at || null,
        hasAttachments: !t.deleted_at && parseAttachments(t.attachments_json).length > 0,
      });
    }
    return map;
  }

  /**
   * Resolves authentic conversation participants from DB without creating synthetic accounts.
   */
  static getOrCreateConversation(initiatorUserId: string, targetPartyId: string, productId?: string) {
    if (!initiatorUserId || !targetPartyId) {
      throw AppError.badRequest('Both initiator and target participant IDs are required.');
    }

    const initiatorUser = Database.get<any>(
      'SELECT id, name, role, status FROM users WHERE id = ?',
      [initiatorUserId]
    );
    if (!initiatorUser) {
      throw AppError.notFound('Initiator user not found.');
    }
    if (initiatorUser.status === 'suspended') {
      throw AppError.forbidden('Suspended accounts cannot start conversations.');
    }

    const initiatorFp = Database.get<any>('SELECT * FROM farmer_profiles WHERE user_id = ?', [initiatorUser.id]);

    // Locate target strictly in existing DB records (farmer_profiles or users)
    let targetFp = Database.get<any>('SELECT * FROM farmer_profiles WHERE id = ?', [targetPartyId]);
    if (!targetFp) {
      targetFp = Database.get<any>('SELECT * FROM farmer_profiles WHERE user_id = ?', [targetPartyId]);
    }

    const targetUser = Database.get<any>(
      'SELECT id, name, role, status FROM users WHERE id = ?',
      [targetFp ? targetFp.user_id : targetPartyId]
    );

    if (!targetUser) {
      throw AppError.notFound('Target user or seller does not exist.');
    }
    if (targetUser.id === initiatorUser.id) {
      throw AppError.badRequest('Cannot start a conversation with yourself.');
    }

    let customerId: string;
    let farmerProfileId: string;

    if (targetFp) {
      // Check if an existing conversation already exists in either customer/farmer direction
      const existingPair = Database.get<any>(
        `SELECT * FROM conversations
         WHERE (customer_id = ? AND farmer_id = ?)
            OR (customer_id = ? AND farmer_id IN (SELECT id FROM farmer_profiles WHERE user_id = ?))`,
        [initiatorUser.id, targetFp.id, targetUser.id, initiatorUser.id]
      );
      if (existingPair) {
        return this.touchAndFormatConversation(existingPair, initiatorUserId, productId);
      }
      customerId = initiatorUser.id;
      farmerProfileId = targetFp.id;
    } else if (initiatorFp) {
      // Farmer initiating chat with an existing customer user
      const existingPair = Database.get<any>(
        `SELECT * FROM conversations WHERE customer_id = ? AND farmer_id = ?`,
        [targetUser.id, initiatorFp.id]
      );
      if (existingPair) {
        return this.touchAndFormatConversation(existingPair, initiatorUserId, productId);
      }
      customerId = targetUser.id;
      farmerProfileId = initiatorFp.id;
    } else {
      // Neither has a farmer_profiles row yet, but targetUser is a verified real row in `users`
      // Create a minimal unverified seller link referencing ONLY existing targetUser DB identity
      const newFpId = `farmer-${targetUser.id.replace(/^user-/, '')}`;
      const now = new Date().toISOString();
      Database.run(
        `INSERT OR IGNORE INTO farmer_profiles (
          id, user_id, farm_name, description, location, city, verification_status, rating, created_at, updated_at
        ) VALUES (?, ?, ?, '', '', '', 'pending', 5.0, ?, ?)`,
        [newFpId, targetUser.id, targetUser.name, now, now]
      );
      const createdFp = Database.get<any>('SELECT * FROM farmer_profiles WHERE user_id = ?', [targetUser.id]);
      if (!createdFp) {
        throw AppError.notFound('Target seller profile could not be resolved.');
      }
      customerId = initiatorUser.id;
      farmerProfileId = createdFp.id;
    }

    let conv = Database.get<any>(
      'SELECT * FROM conversations WHERE customer_id = ? AND farmer_id = ?',
      [customerId, farmerProfileId]
    );

    const now = new Date().toISOString();
    if (!conv) {
      // Validate productId if supplied so invalid product links don't fail FK
      let validProductId: string | null = null;
      if (productId) {
        const prodExists = Database.get<any>('SELECT id FROM products WHERE id = ?', [productId]);
        if (prodExists) validProductId = prodExists.id;
      }

      const convId = `conv-${uuidv4()}`;
      Database.run(
        `INSERT INTO conversations (id, customer_id, farmer_id, product_id, last_message_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [convId, customerId, farmerProfileId, validProductId, now, now, now]
      );
      return this.getFormattedConversationForUser(convId, initiatorUserId) || Database.get<any>('SELECT * FROM conversations WHERE id = ?', [convId]);
    }

    return this.touchAndFormatConversation(conv, initiatorUserId, productId);
  }

  private static touchAndFormatConversation(conv: any, viewerUserId: string, productId?: string) {
    const now = new Date().toISOString();
    Database.run('UPDATE conversations SET updated_at = ? WHERE id = ?', [now, conv.id]);
    if (productId && !conv.product_id) {
      const prodExists = Database.get<any>('SELECT id FROM products WHERE id = ?', [productId]);
      if (prodExists) {
        Database.run('UPDATE conversations SET product_id = ? WHERE id = ?', [productId, conv.id]);
      }
    }
    return this.getFormattedConversationForUser(conv.id, viewerUserId);
  }

  /**
   * Get a conversation by ID.
   */
  static getConversationById(conversationId: string) {
    const conv = Database.get<any>('SELECT * FROM conversations WHERE id = ?', [conversationId]);
    if (!conv) return null;
    return {
      ...conv,
      customerId: conv.customer_id,
      farmerId: conv.farmer_id,
      productId: conv.product_id,
      lastMessageAt: conv.last_message_at || conv.updated_at,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
    };
  }

  /**
   * Verify user participates in conversation (defense-in-depth helper).
   */
  static verifyParticipant(conv: { customer_id: string; farmer_id: string }, userId: string, role?: string): boolean {
    if (role === 'admin') return true;
    if (conv.customer_id === userId) return true;
    if (conv.farmer_id === userId) return true;
    const fp = Database.get<any>('SELECT 1 FROM farmer_profiles WHERE id = ? AND user_id = ?', [
      conv.farmer_id,
      userId,
    ]);
    return fp != null;
  }

  /**
   * Resolve customer and farmer user IDs plus mute status for a conversation.
   */
  static getConversationMeta(conversationId: string) {
    return Database.get<any>(
      `SELECT c.id, c.customer_id, c.farmer_id, c.muted_by_customer, c.muted_by_farmer,
              fp.user_id AS farmer_user_id
       FROM conversations c
       LEFT JOIN farmer_profiles fp ON c.farmer_id = fp.id
       WHERE c.id = ?`,
      [conversationId]
    );
  }

  /**
   * Returns all user IDs that share at least one conversation with `userId`.
   */
  static getPartnerUserIds(userId: string): string[] {
    const rows = Database.query<{ partner_user_id: string }>(
      `SELECT DISTINCT
         CASE
           WHEN c.customer_id = ? THEN fp.user_id
           ELSE c.customer_id
         END AS partner_user_id
       FROM conversations c
       LEFT JOIN farmer_profiles fp ON c.farmer_id = fp.id
       WHERE (c.customer_id = ? OR fp.user_id = ?)`,
      [userId, userId, userId]
    );
    return rows.map((r) => r.partner_user_id).filter((id) => Boolean(id) && id !== userId);
  }

  private static formatConversationRow(
    row: any,
    userId: string,
    isOnlineCheck?: (uid: string) => boolean
  ) {
    const isBuyer = row.cust_user_id === userId;
    const convType = isBuyer ? 'buying' : 'selling';

    const lastMsgRaw = Database.get<any>(
      `SELECT id, conversation_id, sender_id, sender_role, message, client_msg_id, status,
              delivered_at, read_at, edited_at, deleted_at, reply_to_id, attachments_json, created_at
       FROM messages
       WHERE conversation_id = ?
       ORDER BY created_at DESC LIMIT 1`,
      [row.id]
    );

    let lastMessage: FormattedMessage | null = null;
    if (lastMsgRaw) {
      const formattedMsg = formatMessageRow(lastMsgRaw);
      const previewText = lastMsgRaw.deleted_at
        ? 'This message was deleted'
        : !formattedMsg.message && formattedMsg.attachments.length > 0
        ? `📎 ${formattedMsg.attachments[0].filename}`
        : formattedMsg.message;
      lastMessage = {
        ...formattedMsg,
        message: previewText,
      };
    }

    const otherUserId = isBuyer ? row.farm_user_id || row.farmer_id : row.cust_user_id || row.customer_id;
    const otherParty: ConversationParticipant = isBuyer
      ? {
          id: otherUserId,
          userId: otherUserId,
          farmerProfileId: row.farm_profile_id || row.farmer_id,
          name: row.farm_owner_name || row.farm_name || 'Seller',
          phone: row.farm_phone || undefined,
          avatar: row.farm_avatar || row.farm_user_avatar || '',
          farmName: row.farm_name || '',
          city: row.farm_city || '',
          location: row.farm_location || row.farm_city || '',
          halderId: row.farm_halder_id || undefined,
          role: 'farmer',
          verificationStatus: row.farm_verification_status || 'pending',
          rating: typeof row.farm_rating === 'number' ? row.farm_rating : null,
          reviewsCount: Number(row.farm_total_orders || 0),
          isOnline: isOnlineCheck ? isOnlineCheck(otherUserId) : false,
          lastSeenAt: row.farm_last_seen_at || null,
        }
      : {
          id: otherUserId,
          userId: otherUserId,
          name: row.cust_name || 'Customer',
          phone: row.cust_phone || undefined,
          avatar: row.cust_avatar || '',
          farmName: '',
          city: '',
          location: '',
          halderId: row.cust_halder_id || undefined,
          role: 'customer',
          verificationStatus: 'pending',
          rating: null,
          reviewsCount: 0,
          isOnline: isOnlineCheck ? isOnlineCheck(otherUserId) : false,
          lastSeenAt: row.cust_last_seen_at || null,
        };

    const product = row.product_name
      ? {
          id: row.product_id,
          name: row.product_name,
          image: row.product_image || '',
          unit: row.product_unit || '',
        }
      : null;

    const isMuted = isBuyer ? Boolean(row.muted_by_customer) : Boolean(row.muted_by_farmer);

    return {
      id: row.id,
      customer_id: row.customer_id,
      customerId: row.customer_id,
      farmer_id: row.farmer_id,
      farmerId: row.farmer_id,
      product_id: row.product_id,
      productId: row.product_id,
      type: convType,
      isMuted,
      lastMessageAt: row.last_message_at || row.updated_at,
      created_at: row.created_at,
      createdAt: row.created_at,
      updated_at: row.updated_at,
      updatedAt: row.updated_at,
      otherParty,
      product,
      lastMessage,
      unreadCount: Number(row.unread_count || 0),
    };
  }

  static getFormattedConversationForUser(
    conversationId: string,
    userId: string,
    isUserOnline?: (uid: string) => boolean
  ) {
    const row = Database.get<any>(`${CONVERSATION_BASE_SELECT} WHERE c.id = ?`, [userId, conversationId]);
    if (!row) return null;
    return this.formatConversationRow(row, userId, isUserOnline);
  }

  /**
   * Get all conversations for the authenticated user using real DB fields only.
   */
  static getUserConversations(
    userId: string,
    role: string,
    farmerProfileId?: string,
    options?: {
      search?: string;
      isUserOnline?: (uid: string) => boolean;
    }
  ) {
    let actualFarmerProfileId = farmerProfileId;
    if (!actualFarmerProfileId) {
      const fp = Database.get<any>('SELECT id FROM farmer_profiles WHERE user_id = ?', [userId]);
      actualFarmerProfileId = fp?.id;
    }

    const rows =
      role === 'admin'
        ? Database.query<any>(
            `${CONVERSATION_BASE_SELECT} ORDER BY COALESCE(c.last_message_at, c.updated_at) DESC`,
            [userId]
          )
        : Database.query<any>(
            `${CONVERSATION_BASE_SELECT}
             WHERE c.customer_id = ? OR fp.user_id = ? OR c.farmer_id = ?
             ORDER BY COALESCE(c.last_message_at, c.updated_at) DESC`,
            [userId, userId, userId, actualFarmerProfileId || '']
          );

    const formatted = rows.map((row) => this.formatConversationRow(row, userId, options?.isUserOnline));

    const query = options?.search?.trim().toLowerCase();
    if (!query) return formatted;

    return formatted.filter((c) => {
      const nameMatch = c.otherParty.name.toLowerCase().includes(query);
      const farmMatch = c.otherParty.farmName.toLowerCase().includes(query);
      const prodMatch = c.product?.name?.toLowerCase().includes(query);
      const msgMatch = c.lastMessage?.message?.toLowerCase().includes(query);
      return Boolean(nameMatch || farmMatch || prodMatch || msgMatch);
    });
  }

  /**
   * Retrieve paginated, incremental (`after`), or searchable (`search`) conversation history.
   */
  static getMessages(
    conversationId: string,
    options?: { limit?: number; before?: string; after?: string; search?: string }
  ): { messages: FormattedMessage[]; hasMore: boolean; nextCursor: string | null } {
    const conv = Database.get<any>('SELECT id FROM conversations WHERE id = ?', [conversationId]);
    if (!conv) {
      throw AppError.notFound('Conversation not found');
    }

    // Incremental recovery sync after reconnect (includes edited & deleted tombstones)
    if (options?.after) {
      const afterRows = Database.query<any>(
        `SELECT id, conversation_id, sender_id, sender_role, message, client_msg_id, status,
                delivered_at, read_at, edited_at, deleted_at, reply_to_id, attachments_json, created_at
         FROM messages
         WHERE conversation_id = ?
           AND (
             created_at > ?
             OR (edited_at IS NOT NULL AND edited_at > ?)
             OR (deleted_at IS NOT NULL AND deleted_at > ?)
           )
         ORDER BY created_at ASC`,
        [conversationId, options.after, options.after, options.after]
      );
      const replyMap = this.buildReplyMap(afterRows);
      const messages = afterRows.map((m) => formatMessageRow(m, replyMap));
      return {
        messages,
        hasMore: false,
        nextCursor: messages.length > 0 ? messages[0].createdAt : null,
      };
    }

    // In-conversation text search
    if (options?.search && options.search.trim()) {
      const escaped = options.search.trim().replace(/[%_]/g, '\\$&');
      const matched = Database.query<any>(
        `SELECT id, conversation_id, sender_id, sender_role, message, client_msg_id, status,
                delivered_at, read_at, edited_at, deleted_at, reply_to_id, attachments_json, created_at
         FROM messages
         WHERE conversation_id = ? AND deleted_at IS NULL AND message LIKE ? ESCAPE '\\'
         ORDER BY created_at DESC LIMIT 50`,
        [conversationId, `%${escaped}%`]
      );
      matched.reverse();
      const replyMap = this.buildReplyMap(matched);
      const messages = matched.map((m) => formatMessageRow(m, replyMap));
      return {
        messages,
        hasMore: false,
        nextCursor: messages.length > 0 ? messages[0].createdAt : null,
      };
    }

    const limit = Math.min(100, Math.max(1, options?.limit || 50));

    let rows: any[];
    if (options?.before) {
      // Support cursor by created_at timestamp or message ID
      const beforeRef = options.before.startsWith('msg-')
        ? Database.get<any>('SELECT created_at FROM messages WHERE id = ? AND conversation_id = ?', [
            options.before,
            conversationId,
          ])?.created_at || options.before
        : options.before;

      rows = Database.query<any>(
        `SELECT id, conversation_id, sender_id, sender_role, message, client_msg_id, status,
                delivered_at, read_at, edited_at, deleted_at, reply_to_id, attachments_json, created_at
         FROM messages
         WHERE conversation_id = ? AND created_at < ?
         ORDER BY created_at DESC LIMIT ?`,
        [conversationId, beforeRef, limit + 1]
      );
    } else {
      rows = Database.query<any>(
        `SELECT id, conversation_id, sender_id, sender_role, message, client_msg_id, status,
                delivered_at, read_at, edited_at, deleted_at, reply_to_id, attachments_json, created_at
         FROM messages
         WHERE conversation_id = ?
         ORDER BY created_at DESC LIMIT ?`,
        [conversationId, limit + 1]
      );
    }

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    pageRows.reverse(); // Chronological ASC order for UI feed

    const replyMap = this.buildReplyMap(pageRows);
    const messages = pageRows.map((m) => formatMessageRow(m, replyMap));

    return {
      messages,
      hasMore,
      nextCursor: messages.length > 0 ? messages[0].createdAt : null,
    };
  }

  /**
   * Transaction-safe, idempotent message persistence supporting replies & validated attachments.
   */
  static sendMessage(
    conversationId: string,
    senderId: string,
    senderRole: 'user' | 'farmer' | 'admin',
    text: string,
    options?: {
      clientMessageId?: string;
      replyToId?: string;
      attachmentIds?: string[];
      recipientOnline?: boolean;
    }
  ): FormattedMessage & { deduplicated?: boolean } {
    const cleanText = sanitizeText(text || '');
    const clientMsgId = options?.clientMessageId?.trim() || null;
    const attachmentIds = Array.isArray(options?.attachmentIds)
      ? Array.from(new Set(options!.attachmentIds.filter((id) => typeof id === 'string' && id.trim())))
      : [];

    if (!cleanText.trim() && attachmentIds.length === 0) {
      throw AppError.badRequest('Message text or at least one attachment is required.');
    }

    return Database.transaction(() => {
      const conv = Database.get<any>(
        `SELECT c.id, c.customer_id, c.farmer_id, fp.user_id AS farmer_user_id
         FROM conversations c
         LEFT JOIN farmer_profiles fp ON c.farmer_id = fp.id
         WHERE c.id = ?`,
        [conversationId]
      );
      if (!conv) {
        throw AppError.notFound('Conversation not found');
      }

      if (!this.verifyParticipant(conv, senderId, senderRole)) {
        throw AppError.forbidden('You are not a participant in this conversation.');
      }

      // Idempotency check (prevents duplicate rows on WS retry / REST fallback)
      if (clientMsgId) {
        const existing = Database.get<any>(
          'SELECT * FROM messages WHERE conversation_id = ? AND client_msg_id = ?',
          [conversationId, clientMsgId]
        );
        if (existing) {
          const replyMap = this.buildReplyMap([existing]);
          return { ...formatMessageRow(existing, replyMap), deduplicated: true };
        }
      }

      let validReplyToId: string | null = null;
      if (options?.replyToId) {
        const replyTarget = Database.get<any>(
          'SELECT id FROM messages WHERE id = ? AND conversation_id = ?',
          [options.replyToId, conversationId]
        );
        if (!replyTarget) {
          throw AppError.badRequest('Reply target message does not exist in this conversation.');
        }
        validReplyToId = replyTarget.id;
      }

      let attachmentsMeta: FormattedAttachment[] = [];
      if (attachmentIds.length > 0) {
        if (attachmentIds.length > 5) {
          throw AppError.badRequest('A maximum of 5 attachments can be sent per message.');
        }
        const placeholders = attachmentIds.map(() => '?').join(', ');
        const foundAttachments = Database.query<any>(
          `SELECT id, conversation_id, original_name, mime_type, size_bytes
           FROM chat_attachments
           WHERE id IN (${placeholders}) AND conversation_id = ? AND uploader_id = ?`,
          [...attachmentIds, conversationId, senderId]
        );
        if (foundAttachments.length !== attachmentIds.length) {
          throw AppError.badRequest('One or more attachments are invalid or do not belong to this conversation.');
        }
        attachmentsMeta = foundAttachments.map((a) => ({
          id: a.id,
          filename: a.original_name,
          mimeType: a.mime_type,
          sizeBytes: a.size_bytes,
          url: `/api/v1/chat/conversations/${conversationId}/attachments/${a.id}`,
        }));
      }

      const messageId = `msg-${uuidv4()}`;
      const now = new Date().toISOString();
      const deliveredAt = options?.recipientOnline ? now : null;
      const initialStatus = deliveredAt ? 'delivered' : 'sent';
      const attachmentsJson = attachmentsMeta.length > 0 ? JSON.stringify(attachmentsMeta) : null;

      try {
        Database.run(
          `INSERT INTO messages (
            id, conversation_id, sender_id, sender_role, message, client_msg_id,
            status, delivered_at, reply_to_id, attachments_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            messageId,
            conversationId,
            senderId,
            senderRole,
            cleanText,
            clientMsgId,
            initialStatus,
            deliveredAt,
            validReplyToId,
            attachmentsJson,
            now,
          ]
        );
      } catch (err: any) {
        // Race condition safeguard on UNIQUE(conversation_id, client_msg_id)
        if (clientMsgId && String(err?.message || '').toLowerCase().includes('unique')) {
          const raceExisting = Database.get<any>(
            'SELECT * FROM messages WHERE conversation_id = ? AND client_msg_id = ?',
            [conversationId, clientMsgId]
          );
          if (raceExisting) {
            const replyMap = this.buildReplyMap([raceExisting]);
            return { ...formatMessageRow(raceExisting, replyMap), deduplicated: true };
          }
        }
        throw err;
      }

      if (attachmentIds.length > 0) {
        const attPlaceholders = attachmentIds.map(() => '?').join(', ');
        Database.run(
          `UPDATE chat_attachments SET message_id = ? WHERE id IN (${attPlaceholders})`,
          [messageId, ...attachmentIds]
        );
      }

      Database.run(
        'UPDATE conversations SET updated_at = ?, last_message_at = ? WHERE id = ?',
        [now, now, conversationId]
      );

      const inserted = Database.get<any>('SELECT * FROM messages WHERE id = ?', [messageId]);
      const replyMap = this.buildReplyMap([inserted]);
      return { ...formatMessageRow(inserted, replyMap), deduplicated: false };
    });
  }

  /**
   * Edit an existing message sent by `userId`.
   */
  static editMessage(conversationId: string, messageId: string, userId: string, newText: string): FormattedMessage {
    const cleanText = sanitizeText(newText || '');
    if (!cleanText.trim()) {
      throw AppError.badRequest('Edited message text cannot be empty.');
    }

    const msg = Database.get<any>(
      'SELECT * FROM messages WHERE id = ? AND conversation_id = ?',
      [messageId, conversationId]
    );
    if (!msg) {
      throw AppError.notFound('Message not found.');
    }
    if (msg.sender_id !== userId) {
      throw AppError.forbidden('You can only edit your own messages.');
    }
    if (msg.deleted_at) {
      throw AppError.badRequest('Deleted messages cannot be edited.');
    }

    const now = new Date().toISOString();
    Database.run('UPDATE messages SET message = ?, edited_at = ? WHERE id = ?', [cleanText, now, messageId]);
    Database.run('UPDATE conversations SET updated_at = ? WHERE id = ?', [now, conversationId]);

    const updated = Database.get<any>('SELECT * FROM messages WHERE id = ?', [messageId]);
    const replyMap = this.buildReplyMap([updated]);
    return formatMessageRow(updated, replyMap);
  }

  /**
   * Soft-delete an existing message authored by `userId` (or admin).
   */
  static deleteMessage(conversationId: string, messageId: string, userId: string, role?: string): FormattedMessage {
    const msg = Database.get<any>(
      'SELECT * FROM messages WHERE id = ? AND conversation_id = ?',
      [messageId, conversationId]
    );
    if (!msg) {
      throw AppError.notFound('Message not found.');
    }
    if (msg.sender_id !== userId && role !== 'admin') {
      throw AppError.forbidden('You can only delete your own messages.');
    }

    const now = new Date().toISOString();
    if (!msg.deleted_at) {
      Database.run(
        `UPDATE messages SET deleted_at = ?, message = '', attachments_json = NULL WHERE id = ?`,
        [now, messageId]
      );
      Database.run('UPDATE conversations SET updated_at = ? WHERE id = ?', [now, conversationId]);
    }

    const updated = Database.get<any>('SELECT * FROM messages WHERE id = ?', [messageId]);
    return formatMessageRow(updated);
  }

  /**
   * Mark a specific message as delivered.
   */
  static markMessageDelivered(messageId: string) {
    const now = new Date().toISOString();
    Database.run(
      `UPDATE messages
       SET delivered_at = COALESCE(delivered_at, ?),
           status = CASE WHEN read_at IS NOT NULL THEN 'read' ELSE 'delivered' END
       WHERE id = ? AND delivered_at IS NULL`,
      [now, messageId]
    );
    return now;
  }

  /**
   * Mark all incoming undelivered messages for `userId` across conversations as delivered.
   * Returns notification summaries grouped by (conversationId, senderId).
   */
  static markAllDeliveredForUser(
    userId: string
  ): Array<{ conversationId: string; senderId: string; messageIds: string[]; deliveredAt: string }> {
    const pendingRows = Database.query<{ id: string; conversation_id: string; sender_id: string }>(
      `SELECT m.id, m.conversation_id, m.sender_id
       FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       LEFT JOIN farmer_profiles fp ON c.farmer_id = fp.id
       WHERE (c.customer_id = ? OR fp.user_id = ? OR c.farmer_id = ?)
         AND m.sender_id != ?
         AND m.delivered_at IS NULL
         AND m.deleted_at IS NULL`,
      [userId, userId, userId, userId]
    );

    if (pendingRows.length === 0) return [];

    const now = new Date().toISOString();
    Database.transaction(() => {
      const ids = pendingRows.map((r) => r.id);
      const placeholders = ids.map(() => '?').join(', ');
      Database.run(
        `UPDATE messages
         SET delivered_at = ?, status = CASE WHEN read_at IS NOT NULL THEN 'read' ELSE 'delivered' END
         WHERE id IN (${placeholders})`,
        [now, ...ids]
      );
    });

    const grouped = new Map<string, { conversationId: string; senderId: string; messageIds: string[] }>();
    for (const r of pendingRows) {
      const key = `${r.conversation_id}::${r.sender_id}`;
      if (!grouped.has(key)) {
        grouped.set(key, { conversationId: r.conversation_id, senderId: r.sender_id, messageIds: [] });
      }
      grouped.get(key)!.messageIds.push(r.id);
    }

    return Array.from(grouped.values()).map((g) => ({ ...g, deliveredAt: now }));
  }

  /**
   * Mark incoming messages in a conversation as delivered for `userId`.
   */
  static markConversationDelivered(conversationId: string, userId: string): string | null {
    const undelivered = Database.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM messages WHERE conversation_id = ? AND sender_id != ? AND delivered_at IS NULL',
      [conversationId, userId]
    );
    if (!undelivered || undelivered.count === 0) return null;

    const now = new Date().toISOString();
    Database.run(
      `UPDATE messages
       SET delivered_at = COALESCE(delivered_at, ?),
           status = CASE WHEN read_at IS NOT NULL THEN 'read' ELSE 'delivered' END
       WHERE conversation_id = ? AND sender_id != ? AND delivered_at IS NULL`,
      [now, conversationId, userId]
    );
    return now;
  }

  /**
   * Mark all unread messages in a conversation from other participants as read.
   */
  static markMessagesRead(conversationId: string, userId: string) {
    const conv = Database.get<any>('SELECT id FROM conversations WHERE id = ?', [conversationId]);
    if (!conv) {
      throw AppError.notFound('Conversation not found');
    }

    const now = new Date().toISOString();
    const unread = Database.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM messages WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL',
      [conversationId, userId]
    );

    Database.run(
      `UPDATE messages
       SET delivered_at = COALESCE(delivered_at, ?), read_at = ?, status = 'read'
       WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL`,
      [now, now, conversationId, userId]
    );

    return {
      success: true,
      count: unread ? unread.count : 0,
      readAt: now,
      conversationId,
    };
  }

  /**
   * Mute or unmute notifications for a conversation for the calling participant.
   */
  static setConversationMuted(conversationId: string, userId: string, muted: boolean) {
    const meta = this.getConversationMeta(conversationId);
    if (!meta) {
      throw AppError.notFound('Conversation not found');
    }

    const isCustomer = meta.customer_id === userId;
    const isFarmer = meta.farmer_user_id === userId || meta.farmer_id === userId;
    if (!isCustomer && !isFarmer) {
      throw AppError.forbidden('You are not a participant in this conversation.');
    }

    const val = muted ? 1 : 0;
    const now = new Date().toISOString();
    if (isCustomer) {
      Database.run('UPDATE conversations SET muted_by_customer = ?, updated_at = ? WHERE id = ?', [
        val,
        now,
        conversationId,
      ]);
    } else {
      Database.run('UPDATE conversations SET muted_by_farmer = ?, updated_at = ? WHERE id = ?', [
        val,
        now,
        conversationId,
      ]);
    }

    return { success: true, conversationId, isMuted: muted };
  }

  /**
   * Persist user last-seen activity timestamp.
   */
  static updateUserLastSeen(userId: string, timestamp: string = new Date().toISOString()) {
    try {
      Database.run('UPDATE users SET last_seen_at = ? WHERE id = ?', [timestamp, userId]);
    } catch {
      // Non-critical telemetry write
    }
  }

  /**
   * Shared notification dispatcher used by both REST & WebSocket send paths.
   * Respects mute settings, notification preferences, deduplication, and never fails message send.
   */
  static dispatchChatNotification(params: {
    conversationId: string;
    senderId: string;
    senderName: string;
    message: FormattedMessage;
  }): string | null {
    try {
      const meta = this.getConversationMeta(params.conversationId);
      if (!meta) return null;

      const isSenderCustomer = params.senderId === meta.customer_id;
      const recipientUserId = isSenderCustomer ? meta.farmer_user_id || meta.farmer_id : meta.customer_id;
      if (!recipientUserId || recipientUserId === params.senderId) return null;

      const isMuted = isSenderCustomer ? Boolean(meta.muted_by_farmer) : Boolean(meta.muted_by_customer);
      if (isMuted) return recipientUserId;

      const recipientUser = Database.get<any>('SELECT role FROM users WHERE id = ?', [recipientUserId]);
      const preview =
        params.message.message?.trim() ||
        (params.message.attachments?.length > 0 ? `📎 ${params.message.attachments[0].filename}` : 'New message');

      NotificationService.createAndPush({
        userId: recipientUserId,
        recipientRole: (recipientUser?.role as any) || 'customer',
        type: 'chat',
        title: `New message from ${params.senderName}`,
        message: preview.slice(0, 140),
        conversationId: params.conversationId,
        messageId: params.message.id,
        sourceKey: `chat:${params.message.id}`,
        data: { conversationId: params.conversationId, messageId: params.message.id },
      });

      return recipientUserId;
    } catch (err: any) {
      console.warn('[ChatService] Notification dispatch warning:', err?.message || err);
      return null;
    }
  }
}
