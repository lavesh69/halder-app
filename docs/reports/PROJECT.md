# Project: HALDER Direct-Farm Marketplace & Agro-Logistics Ecosystem

## 1. Architectural Architecture & Ecosystem Overview
HALDER (हलधर) is an enterprise-grade agricultural direct-to-consumer and B2B wholesale platform.
It connects smallholder and commercial farmers directly with retail consumers, bulk buyers, restaurants, and institutions across India within a 300-kilometer regional radius.

- **Backend Architecture**: Node.js (>=22.5.0), Express.js REST API with WebSocket (`ws`) real-time messaging, native SQLite (`node:sqlite` DatabaseSync) in Write-Ahead Logging (WAL) mode, zero-trust IDOR middleware, and persistent administrative platform governance.
- **Frontend Architecture**: React 19 + TypeScript + Vite 8 SPA, Tailwind CSS v4, Lucide React icons, centralized React Context, and native mobile containerization via Capacitor 8 Android.
- **Multilingual Support (i18n)**: High-performance typed 5-language translation dictionaries (`en`, `hi`, `pa`, `mr`, `bn`) with persistent localStorage synchronization and global navbar switching.
- **Zero-Trust Security**: Backend-enforced authorization across all mutations (products, crops, orders, telemetry, KYC documents, grievances, and private messages).

---

## 2. Core System Modules & Implementation Status

| # | Module | Scope & Capabilities | Status | Test Coverage |
|---|---|---|---|---|
| 1 | **Customer Marketplace & Discovery** | 300km Haversine geo-filtering, multi-farmer cart, stock revalidation, delivery handover, harvest transparency | COMPLETE | `server:test`, `server:geo`, `server:e2e` |
| 2 | **Farmer Business Ecosystem** | Multi-acre farm registration, crop calendars, harvest windows, inventory alerts, business analytics | COMPLETE | `server:test`, `server:earnings`, `server:comprehensive` |
| 3 | **Order Lifecycle State Machine** | Placed -> Accepted -> Preparing -> In-Transit -> Delivered (with rejection/cancellation guards) | COMPLETE | `server:test`, `server:e2e`, `server:security` |
| 4 | **Farmer Finance & Ledger** | Real-time earnings aggregation, commission breakdown (5-10%), bank/UPI settings, withdrawal ledgers | COMPLETE | `server:earnings`, `server:test` |
| 5 | **Fleet & Logistics Engine** | Delivery partner management, GPS telemetry (-90 to 90 lat, -180 to 180 lng), secure 4-digit OTP handover | COMPLETE | `server:geo`, `ecosystem.test.ts` |
| 6 | **Mandi APMC Market Intelligence** | Live APMC price benchmarks, spread validation (min <= modal <= max), CSV streaming export | COMPLETE | `server:comprehensive`, `ecosystem.test.ts` |
| 7 | **B2B Wholesale & Contract Farming** | Business buyer profile, RFQ quotation negotiation, counter-offers, inventory reservation, contracts | COMPLETE | `server:comprehensive`, `ecosystem.test.ts` |
| 8 | **Community Group Buying** | Group buy pool opening, participant volume accumulation, auto-completion at target quantity, volume rollback | COMPLETE | `server:comprehensive` |
| 9 | **Scheduled Farm Procurements** | Recurring delivery schedules (daily, alternate_days, weekly, biweekly, monthly), skip next drop, idempotent dispatch | COMPLETE | `server:comprehensive` |
| 10 | **Agro Weather & Advisory** | Open-Meteo live meteorology, wind speed (km/h), severe alert calculations, Krishi Vigyan Kendra (KVK) disclaimer | COMPLETE | `server:comprehensive` |
| 11 | **Real-Time WebSocket Chat** | Bidirectional messaging, typing indicators, read receipts, unread counter badges, multi-device presence | COMPLETE | `server:chat-i18n`, `server:chat-adversarial` |
| 12 | **Grievance & Support Tickets** | Order-linked dispute complaints, image evidence URLs, admin assignment, resolution notes, audit logging | COMPLETE | `server:comprehensive` |
| 13 | **Admin Governance & Kill Switch** | Real DB metrics (zero hardcoded values), KYC verification queue, persistent kill switches in platform_settings | COMPLETE | `server:kyc-push`, `server:comprehensive` |
| 14 | **Mobile App & Android Runtime** | Capacitor 8 integration, Android 34 build-tools compatibility, release keystore signing configuration | COMPLETE | `build:android`, Android CI workflow |

---

## 3. Database Schema Layout

The database uses embedded SQLite (`node:sqlite`) with Write-Ahead Logging (`WAL` mode) and strict foreign key enforcement.

1. `users` — Base user credentials, HALDER ID (`HAL-CUS-`, `HAL-FRM-`, `HAL-ADM-`), phone, email, roles (`customer`, `farmer`, `delivery_partner`, `admin`), profile avatar, status.
2. `customer_profiles` — Default delivery address, coordinates, bio, preferred language.
3. `farmer_profiles` — Farm name, location, coordinates, farm size acres, experience years, organic certification status, bank/UPI payout credentials, verification status (`pending`, `verified`, `rejected`).
4. `farm_crops` — Crop calendar items (crop name, season, sowing date, expected harvest date, estimated yield kg, farming method, certifications, status).
5. `products` — Producer product catalog (name, category, description, unit, price, wholesale price, moq, available quantity, harvest date, freshness duration, organic flag, moderation status).
6. `orders` — Consumer and B2B orders with unique `#HD` order numbers, status timeline, delivery mode (`farmer_direct`, `platform_fleet`), address, subtotal, delivery fee, farmer tip.
7. `order_items` — Line items linking products, quantities, unit prices.
8. `delivery_partners` — Fleet vehicles (`pickup_truck`, `electric_van`, `motorcycle`, `tractor`), active zones, ratings, active status.
9. `delivery_tasks` — Dispatch assignments linking orders to couriers, secure 4-digit verification OTPs, live telemetry (`current_lat`, `current_lng`), timestamps.
10. `mandi_prices` — APMC market benchmark records (crop, commodity, variety, state, district, market name, min_price, max_price, modal_price, arrival tonnes, date, source).
11. `conversations` & `messages` — Chat rooms linking customers and farmers, message content, read receipts, timestamps.
12. `reviews` — Verified harvest ratings and feedback tied to completed orders.
13. `notifications` — Role-based notifications (order updates, weather warnings, KYC approvals).
14. `payout_records` — Payout requests, settlement ledger codes (`SETTLE-HLD-XXXXXX`), bank transaction references.
15. `b2b_quotations` & `b2b_contracts` — Wholesale negotiation requests, farmer counter-offers, formal contracts, milestones.
16. `group_buys` & `group_buy_participants` — Community purchasing pools, target quantities, participant orders.
17. `scheduled_procurements` — Recurring harvest subscriptions, frequencies, last executed dates, next delivery dates.
18. `reports` — Customer and farmer support grievances, order linkages, priority levels, resolution notes, audit records.
19. `audit_logs` — Immutable administrative logs (`GRIEVANCE_RESOLVED`, `KILL_SWITCH_TOGGLED`, `FARMER_KYC_VERIFIED`).
20. `platform_settings` — Persistent key-value platform configurations and persistent kill switch states.

---

## 4. REST API Endpoint Catalog

### Authentication (Frozen & Untouched)
- `POST /api/v1/auth/register` — Register customer, farmer, or partner
- `POST /api/v1/auth/login` — Authenticate via email or phone
- `POST /api/v1/auth/google` — Google OAuth credential login / account link
- `POST /api/v1/auth/send-otp` / `verify-otp` — Dynamic SMS OTP authentication
- `GET /api/v1/auth/me` — Current authenticated user context

### Products & Catalog
- `GET /api/v1/products` — Filter products by category, search, radiusKm, coordinates, organic status
- `GET /api/v1/products/:id` — Product details with farmer origin
- `POST /api/v1/products` — Create listing (farmer/admin)
- `PATCH /api/v1/products/:id` — Update listing with IDOR ownership verification
- `DELETE /api/v1/products/:id` — Delete/archive listing

### Orders & Tracking
- `POST /api/v1/orders` — Place direct or fleet order with atomic inventory deduction
- `GET /api/v1/orders` — List user's orders (customer or farmer scope)
- `GET /api/v1/orders/:id` — Order details with IDOR verification
- `PATCH /api/v1/orders/:id/status` — State machine transition (accepted, preparing, dispatched, delivered)
- `GET /api/v1/orders/:id/track` — Real-time delivery tracking with courier coordinates

### Farmer Management
- `GET /api/v1/farmers/:id` — Public farmer profile with active crops & reviews
- `GET /api/v1/farmers/:id/earnings` — Live aggregated earnings, gross sales, available balance
- `PUT /api/v1/farmers/:id/payout-settings` — Set IFSC, bank account, and UPI ID
- `POST /api/v1/farmers/:id/withdraw` — Request settlement payout with ledger entry
- `POST /api/v1/farmers/:id/kyc` — Submit Aadhaar/KCC/Land verification documents
- `GET /api/v1/farmers/:id/crops` — List seasonal farm crops
- `POST /api/v1/farmers/:id/crops` — Add crop to harvest calendar
- `PATCH /api/v1/farmers/:id/crops/:cropId` — Update crop progress/yield (owner-only)
- `DELETE /api/v1/farmers/:id/crops/:cropId` — Remove crop from calendar (owner-only)

### Mandi Intelligence
- `GET /api/v1/mandi/prices` — APMC price benchmarks with search & state filtering
- `GET /api/v1/mandi/export` — Stream price benchmark records in RFC 4180 CSV
- `POST /api/v1/mandi/prices` — Admin entry with strict min <= modal <= max validation

### Logistics & Fleet
- `GET /api/v1/logistics/partners` — List delivery partners
- `GET /api/v1/logistics/tasks` — List delivery tasks
- `POST /api/v1/logistics/tasks/:id/telemetry` — Update GPS coordinates (-90..90 lat, -180..180 lng)
- `POST /api/v1/logistics/tasks/:id/verify-otp` — Verify customer delivery handover OTP

### B2B, Group Buying & Subscriptions
- `POST /api/v1/advanced/b2b/quotations` — Submit wholesale RFQ
- `PATCH /api/v1/advanced/b2b/quotations/:id` — Counter-offer or accept quotation
- `GET /api/v1/advanced/group-buys` — Active community group buying deals
- `POST /api/v1/advanced/group-buys` — Open new community pool
- `POST /api/v1/advanced/group-buys/:id/join` — Join pool with quantity
- `POST /api/v1/advanced/group-buys/:id/leave` — Leave pool (with volume rollback)
- `GET /api/v1/advanced/procurements` — Recurring farm subscription schedules
- `POST /api/v1/advanced/procurements` — Create recurring schedule
- `PUT /api/v1/advanced/procurements/:id` — Update frequency/quantity
- `POST /api/v1/advanced/procurements/:id/skip` — Skip next delivery cycle
- `POST /api/v1/advanced/procurements/:id/execute` — Idempotent scheduled order execution

### Grievances & Support
- `POST /api/v1/reports` — Submit support ticket linked to order
- `GET /api/v1/reports/my` — Customer ticket history
- `GET /api/v1/reports/admin` — Admin ticket queue with filtering
- `PATCH /api/v1/reports/:id/status` — Resolve dispute with resolution notes

### Governance & Kill Switch
- `GET /api/v1/admin/kill-switch` — List system feature states
- `POST /api/v1/admin/kill-switch/toggle` — Emergency feature toggle with persistence & audit log
- `GET /api/v1/admin/audit-logs` — Immutable audit log trail

---

## 5. Verification Commands

```bash
# Frontend production build
npm run build

# Comprehensive modules & hardening suite
npm run server:comprehensive

# Core production test suite
npm run server:test

# Security matrix & zero-trust IDOR
npm run server:security

# Real earnings & settlement ledger
npm run server:earnings

# Full E2E customer-farmer transaction flow
npm run server:e2e

# Real-time WebSocket chat & 5-language i18n
npm run server:chat-i18n
npm run server:chat-adversarial
```
