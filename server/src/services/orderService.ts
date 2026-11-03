import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeText } from '../utils/sanitize';
import { VALID_STATUS_TRANSITIONS, OrderStatusType } from '../config/constants';
import { NotificationService } from './notificationService';

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
}

export interface CreateOrderInput {
  customerId: string;
  items: CreateOrderItemInput[];
  deliveryAddress: string;
  city?: string;
  postalCode?: string;
  customerPhone: string;
  paymentMethod: 'upi' | 'cod' | 'card' | 'wallet' | 'phonepe' | 'gpay' | 'paytm';
  farmerTip?: number;
  deliverySlot?: string;
}

export class OrderService {
  static create(input: CreateOrderInput) {
    if (!input.items || input.items.length === 0) {
      throw AppError.badRequest('Order must contain at least one product item.');
    }

    return Database.transaction(() => {
      const customer = Database.get<any>('SELECT id, name, phone, status FROM users WHERE id = ?', [
        input.customerId,
      ]);

      if (!customer) {
        throw AppError.notFound('Customer account not found.');
      }
      if (customer.status === 'suspended') {
        throw AppError.forbidden('Suspended accounts cannot place orders.');
      }

      const farmerGroups: Record<
        string,
        {
          farmerProfile: any;
          items: Array<{
            product: any;
            quantity: number;
            subtotal: number;
          }>;
        }
      > = {};

      for (const itemInput of input.items) {
        if (itemInput.quantity <= 0) {
          throw AppError.badRequest(`Invalid quantity (${itemInput.quantity}) for product.`);
        }

        const product = Database.get<any>(
          `SELECT p.*, f.id as farmer_profile_id, f.farm_name, u.name as farmer_name, u.phone as farmer_phone
           FROM products p
           JOIN farmer_profiles f ON p.farmer_id = f.id
           JOIN users u ON f.user_id = u.id
           WHERE p.id = ?`,
          [itemInput.productId]
        );

        if (!product) {
          throw AppError.notFound(`Product with ID ${itemInput.productId} not found.`);
        }

        if (product.status !== 'active' || product.moderation_status !== 'approved') {
          throw AppError.badRequest(`Product "${product.name}" is currently unavailable in the mandi.`);
        }

        if (product.available_quantity < itemInput.quantity) {
          throw AppError.badRequest(
            `Insufficient stock for "${product.name}". Available: ${product.available_quantity} ${product.unit}, Requested: ${itemInput.quantity} ${product.unit}`,
            'INSUFFICIENT_STOCK'
          );
        }

        const fId = product.farmer_profile_id;
        if (!farmerGroups[fId]) {
          farmerGroups[fId] = {
            farmerProfile: {
              id: product.farmer_profile_id,
              farmName: product.farm_name,
              farmerName: product.farmer_name,
              farmerPhone: product.farmer_phone,
            },
            items: [],
          };
        }

        const subtotal = Number((product.price * itemInput.quantity).toFixed(2));
        farmerGroups[fId].items.push({
          product,
          quantity: itemInput.quantity,
          subtotal,
        });

        // Deduct inventory atomically
        Database.run(
          'UPDATE products SET available_quantity = available_quantity - ?, updated_at = ? WHERE id = ?',
          [itemInput.quantity, new Date().toISOString(), product.id]
        );
      }

      const createdOrders: any[] = [];
      const now = new Date().toISOString();

      for (const [farmerId, group] of Object.entries(farmerGroups)) {
        const orderId = `order-${uuidv4()}`;
        const orderNumber = `#HD${Math.floor(1000 + Math.random() * 9000)}`;

        const subtotal = group.items.reduce((s, it) => s + it.subtotal, 0);
        const deliveryFee = subtotal >= 200 ? 0 : 25;
        const farmerTip = input.farmerTip || 10;
        const totalAmount = Number((subtotal + deliveryFee + farmerTip).toFixed(2));

        const deliveryMode = 'farmer_direct';
        const distanceKm = input.deliveryDistanceKm !== undefined ? input.deliveryDistanceKm : 5.0;
        let estimatedDeliveryTime = '40-50 mins';
        const trackingCourier = `${group.farmerProfile.farmerName} (Farmer Self-Fleet / किसान वाहन)`;
        const trackingNumber = `HLD-DIR-${Math.floor(100000 + Math.random() * 900000)}`;

        if (distanceKm <= 15) {
          estimatedDeliveryTime = 'Within 45-60 mins (Farmer Local Run)';
        } else if (distanceKm <= 50) {
          estimatedDeliveryTime = 'Within 2-4 hours (Direct Farm Transit)';
        } else if (distanceKm <= 150) {
          estimatedDeliveryTime = 'Same-day evening harvest (Direct Kisan Vehicle)';
        } else {
          estimatedDeliveryTime = 'Next-morning direct farm crate dispatch';
        }

        Database.run(
          `INSERT INTO orders (
            id, order_number, customer_id, farmer_id, total_amount, subtotal,
            delivery_fee, farmer_tip, delivery_address, city, postal_code,
            customer_phone, customer_name, farmer_name, farm_name, farmer_phone,
            payment_method, payment_status, order_status, estimated_delivery_time,
            delivery_mode, delivery_distance_km, tracking_courier, tracking_number,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'placed', ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            orderNumber,
            customer.id,
            farmerId,
            totalAmount,
            subtotal,
            deliveryFee,
            farmerTip,
            sanitizeText(input.deliveryAddress),
            input.city || 'Dehradun',
            input.postalCode || '248001',
            input.customerPhone || customer.phone,
            customer.name,
            group.farmerProfile.farmerName,
            group.farmerProfile.farmName,
            group.farmerProfile.farmerPhone,
            input.paymentMethod,
            input.paymentMethod === 'cod' ? 'pending' : 'paid',
            estimatedDeliveryTime,
            deliveryMode,
            distanceKm,
            trackingCourier,
            trackingNumber,
            now,
            now,
          ]
        );

        for (const item of group.items) {
          const orderItemId = `item-${uuidv4()}`;
          Database.run(
            `INSERT INTO order_items (
              id, order_id, product_id, farmer_id, product_name_snapshot,
              unit_price_snapshot, unit_snapshot, quantity, subtotal
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              orderItemId,
              orderId,
              item.product.id,
              farmerId,
              item.product.name,
              item.product.price,
              item.product.unit,
              item.quantity,
              item.subtotal,
            ]
          );
        }

        const timelineId = `tl-${uuidv4()}`;
        Database.run(
          `INSERT INTO order_timeline (id, order_id, status, title, description, time, completed, current, created_at)
           VALUES (?, ?, 'placed', 'Order Placed', ?, 'Just now', 1, 1, ?)`,
          [
            timelineId,
            orderId,
            `Order placed with ${group.farmerProfile.farmerName}`,
            now,
          ]
        );

        Database.run(
          'UPDATE farmer_profiles SET total_orders = total_orders + 1 WHERE id = ?',
          [farmerId]
        );

        NotificationService.createAndPush({
          userId: customer.id,
          recipientRole: 'customer',
          type: 'order',
          title: 'Order Placed 🧺',
          message: `Your order ${orderNumber} for ₹${totalAmount} from ${group.farmerProfile.farmerName} has been confirmed. 100% Kisan Direct Delivery.`,
          data: { orderId, orderNumber },
        });

        const farmerUser = Database.get<any>('SELECT user_id FROM farmer_profiles WHERE id = ?', [farmerId]);
        if (farmerUser) {
          NotificationService.createAndPush({
            userId: farmerUser.user_id,
            recipientRole: 'farmer',
            type: 'order',
            title: 'New Mandi Order! 🔔',
            message: `New order ${orderNumber} placed by ${customer.name} for ₹${totalAmount}.`,
            data: { orderId, orderNumber },
          });
        }

        createdOrders.push(OrderService.getById(orderId));
      }

      const cart = Database.get<any>('SELECT id FROM carts WHERE user_id = ?', [customer.id]);
      if (cart) {
        Database.run('DELETE FROM cart_items WHERE cart_id = ?', [cart.id]);
      }

      return createdOrders;
    });
  }

  static getById(orderId: string) {
    const order = Database.get<any>('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      throw AppError.notFound('Order not found');
    }

    const items = Database.query<any>('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
    const timeline = Database.query<any>(
      'SELECT * FROM order_timeline WHERE order_id = ? ORDER BY created_at ASC',
      [orderId]
    );

    return {
      ...order,
      items,
      timeline,
    };
  }

  static list(params: {
    userId?: string;
    role?: 'customer' | 'farmer' | 'admin';
    farmerProfileId?: string;
    status?: string;
  }) {
    let sql = 'SELECT * FROM orders WHERE 1=1';
    const sqlParams: any[] = [];

    if (params.role === 'customer' && params.userId) {
      sql += ' AND customer_id = ?';
      sqlParams.push(params.userId);
    } else if (params.role === 'farmer' && params.farmerProfileId) {
      sql += ' AND farmer_id = ?';
      sqlParams.push(params.farmerProfileId);
    }

    if (params.status) {
      sql += ' AND order_status = ?';
      sqlParams.push(params.status);
    }

    sql += ' ORDER BY created_at DESC';
    const orders = Database.query<any>(sql, sqlParams);

    return orders.map((o) => ({
      ...o,
      items: Database.query<any>('SELECT * FROM order_items WHERE order_id = ?', [o.id]),
    }));
  }

  static updateStatus(orderId: string, newStatus: OrderStatusType, actorRole: string) {
    const order = Database.get<any>('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      throw AppError.notFound('Order not found');
    }

    const currentStatus = order.order_status as OrderStatusType;

    // Role-based state machine enforcement FIRST: check WHO is allowed to perform this transition
    if (actorRole === 'customer') {
      if (newStatus !== 'cancelled' || currentStatus !== 'placed') {
        throw AppError.forbidden(
          'Customers are only authorized to cancel orders that are in "placed" status.',
          'CUSTOMER_STATUS_TRANSITION_FORBIDDEN'
        );
      }
    }

    const allowedNext = VALID_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(newStatus) && actorRole !== 'admin') {
      throw AppError.badRequest(
        `Invalid status transition from "${currentStatus}" to "${newStatus}". Allowed next: [${allowedNext.join(', ')}]`,
        'INVALID_STATUS_TRANSITION'
      );
    }

    const now = new Date().toISOString();

    Database.transaction(() => {
      Database.run('UPDATE orders SET order_status = ?, updated_at = ? WHERE id = ?', [
        newStatus,
        now,
        orderId,
      ]);

      // If order is cancelled or rejected, return reserved stock back to farmer inventory
      if (newStatus === 'cancelled' || newStatus === 'rejected') {
        const items = Database.query<any>(
          'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
          [orderId]
        );
        for (const item of items) {
          Database.run(
            'UPDATE products SET available_quantity = available_quantity + ?, updated_at = ? WHERE id = ?',
            [item.quantity, now, item.product_id]
          );
        }
      }

      // If order is marked delivered, ensure formal payout record exists
      if (newStatus === 'delivered') {
        const order = Database.get<any>('SELECT * FROM orders WHERE id = ?', [orderId]);
        if (order) {
          const gross = order.subtotal || order.total_amount;
          const fee = 5.0;
          const net = Math.max(0, gross - fee);
          Database.run(
            `INSERT OR IGNORE INTO payout_records (id, farmer_id, order_id, gross_amount, platform_fee, net_amount, status, payout_method, payout_reference, created_at, processed_at)
             VALUES (?, ?, ?, ?, ?, ?, 'processed', 'upi', 'delivered_settled', ?, ?)`,
            [`payout-${uuidv4()}`, order.farmer_id, orderId, gross, fee, net, now, now]
          );
        }
      }

      Database.run('UPDATE order_timeline SET current = 0 WHERE order_id = ?', [orderId]);
      Database.run(
        `INSERT INTO order_timeline (id, order_id, status, title, description, time, completed, current, created_at)
         VALUES (?, ?, ?, ?, ?, 'Just now', 1, 1, ?)`,
        [
          `tl-${uuidv4()}`,
          orderId,
          newStatus,
          `Status: ${newStatus.toUpperCase()}`,
          `Order moved to ${newStatus.replace(/_/g, ' ')}`,
          now,
        ]
      );

      NotificationService.createAndPush({
        userId: order.customer_id,
        recipientRole: 'customer',
        type: 'order',
        title: newStatus === 'dispatched'
          ? '🚚 Kisan Fleet En Route!'
          : newStatus === 'delivered'
          ? '✅ Harvest Delivered!'
          : `Order Update: ${newStatus.toUpperCase()} 📦`,
        message: newStatus === 'dispatched'
          ? `Farmer ${order.farmer_name} is personally delivering your order ${order.order_number} via Kisan Vahan!`
          : newStatus === 'delivered'
          ? `Your order ${order.order_number} has been delivered fresh from the farm.`
          : `Your order ${order.order_number} is now ${newStatus.replace(/_/g, ' ')}.`,
        data: { orderId: order.id, orderNumber: order.order_number, status: newStatus },
      });
    });

    return OrderService.getById(orderId);
  }
}
