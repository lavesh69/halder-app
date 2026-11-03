import { Database } from '../db/database';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

export class CartService {
  static getOrCreateCart(userId: string) {
    let cart = Database.get<any>('SELECT * FROM carts WHERE user_id = ?', [userId]);
    if (!cart) {
      const cartId = `cart-${uuidv4()}`;
      const now = new Date().toISOString();
      Database.run('INSERT INTO carts (id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?)', [
        cartId,
        userId,
        now,
        now,
      ]);
      cart = { id: cartId, user_id: userId };
    }
    return cart;
  }

  static getCart(userId: string) {
    const cart = CartService.getOrCreateCart(userId);

    const items = Database.query<any>(
      `SELECT ci.*,
              p.name as product_name,
              p.price as product_price,
              p.unit as product_unit,
              p.image as product_image,
              p.available_quantity as product_stock,
              f.id as farmer_id,
              f.farm_name,
              u.name as farmer_name
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       JOIN farmer_profiles f ON p.farmer_id = f.id
       JOIN users u ON f.user_id = u.id
       WHERE ci.cart_id = ?`,
      [cart.id]
    );

    const subtotal = items.reduce((sum, it) => sum + it.product_price * it.quantity, 0);

    return {
      cartId: cart.id,
      items,
      subtotal: Number(subtotal.toFixed(2)),
      itemsCount: items.reduce((sum, it) => sum + it.quantity, 0),
    };
  }

  static addItem(userId: string, productId: string, quantity: number) {
    if (quantity <= 0) {
      throw AppError.badRequest('Quantity must be greater than zero.');
    }

    const product = Database.get<any>('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) {
      throw AppError.notFound('Product not found');
    }

    if (product.available_quantity < quantity) {
      throw AppError.badRequest(`Cannot add ${quantity} ${product.unit}. Only ${product.available_quantity} available.`);
    }

    const cart = CartService.getOrCreateCart(userId);
    const existingItem = Database.get<any>(
      'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?',
      [cart.id, productId]
    );

    const now = new Date().toISOString();

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (product.available_quantity < newQty) {
        throw AppError.badRequest(`Total in basket (${newQty}) exceeds available farm stock (${product.available_quantity}).`);
      }
      Database.run(
        'UPDATE cart_items SET quantity = ?, updated_at = ? WHERE id = ?',
        [newQty, now, existingItem.id]
      );
    } else {
      const itemId = `ci-${uuidv4()}`;
      Database.run(
        'INSERT INTO cart_items (id, cart_id, product_id, quantity, selected_unit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [itemId, cart.id, productId, quantity, product.unit, now, now]
      );
    }

    return CartService.getCart(userId);
  }

  static updateQuantity(userId: string, productId: string, quantity: number) {
    const cart = CartService.getOrCreateCart(userId);

    if (quantity <= 0) {
      Database.run('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?', [cart.id, productId]);
      return CartService.getCart(userId);
    }

    const product = Database.get<any>('SELECT * FROM products WHERE id = ?', [productId]);
    if (product && product.available_quantity < quantity) {
      throw AppError.badRequest(`Requested quantity (${quantity}) exceeds farm stock (${product.available_quantity}).`);
    }

    Database.run(
      'UPDATE cart_items SET quantity = ?, updated_at = ? WHERE cart_id = ? AND product_id = ?',
      [quantity, new Date().toISOString(), cart.id, productId]
    );

    return CartService.getCart(userId);
  }

  static removeItem(userId: string, productId: string) {
    const cart = CartService.getOrCreateCart(userId);
    Database.run('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?', [cart.id, productId]);
    return CartService.getCart(userId);
  }

  static clear(userId: string) {
    const cart = CartService.getOrCreateCart(userId);
    Database.run('DELETE FROM cart_items WHERE cart_id = ?', [cart.id]);
    return { success: true, message: 'Cart cleared' };
  }
}
