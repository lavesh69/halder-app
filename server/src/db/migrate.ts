import fs from 'fs';
import path from 'path';
import { Database } from './database';

export function runMigrations() {
  const schemaPath = path.resolve(process.cwd(), 'server', 'src', 'db', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  const db = Database.getDB();
  db.exec(schemaSql);

  // Migration: add notes and phonepe_transaction_id to orders if missing
  try {
    const cols = db.prepare(`PRAGMA table_info(orders)`).all() as any[];
    const colNames = cols.map((c) => c.name);
    if (!colNames.includes('notes')) {
      db.exec(`ALTER TABLE orders ADD COLUMN notes TEXT DEFAULT ''`);
    }
    if (!colNames.includes('phonepe_transaction_id')) {
      db.exec(`ALTER TABLE orders ADD COLUMN phonepe_transaction_id TEXT DEFAULT ''`);
    }
    if (!colNames.includes('cancellation_reason')) {
      db.exec(`ALTER TABLE orders ADD COLUMN cancellation_reason TEXT DEFAULT ''`);
    }
    if (!colNames.includes('refund_amount')) {
      db.exec(`ALTER TABLE orders ADD COLUMN refund_amount REAL DEFAULT 0`);
    }
    if (!colNames.includes('dispute_status')) {
      db.exec(`ALTER TABLE orders ADD COLUMN dispute_status TEXT DEFAULT 'none'`);
    }
    if (!colNames.includes('delivery_otp')) {
      db.exec(`ALTER TABLE orders ADD COLUMN delivery_otp TEXT DEFAULT '1234'`);
    }

    // Products table enhancements (Wholesale, MOQ, Stock Alerts, Classifieds Slabs)
    const prodCols = db.prepare(`PRAGMA table_info(products)`).all() as any[];
    const prodColNames = prodCols.map((c) => c.name);
    if (!prodColNames.includes('wholesale_price')) {
      db.exec(`ALTER TABLE products ADD COLUMN wholesale_price REAL DEFAULT NULL`);
    }
    if (!prodColNames.includes('moq')) {
      db.exec(`ALTER TABLE products ADD COLUMN moq REAL DEFAULT 1`);
    }
    if (!prodColNames.includes('stock_alert_threshold')) {
      db.exec(`ALTER TABLE products ADD COLUMN stock_alert_threshold REAL DEFAULT 5`);
    }
    if (!prodColNames.includes('total_quantity')) {
      db.exec(`ALTER TABLE products ADD COLUMN total_quantity REAL DEFAULT 0`);
    }
    if (!prodColNames.includes('reserved_quantity')) {
      db.exec(`ALTER TABLE products ADD COLUMN reserved_quantity REAL DEFAULT 0`);
    }
    if (!prodColNames.includes('sold_quantity')) {
      db.exec(`ALTER TABLE products ADD COLUMN sold_quantity REAL DEFAULT 0`);
    }
    if (!prodColNames.includes('min_order_quantity')) {
      db.exec(`ALTER TABLE products ADD COLUMN min_order_quantity REAL DEFAULT 1`);
    }
    if (!prodColNames.includes('is_negotiable')) {
      db.exec(`ALTER TABLE products ADD COLUMN is_negotiable INTEGER DEFAULT 1`);
    }
    if (!prodColNames.includes('stock_status')) {
      db.exec(`ALTER TABLE products ADD COLUMN stock_status TEXT DEFAULT 'available'`);
    }
    if (!prodColNames.includes('product_grade')) {
      db.exec(`ALTER TABLE products ADD COLUMN product_grade TEXT DEFAULT 'Grade A'`);
    }
    if (!prodColNames.includes('quality_description')) {
      db.exec(`ALTER TABLE products ADD COLUMN quality_description TEXT DEFAULT ''`);
    }
    if (!prodColNames.includes('organic_certification_body')) {
      db.exec(`ALTER TABLE products ADD COLUMN organic_certification_body TEXT DEFAULT ''`);
    }
    if (!prodColNames.includes('storage_info')) {
      db.exec(`ALTER TABLE products ADD COLUMN storage_info TEXT DEFAULT ''`);
    }
    if (!prodColNames.includes('packaging_info')) {
      db.exec(`ALTER TABLE products ADD COLUMN packaging_info TEXT DEFAULT ''`);
    }
    if (!prodColNames.includes('village')) {
      db.exec(`ALTER TABLE products ADD COLUMN village TEXT DEFAULT ''`);
    }
    if (!prodColNames.includes('district')) {
      db.exec(`ALTER TABLE products ADD COLUMN district TEXT DEFAULT ''`);
    }
    if (!prodColNames.includes('state')) {
      db.exec(`ALTER TABLE products ADD COLUMN state TEXT DEFAULT 'Uttarakhand'`);
    }
    if (!prodColNames.includes('postal_code')) {
      db.exec(`ALTER TABLE products ADD COLUMN postal_code TEXT DEFAULT '248001'`);
    }
    if (!prodColNames.includes('farm_location_name')) {
      db.exec(`ALTER TABLE products ADD COLUMN farm_location_name TEXT DEFAULT ''`);
    }
    if (!prodColNames.includes('pickup_available')) {
      db.exec(`ALTER TABLE products ADD COLUMN pickup_available INTEGER DEFAULT 1`);
    }
    if (!prodColNames.includes('farmer_delivery_available')) {
      db.exec(`ALTER TABLE products ADD COLUMN farmer_delivery_available INTEGER DEFAULT 1`);
    }

    // Products table status check constraint update (active, unavailable, draft, paused, sold, expired)
    try {
      const prodSql = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='products'`).get() as any;
      if (prodSql && prodSql.sql && !prodSql.sql.includes("'paused'")) {
        console.log('[Migration] Updating products table status constraint to include paused, sold, and expired...');
        db.exec(`
          PRAGMA foreign_keys=off;
          CREATE TABLE products_new (
            id TEXT PRIMARY KEY,
            farmer_id TEXT NOT NULL REFERENCES farmer_profiles(id) ON DELETE CASCADE,
            category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            description TEXT DEFAULT '',
            price REAL NOT NULL CHECK(price > 0),
            unit TEXT NOT NULL,
            available_quantity REAL NOT NULL CHECK(available_quantity >= 0),
            total_quantity REAL DEFAULT 0,
            reserved_quantity REAL DEFAULT 0,
            sold_quantity REAL DEFAULT 0,
            min_order_quantity REAL DEFAULT 1,
            is_negotiable INTEGER DEFAULT 1,
            stock_status TEXT DEFAULT 'available',
            product_grade TEXT DEFAULT 'Grade A',
            quality_description TEXT DEFAULT '',
            organic_certification_body TEXT DEFAULT '',
            storage_info TEXT DEFAULT '',
            packaging_info TEXT DEFAULT '',
            village TEXT DEFAULT '',
            district TEXT DEFAULT '',
            state TEXT DEFAULT 'Uttarakhand',
            postal_code TEXT DEFAULT '248001',
            farm_location_name TEXT DEFAULT '',
            pickup_available INTEGER DEFAULT 1,
            farmer_delivery_available INTEGER DEFAULT 1,
            wholesale_price REAL DEFAULT NULL,
            moq REAL DEFAULT 1,
            stock_alert_threshold REAL DEFAULT 5,
            is_organic INTEGER NOT NULL DEFAULT 0,
            available_today INTEGER NOT NULL DEFAULT 1,
            harvest_date TEXT,
            freshness_tag TEXT,
            location TEXT NOT NULL,
            city TEXT NOT NULL DEFAULT 'Dehradun',
            latitude REAL,
            longitude REAL,
            image TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'unavailable', 'draft', 'paused', 'sold', 'expired')),
            moderation_status TEXT NOT NULL DEFAULT 'approved' CHECK(moderation_status IN ('approved', 'pending', 'flagged')),
            views_count INTEGER NOT NULL DEFAULT 0,
            likes_count INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          INSERT INTO products_new (
            id, farmer_id, category_id, name, slug, description, price, unit,
            available_quantity, total_quantity, reserved_quantity, sold_quantity, min_order_quantity, is_negotiable,
            stock_status, product_grade, quality_description, organic_certification_body, storage_info, packaging_info,
            village, district, state, postal_code, farm_location_name, pickup_available, farmer_delivery_available,
            wholesale_price, moq, stock_alert_threshold, is_organic, available_today, harvest_date, freshness_tag,
            location, city, latitude, longitude, image, status, moderation_status, views_count, likes_count,
            created_at, updated_at
          ) SELECT
            id, farmer_id, category_id, name, slug, description, price, unit,
            available_quantity, total_quantity, reserved_quantity, sold_quantity, min_order_quantity, is_negotiable,
            stock_status, product_grade, quality_description, organic_certification_body, storage_info, packaging_info,
            village, district, state, postal_code, farm_location_name, pickup_available, farmer_delivery_available,
            wholesale_price, moq, stock_alert_threshold, is_organic, available_today, harvest_date, freshness_tag,
            location, city, latitude, longitude, image, status, moderation_status, views_count, likes_count,
            created_at, updated_at
          FROM products;
          DROP TABLE products;
          ALTER TABLE products_new RENAME TO products;
          CREATE INDEX IF NOT EXISTS idx_products_farmer ON products(farmer_id);
          CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
          CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
          CREATE INDEX IF NOT EXISTS idx_products_city ON products(city);
          CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
          PRAGMA foreign_keys=on;
        `);
      }
    } catch (e: any) {
      console.warn('[Migration] Notice on products constraint update:', e.message);
    }

    // Notifications table update for smart alerts and negotiation types
    try {
      const notifSql = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='notifications'`).get() as any;
      if (notifSql && notifSql.sql && !notifSql.sql.includes("'offer'")) {
        console.log('[Migration] Updating notifications table constraints for smart alerts and offers...');
        db.exec(`
          PRAGMA foreign_keys=off;
          CREATE TABLE notifications_new (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            recipient_role TEXT NOT NULL CHECK(recipient_role IN ('customer', 'farmer', 'admin')),
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER NOT NULL DEFAULT 0,
            read_at TEXT,
            created_at TEXT NOT NULL
          );
          INSERT INTO notifications_new (id, user_id, recipient_role, type, title, message, is_read, read_at, created_at)
          SELECT id, user_id, recipient_role, type, title, message, is_read, read_at, created_at FROM notifications;
          DROP TABLE notifications;
          ALTER TABLE notifications_new RENAME TO notifications;
          CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
          CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
          PRAGMA foreign_keys=on;
        `);
      }
    } catch (e: any) {
      console.warn('[Migration] Notice on notifications constraint update:', e.message);
    }

    // Reports table enhancements (Grievances, Categories, Orders Linkage, Priority, Resolution)
    const reportCols = db.prepare(`PRAGMA table_info(reports)`).all() as any[];
    const reportColNames = reportCols.map((c) => c.name);
    if (!reportColNames.includes('order_id')) {
      db.exec(`ALTER TABLE reports ADD COLUMN order_id TEXT DEFAULT NULL`);
    }
    if (!reportColNames.includes('category')) {
      db.exec(`ALTER TABLE reports ADD COLUMN category TEXT DEFAULT 'general'`);
    }
    if (!reportColNames.includes('priority')) {
      db.exec(`ALTER TABLE reports ADD COLUMN priority TEXT DEFAULT 'medium'`);
    }
    if (!reportColNames.includes('assigned_admin_id')) {
      db.exec(`ALTER TABLE reports ADD COLUMN assigned_admin_id TEXT DEFAULT NULL`);
    }
    if (!reportColNames.includes('resolution_notes')) {
      db.exec(`ALTER TABLE reports ADD COLUMN resolution_notes TEXT DEFAULT ''`);
    }
    if (!reportColNames.includes('resolution_reason')) {
      db.exec(`ALTER TABLE reports ADD COLUMN resolution_reason TEXT DEFAULT ''`);
    }
    if (!reportColNames.includes('evidence_url')) {
      db.exec(`ALTER TABLE reports ADD COLUMN evidence_url TEXT DEFAULT ''`);
    }

    // Group Buys creator_id enhancement
    const gbCols = db.prepare(`PRAGMA table_info(group_buys)`).all() as any[];
    const gbColNames = gbCols.map((c) => c.name);
    if (!gbColNames.includes('creator_id')) {
      db.exec(`ALTER TABLE group_buys ADD COLUMN creator_id TEXT DEFAULT NULL`);
    }

    // Scheduled Procurements last_executed_at enhancement
    const spCols = db.prepare(`PRAGMA table_info(scheduled_procurements)`).all() as any[];
    const spColNames = spCols.map((c) => c.name);
    if (!spColNames.includes('last_executed_at')) {
      db.exec(`ALTER TABLE scheduled_procurements ADD COLUMN last_executed_at TEXT DEFAULT NULL`);
    }

    // B2B Profiles enhancement (admin verification, rejection reason, status)
    const b2bCols = db.prepare(`PRAGMA table_info(b2b_profiles)`).all() as any[];
    const b2bColNames = b2bCols.map((c) => c.name);
    if (!b2bColNames.includes('verified_by')) {
      db.exec(`ALTER TABLE b2b_profiles ADD COLUMN verified_by TEXT DEFAULT NULL`);
    }
    if (!b2bColNames.includes('verified_at')) {
      db.exec(`ALTER TABLE b2b_profiles ADD COLUMN verified_at TEXT DEFAULT NULL`);
    }
    if (!b2bColNames.includes('rejection_reason')) {
      db.exec(`ALTER TABLE b2b_profiles ADD COLUMN rejection_reason TEXT DEFAULT ''`);
    }
    if (!b2bColNames.includes('status')) {
      db.exec(`ALTER TABLE b2b_profiles ADD COLUMN status TEXT DEFAULT 'pending'`);
    }

    // Delivery partners enhancement (speed and heading telemetry)
    const dpCols = db.prepare(`PRAGMA table_info(delivery_partners)`).all() as any[];
    const dpColNames = dpCols.map((c) => c.name);
    if (!dpColNames.includes('speed_kmh')) {
      db.exec(`ALTER TABLE delivery_partners ADD COLUMN speed_kmh REAL DEFAULT 0`);
    }
    if (!dpColNames.includes('heading_deg')) {
      db.exec(`ALTER TABLE delivery_partners ADD COLUMN heading_deg REAL DEFAULT 0`);
    }

    // Delivery tasks enhancement (estimated_delivery_time)
    const dtCols = db.prepare(`PRAGMA table_info(delivery_tasks)`).all() as any[];
    const dtColNames = dtCols.map((c) => c.name);
    if (!dtColNames.includes('estimated_delivery_time')) {
      db.exec(`ALTER TABLE delivery_tasks ADD COLUMN estimated_delivery_time TEXT DEFAULT NULL`);
    }
  } catch (err: any) {
    console.warn('[Migration] Notice on orders/products columns migration:', err.message);
  }

  // Migration: Update wholesale_quotations CHECK constraint to support 'counter_offered' and 'expired'
  try {
    const wqSql = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='wholesale_quotations'`).get() as any;
    if (wqSql && wqSql.sql && (!wqSql.sql.includes("'counter_offered'") || !wqSql.sql.includes("'expired'"))) {
      console.log('[Migration] Updating wholesale_quotations table constraint for counter_offered and expired...');
      db.exec(`
        PRAGMA foreign_keys=off;
        CREATE TABLE wholesale_quotations_new (
          id TEXT PRIMARY KEY,
          quotation_number TEXT NOT NULL UNIQUE,
          buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          farmer_id TEXT NOT NULL REFERENCES farmer_profiles(id) ON DELETE CASCADE,
          product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          requested_quantity REAL NOT NULL CHECK(requested_quantity > 0),
          unit TEXT NOT NULL DEFAULT 'kg',
          offered_price_per_unit REAL NOT NULL CHECK(offered_price_per_unit > 0),
          farmer_counter_price REAL,
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'countered', 'counter_offered', 'accepted', 'rejected', 'ordered', 'expired')),
          notes TEXT DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT INTO wholesale_quotations_new (
          id, quotation_number, buyer_id, farmer_id, product_id,
          requested_quantity, unit, offered_price_per_unit, farmer_counter_price,
          status, notes, created_at, updated_at
        ) SELECT 
          id, quotation_number, buyer_id, farmer_id, product_id,
          requested_quantity, unit, offered_price_per_unit, farmer_counter_price,
          status, notes, created_at, updated_at
        FROM wholesale_quotations;
        DROP TABLE wholesale_quotations;
        ALTER TABLE wholesale_quotations_new RENAME TO wholesale_quotations;
        CREATE INDEX IF NOT EXISTS idx_wholesale_quotations_buyer ON wholesale_quotations(buyer_id);
        CREATE INDEX IF NOT EXISTS idx_wholesale_quotations_farmer ON wholesale_quotations(farmer_id);
        PRAGMA foreign_keys=on;
      `);
      console.log('[Migration] wholesale_quotations table successfully updated with enhanced status constraints.');
    }
  } catch (err: any) {
    console.warn('[Migration] Notice on wholesale_quotations CHECK constraint update:', err.message);
  }

  // Migration: Update CHECK constraint to support 'phonepe' payment method
  try {
    const ordersSql = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'`).get() as any;
    if (ordersSql && ordersSql.sql && (!ordersSql.sql.includes("'gpay'") || !ordersSql.sql.includes("'paytm')"))) {
      console.log('[Migration] Updating orders table constraint for PhonePe, GPay, and Paytm...');
      db.exec(`
        PRAGMA foreign_keys=off;
        CREATE TABLE orders_new (
          id TEXT PRIMARY KEY,
          order_number TEXT NOT NULL UNIQUE,
          customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
          farmer_id TEXT NOT NULL REFERENCES farmer_profiles(id) ON DELETE RESTRICT,
          total_amount REAL NOT NULL CHECK(total_amount >= 0),
          subtotal REAL NOT NULL CHECK(subtotal >= 0),
          delivery_fee REAL NOT NULL DEFAULT 0 CHECK(delivery_fee >= 0),
          farmer_tip REAL NOT NULL DEFAULT 0 CHECK(farmer_tip >= 0),
          delivery_address TEXT NOT NULL,
          city TEXT NOT NULL DEFAULT 'Dehradun',
          postal_code TEXT DEFAULT '248001',
          customer_phone TEXT NOT NULL,
          customer_name TEXT NOT NULL,
          farmer_name TEXT NOT NULL,
          farm_name TEXT NOT NULL,
          farmer_phone TEXT NOT NULL,
          payment_method TEXT NOT NULL CHECK(payment_method IN ('upi', 'cod', 'card', 'wallet', 'phonepe', 'gpay', 'paytm')),
          payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'failed', 'refunded')),
          order_status TEXT NOT NULL DEFAULT 'placed' CHECK(order_status IN ('placed', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'rejected', 'cancelled')),
          estimated_delivery_time TEXT DEFAULT '40-50 mins',
          delivery_mode TEXT DEFAULT 'farmer_direct',
          delivery_distance_km REAL DEFAULT 5.0,
          tracking_courier TEXT DEFAULT 'Farmer Self-Fleet',
          tracking_number TEXT,
          notes TEXT DEFAULT '',
          phonepe_transaction_id TEXT DEFAULT '',
          cancellation_reason TEXT DEFAULT '',
          refund_amount REAL DEFAULT 0,
          dispute_status TEXT DEFAULT 'none',
          delivery_otp TEXT DEFAULT '1234',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        INSERT INTO orders_new (
          id, order_number, customer_id, farmer_id, total_amount, subtotal, delivery_fee, farmer_tip,
          delivery_address, city, postal_code, customer_phone, customer_name, farmer_name, farm_name, farmer_phone,
          payment_method, payment_status, order_status, estimated_delivery_time, delivery_mode, delivery_distance_km,
          tracking_courier, tracking_number, notes, phonepe_transaction_id, created_at, updated_at
        ) SELECT 
          id, order_number, customer_id, farmer_id, total_amount, subtotal, delivery_fee, farmer_tip,
          delivery_address, city, postal_code, customer_phone, customer_name, farmer_name, farm_name, farmer_phone,
          payment_method, payment_status, order_status, estimated_delivery_time, delivery_mode, delivery_distance_km,
          tracking_courier, tracking_number, notes, phonepe_transaction_id, created_at, updated_at
        FROM orders;

        DROP TABLE orders;
        ALTER TABLE orders_new RENAME TO orders;
        CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
        CREATE INDEX IF NOT EXISTS idx_orders_farmer ON orders(farmer_id);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
        PRAGMA foreign_keys=on;
      `);
      console.log('[Migration] orders table successfully updated with PhonePe check constraint.');
    }
  } catch (err: any) {
    console.warn('[Migration] Notice on orders CHECK constraint update:', err.message);
  }

  console.log('[Migration] Database schema migrated successfully.');
}

if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  runMigrations();
}
