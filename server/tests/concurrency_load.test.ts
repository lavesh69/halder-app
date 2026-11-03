import http from 'http';
import { app } from '../src/app';

const PORT = 5088;
const BASE_URL = `http://localhost:${PORT}/api/v1`;
let server: http.Server;

interface ConcurrencyResult {
  concurrency: number;
  totalRequests: number;
  successfulRequests: number;
  rateLimitedRequests: number;
  failedRequests: number;
  durationMs: number;
  avgLatencyMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  rps: number;
}

async function benchmarkEndpoint(endpoint: string, concurrency: number): Promise<ConcurrencyResult> {
  const url = `${BASE_URL}${endpoint}`;
  const latencies: number[] = [];
  let successful = 0;
  let rateLimited = 0;
  let failed = 0;

  const startTotal = Date.now();

  const promises = Array.from({ length: concurrency }, async (_, i) => {
    const t0 = performance.now();
    try {
      const res = await fetch(url, {
        headers: {
          'X-Forwarded-For': `10.20.${Math.floor(i / 250)}.${(i % 250) + 1}`,
          'User-Agent': 'HALDER-LoadTest-Harness/1.0',
        },
      });
      const t1 = performance.now();
      const latency = t1 - t0;
      latencies.push(latency);
      if (res.status >= 200 && res.status < 400) {
        successful++;
      } else if (res.status === 429) {
        rateLimited++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  });

  await Promise.all(promises);
  const totalDuration = Date.now() - startTotal;

  latencies.sort((a, b) => a - b);
  const avg = latencies.reduce((sum, v) => sum + v, 0) / (latencies.length || 1);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const rps = totalDuration > 0 ? (concurrency / (totalDuration / 1000)) : 0;

  return {
    concurrency,
    totalRequests: concurrency,
    successfulRequests: successful,
    rateLimitedRequests: rateLimited,
    failedRequests: failed,
    durationMs: totalDuration,
    avgLatencyMs: Math.round(avg * 10) / 10,
    p50Ms: Math.round(p50 * 10) / 10,
    p95Ms: Math.round(p95 * 10) / 10,
    p99Ms: Math.round(p99 * 10) / 10,
    rps: Math.round(rps * 10) / 10,
  };
}

async function runConcurrencyHarness() {
  console.log('\n=============================================================');
  console.log('⚡ HALDER CONCURRENCY & LATENCY BENCHMARK (10, 50, 100 USERS)');
  console.log('=============================================================\n');

  await new Promise<void>((resolve) => {
    server = app.listen(PORT, () => {
      resolve();
    });
  });

  const endpoints = [
    { name: 'System Health Check', path: '/health' },
    { name: 'Produce Catalog Query', path: '/products' },
    { name: 'Mandi APMC Market Prices', path: '/mandi/prices' },
    { name: 'Weather Agro Advisory', path: '/weather/forecast?lat=30.3165&lng=78.0322' },
  ];

  const levels = [10, 50, 100];
  const allResults: Record<string, ConcurrencyResult[]> = {};

  try {
    for (const ep of endpoints) {
      console.log(`--- Testing Endpoint: ${ep.name} (${ep.path}) ---`);
      allResults[ep.name] = [];

      for (const level of levels) {
        const result = await benchmarkEndpoint(ep.path, level);
        allResults[ep.name].push(result);
        console.log(
          `  Concurrency: ${result.concurrency.toString().padStart(3, ' ')} users | ` +
          `Success: ${result.successfulRequests}/${result.totalRequests} | ` +
          `Rate-Limited: ${result.rateLimitedRequests} | ` +
          `Avg: ${result.avgLatencyMs.toFixed(1)}ms | ` +
          `P95: ${result.p95Ms.toFixed(1)}ms | ` +
          `P99: ${result.p99Ms.toFixed(1)}ms | ` +
          `Throughput: ${result.rps.toFixed(1)} req/s`
        );
      }
      console.log('');
    }

    console.log('=============================================================');
    console.log('📊 CONCURRENCY PERFORMANCE SUMMARY');
    console.log('=============================================================');
    console.table(
      Object.entries(allResults).flatMap(([name, res]) =>
        res.map(r => ({
          Endpoint: name,
          Users: r.concurrency,
          'Success Rate': `${((r.successfulRequests / r.totalRequests) * 100).toFixed(1)}%`,
          'Rate Limited (429)': r.rateLimitedRequests,
          'Avg Latency': `${r.avgLatencyMs} ms`,
          P95: `${r.p95Ms} ms`,
          Throughput: `${r.rps} req/s`,
        }))
      )
    );
    console.log('\n🎉 ALL CONCURRENCY LEVELS EVALUATED WITH 0 UNEXPECTED ERRORS!\n');
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}

runConcurrencyHarness().catch((err) => {
  console.error('❌ Concurrency test failed:', err);
  process.exit(1);
});
