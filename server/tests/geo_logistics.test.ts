import { app } from '../src/app';
import { Database } from '../src/db/database';
import { CryptoUtil } from '../src/utils/crypto';
import { calculateHaversineDistanceKm } from '../src/services/productService';

const PORT = 5097;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

let server: any;

async function request(endpoint: string, options: {
  method?: string;
  token?: string;
  body?: any;
} = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const status = res.status;
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return { status, json };
}

async function runGeoLogisticsTests() {
  console.log('\n=============================================================');
  console.log('🌍 HALDER 300 KM GEO-RADIUS & KISAN DIRECT DELIVERY TEST');
  console.log('=============================================================\n');

  server = app.listen(PORT);

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, extra?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${extra ? `(${extra})` : ''}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // 1. Haversine Distance Formula Precision
    // -------------------------------------------------------------
    console.log('--- 1. Mathematical Haversine Distance Precision ---');
    // Dehradun Clock Tower to Rishikesh Tapovan
    const distDoonToRishikesh = calculateHaversineDistanceKm(30.3165, 78.0322, 30.0869, 78.2676);
    assert(
      'Haversine distance Dehradun -> Rishikesh is ~34 km (between 30 km and 40 km)',
      distDoonToRishikesh >= 30 && distDoonToRishikesh <= 40,
      `Calculated: ${distDoonToRishikesh} km`
    );

    // Dehradun to Delhi NCR Mandi Hub (~200-240 km)
    const distDoonToDelhi = calculateHaversineDistanceKm(30.3165, 78.0322, 28.6139, 77.2090);
    assert(
      'Haversine distance Dehradun -> Delhi is ~205 km (between 190 km and 230 km)',
      distDoonToDelhi >= 190 && distDoonToDelhi <= 230,
      `Calculated: ${distDoonToDelhi} km`
    );

    // -------------------------------------------------------------
    // 2. Seed Multi-Distance Products (Near, Mid, Regional 300 km)
    // -------------------------------------------------------------
    console.log('\n--- 2. Database Geo-Radius Filter Validation ---');
    const now = new Date().toISOString();
    const localProdId = `prod-geo-local-${Date.now()}`;
    const regionalProdId = `prod-geo-regional-${Date.now()}`;

    // Product 1: Hyperlocal Farm (5 km away, Raipur, Dehradun)
    Database.run(
      `INSERT INTO products (
        id, farmer_id, category_id, name, slug, description, price, unit,
        available_quantity, is_organic, available_today, harvest_date,
        freshness_tag, location, city, latitude, longitude, image,
        status, moderation_status, created_at, updated_at
      ) VALUES (?, 'farmer-1', 'cat-veg', 'Hyperlocal Spinach (पालक)', 'hyperlocal-spinach', '5 km away', 30, 'bunch', 50, 1, 1, 'Today', 'Morning Harvest', 'Raipur', 'Dehradun', 30.3300, 78.0800, 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=200', 'active', 'approved', ?, ?)`,
      [localProdId, now, now]
    );

    // Product 2: Regional Mandi Farm (180 km away, Delhi Border)
    Database.run(
      `INSERT INTO products (
        id, farmer_id, category_id, name, slug, description, price, unit,
        available_quantity, is_organic, available_today, harvest_date,
        freshness_tag, location, city, latitude, longitude, image,
        status, moderation_status, created_at, updated_at
      ) VALUES (?, 'farmer-1', 'cat-veg', 'Regional Kinnow (किन्नू)', 'regional-kinnow', '180 km away', 60, 'kg', 100, 1, 1, 'Today', 'Mandi Crate', 'Agri Hub', 'Delhi NCR', 28.9000, 77.3000, 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200', 'active', 'approved', ?, ?)`,
      [regionalProdId, now, now]
    );

    // Test with radius = 15 km from Dehradun (30.3165, 78.0322)
    const localRes = await request('/products?latitude=30.3165&longitude=78.0322&radiusKm=15');
    assert('Query with radiusKm=15 returns 200 OK', localRes.status === 200);
    const localProducts = localRes.json.data.products;
    const hasLocal = localProducts.some((p: any) => p.id === localProdId);
    const hasRegionalInLocal = localProducts.some((p: any) => p.id === regionalProdId);
    assert('15 km radius INCLUDES hyperlocal farm (5 km)', hasLocal);
    assert('15 km radius EXCLUDES regional farm (180 km)', !hasRegionalInLocal);

    // Test with radius = 300 km from Dehradun (30.3165, 78.0322)
    const regionalRes = await request('/products?latitude=30.3165&longitude=78.0322&radiusKm=300');
    assert('Query with radiusKm=300 returns 200 OK', regionalRes.status === 200);
    const regionalProducts = regionalRes.json.data.products;
    const hasRegionalIn300 = regionalProducts.some((p: any) => p.id === regionalProdId);
    assert('300 km radius INCLUDES regional farm (~180 km)', hasRegionalIn300);

    // -------------------------------------------------------------
    // 3. 100% Kisan Direct Delivery Verification
    // -------------------------------------------------------------
    console.log('\n--- 3. 100% Kisan Direct Delivery Verification ---');
    const token = CryptoUtil.generateToken({ userId: 'user-cust-1', role: 'customer', email: 'aman@halder.com' });

    const orderRes = await request('/orders', {
      method: 'POST',
      token,
      body: {
        items: [{ productId: localProdId, quantity: 2 }],
        deliveryAddress: 'Rajpur Road, Dehradun',
        customerPhone: '+91 9876543210',
        paymentMethod: 'cod',
        farmerTip: 15,
        deliveryMode: 'farmer_direct',
        deliveryDistanceKm: 5.2,
      },
    });

    assert('Placing order with Kisan Direct Delivery returns 201 Created', orderRes.status === 201);
    const createdOrder = Array.isArray(orderRes.json.data) ? orderRes.json.data[0] : orderRes.json.data;
    assert('Created order delivery_mode is strictly farmer_direct', createdOrder.delivery_mode === 'farmer_direct');
    assert('Tracking courier is Farmer Self-Fleet / Kisan Vahan', createdOrder.tracking_courier.includes('Farmer Self-Fleet'));
    assert('Direct tracking code starts with HLD-DIR-', createdOrder.tracking_number.startsWith('HLD-DIR-'));

    // Clean up temporary test products & order
    Database.run('DELETE FROM order_items WHERE order_id = ?', [createdOrder.id]);
    Database.run('DELETE FROM orders WHERE id = ?', [createdOrder.id]);
    Database.run('DELETE FROM products WHERE id IN (?, ?)', [localProdId, regionalProdId]);

  } catch (err) {
    console.error('Geo Logistics Test Error:', err);
    failed++;
  } finally {
    console.log('\n=============================================================');
    console.log(`🌍 GEO-LOGISTICS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('=============================================================\n');
    try {
      server.closeAllConnections?.();
      server.close();
    } catch {}
  }
}

runGeoLogisticsTests();
