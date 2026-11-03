-- ==========================================================
-- HALDER Production Database Relational Schema (SQLite / WAL)
-- ==========================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  halder_id TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('customer', 'farmer', 'admin')),
  profile_image TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 1B. Identity Sequences Table (HAL-CUS, HAL-FRM, HAL-ADM)
CREATE TABLE IF NOT EXISTS identity_sequences (
  role TEXT PRIMARY KEY CHECK(role IN ('customer', 'farmer', 'admin')),
  prefix TEXT NOT NULL,
  current_seq INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

-- 1C. External Authentication Identities (Google OAuth / SSO)
CREATE TABLE IF NOT EXISTS auth_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK(provider IN ('google', 'apple', 'phone', 'email')),
  provider_user_id TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(provider, provider_user_id)
);
CREATE INDEX IF NOT EXISTS idx_auth_identities_user ON auth_identities(user_id);

-- 1D. Customer Profiles Table
CREATE TABLE IF NOT EXISTS customer_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  date_of_birth TEXT DEFAULT NULL,
  gender TEXT DEFAULT NULL,
  default_address_id TEXT DEFAULT NULL,
  notification_preferences TEXT DEFAULT '{"orders":true,"delivery":true,"payments":true,"promos":false,"chat":true}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_user ON customer_profiles(user_id);

-- 1E. Customer Addresses Table
CREATE TABLE IF NOT EXISTS customer_addresses (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home',
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  house_building TEXT NOT NULL,
  street_locality TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  landmark TEXT DEFAULT '',
  is_default INTEGER NOT NULL DEFAULT 0,
  latitude REAL DEFAULT NULL,
  longitude REAL DEFAULT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses(customer_id);

-- 2. Farmer Profiles Table
CREATE TABLE IF NOT EXISTS farmer_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  farm_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  location TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Dehradun',
  latitude REAL NOT NULL DEFAULT 30.3165,
  longitude REAL NOT NULL DEFAULT 78.0322,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK(verification_status IN ('verified', 'pending', 'rejected')),
  rating REAL NOT NULL DEFAULT 5.0 CHECK(rating >= 1.0 AND rating <= 5.0),
  total_orders INTEGER NOT NULL DEFAULT 0 CHECK(total_orders >= 0),
  total_listings_count INTEGER NOT NULL DEFAULT 0,
  response_rate INTEGER NOT NULL DEFAULT 98,
  joined_year INTEGER NOT NULL DEFAULT 2023,
  avatar TEXT DEFAULT '',
  cover_image TEXT DEFAULT '',
  bank_account_name TEXT DEFAULT '',
  bank_account_number TEXT DEFAULT '',
  bank_ifsc TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  upi_id TEXT DEFAULT '',
  kyc_document_type TEXT DEFAULT '',
  kyc_document_number TEXT DEFAULT '',
  kyc_document_url TEXT DEFAULT '',
  kyc_submitted_at TEXT DEFAULT NULL,
  kyc_reviewed_at TEXT DEFAULT NULL,
  kyc_rejection_reason TEXT DEFAULT '',
  specialty_crops TEXT DEFAULT '[]',
  farm_size_acres REAL DEFAULT 5.0,
  organic_certification_body TEXT DEFAULT 'NPOP Certified Organic',
  water_source TEXT DEFAULT 'Natural Rainwater & Deep Aquifer',
  experience_years INTEGER DEFAULT 10,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  emoji TEXT NOT NULL DEFAULT '🌱',
  image TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- 4. Products Table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  farmer_id TEXT NOT NULL REFERENCES farmer_profiles(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT DEFAULT '',
  price REAL NOT NULL CHECK(price > 0),
  unit TEXT NOT NULL CHECK(unit IN ('kg', 'gram', 'litre', 'bunch', 'piece', 'packet', 'dozen', 'box')),
  available_quantity REAL NOT NULL CHECK(available_quantity >= 0),
  is_organic INTEGER NOT NULL DEFAULT 0,
  available_today INTEGER NOT NULL DEFAULT 1,
  harvest_date TEXT,
  freshness_tag TEXT,
  location TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Dehradun',
  latitude REAL,
  longitude REAL,
  image TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'unavailable', 'draft')),
  moderation_status TEXT NOT NULL DEFAULT 'approved' CHECK(moderation_status IN ('approved', 'pending', 'flagged')),
  views_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 5. Product Images Table
CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- 6. Favorites Table
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, product_id)
);

-- 7. Carts Table
CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 8. Cart Items Table
CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity REAL NOT NULL CHECK(quantity > 0),
  selected_unit TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(cart_id, product_id)
);

-- 9. Orders Table
CREATE TABLE IF NOT EXISTS orders (
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
  delivery_mode TEXT DEFAULT 'farmer_direct' CHECK(delivery_mode IN ('farmer_direct', 'halder_logistics')),
  delivery_distance_km REAL DEFAULT 5.0,
  tracking_courier TEXT DEFAULT 'Farmer Self-Fleet',
  tracking_number TEXT,
  phonepe_transaction_id TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 10. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  farmer_id TEXT NOT NULL REFERENCES farmer_profiles(id) ON DELETE RESTRICT,
  product_name_snapshot TEXT NOT NULL,
  unit_price_snapshot REAL NOT NULL CHECK(unit_price_snapshot > 0),
  unit_snapshot TEXT NOT NULL,
  quantity REAL NOT NULL CHECK(quantity > 0),
  subtotal REAL NOT NULL CHECK(subtotal >= 0)
);

-- 11. Order Timeline Steps Table
CREATE TABLE IF NOT EXISTS order_timeline (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  time TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  current INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- 12. Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  farmer_id TEXT NOT NULL REFERENCES farmer_profiles(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(customer_id, farmer_id)
);

-- 13. Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK(sender_role IN ('user', 'farmer', 'admin')),
  message TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL
);

-- 14. Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  farmer_id TEXT NOT NULL REFERENCES farmer_profiles(id) ON DELETE CASCADE,
  rating REAL NOT NULL CHECK(rating >= 1.0 AND rating <= 5.0),
  review TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 15. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_role TEXT NOT NULL CHECK(recipient_role IN ('customer', 'farmer', 'admin')),
  type TEXT NOT NULL CHECK(type IN ('order', 'verification', 'chat', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  read_at TEXT,
  created_at TEXT NOT NULL
);

-- 15b. Device Tokens Table (FCM & Web Push)
CREATE TABLE IF NOT EXISTS device_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK(platform IN ('web', 'android', 'ios')),
  device_name TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 16. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL
);

-- 17. Reports Table
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  reported_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'investigating', 'resolved', 'dismissed')),
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

-- 18. Payout Records (Escrow & Farmer Settlement)
CREATE TABLE IF NOT EXISTS payout_records (
  id TEXT PRIMARY KEY,
  farmer_id TEXT NOT NULL REFERENCES farmer_profiles(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  gross_amount REAL NOT NULL CHECK(gross_amount >= 0),
  platform_fee REAL NOT NULL CHECK(platform_fee >= 0),
  net_amount REAL NOT NULL CHECK(net_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processed', 'failed')),
  payout_method TEXT NOT NULL DEFAULT 'upi' CHECK(payout_method IN ('upi', 'bank_transfer', 'cash')),
  payout_reference TEXT,
  created_at TEXT NOT NULL,
  processed_at TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_farmer_profiles_user ON farmer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_farmer_profiles_loc ON farmer_profiles(city, location);
CREATE INDEX IF NOT EXISTS idx_farmer_profiles_verif ON farmer_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_products_farmer ON products(farmer_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_avail_today ON products(available_today);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_farmer ON orders(farmer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_farmer ON order_items(farmer_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_payout_records_farmer ON payout_records(farmer_id);
CREATE INDEX IF NOT EXISTS idx_payout_records_status ON payout_records(status);
CREATE INDEX IF NOT EXISTS idx_reviews_farmer ON reviews(farmer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_farmer ON conversations(farmer_id);
CREATE INDEX IF NOT EXISTS idx_users_halder_id ON users(halder_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);


