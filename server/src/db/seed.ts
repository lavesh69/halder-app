import { runMigrations } from './migrate';
import { Database } from './database';
import bcrypt from 'bcryptjs';

export async function seedDatabase() {
  runMigrations();

  const existingUsers = Database.get<any>('SELECT COUNT(*) as count FROM users');
  if (existingUsers && existingUsers.count > 0) {
    console.log('[Seed] Database already seeded. Skipping.');
    return;
  }

  console.log('[Seed] Seeding production database with initial realistic mandi data...');
  const passwordHash = await bcrypt.hash('halder123', 10);
  const now = new Date().toISOString();

  Database.transaction(() => {
    Database.run(
      `INSERT INTO users (id, name, email, phone, password_hash, role, profile_image, status, created_at, updated_at) VALUES
       ('user-cust-1', 'Aman Sharma', 'aman@halder.com', '+91 98765 43210', ?, 'customer', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80', 'active', ?, ?),
       ('user-farm-1', 'Rajesh Kumar', 'rajesh@greenvalley.in', '+91 98450 12345', ?, 'farmer', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80', 'active', ?, ?),
       ('user-farm-2', 'Amit Singh', 'amit@sunrisefarms.in', '+91 98110 54321', ?, 'farmer', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80', 'active', ?, ?),
       ('user-farm-3', 'Pooja Devi', 'pooja@himalayanorganics.in', '+91 98330 98765', ?, 'farmer', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80', 'active', ?, ?),
       ('user-admin-1', 'Vikram Patel', 'admin@halder.com', '+91 99999 00001', ?, 'admin', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80', 'active', ?, ?)`,
      [passwordHash, now, now, passwordHash, now, now, passwordHash, now, now, passwordHash, now, now, passwordHash, now, now]
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
        status, moderation_status, created_at, updated_at
      ) VALUES
       ('prod-1', 'farmer-1', 'cat-veg', 'Fresh Farm Tomatoes (देसी टमाटर)', 'fresh-farm-tomatoes', 'Vine-ripened juicy red tomatoes from Doon Valley farm.', 40.0, 'kg', 45.0, 1, 1, 'Today 6:00 AM', 'Harvested Today', 'Doon Valley, Dehradun', 'Dehradun', 30.3256, 78.0437, 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=600&auto=format&fit=crop&q=80', 'active', 'approved', ?, ?),
       ('prod-2', 'farmer-2', 'cat-veg', 'Pahari Potatoes (पहाड़ी आलू)', 'pahari-potatoes', 'Mountain-grown red skin potatoes, firm and sweet in taste.', 35.0, 'kg', 80.0, 0, 1, 'Yesterday', 'Farm Fresh', 'Vikas Nagar, Dehradun', 'Dehradun', 30.4358, 77.8105, 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80', 'active', 'approved', ?, ?),
       ('prod-3', 'farmer-2', 'cat-veg', 'Nashik Red Onions (लाल प्याज)', 'nashik-red-onions', 'Pungent, dry-skin farm onions with rich flavor.', 45.0, 'kg', 60.0, 0, 1, '2 days ago', 'Best Quality', 'Vikas Nagar, Dehradun', 'Dehradun', 30.4358, 77.8105, 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=80', 'active', 'approved', ?, ?),
       ('prod-4', 'farmer-3', 'cat-leafy', 'Organic Mountain Spinach (देसी पालक)', 'organic-mountain-spinach', 'Tender dark-green chemical-free spinach leaves washed with clean stream water.', 25.0, 'bunch', 30.0, 1, 1, 'Today 5:30 AM', 'Morning Plucked', 'Mussoorie Foothills', 'Dehradun', 30.3872, 78.0772, 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80', 'active', 'approved', ?, ?),
       ('prod-5', 'farmer-2', 'cat-veg', 'Sweet Hill Carrots (गाजर)', 'sweet-hill-carrots', 'Sweet, crunch red carrots directly harvested from sandy loam soil.', 50.0, 'kg', 40.0, 1, 1, 'Today 6:30 AM', 'Sweet & Crisp', 'Vikas Nagar, Dehradun', 'Dehradun', 30.4358, 77.8105, 'https://images.unsplash.com/photo-1598170845058-32b9d6a5c317?w=600&auto=format&fit=crop&q=80', 'active', 'approved', ?, ?),
       ('prod-6', 'farmer-3', 'cat-veg', 'Farm Cauliflower (फूलगोभी)', 'farm-cauliflower', 'Pure white, tight-curd cauliflower with outer protective leaves.', 40.0, 'piece', 25.0, 1, 1, 'Today 6:00 AM', 'Chemical-Free', 'Mussoorie Foothills', 'Dehradun', 30.3872, 78.0772, 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=600&auto=format&fit=crop&q=80', 'active', 'approved', ?, ?),
       ('prod-7', 'farmer-2', 'cat-veg', 'Sweet Green Peas (मटर)', 'sweet-green-peas', 'Tender and sweet mountain green pea pods full of fresh seeds.', 80.0, 'kg', 35.0, 1, 1, 'Today 5:45 AM', 'Sugar Sweet', 'Vikas Nagar, Dehradun', 'Dehradun', 30.4358, 77.8105, 'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=600&auto=format&fit=crop&q=80', 'active', 'approved', ?, ?),
       ('prod-8', 'farmer-1', 'cat-veg', 'Crisp Green Cucumber (खीरा)', 'crisp-green-cucumber', 'Hydrating, crunchy organic cucumbers grown in polyhouse beds.', 35.0, 'kg', 50.0, 1, 1, 'Today 6:15 AM', 'Polyhouse Fresh', 'Doon Valley, Dehradun', 'Dehradun', 30.3256, 78.0437, 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=600&auto=format&fit=crop&q=80', 'active', 'approved', ?, ?),
       ('prod-9', 'farmer-1', 'cat-dairy', 'Desi Badri Cow Raw Milk (गाय का दूध)', 'desi-badri-cow-raw-milk', 'Pure, unadulterated raw A2 milk from grass-fed Himalayan Badri cows.', 75.0, 'litre', 25.0, 1, 1, 'Today 5:00 AM', 'Morning Milked', 'Doon Valley, Dehradun', 'Dehradun', 30.3256, 78.0437, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80', 'active', 'approved', ?, ?),
       ('prod-10', 'farmer-3', 'cat-organic', 'Wild Himalayan Forest Honey (जंगली शहद)', 'wild-himalayan-forest-honey', 'Raw, unprocessed multi-floral honey harvested from oak forests.', 350.0, 'packet', 18.0, 1, 1, 'Seasonal', '100% Pure Raw', 'Mussoorie Foothills', 'Dehradun', 30.3872, 78.0772, 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80', 'active', 'approved', ?, ?)`,
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
        created_at, updated_at
      ) VALUES
       ('order-101', '#HD8491', 'user-cust-1', 'farmer-1', 265.0, 230.0, 25.0, 10.0, '14, Rajpur Road, Dehradun', 'Dehradun', '248001', '+91 98765 43210', 'Aman Sharma', 'Rajesh Kumar', 'Green Valley Farm', '+91 98450 12345', 'upi', 'paid', 'preparing', '35-45 mins', ?, ?),
       ('order-102', '#HD7823', 'user-cust-1', 'farmer-3', 190.0, 155.0, 25.0, 10.0, '14, Rajpur Road, Dehradun', 'Dehradun', '248001', '+91 98765 43210', 'Aman Sharma', 'Pooja Devi', 'Himalayan Organics', '+91 98330 98765', 'cod', 'pending', 'delivered', 'Delivered', ?, ?)`,
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
       ('rev-1', 'order-102', 'user-cust-1', 'farmer-3', 5.0, 'The mountain spinach was super fresh and the cauliflower tasted sweet! Delivered right on time.', ?)`
      , [now]
    );

    Database.run(
      `INSERT INTO notifications (id, user_id, recipient_role, type, title, message, is_read, created_at) VALUES
       ('notif-1', 'user-cust-1', 'customer', 'order', 'Order Placed 🧺', 'Your order #HD8491 from Green Valley Farm has been placed.', 1, ?),
       ('notif-2', 'user-farm-1', 'farmer', 'order', 'New Order Received! 🔔', 'New order #HD8491 received from Aman Sharma for ₹265.', 0, ?),
       ('notif-3', 'user-farm-1', 'farmer', 'verification', 'Farmer Verified! 🛡️', 'Your farm verification credentials have been approved by Admin.', 1, ?)`
      , [now, now, now]
    );
  });

  console.log('[Seed] Production database successfully seeded!');
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase();
}
