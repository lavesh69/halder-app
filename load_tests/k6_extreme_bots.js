import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    extreme_bot_swarm: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5s', target: 500 },    // Ramp up to 500 VUs
        { duration: '10s', target: 1200 },  // Ramp to 1,200 bots
        { duration: '20s', target: 1200 },  // Hold 1,200 concurrent bots
        { duration: '5s', target: 0 },      // Graceful ramp down
      ],
      gracefulRampDown: '5s',
    },
  },
  noConnectionReuse: false,     // Keep connections alive to prevent OS socket exhaustion
  discardResponseBodies: true,  // Discard bodies to preserve client heap
  thresholds: {
    http_req_failed: ['rate<0.01'],    // Under 1% error rate
    http_req_duration: ['p(95)<500'],  // 95% requests under 500ms
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://127.0.0.1:5055';

export default function () {
  const botId = __VU * 100000 + __ITER;
  const ipOctet3 = (__VU >> 8) & 255;
  const ipOctet4 = __VU & 255;
  const headers = {
    'X-Forwarded-For': `10.244.${ipOctet3}.${ipOctet4}`,
    'User-Agent': `HALDER-ExtremeBot/${botId}`,
    'Accept': 'application/json',
  };

  // 1. Health Ping
  const pingRes = http.get(`${BASE_URL}/health`, { headers });
  check(pingRes, { 'health ok': (r) => r.status === 200 });

  // 2. Fetch Categories
  const catRes = http.get(`${BASE_URL}/api/v1/categories`, { headers });
  check(catRes, { 'categories ok': (r) => r.status === 200 });

  // 3. Browse Paginated Products
  const prodRes = http.get(`${BASE_URL}/api/v1/products?limit=20`, { headers });
  check(prodRes, { 'products ok': (r) => r.status === 200 });

  // 4. Farmer Profiles
  const farmerRes = http.get(`${BASE_URL}/api/v1/farmers`, { headers });
  check(farmerRes, { 'farmers ok': (r) => r.status === 200 });

  sleep(Math.random() * 0.2 + 0.1);
}
