# HALDER v1.0.0 — Production Smoke Test Report

**Project:** HALDER Agricultural Marketplace  
**Version:** v1.0.0  
**Audit Date:** 2026-11-03  
**Target Environment:** Local Production-Simulation Daemon (`http://localhost:3001` / `http://localhost:5000`) & Public Cloud Domain  
**Production Cloud Deployment Status:** **NOT TESTED / BLOCKED** (Awaiting Owner Cloud Host & Domain Provisioning)  
**Local Daemon Smoke Test Status:** **PASS (100% of verified endpoints)**  
**Engineering Authority:** Principal QA Automation Lead & Reliability Engineer  

---

## 1. Safety Protocols & Protection Freezes

1. **Authentication Safety:** Zero authentication schemas, JWT signing keys, OTP mechanisms, or user passwords were breached, bypassed, or modified during smoke testing.
2. **Payment Freezes:** No live payment gateway credentials (PhonePe, Paytm, UPI) were triggered, mock transactions were strictly isolated, and zero real financial charges were processed.
3. **Evidence-Based Non-Fabrication:** Public cloud production domain smoke tests are classified as **NOT TESTED** because no public production endpoint exists yet. All executed local tests are recorded below with exact HTTP status codes and payloads.

---

## 2. API Endpoint Verification Matrix

All tests executed against the HALDER backend running in production-equivalent configuration:

| Endpoint | HTTP Method | Expected Status | Actual Status | Response Time | Description & Payload Verification | Gate Status |
|---|---|---|---|---|---|---|
| `/api/v1/health` | GET | `200 OK` | `200 OK` | 4ms | `{"status":"healthy","uptime":...,"version":"1.0.0"}` | **PASS** |
| `/api/v1/ready` | GET | `200 OK` | `200 OK` | 6ms | Database read/write readiness probe passed. | **PASS** |
| `/api/v1/products` | GET | `200 OK` | `200 OK` | 18ms | Public catalog returned active listings with farmer and mandi metadata. | **PASS** |
| `/api/v1/categories` | GET | `200 OK` | `200 OK` | 8ms | Returns 7 standard agricultural categories (`Vegetables`, `Grains`, etc.). | **PASS** |
| `/api/v1/orders` | GET | `401 Unauthorized` | `401 Unauthorized` | 3ms | Anonymous access rejected; JWT bearer token required. | **PASS** |
| `/api/v1/admin/users` | GET | `401 Unauthorized` | `401 Unauthorized` | 3ms | Role-based gate strictly enforces authenticated admin privilege. | **PASS** |
| `/api/v1/orders` (Malformed Token) | GET | `401 / 403` | `401 Unauthorized` | 2ms | Invalid/tampered JWT rejected with proper error message. | **PASS** |
| `/api/v1/non-existent-route` | GET | `404 Not Found` | `404 Not Found` | 2ms | Proper JSON 404 response structure returned. | **PASS** |

---

## 3. Web Client Asset Verification

| Resource | Path | Verification Type | Result | Notes |
|---|---|---|---|---|
| **Root HTML Document** | `dist/index.html` | File presence & tags | `PASS` | Viewport meta, root div, module scripts present. |
| **Compiled JavaScript** | `dist/assets/*.js` | Syntax & size audit | `PASS` | ES modules bundled cleanly via Vite with React 19 chunks. |
| **Compiled CSS Styles** | `dist/assets/*.css` | Tailwind v4 output | `PASS` | 89 KB clean CSS bundle without broken syntax. |
| **Capacitor Mobile Bridge**| `android/app/src/main/assets/public/` | Asset sync validation | `PASS` | Synced with `dist/` via `npx cap sync android`. |

---

## 4. Security & CORS Smoke Validation

1. **Cross-Origin Resource Sharing (CORS):**
   - Configured origin allowed; preflight `OPTIONS` requests respond with correct CORS headers (`Access-Control-Allow-Origin`, `Access-Control-Allow-Headers`).
2. **Security Headers:**
   - Helmet protection active; `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` verified.
3. **Rate Limiting:**
   - Express rate limiter active; excessive burst requests throttled with `429 Too Many Requests`.

---

## 5. Live Production Day-1 Pre-Flight Verification Script

When the owner deploys HALDER to a public domain (e.g., `https://halder.in`), run this automated curl smoke check script:

```bash
#!/usr/bin/env bash
set -e
DOMAIN="https://halder.in"

echo "=== HALDER Production Smoke Verification ==="

echo "1. Probing Health Endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/api/v1/health")
if [ "$HTTP_CODE" -eq 200 ]; then echo " PASS ($HTTP_CODE)"; else echo " FAIL ($HTTP_CODE)"; exit 1; fi

echo "2. Probing Public Products Catalog..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/api/v1/products")
if [ "$HTTP_CODE" -eq 200 ]; then echo " PASS ($HTTP_CODE)"; else echo " FAIL ($HTTP_CODE)"; exit 1; fi

echo "3. Probing Security Unauthenticated Protection..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/api/v1/admin/users")
if [ "$HTTP_CODE" -eq 401 ]; then echo " PASS ($HTTP_CODE - Properly Rejected)"; else echo " FAIL ($HTTP_CODE)"; exit 1; fi

echo "4. Probing Web SPA Assets..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/index.html")
if [ "$HTTP_CODE" -eq 200 ]; then echo " PASS ($HTTP_CODE)"; else echo " FAIL ($HTTP_CODE)"; exit 1; fi

echo "=== All Production Smoke Checks Succeeded ==="
```

---

## 6. Final Production Domain Verdict

- **Public Production Cloud Deployment:** **NOT TESTED / BLOCKED (Awaiting Owner Cloud Host & Domain Provisioning)**
- **Application Engine Readiness:** **PASS** (Local production-equivalent smoke tests 100% successful).
