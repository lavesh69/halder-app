import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeText } from '../utils/sanitize';

export interface FormattedMessage {
  id: string;
  conversation_id: string;
  conversationId: string;
  sender_id: string;
  senderId: string;
  sender_role: 'user' | 'farmer' | 'admin';
  senderRole: 'user' | 'farmer' | 'admin';
  message: string;
  read_at: string | null;
  readAt: string | null;
  created_at: string;
  createdAt: string;
}

export interface ConversationParticipant {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
  farmName?: string;
  city?: string;
  halderId?: string;
  role: 'customer' | 'farmer' | 'admin';
  verificationStatus?: string;
}

export class ChatService {
  /**
   * Get or create a conversation between a customer and farmer.
   */
  static getOrCreateConversation(customerId: string, farmerId: string, productId?: string) {
    if (!customerId || !farmerId) {
      throw AppError.badRequest('Both customerId and farmerId are required to initialize a conversation.');
    }

    // Verify customer exists
    const customer = Database.get<any>('SELECT id, name FROM users WHERE id = ?', [customerId]);
    if (!customer) {
      throw AppError.notFound('Customer user not found.');
    }

    // Verify farmer profile exists
    const farmer = Database.get<any>('SELECT id, farm_name FROM farmer_profiles WHERE id = ?', [farmerId]);
    if (!farmer) {
      throw AppError.notFound('Farmer profile not found.');
    }

    let conv = Database.get<any>(
      'SELECT * FROM conversations WHERE customer_id = ? AND farmer_id = ?',
      [customerId, farmerId]
    );

    if (!conv) {
      const convId = `conv-${uuidv4()}`;
      const now = new Date().toISOString();
      Database.run(
        'INSERT INTO conversations (id, customer_id, farmer_id, product_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [convId, customerId, farmerId, productId || null, now, now]
      );
      conv = Database.get<any>('SELECT * FROM conversations WHERE id = ?', [convId]);
    } else if (productId && !conv.product_id) {
      Database.run('UPDATE conversations SET product_id = ? WHERE id = ?', [productId, conv.id]);
      conv.product_id = productId;
    }

    return {
      ...conv,
      customerId: conv.customer_id,
      farmerId: conv.farmer_id,
      productId: conv.product_id,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
    };
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
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
    };
  }

  /**
   * Get all conversations for a specific authenticated user.
   */
  static getUserConversations(userId: string, role: string, farmerProfileId?: string) {
    // If user is a farmer, resolve their farmer profile if not provided
    let actualFarmerProfileId = farmerProfileId;
    if (role === 'farmer' && !actualFarmerProfileId) {
      const fp = Database.get<any>('SELECT id FROM farmer_profiles WHERE user_id = ?', [userId]);
      actualFarmerProfileId = fp?.id;
    }

    let rows: any[] = [];

    if (role === 'farmer' && actualFarmerProfileId) {
      rows = Database.query<any>(
        `SELECT 
          c.id,
          c.customer_id,
          c.farmer_id,
          c.product_id,
          c.created_at,
          c.updated_at,
          u.id AS other_user_id,
          u.name AS other_name,
          u.phone AS other_phone,
          u.email AS other_email,
          u.profile_image AS other_avatar,
          u.halder_id AS other_halder_id,
          'customer' AS other_role,
          p.name AS product_name,
          p.image AS product_image,
          p.price AS product_price,
          p.unit AS product_unit
        FROM conversations c
        JOIN users u ON c.customer_id = u.id
        LEFT JOIN products p ON c.product_id = p.id
        WHERE c.farmer_id = ?
        ORDER BY c.updated_at DESC`,
        [actualFarmerProfileId]
      );
    } else if (role === 'admin') {
      rows = Database.query<any>(
        `SELECT 
          c.id,
          c.customer_id,
          c.farmer_id,
          c.product_id,
          c.created_at,
          c.updated_at,
          u.id AS cust_user_id,
          u.name AS cust_name,
          u.phone AS cust_phone,
          u.email AS cust_email,
          fu.name AS farmer_name,
          fp.farm_name AS farm_name,
          fp.avatar AS farm_avatar,
          p.name AS product_name,
          p.image AS product_image
        FROM conversations c
        JOIN users u ON c.customer_id = u.id
        JOIN farmer_profiles fp ON c.farmer_id = fp.id
        JOIN users fu ON fp.user_id = fu.id
        LEFT JOIN products p ON c.product_id = p.id
        ORDER BY c.updated_at DESC`
      );
    } else {
      // Default: Customer perspective
      rows = Database.query<any>(
        `SELECT 
          c.id,
          c.customer_id,
          c.farmer_id,
          c.product_id,
          c.created_at,
          c.updated_at,
          fp.id AS other_farmer_id,
          fu.id AS other_user_id,
          fu.name AS other_name,
          fp.farm_name AS other_farm_name,
          fp.avatar AS other_avatar,
          fp.city AS other_city,
          fu.phone AS other_phone,
          fu.email AS other_email,
          fu.halder_id AS other_halder_id,
          fp.verification_status AS other_verification_status,
          'farmer' AS other_role,
          p.name AS product_name,
          p.image AS product_image,
          p.price AS product_price,
          p.unit AS product_unit
        FROM conversations c
        JOIN farmer_profiles fp ON c.farmer_id = fp.id
        JOIN users fu ON fp.user_id = fu.id
        LEFT JOIN products p ON c.product_id = p.id
        WHERE c.customer_id = ?
        ORDER BY c.updated_at DESC`,
        [userId]
      );
    }

    return rows.map((row) => {
      // Get the last message
      const lastMsgRaw = Database.get<any>(
        'SELECT id, conversation_id, sender_id, sender_role, message, read_at, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1',
        [row.id]
      );

      const lastMessage: FormattedMessage | null = lastMsgRaw
        ? {
            id: lastMsgRaw.id,
            conversation_id: lastMsgRaw.conversation_id,
            conversationId: lastMsgRaw.conversation_id,
            sender_id: lastMsgRaw.sender_id,
            senderId: lastMsgRaw.sender_id,
            sender_role: lastMsgRaw.sender_role,
            senderRole: lastMsgRaw.sender_role,
            message: lastMsgRaw.message,
            read_at: lastMsgRaw.read_at,
            readAt: lastMsgRaw.read_at,
            created_at: lastMsgRaw.created_at,
            createdAt: lastMsgRaw.created_at,
          }
        : null;

      // Count unread messages sent by the other party
      const unreadCountRow = Database.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM messages WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL',
        [row.id, userId]
      );

      const unreadCount = unreadCountRow ? unreadCountRow.count : 0;

      const otherParty: ConversationParticipant = {
        id: row.other_user_id || row.cust_user_id || row.farmer_id,
        name: row.other_name || row.cust_name || row.farmer_name || 'User',
        phone: row.other_phone || row.cust_phone,
        email: row.other_email || row.cust_email,
        avatar: row.other_avatar || row.farm_avatar || '',
        farmName: row.other_farm_name || row.farm_name,
        city: row.other_city,
        halderId: row.other_halder_id,
        role: row.other_role || 'customer',
        verificationStatus: row.other_verification_status,
      };

      const product = row.product_name
        ? {
            id: row.product_id,
            name: row.product_name,
            image: row.product_image,
            price: row.product_price,
            unit: row.product_unit,
          }
        : null;

      return {
        id: row.id,
        customer_id: row.customer_id,
        customerId: row.customer_id,
        farmer_id: row.farmer_id,
        farmerId: row.farmer_id,
        product_id: row.product_id,
        productId: row.product_id,
        created_at: row.created_at,
        createdAt: row.created_at,
        updated_at: row.updated_at,
        updatedAt: row.updated_at,
        otherParty,
        product,
        lastMessage,
        unreadCount,
      };
    });
  }

  /**
   * Get message history for a conversation.
   */
  static getMessages(conversationId: string): FormattedMessage[] {
    const rawMessages = Database.query<any>(
      'SELECT id, conversation_id, sender_id, sender_role, message, read_at, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [conversationId]
    );

    return rawMessages.map((m) => ({
      id: m.id,
      conversation_id: m.conversation_id,
      conversationId: m.conversation_id,
      sender_id: m.sender_id,
      senderId: m.sender_id,
      sender_role: m.sender_role,
      senderRole: m.sender_role,
      message: m.message,
      read_at: m.read_at,
      readAt: m.read_at,
      created_at: m.created_at,
      createdAt: m.created_at,
    }));
  }

  /**
   * Send a new chat message and persist to database.
   */
  static sendMessage(
    conversationId: string,
    senderId: string,
    senderRole: 'user' | 'farmer' | 'admin',
    text: string
  ): FormattedMessage {
    if (!text || !text.trim()) {
      throw AppError.badRequest('Message text cannot be empty');
    }

    const sanitized = sanitizeText(text);
    if (!sanitized || !sanitized.trim()) {
      throw AppError.badRequest('Message text cannot be empty after sanitization');
    }

    // Verify conversation exists
    const conv = Database.get<any>('SELECT id FROM conversations WHERE id = ?', [conversationId]);
    if (!conv) {
      throw AppError.notFound('Conversation not found');
    }

    const messageId = `msg-${uuidv4()}`;
    const now = new Date().toISOString();

    Database.run(
      'INSERT INTO messages (id, conversation_id, sender_id, sender_role, message, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [messageId, conversationId, senderId, senderRole, sanitized, now]
    );

    Database.run('UPDATE conversations SET updated_at = ? WHERE id = ?', [now, conversationId]);

    const msg = Database.get<any>('SELECT * FROM messages WHERE id = ?', [messageId]);

    return {
      id: msg.id,
      conversation_id: msg.conversation_id,
      conversationId: msg.conversation_id,
      sender_id: msg.sender_id,
      senderId: msg.sender_id,
      sender_role: msg.sender_role,
      senderRole: msg.sender_role,
      message: msg.message,
      read_at: msg.read_at,
      readAt: msg.read_at,
      created_at: msg.created_at,
      createdAt: msg.created_at,
    };
  }

  /**
   * Mark all unread messages in a conversation as read.
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
      'UPDATE messages SET read_at = ? WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL',
      [now, conversationId, userId]
    );

    return {
      success: true,
      count: unread ? unread.count : 0,
      readAt: now,
      conversationId,
    };
  }
}
