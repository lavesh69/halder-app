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
  } catch (err: any) {
    console.warn('[Migration] Notice on orders columns migration:', err.message);
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
