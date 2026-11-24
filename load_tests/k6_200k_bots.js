import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const botRequestsCount = new Counter('total_bot_requests_200k');
const latencyTrend = new Trend('bot_request_latency_ms');

export const options = {
  scenarios: {
    swarm_200k: {
      executor: 'shared-iterations',
      vus: 250,              // 250 parallel high-speed bot workers
      iterations: 200000,    // Exactly 200,000 total simulated bot interactions
      maxDuration: '3m',     // 3 minutes execution window
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],  // Error rate must stay below 1%
    http_req_duration: ['p(95)<250'], // 95% of 200k requests must be under 250ms
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://127.0.0.1:5055/api/v1';

export default function () {
  // Simulate unique IP for each bot iteration across 200,000 bot pool
  const botId = __ITER + 1;
  const ipPart1 = 10 + Math.floor(botId / 65536);
  const ipPart2 = Math.floor((botId % 65536) / 256);
  const ipPart3 = (botId % 256);
  const clientIp = `10.${ipPart1}.${ipPart2}.${ipPart3}`;

  const headers = {
    'Content-Type': 'application/json',
    'X-Forwarded-For': clientIp,
    'User-Agent': `HALDER-BotSwarm-200K/${botId}`,
  };

  // Rotate between high-traffic endpoints
  const endpointSelector = botId % 3;
  let res;

  if (endpointSelector === 0) {
    res = http.get(`${BASE_URL}/health`, { headers });
  } else if (endpointSelector === 1) {
    res = http.get(`${BASE_URL}/categories`, { headers });
  } else {
    res = http.get(`${BASE_URL}/products?limit=10&page=1`, { headers });
  }

  botRequestsCount.add(1);
  latencyTrend.add(res.timings.duration);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
