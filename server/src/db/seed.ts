import { runMigrations } from './migrate';
import { Database } from './database';
import bcrypt from 'bcryptjs';

export async function seedDatabase() {
  runMigrations();

  const existingUsers = Database.get<any>('SELECT COUNT(*) as count FROM users');
  const now = new Date().toISOString();

  if (!existingUsers || existingUsers.count === 0) {
    console.log('[Seed] Seeding production database with initial realistic mandi data...');
    const passwordHash = await bcrypt.hash('halder123', 10);

    Database.transaction(() => {
      Database.run(
        `INSERT INTO users (id, halder_id, name, email, phone, password_hash, role, profile_image, status, created_at, updated_at) VALUES
         ('user-cust-1', 'HAL-CUS-10000001', 'Aman Sharma', 'aman@halder.com', '+91 98765 43210', ?, 'customer', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80', 'active', ?, ?),
         ('user-farm-1', 'HAL-FRM-20000001', 'Rajesh Kumar', 'rajesh@greenvalley.in', '+91 98450 12345', ?, 'farmer', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80', 'active', ?, ?),
         ('user-farm-2', 'HAL-FRM-20000002', 'Amit Singh', 'amit@sunrisefarms.in', '+91 98110 54321', ?, 'farmer', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80', 'active', ?, ?),
         ('user-farm-3', 'HAL-FRM-20000003', 'Pooja Devi', 'pooja@himalayanorganics.in', '+91 98330 98765', ?, 'farmer', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80', 'active', ?, ?),
         ('user-admin-1', 'HAL-ADM-90000001', 'Vikram Patel', 'admin@halder.com', '+91 99999 00001', ?, 'admin', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80', 'active', ?, ?),
         ('user-del-1', 'HAL-CUS-10000002', 'Rahul Verma', 'rahul.delivery@halder.com', '+91 98888 11111', ?, 'customer', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80', 'active', ?, ?)`,
        [passwordHash, now, now, passwordHash, now, now, passwordHash, now, now, passwordHash, now, now, passwordHash, now, now, passwordHash, now, now]
      );

      Database.run(
        `INSERT INTO farmer_profiles (id, user_id, farm_name, description, location, city, latitude, longitude, verification_status, rating, total_orders, total_listings_count, response_rate, joined_year, avatar, cover_image, created_at, updated_at) VALUES
         ('farmer-1', 'user-farm-1', 'Green Valley Farm', 'Organic hill vegetables & A2 Badri cow dairy from Doon Valley.', 'Doon Valley, Dehradun', 'Dehradun', 30.3256, 78.0437, 'verified', 4.9, 142, 4, 98, 2021, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop&q=80', ?, ?),
         ('farmer-2', 'user-farm-2', 'Sunrise Farm', 'Naturally grown seasonal potatoes, onions, carrots and green peas.', 'Vikas Nagar, Dehradun', 'Dehradun', 30.4358, 77.8105, 'verified', 4.8, 98, 3, 95, 2022, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800&auto=format&fit=crop&q=80', ?, ?),
         ('farmer-3', 'user-farm-3', 'Himalayan Organics', 'Certified mountain greens, chemical-free raw wild honey and organic cauliflower.', 'Mussoorie Foothills', 'Dehradun', 30.3872, 78.0772, 'pending', 4.9, 175, 3, 99, 2020, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?w=800&auto=format&fit=crop&q=80', ?, ?)`,
        [now, now, now, now, now, now]
      );

      Database.run(
        `INSERT INTO categories (id, name, slug, emoji, image, active, created_at) VALUES
         ('cat-veg', 'Vegetables', 'vegetables', '🍅', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&auto=format&fit=crop&q=80', 1, ?),
         ('cat-fruits', 'Fruits', 'fruits', '🍎', 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&auto=format&fit=crop&q=80', 1, ?),
         ('cat-leafy', 'Leafy Greens', 'leafy-greens', '🥬', 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&auto=format&fit=crop&q=80', 1, ?),
         ('cat-grains', 'Grains & Pulses', 'grains', '🌾', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80', 1, ?),
         ('cat-dairy', 'Dairy', 'dairy', '🥛', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80', 1, ?),
         ('cat-organic', 'Organic Food', 'organic', '🍯', 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&auto=format&fit=crop&q=80', 1, ?),
         ('cat-homemade', 'Homemade Pickles', 'homemade', '🫙', 'https://images.unsplash.com/photo-1589135233689-d49fa2b23419?w=400&auto=format&fit=crop&q=80', 1, ?)`,
        [now, now, now, now, now, now, now]
      );

      Database.run(
        `INSERT INTO products (
          id, farmer_id, category_id, name, slug, description, price, unit,
          available_quantity, is_organic, available_today, harvest_date,
          freshness_tag, location, city, latitude, longitude, image,
          wholesale_price, moq, stock_alert_threshold, status, moderation_status, created_at, updated_at
        ) VALUES
         ('prod-1', 'farmer-1', 'cat-veg', 'Fresh Farm Tomatoes (देसी टमाटर)', 'fresh-farm-tomatoes', 'Vine-ripened juicy red tomatoes from Doon Valley farm.', 40.0, 'kg', 45.0, 1, 1, 'Today 6:00 AM', 'Harvested Today', 'Doon Valley, Dehradun', 'Dehradun', 30.3256, 78.0437, 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=600&auto=format&fit=crop&q=80', 32.0, 10.0, 5.0, 'active', 'approved', ?, ?),
         ('prod-2', 'farmer-2', 'cat-veg', 'Pahari Potatoes (पहाड़ी आलू)', 'pahari-potatoes', 'Mountain-grown red skin potatoes, firm and sweet in taste.', 35.0, 'kg', 80.0, 0, 1, 'Yesterday', 'Farm Fresh', 'Vikas Nagar, Dehradun', 'Dehradun', 30.4358, 77.8105, 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80', 28.0, 20.0, 10.0, 'active', 'approved', ?, ?),
         ('prod-3', 'farmer-2', 'cat-veg', 'Nashik Red Onions (लाल प्याज)', 'nashik-red-onions', 'Pungent, dry-skin farm onions with rich flavor.', 45.0, 'kg', 60.0, 0, 1, '2 days ago', 'Best Quality', 'Vikas Nagar, Dehradun', 'Dehradun', 30.4358, 77.8105, 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=80', 36.0, 15.0, 8.0, 'active', 'approved', ?, ?),
         ('prod-4', 'farmer-3', 'cat-leafy', 'Organic Mountain Spinach (देसी पालक)', 'organic-mountain-spinach', 'Tender dark-green chemical-free spinach leaves washed with clean stream water.', 25.0, 'bunch', 30.0, 1, 1, 'Today 5:30 AM', 'Morning Plucked', 'Mussoorie Foothills', 'Dehradun', 30.3872, 78.0772, 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80', 20.0, 10.0, 5.0, 'active', 'approved', ?, ?),
         ('prod-5', 'farmer-2', 'cat-veg', 'Sweet Hill Carrots (गाजर)', 'sweet-hill-carrots', 'Sweet, crunch red carrots directly harvested from sandy loam soil.', 50.0, 'kg', 40.0, 1, 1, 'Today 6:30 AM', 'Sweet & Crisp', 'Vikas Nagar, Dehradun', 'Dehradun', 30.4358, 77.8105, 'https://images.unsplash.com/photo-1598170845058-32b9d6a5c317?w=600&auto=format&fit=crop&q=80', 40.0, 10.0, 5.0, 'active', 'approved', ?, ?),
         ('prod-6', 'farmer-3', 'cat-veg', 'Farm Cauliflower (फूलगोभी)', 'farm-cauliflower', 'Pure white, tight-curd cauliflower with outer protective leaves.', 40.0, 'piece', 25.0, 1, 1, 'Today 6:00 AM', 'Chemical-Free', 'Mussoorie Foothills', 'Dehradun', 30.3872, 78.0772, 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=600&auto=format&fit=crop&q=80', 30.0, 15.0, 5.0, 'active', 'approved', ?, ?),
         ('prod-7', 'farmer-2', 'cat-veg', 'Sweet Green Peas (मटर)', 'sweet-green-peas', 'Tender and sweet mountain green pea pods full of fresh seeds.', 80.0, 'kg', 35.0, 1, 1, 'Today 5:45 AM', 'Sugar Sweet', 'Vikas Nagar, Dehradun', 'Dehradun', 30.4358, 77.8105, 'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=600&auto=format&fit=crop&q=80', 68.0, 10.0, 5.0, 'active', 'approved', ?, ?),
         ('prod-8', 'farmer-1', 'cat-veg', 'Crisp Green Cucumber (खीरा)', 'crisp-green-cucumber', 'Hydrating, crunchy organic cucumbers grown in polyhouse beds.', 35.0, 'kg', 50.0, 1, 1, 'Today 6:15 AM', 'Polyhouse Fresh', 'Doon Valley, Dehradun', 'Dehradun', 30.3256, 78.0437, 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=600&auto=format&fit=crop&q=80', 28.0, 10.0, 5.0, 'active', 'approved', ?, ?),
         ('prod-9', 'farmer-1', 'cat-dairy', 'Desi Badri Cow Raw Milk (गाय का दूध)', 'desi-badri-cow-raw-milk', 'Pure, unadulterated raw A2 milk from grass-fed Himalayan Badri cows.', 75.0, 'litre', 25.0, 1, 1, 'Today 5:00 AM', 'Morning Milked', 'Doon Valley, Dehradun', 'Dehradun', 30.3256, 78.0437, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80', 70.0, 5.0, 3.0, 'active', 'approved', ?, ?),
         ('prod-10', 'farmer-3', 'cat-organic', 'Wild Himalayan Forest Honey (जंगली शहद)', 'wild-himalayan-forest-honey', 'Raw, unprocessed multi-floral honey harvested from oak forests.', 350.0, 'packet', 18.0, 1, 1, 'Seasonal', '100% Pure Raw', 'Mussoorie Foothills', 'Dehradun', 30.3872, 78.0772, 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80', 310.0, 5.0, 2.0, 'active', 'approved', ?, ?)`,
        [
          now, now, now, now, now, now, now, now, now, now,
          now, now, now, now, now, now, now, now, now, now
        ]
      );

      Database.run("INSERT INTO carts (id, user_id, created_at, updated_at) VALUES ('cart-cust-1', 'user-cust-1', ?, ?)", [now, now]);

      Database.run(
        `INSERT INTO orders (
          id, order_number, customer_id, farmer_id, total_amount, subtotal,
          delivery_fee, farmer_tip, delivery_address, city, postal_code,
          customer_phone, customer_name, farmer_name, farm_name, farmer_phone,
          payment_method, payment_status, order_status, estimated_delivery_time,
          delivery_otp, created_at, updated_at
        ) VALUES
         ('order-101', '#HD8491', 'user-cust-1', 'farmer-1', 265.0, 230.0, 25.0, 10.0, '14, Rajpur Road, Dehradun', 'Dehradun', '248001', '+91 98765 43210', 'Aman Sharma', 'Rajesh Kumar', 'Green Valley Farm', '+91 98450 12345', 'upi', 'paid', 'preparing', '35-45 mins', '4829', ?, ?),
         ('order-102', '#HD7823', 'user-cust-1', 'farmer-3', 190.0, 155.0, 25.0, 10.0, '14, Rajpur Road, Dehradun', 'Dehradun', '248001', '+91 98765 43210', 'Aman Sharma', 'Pooja Devi', 'Himalayan Organics', '+91 98330 98765', 'cod', 'pending', 'delivered', 'Delivered', '9103', ?, ?)`,
        [now, now, now, now]
      );

      Database.run(
        `INSERT INTO order_items (id, order_id, product_id, farmer_id, product_name_snapshot, unit_price_snapshot, unit_snapshot, quantity, subtotal) VALUES
         ('item-1', 'order-101', 'prod-1', 'farmer-1', 'Fresh Farm Tomatoes', 40.0, 'kg', 2.0, 80.0),
         ('item-2', 'order-101', 'prod-9', 'farmer-1', 'Desi Badri Cow Raw Milk', 75.0, 'litre', 2.0, 150.0),
         ('item-3', 'order-102', 'prod-4', 'farmer-3', 'Organic Mountain Spinach', 25.0, 'bunch', 3.0, 75.0),
         ('item-4', 'order-102', 'prod-6', 'farmer-3', 'Farm Cauliflower', 40.0, 'piece', 2.0, 80.0)`
      );

      Database.run(
        `INSERT INTO order_timeline (id, order_id, status, title, description, time, completed, current, created_at) VALUES
         ('tl-1', 'order-101', 'placed', 'Order Placed', 'Order placed with Rajesh Kumar', '7:00 AM', 1, 0, ?),
         ('tl-2', 'order-101', 'accepted', 'Harvest Confirmed', 'Rajesh Kumar verified morning harvest', '7:05 AM', 1, 0, ?),
         ('tl-3', 'order-101', 'preparing', 'Weighing & Packing', 'Eco-crate weighing and hygiene pack', '7:15 AM', 1, 1, ?),
         ('tl-4', 'order-102', 'placed', 'Order Placed', 'Order placed with Pooja Devi', 'Yesterday', 1, 0, ?),
         ('tl-5', 'order-102', 'delivered', 'Delivered', 'Delivered to Rajpur Road', 'Yesterday', 1, 1, ?)`,
        [now, now, now, now, now]
      );

      Database.run(
        `INSERT INTO reviews (id, order_id, customer_id, farmer_id, rating, review, created_at) VALUES
         ('rev-1', 'order-102', 'user-cust-1', 'farmer-3', 5.0, 'The mountain spinach was super fresh and the cauliflower tasted sweet! Delivered right on time.', ?)`,
        [now]
      );

      Database.run(
        `INSERT INTO notifications (id, user_id, recipient_role, type, title, message, is_read, created_at) VALUES
         ('notif-1', 'user-cust-1', 'customer', 'order', 'Order Placed 🧺', 'Your order #HD8491 from Green Valley Farm has been placed.', 1, ?),
         ('notif-2', 'user-farm-1', 'farmer', 'order', 'New Order Received! 🔔', 'New order #HD8491 received from Aman Sharma for ₹265.', 0, ?),
         ('notif-3', 'user-farm-1', 'farmer', 'verification', 'Farmer Verified! 🛡️', 'Your farm verification credentials have been approved by Admin.', 1, ?)`,
        [now, now, now]
      );
    });
  }

  // Seed extended modules (Mandi, Logistics, B2B, Subscriptions, Crop Calendar, Settings)
  seedExtendedEcosystem(now);

  console.log('[Seed] Production database successfully initialized and seeded!');
}

function seedExtendedEcosystem(now: string) {
  // 1. Mandi Prices
  const mandiCount = Database.get<any>('SELECT COUNT(*) as count FROM mandi_prices');
  if (!mandiCount || mandiCount.count === 0) {
    console.log('[Seed] Seeding verified Mandi price intelligence records...');
    const mandiDate = new Date().toISOString().split('T')[0];
    const prices = [
      ['mandi-1', 'Tomato (टमाटर)', 'Tomato', 'Hybrid Red', 'Uttarakhand', 'Dehradun', 'Dehradun Mandi', 26.0, 36.0, 32.0, 18.5, mandiDate, 'Agmarknet / UK Mandi Board', 1],
      ['mandi-2', 'Pahari Potato (आलू)', 'Potato', 'Jyoti / Red Mountain', 'Uttarakhand', 'Dehradun', 'Dehradun Mandi', 20.0, 28.0, 24.0, 42.0, mandiDate, 'Agmarknet / UK Mandi Board', 1],
      ['mandi-3', 'Red Onion (प्याज)', 'Onion', 'Nashik Red', 'Uttarakhand', 'Dehradun', 'Rishikesh Mandi', 32.0, 44.0, 38.0, 26.0, mandiDate, 'Agmarknet / UK Mandi Board', 1],
      ['mandi-4', 'Green Peas (मटर)', 'Peas', 'Sweet Mountain Green', 'Uttarakhand', 'Dehradun', 'Dehradun Mandi', 55.0, 75.0, 65.0, 14.0, mandiDate, 'Agmarknet / UK Mandi Board', 1],
      ['mandi-5', 'Cauliflower (फूलगोभी)', 'Cauliflower', 'Snowball', 'Uttarakhand', 'Haridwar', 'Roorkee Mandi', 20.0, 34.0, 28.0, 9.5, mandiDate, 'Agmarknet / UK Mandi Board', 1],
      ['mandi-6', 'Mountain Spinach (पालक)', 'Spinach', 'Desi Broadleaf', 'Uttarakhand', 'Nainital', 'Haldwani Mandi', 15.0, 26.0, 20.0, 6.2, mandiDate, 'Agmarknet / UK Mandi Board', 1],
      ['mandi-7', 'Basmati Paddy (धान)', 'Paddy (Dhan)', 'Pusa 1121 Basmati', 'Uttarakhand', 'Haridwar', 'Haridwar Mandi', 32.0, 38.5, 35.5, 85.0, mandiDate, 'e-NAM National Portal', 1],
      ['mandi-8', 'Himachali Apple (सेब)', 'Apple', 'Royal Delicious', 'Uttarakhand', 'Dehradun', 'Dehradun Mandi', 85.0, 135.0, 110.0, 22.0, mandiDate, 'Agmarknet / UK Mandi Board', 1]
    ];

    for (const p of prices) {
      Database.run(
        `INSERT OR IGNORE INTO mandi_prices (id, crop_name, commodity, variety, state, district, market_name, min_price, max_price, modal_price, arrival_quantity_tonnes, price_date, source, is_verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [...p, now, now]
      );
    }
  }

  // 2. Crop Demand Indicators
  const demandCount = Database.get<any>('SELECT COUNT(*) as count FROM crop_demand_indicators');
  if (!demandCount || demandCount.count === 0) {
    const indicators = [
      ['Tomato', 'Kharif', 'high', 'bullish', 'Early Morning 06:00 - 09:00 AM', 32.0, 25.0, 88, 'Strong local household & restaurant demand in Doon Valley. Direct farm deliveries command 20-25% premium over wholesale mandi rates.'],
      ['Pahari Potato', 'Rabi', 'moderate', 'stable', 'Bulk direct delivery on weekends', 24.0, 30.0, 82, 'Storage crop with high steady consumption across residential kitchens and cloud kitchens.'],
      ['Green Peas', 'Rabi', 'high', 'bullish', 'Harvest fresh morning pods', 65.0, 23.0, 94, 'Premium winter harvest with high margin potential. Freshness indicator drives instant consumer purchases.'],
      ['Mountain Spinach', 'Rabi', 'high', 'stable', 'Same-day sunrise dispatch', 20.0, 25.0, 90, 'High consumer affinity for chemical-free Himalayan greens. Quick turnover avoids spoilage.'],
      ['A2 Badri Cow Milk', 'Year-round', 'high', 'bullish', 'Daily dawn delivery 06:00 - 08:00 AM', 60.0, 25.0, 96, 'Consistent recurring subscription demand from health-conscious urban households. 0% middleman cut.']
    ];

    for (const ind of indicators) {
      Database.run(
        `INSERT OR IGNORE INTO crop_demand_indicators (id, crop_name, season, demand_level, price_outlook, recommended_selling_window, avg_mandi_modal_price, retail_mandi_spread_pct, profitability_score, insights_summary, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['ind-' + ind[0].toLowerCase().replace(/\s+/g, '-'), ...ind, now]
      );
    }
  }

  // 3. Farm Crops (Crop Calendar)
  const cropsCount = Database.get<any>('SELECT COUNT(*) as count FROM farm_crops');
  if (!cropsCount || cropsCount.count === 0) {
    const crops = [
      ['crop-1', 'farmer-1', 'Desi Hill Tomato', 'Kharif', '2026-07-15', '2026-10-25', 2500, 'Organic Certified', '["NPOP Organic", "Vedic Krishi"]', 'harvesting'],
      ['crop-2', 'farmer-1', 'Badri Cow Fodder (Barseem)', 'Rabi', '2026-09-01', '2026-12-15', 5000, 'Natural/Zero Budget', '[]', 'growing'],
      ['crop-3', 'farmer-2', 'Pahari Red Potato', 'Rabi', '2026-08-20', '2026-11-28', 4200, 'Traditional', '[]', 'growing'],
      ['crop-4', 'farmer-2', 'Sweet Green Peas', 'Rabi', '2026-09-10', '2026-12-05', 1800, 'Traditional', '[]', 'growing'],
      ['crop-5', 'farmer-3', 'Organic Mountain Spinach', 'Kharif', '2026-08-01', '2026-10-18', 950, 'Organic Certified', '["Uttarakhand Organic Commodity Board"]', 'harvested']
    ];

    for (const c of crops) {
      Database.run(
        `INSERT OR IGNORE INTO farm_crops (id, farmer_id, crop_name, season, sowing_date, expected_harvest_date, estimated_yield_kg, farming_method, certifications, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [...c, now, now]
      );
    }
  }

  // 4. Delivery Partners
  const delCount = Database.get<any>('SELECT COUNT(*) as count FROM delivery_partners');
  if (!delCount || delCount.count === 0) {
    const delUser = Database.get<any>("SELECT id FROM users WHERE id = 'user-del-1'");
    if (!delUser) {
      const defaultPasswordHash = bcrypt.hashSync('halder123', 10);
      Database.run(
        `INSERT OR IGNORE INTO users (id, halder_id, name, email, phone, password_hash, role, profile_image, status, created_at, updated_at)
         VALUES ('user-del-1', 'HAL-CUS-10000002', 'Rahul Verma', 'rahul.delivery@halder.com', '+91 98888 11111', ?, 'customer', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80', 'active', ?, ?)`,
        [defaultPasswordHash, now, now]
      );
    }

    Database.run(
      `INSERT OR IGNORE INTO delivery_partners (id, user_id, vehicle_type, vehicle_number, license_number, service_zone, is_available, current_lat, current_lng, rating, total_deliveries, status, created_at, updated_at)
       VALUES 
       ('partner-1', 'user-del-1', 'bike', 'UK-07-AB-1234', 'DL-UK-2022-09412', 'Dehradun Urban (Rajpur, Jakhan, Clock Tower)', 1, 30.3250, 78.0400, 4.9, 214, 'active', ?, ?),
       ('partner-2', 'user-admin-1', 'pickup_truck', 'UK-07-TA-5678', 'DL-UK-2020-88123', 'Vikasnagar & Peri-Urban Agro Belt', 1, 30.4350, 77.8100, 4.8, 342, 'active', ?, ?)`,
      [now, now, now, now]
    );

    // Initial Delivery Task for Order 101
    Database.run(
      `INSERT OR IGNORE INTO delivery_tasks (id, order_id, partner_id, status, pickup_address, delivery_address, distance_km, delivery_fee, partner_payout, otp_code, notes, assigned_at, created_at, updated_at)
       VALUES ('task-101', 'order-101', 'partner-1', 'out_for_delivery', 'Green Valley Farm, Doon Valley, Dehradun', '14, Rajpur Road, Dehradun', 5.2, 25.0, 20.0, '4829', 'Handle glass milk bottles with care', ?, ?, ?)`,
      [now, now, now]
    );
  }

  // 5. B2B Profile
  const b2bCount = Database.get<any>('SELECT COUNT(*) as count FROM b2b_profiles');
  if (!b2bCount || b2bCount.count === 0) {
    Database.run(
      `INSERT OR IGNORE INTO b2b_profiles (id, user_id, business_name, business_type, gstin, fssai_license, credit_limit, verified, created_at, updated_at)
       VALUES ('b2b-1', 'user-cust-1', 'The Doon Bistro & Farm Table', 'restaurant', '05AAAAA0000A1Z5', '12622005000123', 50000.0, 1, ?, ?)`,
      [now, now]
    );
  }

  // 6. Farmer Subscriptions
  const subCount = Database.get<any>('SELECT COUNT(*) as count FROM farmer_subscriptions');
  if (!subCount || subCount.count === 0) {
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    Database.run(
      `INSERT OR IGNORE INTO farmer_subscriptions (id, farmer_id, plan_id, plan_name, price_monthly, max_listings, features_json, status, start_date, end_date, payment_reference, created_at)
       VALUES 
       ('sub-1', 'farmer-1', 'kisan_samridhi', 'Kisan Samridhi (Pro)', 499.0, 50, '{"priority_placement":true,"sms_alerts":true,"wholesale_b2b":true,"custom_branding":true}', 'active', ?, ?, 'UPI-SUB-84912', ?),
       ('sub-2', 'farmer-2', 'kisan_mitra', 'Kisan Mitra (Basic)', 199.0, 25, '{"priority_placement":false,"sms_alerts":true,"wholesale_b2b":true,"custom_branding":false}', 'active', ?, ?, 'UPI-SUB-10294', ?),
       ('sub-3', 'farmer-3', 'free', 'Free Kisan Plan', 0.0, 10, '{"priority_placement":false,"sms_alerts":false,"wholesale_b2b":false,"custom_branding":false}', 'active', ?, ?, 'FREE', ?)`,
      [now, endDate, now, now, endDate, now, now, endDate, now]
    );
  }

  // 7. Group Buy
  const gbCount = Database.get<any>('SELECT COUNT(*) as count FROM group_buys');
  if (!gbCount || gbCount.count === 0) {
    const deadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    Database.run(
      `INSERT OR IGNORE INTO group_buys (id, product_id, farmer_id, title, target_quantity, current_quantity, unit, retail_price, discounted_price, discount_percent, min_buyers_count, current_buyers_count, deadline, status, created_at)
       VALUES ('gb-1', 'prod-2', 'farmer-2', '🥔 50kg Community Pahari Potato Pool', 50.0, 35.0, 'kg', 35.0, 26.0, 25.7, 3, 3, ?, 'active', ?)`,
      [deadline, now]
    );

    Database.run(
      `INSERT OR IGNORE INTO group_buy_participants (id, group_buy_id, user_id, quantity, subtotal, created_at)
       VALUES 
       ('gbp-1', 'gb-1', 'user-cust-1', 15.0, 390.0, ?),
       ('gbp-2', 'gb-1', 'user-farm-1', 10.0, 260.0, ?),
       ('gbp-3', 'gb-1', 'user-del-1', 10.0, 260.0, ?)`,
      [now, now, now]
    );
  }

  // 8. Scheduled Procurements
  const spCount = Database.get<any>('SELECT COUNT(*) as count FROM scheduled_procurements');
  if (!spCount || spCount.count === 0) {
    const nextDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    Database.run(
      `INSERT OR IGNORE INTO scheduled_procurements (id, user_id, product_id, farmer_id, quantity, unit, frequency, delivery_time_slot, delivery_address, next_delivery_date, status, created_at, updated_at)
       VALUES ('sp-1', 'user-cust-1', 'prod-9', 'farmer-1', 2.0, 'litre', 'daily', 'Morning (06:00 - 08:30 AM)', '14, Rajpur Road, Dehradun', ?, 'active', ?, ?)`,
      [nextDate, now, now]
    );
  }

  // 9. Platform Financial Settings
  const settingsCount = Database.get<any>('SELECT COUNT(*) as count FROM platform_settings');
  if (!settingsCount || settingsCount.count === 0) {
    const defaultSettings = [
      ['commission_rate_pct', '5.0', 'Marketplace platform commission percentage taken on customer order subtotal.'],
      ['delivery_base_fee', '20.0', 'Base delivery charge for first 3 km distance.'],
      ['delivery_per_km_rate', '5.0', 'Additional charge per km past base distance.'],
      ['min_withdrawal_amount', '100.0', 'Minimum settlement balance required for farmer bank withdrawal.'],
      ['settlement_cycle_days', '1', 'Daily T+1 automatic settlement cycle for delivered orders.'],
      ['auto_assign_delivery', 'true', 'Enable automatic closest-partner delivery assignment on order ready.'],
      ['tax_gst_rate_pct', '0.0', 'Fresh farm produce exempt from GST under Indian Agricultural Tax Code.']
    ];

    for (const [key, val, desc] of defaultSettings) {
      Database.run(
        `INSERT OR IGNORE INTO platform_settings (key, value, description, updated_at) VALUES (?, ?, ?, ?)`,
        [key, val, desc, now]
      );
    }
  }

  // 10. Financial Transactions Ledger
  const finCount = Database.get<any>('SELECT COUNT(*) as count FROM financial_transactions');
  if (!finCount || finCount.count === 0) {
    Database.run(
      `INSERT OR IGNORE INTO financial_transactions (id, transaction_ref, type, reference_id, user_id, farmer_id, debit_amount, credit_amount, balance_after, description, gst_rate, gst_amount, status, created_at)
       VALUES 
       ('fin-1', 'TXN-ORD-8491-PAY', 'order_payment', 'order-101', 'user-cust-1', 'farmer-1', 0, 265.0, 265.0, 'Payment received for Order #HD8491 via UPI', 0.0, 0.0, 'completed', ?),
       ('fin-2', 'TXN-ORD-8491-COMM', 'platform_commission', 'order-101', NULL, 'farmer-1', 11.5, 0, 253.5, '5% Platform commission on Order #HD8491 subtotal ₹230', 0.0, 0.0, 'completed', ?),
       ('fin-3', 'TXN-ORD-8491-DEL', 'delivery_charge', 'order-101', NULL, 'farmer-1', 25.0, 0, 228.5, 'Delivery partner fulfillment deduction for Order #HD8491', 0.0, 0.0, 'completed', ?)`,
      [now, now, now]
    );
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase();
}
