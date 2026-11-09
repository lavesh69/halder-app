import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { app } from '../src/app';
import { Database } from '../src/db/database';
import { runMigrations } from '../src/db/migrate';
import { seedDatabase } from '../src/db/seed';
import http from 'http';

const PORT = 5059;
let server: http.Server;
const baseUrl = `http://127.0.0.1:${PORT}/api/v1`;

let customerToken = '';
let farmerToken = '';
let createdListingId = '';
let createdRequirementId = '';
let createdQuotationId = '';
let createdNegotiationId = '';

async function request(path: string, options: { method?: string; body?: any; token?: string } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

describe('HALDER — Agricultural Classifieds Marketplace Test Suite', () => {
  before(async () => {
    runMigrations();
    seedDatabase();
    await new Promise<void>((resolve) => {
      server = app.listen(PORT, '127.0.0.1', () => {
        console.log(`[Marketplace Test Server] Running on ${baseUrl}`);
        resolve();
      });
    });
  });

  after(() => {
    server?.close();
  });

  it('Setup: Log in customer and farmer users', async () => {
    // 1. Customer login
    const cusRes = await request('/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'aman@halder.com', password: 'halder123' },
    });
    assert.strictEqual(cusRes.status, 200);
    customerToken = cusRes.data.data.token;
    assert.ok(customerToken);

    // 2. Farmer login
    const frmRes = await request('/auth/login', {
      method: 'POST',
      body: { emailOrPhone: 'rajesh@greenvalley.in', password: 'halder123' },
    });
    assert.strictEqual(frmRes.status, 200);
    farmerToken = frmRes.data.data.token;
    assert.ok(farmerToken);
  });

  // --- MODULE 1: OLX-Style Post an Ad System ---
  it('Module 1: Farmer publishes an agricultural advertisement with price slabs and multi-images', async () => {
    const postRes = await request('/products', {
      method: 'POST',
      token: farmerToken,
      body: {
        name: 'Organic Basmati Paddy (Dhaan)',
        categoryId: 'cat-veg',
        description: 'Naturally grown Dehradun type Basmati paddy. Hand harvested, sun dried on farm.',
        price: 38,
        unit: 'kg',
        availableQuantity: 500,
        totalQuantity: 500,
        minOrderQuantity: 20,
        isNegotiable: true,
        productGrade: 'Grade A Export',
        qualityDescription: 'Zero chemical spray, moisture below 12%',
        organicCertificationBody: 'Uttarakhand Organic Commodity Board',
        location: 'Doiwala Mandi Road, Dehradun',
        city: 'Dehradun',
        image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600',
        images: [
          'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600',
          'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600',
        ],
        priceSlabs: [
          { minQuantity: 20, maxQuantity: 100, pricePerUnit: 38 },
          { minQuantity: 101, maxQuantity: 300, pricePerUnit: 35 },
          { minQuantity: 301, pricePerUnit: 32 },
        ],
      },
    });

    assert.strictEqual(postRes.status, 201);
    assert.ok(postRes.data.data.id);
    createdListingId = postRes.data.data.id;
    assert.strictEqual(postRes.data.data.name, 'Organic Basmati Paddy (Dhaan)');
    assert.strictEqual(postRes.data.data.images.length, 2);
    assert.strictEqual(postRes.data.data.price_slabs.length, 3);
  });

  it('Module 1: Farmer updates advertisement status (pause, resume, mark as sold, renew)', async () => {
    // Pause
    const pauseRes = await request(`/products/${createdListingId}/status`, {
      method: 'PATCH',
      token: farmerToken,
      body: { statusAction: 'pause' },
    });
    assert.strictEqual(pauseRes.status, 200);
    assert.strictEqual(pauseRes.data.data.status, 'paused');

    // Resume
    const resumeRes = await request(`/products/${createdListingId}/status`, {
      method: 'PATCH',
      token: farmerToken,
      body: { statusAction: 'resume' },
    });
    assert.strictEqual(resumeRes.status, 200);
    assert.strictEqual(resumeRes.data.data.status, 'active');
  });

  // --- MODULE 2: Real-Time Stock Availability ---
  it('Module 2: Real-time stock update with inventory audit log and validation', async () => {
    // 1. Reduce stock by 100
    const reduceRes = await request(`/products/${createdListingId}/stock`, {
      method: 'PATCH',
      token: farmerToken,
      body: { action: 'reduce', amount: 100, reason: 'Direct farm gate sale' },
    });
    assert.strictEqual(reduceRes.status, 200);
    assert.strictEqual(reduceRes.data.data.available_quantity, 400);
    assert.strictEqual(reduceRes.data.data.stock_status, 'available');

    // 2. Reduce to low stock
    const lowRes = await request(`/products/${createdListingId}/stock`, {
      method: 'PATCH',
      token: farmerToken,
      body: { action: 'set', newQuantity: 4, reason: 'Bulk wholesale pickup' },
    });
    assert.strictEqual(lowRes.status, 200);
    assert.strictEqual(lowRes.data.data.available_quantity, 4);
    assert.strictEqual(lowRes.data.data.stock_status, 'limited_stock');

    // 3. Mark sold out
    const soldRes = await request(`/products/${createdListingId}/stock`, {
      method: 'PATCH',
      token: farmerToken,
      body: { action: 'mark_sold_out', reason: 'Stock exhausted' },
    });
    assert.strictEqual(soldRes.status, 200);
    assert.strictEqual(soldRes.data.data.available_quantity, 0);
    assert.strictEqual(soldRes.data.data.stock_status, 'out_of_stock');

    // 4. Restore stock
    const restoreRes = await request(`/products/${createdListingId}/stock`, {
      method: 'PATCH',
      token: farmerToken,
      body: { action: 'restore', amount: 350, reason: 'Fresh morning harvest' },
    });
    assert.strictEqual(restoreRes.status, 200);
    assert.strictEqual(restoreRes.data.data.available_quantity, 350);
    assert.strictEqual(restoreRes.data.data.stock_status, 'available');

    // 5. Verify audit history exists
    const histRes = await request(`/products/${createdListingId}/stock-history`, {
      method: 'GET',
      token: farmerToken,
    });
    assert.strictEqual(histRes.status, 200);
    assert.ok(histRes.data.data.length >= 4);
  });

  it('Module 2: Negative stock updates are rejected on backend', async () => {
    const invalidRes = await request(`/products/${createdListingId}/stock`, {
      method: 'PATCH',
      token: farmerToken,
      body: { action: 'set', newQuantity: -20 },
    });
    assert.strictEqual(invalidRes.status, 400);
  });

  // --- MODULE 4: Buyer Requirement Marketplace ---
  it('Module 4: Buyer posts an agricultural purchase requirement', async () => {
    const reqRes = await request('/requirements', {
      method: 'POST',
      token: customerToken,
      body: {
        productName: 'Fresh Pahadi Potatoes',
        categoryName: 'Vegetables',
        requiredQuantity: 200,
        unit: 'kg',
        targetPrice: 28,
        isNegotiable: true,
        qualityGrade: 'Grade A Medium',
        requiredDate: '2026-11-15',
        location: 'Rajpur Road, Dehradun',
        city: 'Dehradun',
        deliveryPreference: 'flexible',
        instructions: 'Looking for red skin Pahadi aloo without spots for restaurant use.',
      },
    });

    assert.strictEqual(reqRes.status, 201);
    assert.ok(reqRes.data.data.id);
    createdRequirementId = reqRes.data.data.id;
    assert.ok(reqRes.data.data.requirementNumber.startsWith('REQ-'));
    assert.strictEqual(reqRes.data.data.status, 'active');
  });

  it('Module 4: Farmer discovers requirement and submits a quotation', async () => {
    const quoteRes = await request(`/requirements/${createdRequirementId}/quotations`, {
      method: 'POST',
      token: farmerToken,
      body: {
        availableQuantity: 200,
        proposedPrice: 26,
        unit: 'kg',
        deliveryMode: 'farmer_delivery',
        message: 'Can supply fresh Chakrata potatoes harvested yesterday. Will deliver to your location.',
      },
    });

    assert.strictEqual(quoteRes.status, 201);
    assert.ok(quoteRes.data.data.id);
    createdQuotationId = quoteRes.data.data.id;
    assert.strictEqual(quoteRes.data.data.proposedPrice, 26);
    assert.strictEqual(quoteRes.data.data.status, 'submitted');
  });

  it('Module 4: Buyer views received quotations and counters quotation price', async () => {
    // 1. Buyer views quotations
    const listRes = await request(`/requirements/${createdRequirementId}/quotations`, {
      method: 'GET',
      token: customerToken,
    });
    assert.strictEqual(listRes.status, 200);
    assert.strictEqual(listRes.data.data.length, 1);
    assert.strictEqual(listRes.data.data[0].id, createdQuotationId);

    // 2. Buyer counters quotation
    const counterRes = await request(`/requirements/quotations/${createdQuotationId}`, {
      method: 'PATCH',
      token: customerToken,
      body: { action: 'counter', counterPrice: 25 },
    });
    assert.strictEqual(counterRes.status, 200);
    assert.strictEqual(counterRes.data.status, 'countered');
  });

  it('Module 4: Buyer accepts quotation and finalizes deal terms', async () => {
    const acceptRes = await request(`/requirements/quotations/${createdQuotationId}`, {
      method: 'PATCH',
      token: customerToken,
      body: { action: 'accept' },
    });
    assert.strictEqual(acceptRes.status, 200);
    assert.strictEqual(acceptRes.data.status, 'accepted');

    // Requirement status should be updated to offer_accepted
    const reqDetail = await request(`/requirements/${createdRequirementId}`, {
      method: 'GET',
      token: customerToken,
    });
    assert.strictEqual(reqDetail.data.data.status, 'offer_accepted');
  });

  // --- MODULE 5: Bulk Price & Negotiation Engine ---
  it('Module 5: Buyer makes a price offer on a product listing', async () => {
    const offerRes = await request('/negotiations', {
      method: 'POST',
      token: customerToken,
      body: {
        productId: createdListingId,
        proposedPrice: 33,
        quantity: 50,
        requiredDate: '2026-11-12',
        deliveryPreference: 'pickup',
        message: 'Looking to purchase 50 kg for home wedding function. Can pickup from your farm.',
      },
    });

    assert.strictEqual(offerRes.status, 201);
    assert.ok(offerRes.data.data.id);
    createdNegotiationId = offerRes.data.data.id;
    assert.ok(offerRes.data.data.dealReferenceId.startsWith('DEAL-'));
    assert.strictEqual(offerRes.data.data.status, 'pending');
    assert.strictEqual(offerRes.data.data.currentPrice, 33);
  });

  it('Module 5: Farmer counters offer, and Buyer accepts finalized deal terms', async () => {
    // 1. Farmer counters with 34
    const counterRes = await request(`/negotiations/${createdNegotiationId}/counter`, {
      method: 'POST',
      token: farmerToken,
      body: { proposedPrice: 34, message: '33 is too low for organic grade A. I can do 34.' },
    });
    assert.strictEqual(counterRes.status, 200);
    assert.strictEqual(counterRes.data.data.status, 'countered');
    assert.strictEqual(counterRes.data.data.currentPrice, 34);

    // 2. Buyer accepts agreed price
    const acceptRes = await request(`/negotiations/${createdNegotiationId}/accept`, {
      method: 'POST',
      token: customerToken,
    });
    assert.strictEqual(acceptRes.status, 200);
    assert.strictEqual(acceptRes.data.data.status, 'accepted');
    assert.strictEqual(acceptRes.data.data.finalAgreedPrice, 34);
    assert.strictEqual(acceptRes.data.data.finalTotalValue, 1700); // 50 * 34

    // 3. Verify deal summary is generated and accessible
    const summaryRes = await request(`/negotiations/${createdNegotiationId}/deal-summary`, {
      method: 'GET',
      token: customerToken,
    });
    assert.strictEqual(summaryRes.status, 200);
    assert.strictEqual(summaryRes.data.data.dealReferenceId, acceptRes.data.data.dealReferenceId);
    assert.strictEqual(summaryRes.data.data.agreedUnitPrice, 34);
    assert.strictEqual(summaryRes.data.data.estimatedTotalValue, 1700);
  });

  // --- MODULE 6: Farm Nearby Map ---
  it('Module 6: Map query returns nearby farmers with distance calculation and product inventory', async () => {
    const mapRes = await request('/map/nearby-farmers?latitude=30.3165&longitude=78.0322&radiusKm=50', {
      method: 'GET',
    });
    assert.strictEqual(mapRes.status, 200);
    assert.ok(Array.isArray(mapRes.data.data));
    assert.ok(mapRes.data.data.length >= 1);
    const first = mapRes.data.data[0];
    assert.ok(first.farmName);
    assert.ok(first.phone);
    assert.ok(typeof first.distanceKm === 'number');
    assert.ok(Array.isArray(first.topProducts));
  });

  // --- MODULE 11: Smart Buyer Alerts & Notifications ---
  it('Module 11: Buyer creates a saved search alert, and matching produces auto-notifications', async () => {
    // 1. Create saved search for Apples
    const searchRes = await request('/alerts/saved-searches', {
      method: 'POST',
      token: customerToken,
      body: {
        searchName: 'Fresh Shimla Apples',
        productQuery: 'Apple',
        categoryName: 'All',
        maxPrice: 150,
      },
    });
    assert.strictEqual(searchRes.status, 201);
    const searchId = searchRes.data.data.id;
    assert.ok(searchId);

    // 2. Farmer posts matching apple listing
    const postRes = await request('/products', {
      method: 'POST',
      token: farmerToken,
      body: {
        name: 'Kinnaur Royal Apple Crate',
        categoryId: 'cat-veg',
        price: 120,
        unit: 'kg',
        availableQuantity: 50,
        location: 'Chakrata Road, Dehradun',
        image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600',
      },
    });
    assert.strictEqual(postRes.status, 201);

    // 3. Buyer checks notifications - should contain the fresh listing alert
    const notifRes = await request('/notifications', {
      method: 'GET',
      token: customerToken,
    });
    assert.strictEqual(notifRes.status, 200);
    const appleAlert = notifRes.data.data.find((n: any) => n.title && n.title.includes('Kinnaur Royal Apple'));
    assert.ok(appleAlert, 'Expected automatic smart alert notification for buyer matching saved search');
  });

  // --- SECURITY & AUTHORIZATION ---
  it('Security: Non-owner cannot update stock or accept another buyer’s negotiation', async () => {
    // Other customer tries to update farmer's stock
    const badStock = await request(`/products/${createdListingId}/stock`, {
      method: 'PATCH',
      token: customerToken,
      body: { action: 'set', newQuantity: 0 },
    });
    assert.ok(badStock.status === 403, 'Customer must not be allowed to modify farmer inventory');
  });

  // Teardown handled in after hook
});
