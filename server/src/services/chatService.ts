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
  static getOrCreateConversation(customerIdOrInitiator: string, farmerIdOrTarget: string, productId?: string) {
    if (!customerIdOrInitiator || !farmerIdOrTarget) {
      throw AppError.badRequest('Both customerId and farmerId are required to initialize a conversation.');
    }

    // Resolve initiator user
    const initiatorUser = Database.get<any>('SELECT id, name, role FROM users WHERE id = ?', [customerIdOrInitiator]);
    if (!initiatorUser) {
      throw AppError.notFound('Initiator user not found.');
    }

    // Resolve target farmer profile / user
    let targetFp = Database.get<any>('SELECT * FROM farmer_profiles WHERE id = ?', [farmerIdOrTarget]);
    if (!targetFp) {
      targetFp = Database.get<any>('SELECT * FROM farmer_profiles WHERE user_id = ?', [farmerIdOrTarget]);
    }

    // If target has no farmer profile yet, check if they exist in users table
    if (!targetFp) {
      const targetUser = Database.get<any>('SELECT id, name, role FROM users WHERE id = ?', [farmerIdOrTarget]);
      if (targetUser) {
        const newFpId = `farmer-${targetUser.id.replace('user-', '')}`;
        const now = new Date().toISOString();
        Database.run(
          `INSERT INTO farmer_profiles (id, user_id, farm_name, description, location, city, verification_status, rating, created_at, updated_at)
           VALUES (?, ?, ?, 'Direct seller on HALDER', 'Dehradun', 'Dehradun', 'verified', 5.0, ?, ?)`,
          [newFpId, targetUser.id, targetUser.name ? `${targetUser.name}'s Produce` : 'Direct Producer', now, now]
        );
        targetFp = Database.get<any>('SELECT * FROM farmer_profiles WHERE id = ?', [newFpId]);
      }
    }

    if (!targetFp) {
      const fallbackUserId = `user-${farmerIdOrTarget.replace(/^farmer-|^user-/, '')}`;
      let fallbackUser = Database.get<any>('SELECT id FROM users WHERE id = ?', [fallbackUserId]);
      const now = new Date().toISOString();
      if (!fallbackUser) {
        Database.run(
          `INSERT OR IGNORE INTO users (id, halder_id, email, phone, name, role, status, created_at, updated_at)
           VALUES (?, ?, ?, '+919876543210', 'Verified Seller', 'farmer', 'active', ?, ?)`,
          [fallbackUserId, `HAL-FAR-${Date.now().toString().slice(-8)}`, `${fallbackUserId}@halder.org`, now, now]
        );
      }
      const newFpId = farmerIdOrTarget.startsWith('farmer-') ? farmerIdOrTarget : `farmer-${fallbackUserId}`;
      Database.run(
        `INSERT OR IGNORE INTO farmer_profiles (id, user_id, farm_name, description, location, city, verification_status, rating, created_at, updated_at)
         VALUES (?, ?, 'Direct Farm Fresh', 'Verified Direct Farm Seller', 'Dehradun', 'Dehradun', 'verified', 5.0, ?, ?)`,
        [newFpId, fallbackUserId, now, now]
      );
      targetFp = Database.get<any>('SELECT * FROM farmer_profiles WHERE id = ? OR user_id = ?', [newFpId, fallbackUserId]);
    }

    if (!targetFp) {
      throw AppError.notFound('Target seller or farmer profile not found.');
    }

    // Check if conversation already exists in either direction
    let conv = Database.get<any>(
      `SELECT * FROM conversations 
       WHERE (customer_id = ? AND farmer_id = ?)
          OR (customer_id = ? AND farmer_id IN (SELECT id FROM farmer_profiles WHERE user_id = ?))`,
      [initiatorUser.id, targetFp.id, targetFp.user_id, initiatorUser.id]
    );

    const now = new Date().toISOString();
    if (!conv) {
      const convId = `conv-${uuidv4()}`;
      Database.run(
        'INSERT INTO conversations (id, customer_id, farmer_id, product_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [convId, initiatorUser.id, targetFp.id, productId || null, now, now]
      );
      conv = Database.get<any>('SELECT * FROM conversations WHERE id = ?', [convId]);
    } else {
      Database.run('UPDATE conversations SET updated_at = ? WHERE id = ?', [now, conv.id]);
      if (productId && !conv.product_id) {
        Database.run('UPDATE conversations SET product_id = ? WHERE id = ?', [productId, conv.id]);
        conv.product_id = productId;
      }
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
    let actualFarmerProfileId = farmerProfileId;
    if (!actualFarmerProfileId) {
      const fp = Database.get<any>('SELECT id FROM farmer_profiles WHERE user_id = ?', [userId]);
      actualFarmerProfileId = fp?.id;
    }

    let rows: any[] = [];

    if (role === 'admin') {
      rows = Database.query<any>(
        `SELECT 
          c.id,
          c.customer_id,
          c.farmer_id,
          c.product_id,
          c.created_at,
          c.updated_at,
          cu.id AS cust_user_id,
          cu.name AS cust_name,
          cu.phone AS cust_phone,
          cu.email AS cust_email,
          cu.profile_image AS cust_avatar,
          cu.halder_id AS cust_halder_id,
          fp.id AS farm_profile_id,
          fp.user_id AS farm_user_id,
          fp.farm_name AS farm_name,
          fp.avatar AS farm_avatar,
          fp.city AS farm_city,
          fp.verification_status AS farm_verification_status,
          fu.name AS farm_owner_name,
          fu.phone AS farm_phone,
          fu.email AS farm_email,
          fu.halder_id AS farm_halder_id,
          p.name AS product_name,
          p.image AS product_image,
          p.price AS product_price,
          p.unit AS product_unit
        FROM conversations c
        LEFT JOIN users cu ON c.customer_id = cu.id
        LEFT JOIN farmer_profiles fp ON c.farmer_id = fp.id
        LEFT JOIN users fu ON fp.user_id = fu.id
        LEFT JOIN products p ON c.product_id = p.id
        ORDER BY c.updated_at DESC`
      );
    } else {
      rows = Database.query<any>(
        `SELECT 
          c.id,
          c.customer_id,
          c.farmer_id,
          c.product_id,
          c.created_at,
          c.updated_at,
          cu.id AS cust_user_id,
          cu.name AS cust_name,
          cu.phone AS cust_phone,
          cu.email AS cust_email,
          cu.profile_image AS cust_avatar,
          cu.halder_id AS cust_halder_id,
          fp.id AS farm_profile_id,
          fp.user_id AS farm_user_id,
          fp.farm_name AS farm_name,
          fp.avatar AS farm_avatar,
          fp.city AS farm_city,
          fp.verification_status AS farm_verification_status,
          fu.name AS farm_owner_name,
          fu.phone AS farm_phone,
          fu.email AS farm_email,
          fu.halder_id AS farm_halder_id,
          p.name AS product_name,
          p.image AS product_image,
          p.price AS product_price,
          p.unit AS product_unit
        FROM conversations c
        LEFT JOIN users cu ON c.customer_id = cu.id
        LEFT JOIN farmer_profiles fp ON c.farmer_id = fp.id
        LEFT JOIN users fu ON fp.user_id = fu.id
        LEFT JOIN products p ON c.product_id = p.id
        WHERE c.customer_id = ? OR fp.user_id = ? OR c.farmer_id = ?
        ORDER BY c.updated_at DESC`,
        [userId, userId, actualFarmerProfileId || '']
      );
    }

    return rows.map((row) => {
      const isBuyer = row.cust_user_id === userId;
      const convType = isBuyer ? 'buying' : 'selling';

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

      const unreadCountRow = Database.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM messages WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL',
        [row.id, userId]
      );
      const unreadCount = unreadCountRow ? unreadCountRow.count : 0;

      const otherParty: ConversationParticipant = isBuyer
        ? {
            id: row.farm_user_id || row.farmer_id,
            name: row.farm_owner_name || row.farm_name || 'Farmer',
            phone: row.farm_phone,
            email: row.farm_email,
            avatar: row.farm_avatar || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200',
            farmName: row.farm_name || 'Direct Farm Harvest',
            city: row.farm_city || 'Dehradun',
            halderId: row.farm_halder_id,
            role: 'farmer',
            verificationStatus: row.farm_verification_status || 'verified',
          }
        : {
            id: row.cust_user_id || row.customer_id,
            name: row.cust_name || 'Customer',
            phone: row.cust_phone,
            email: row.cust_email,
            avatar: row.cust_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
            farmName: 'Direct Buyer',
            city: 'Dehradun',
            halderId: row.cust_halder_id,
            role: 'customer',
            verificationStatus: 'verified',
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
        type: convType,
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
