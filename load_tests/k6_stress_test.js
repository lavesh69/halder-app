import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

// Custom Metrics for SLA validation
const catalogLatency = new Trend('catalog_latency_ms');
const detailLatency = new Trend('detail_latency_ms');
const authLatency = new Trend('auth_latency_ms');
const rateLimitedCount = new Counter('rate_limited_requests_429');
const successfulRequests = new Counter('successful_requests_2xx');

export const options = {
  scenarios: {
    // Stage 1: Warm-up & baseline smoke test (5 VUs for 10s)
    smoke_test: {
      executor: 'constant-vus',
      vus: 5,
      duration: '10s',
      startTime: '0s',
    },
    // Stage 2: Heavy multi-user load test (Ramp up to 100 concurrent VUs)
    scale_load: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '10s', target: 50 },  // Ramp to 50 users
        { duration: '20s', target: 100 }, // Sustained peak 100 users
        { duration: '10s', target: 0 },   // Clean ramp down
      ],
      startTime: '10s',
    },
  },
  thresholds: {
    // Target SLA: 95% of requests < 350ms, 99% < 750ms
    http_req_duration: ['p(95)<350', 'p(99)<750'],
    http_req_failed: ['rate<0.02'], // Error rate under 2%
    'http_req_duration{type:catalog}': ['p(95)<200'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://127.0.0.1:5055/api/v1';

// Setup hook: Dynamic catalog discovery before running load
export function setup() {
  const headers = { 'Content-Type': 'application/json' };

  // Fetch real categories
  const catRes = http.get(`${BASE_URL}/categories`, { headers });
  let categories = [];
  try {
    categories = catRes.json('data') || [];
  } catch (_) {}

  // Fetch real product IDs and farmer IDs from live database
  const prodRes = http.get(`${BASE_URL}/products?limit=25`, { headers });
  let products = [];
  try {
    products = prodRes.json('data.products') || [];
  } catch (_) {}

  const productIds = products.map((p) => p.id).filter(Boolean);
  const farmerIds = products.map((p) => p.farmer_id).filter(Boolean);

  return {
    productIds: productIds.length > 0 ? productIds : ['prod-a46733e7-fdd3-46e4-bef8-3ab11d7f87b9'],
    farmerIds: farmerIds.length > 0 ? farmerIds : ['farmer-16844ee2-e1eb-4196-ad03-b694b9702bba'],
    categories: categories.map((c) => c.id).filter(Boolean),
  };
}

export default function (data) {
  // Simulate unique distributed client IP per VU
  const clientIp = `192.168.${Math.floor(__VU / 200)}.${(__VU % 200) + 1}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Forwarded-For': clientIp,
    'User-Agent': 'k6-HALDER-VirtualUser/2.4',
  };

  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/health`, { headers, tags: { type: 'health' } });
  check(healthRes, {
    'health returns 200': (r) => r.status === 200,
  });
  if (healthRes.status === 200) successfulRequests.add(1);

  // 2. Browse Categories
  const catRes = http.get(`${BASE_URL}/categories`, { headers, tags: { type: 'categories' } });
  check(catRes, {
    'categories returns 200': (r) => r.status === 200,
  });
  if (catRes.status === 200) successfulRequests.add(1);

  // 3. Browse Marketplace Catalog Feed (Heavy Read Endpoint)
  const catParam = data.categories.length > 0 ? data.categories[__ITER % data.categories.length] : '';
  const url = `${BASE_URL}/products?limit=15&page=1${catParam ? `&category=${catParam}` : ''}`;
  
  const tCat0 = new Date().getTime();
  const prodRes = http.get(url, { headers, tags: { type: 'catalog' } });
  catalogLatency.add(new Date().getTime() - tCat0);

  if (prodRes.status === 429) {
    rateLimitedCount.add(1);
  } else if (prodRes.status === 200) {
    successfulRequests.add(1);
  }
  check(prodRes, {
    'catalog feed 200 OK': (r) => r.status === 200,
  });

  // 4. View Specific Product Details
  const prodId = data.productIds[__ITER % data.productIds.length];
  const tDet0 = new Date().getTime();
  const detailRes = http.get(`${BASE_URL}/products/${prodId}`, { headers, tags: { type: 'product_detail' } });
  detailLatency.add(new Date().getTime() - tDet0);

  check(detailRes, {
    'product detail 200 OK': (r) => r.status === 200,
  });
  if (detailRes.status === 200) successfulRequests.add(1);

  // 5. View Verified Farmer Profile
  const farmerId = data.farmerIds[__ITER % data.farmerIds.length];
  const farmerRes = http.get(`${BASE_URL}/farmers/${farmerId}`, { headers, tags: { type: 'farmer_profile' } });
  check(farmerRes, {
    'farmer profile 200 OK': (r) => r.status === 200,
  });
  if (farmerRes.status === 200) successfulRequests.add(1);

  // 6. Realistic User Authentication Flow (1 in every 20 iterations to mirror ~5% login traffic)
  if (__ITER % 20 === 0) {
    const tAuth0 = new Date().getTime();
    const loginRes = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ emailOrPhone: 'admin@halder.com', password: 'HalderAdmin@2026!' }),
      { headers, tags: { type: 'auth' } }
    );
    authLatency.add(new Date().getTime() - tAuth0);

    if (loginRes.status === 429) {
      rateLimitedCount.add(1);
    } else if (loginRes.status === 200) {
      successfulRequests.add(1);
    }
    check(loginRes, {
      'login returns 200': (r) => r.status === 200,
    });
  }

  // Human think time (100ms - 250ms)
  sleep(0.15);
}
