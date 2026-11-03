# HALDER (हलधर) — Direct Farm-to-Consumer Marketplace & Logistics Ecosystem

[![HALDER CI/CD Pipeline](https://github.com/lavesh69/halder-app/actions/workflows/ci.yml/badge.svg)](https://github.com/lavesh69/halder-app/actions/workflows/ci.yml)
[![Build Android APK & AAB](https://github.com/lavesh69/halder-app/actions/workflows/build-apk.yml/badge.svg)](https://github.com/lavesh69/halder-app/actions/workflows/build-apk.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/Node.js-%E2%89%A522.5.0-brightgreen.svg)](https://nodejs.org/)

**HALDER** (हलधर) is an enterprise-grade, high-performance agricultural marketplace designed to connect smallholder and commercial farmers directly with retail consumers, bulk buyers, restaurants, and institutions across India. By eliminating multi-tier middlemen, HALDER maximizes farmer profit margins while delivering morning-fresh farm produce to end consumers within a 300-kilometer regional radius.

---

## 🌾 Core System Modules

### 1. Customer & Retail Buyer Experience
- **Hyperlocal Geolocation Discovery:** 300 km geo-radius calculation using mathematical Haversine spherical projection.
- **Freshness & Harvest Transparency:** Morning harvest tags, organic certifications, and farm-to-table transparency.
- **Smart Cart & Multi-Farmer Orders:** Grouped checkout handling direct delivery, cold chain logistics, or self-pickup.
- **Secure Deliveries:** OTP-verified delivery handovers with live courier status updates.
- **Real-Time Farmer Chat:** WebSockets bidirectional messaging with native 5-language translation (English, Hindi, Punjabi, Bengali, Marathi).

### 2. Farmer Enterprise & Business Ecosystem
- **Farm Profile & Land Registry:** Farm details, soil types, irrigation infrastructure, certifications, and harvest calendars.
- **Product & Inventory Management:** Batch pricing, unit conversions (kg, bunch, crate, litre), seasonal availability toggles, and multi-image uploads.
- **Mandi Intelligence & Price Comparison:** Live APMC mandi price feeds, historical benchmark tracking, modal price indicators, and CSV report export.
- **Financial Ledger & Payouts:** Real-time earnings aggregation, gross sales derivation, automatic commission calculations (10%), and verifiable payout request ledgers.

### 3. Logistics & Kisan Delivery Fleet
- **Fleet Onboarding & Verification:** Vehicle registration (two-wheelers, tempo, insulated reefer vans, tractor trolleys), driver license audits, and active service zones.
- **Driver Telemetry & Tracking:** Live GPS coordinates updates (`-90 <= lat <= 90`, `-180 <= lng <= 180`) with user ownership verification (`user_id` / role verification).
- **Fleet Analytics Engine:** Real database performance metrics (average transit durations, on-time delivery rates, and benchmark telemetry indicators).
- **Kisan Direct Self-Fleet Delivery:** Zero-commission direct-to-consumer delivery managed directly by the producer farmer.

### 4. B2B Wholesale & Contract Farming
- **Bulk Inquiry & RFQ System:** Minimum order quantities (MOQ), tiered wholesale volume pricing, and automated quotes.
- **Advance Contract Farming:** Forward purchase agreements with milestone-based delivery schedules.

### 5. Admin Governance & Security Operations
- **Role-Based Access Control (RBAC):** Strict isolation across `customer`, `farmer`, `delivery_partner`, and `admin` roles.
- **Zero-Trust IDOR Protection:** Ownership validation preventing unauthorized access across orders, products, and telemetry.
- **Farmer KYC Verification:** Aadhaar, PAN, land ownership document checks, and status audits.
- **Audit Logs & Telemetry Integrity:** Immutable operational audit logs for administrative interventions.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Web** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Canvas Confetti |
| **Mobile Application** | Capacitor 8 Android SDK, Native Android Runtime, Splash Screen API |
| **Backend API** | Node.js (>=22.5.0), Express.js, TypeScript (`tsx`) |
| **Database Engine** | Embedded SQLite 3 (`node:sqlite` DatabaseSync) with Write-Ahead Logging (WAL) |
| **Real-Time Engine** | Native WebSockets (`ws`) with heartbeat ping-pong monitoring |
| **Internationalization** | Multi-locale dictionary engine (English, हिन्दी, ਪੰਜਾਬੀ, বাংলা, मराठी) |
| **Testing & CI** | Oxlint, TypeScript compiler (`tsc`), GitHub Actions Linux Runners |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: Version **22.5.0** or higher (required for native `node:sqlite` DatabaseSync support).
- **npm**: Version **10.x** or higher.
- **Java Development Kit (JDK)**: Version **17** (for local Android builds).
- **Android SDK & Command-Line Tools**: API level 34 (`platforms;android-34`, `build-tools;34.0.0`).

### Installation & Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/lavesh69/halder-app.git
   cd halder-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Initialize and seed the database:**
   ```bash
   npm run server:seed
   ```

4. **Start the Express backend server:**
   ```bash
   npm run server
   ```
   *The backend will boot on `http://localhost:5000` with SQLite WAL mode enabled.*

5. **Start the Vite frontend development server:**
   ```bash
   npm run dev
   ```
   *The frontend application will be accessible at `http://localhost:5173`.*

---

## 🧪 Comprehensive Verification & Test Suite

The HALDER backend features an automated test harness covering security, identity, earnings, logistics, and end-to-end user journeys:

```bash
# 1. Run Core Backend Suite (63 automated scenarios)
npm run server:test

# 2. Run Zero-Trust Security Matrix & RBAC Tests
npm run server:security

# 3. Run 300 km Geo-Logistics & Kisan Direct Delivery Suite
npm run server:geo

# 4. Run Farmer Real Earnings & Payout Ledger Suite
npm run server:earnings

# 5. Run Profile, Address Book & Concurrency Tests
npm run server:profile

# 6. Run KYC Review & Push Notification Suite
npm run server:kyc-push

# 7. Run WebSocket Real-Time Chat & 5-Language i18n Suite
npm run server:chat-i18n

# 8. Run Adversarial Chat Injection & Stress Tests
npm run server:chat-adversarial

# 9. Run Ecosystem Modules Suite
npx tsx server/tests/ecosystem.test.ts

# 10. Run End-to-End Consumer Lifecycle Journey
npm run server:e2e

# 11. Run Production Keystore & Security Configuration Audit
npm run server:production
```

---

## 📱 Android Build & Distribution

HALDER is fully compiled for Android devices via Capacitor:

```bash
# 1. Build production web bundle and sync native Android project
npm run build:android

# 2. Build Android Debug APK
npm run build:apk

# 3. Build Signed Production Release AAB for Google Play Store
npm run build:release-aab
```

Artifacts are generated at:
- **Debug APK:** `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release AAB:** `android/app/build/outputs/bundle/release/app-release.aab`

---

## 🔐 Environment Variables & Production Credentials

Create a `.env` file in the root directory for production deployments:

| Variable | Description | Default / Example |
|---|---|---|
| `NODE_ENV` | Runtime environment mode | `production` / `development` |
| `PORT` | Backend HTTP & WebSocket server port | `5000` |
| `JWT_SECRET` | Cryptographic secret for signing auth tokens | *Strong random 64-char string* |
| `CORS_ORIGIN` | Allowed web frontend origin | `http://localhost:5173` |
| `KEYSTORE_PATH` | Path to production Android release keystore | `android/app/halder-release.jks` |
| `KEYSTORE_PASSWORD` | Password for Android release keystore | Provided via CI secret |
| `KEY_ALIAS` | Key alias in Android release keystore | `halder` |
| `KEY_PASSWORD` | Key password in Android release keystore | Provided via CI secret |
| `AWS_ACCESS_KEY_ID` | Optional S3 / Cloudflare R2 bucket access key | Optional cloud storage |
| `AWS_SECRET_ACCESS_KEY` | Optional S3 / Cloudflare R2 bucket secret | Optional cloud storage |
| `AWS_S3_BUCKET` | Optional S3 / Cloudflare R2 bucket name | `halder-media-assets` |

---

## 📄 License & Attribution

HALDER is developed as open-source agricultural infrastructure under the [MIT License](LICENSE).
