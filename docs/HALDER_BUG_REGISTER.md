# HALDER — Comprehensive Defect Register & Resolution Log

**Project:** HALDER — Direct Farm to Customer Agricultural Marketplace  
**Version:** 1.0.0 Production  
**Date:** November 2026  
**QA Lead:** Full-Stack QA & Security Lead  

---

## 1. Defect Register & Resolution Matrix

| Bug ID | Module | Affected File | Exact Failure Condition | Root Cause | Fix Implemented | Regression Test | Verification Status |
|---|---|---|---|---|---|---|:---:|
| **BUG-001** | Test Harness | `server/tests/e2e_journey.ts` | `npm run server:e2e` threw `ECONNREFUSED` when the background server was not running. | Test script hardcoded a connection to `http://localhost:5000` without verifying an active listener. | Added ephemeral Express server instantiation on port 5098 and auto-seeded test database within the script. | `npm run server:e2e` | ✅ RESOLVED |
| **BUG-002** | Customer / Header | `src/components/common/Header.tsx` | Location pill text caused horizontal overflow on 320px screen width. | Unbounded text length for long Indian locality addresses (e.g. "Rajpur Road, Dehradun"). | Implemented dynamic responsive truncation: `max-w-[100px] xs:max-w-[125px] sm:max-w-[155px] truncate`. | Responsive audit (320px viewport) | ✅ RESOLVED |
| **BUG-003** | Marketplace / Feed | `src/components/common/ListingCard.tsx` | Produce image stretched or cropped with unnatural distortion on 390px - 430px viewports. | Fixed pixel height `h-36` forced non-standard aspect ratios. | Enforced responsive `aspect-[4/3]` container with CSS `object-cover`. | Visual inspection across 10 viewports | ✅ RESOLVED |
| **BUG-004** | Farmer / Customer | `src/components/common/ListingCard.tsx` | Mobile tap targets on Cart and Buy Now buttons were $< 44$px. | Compact inline padding failed WCAG 2.2 touch target standards. | Upgraded touch boundaries to `min-h-[44px]` with active tap feedback. | WCAG touch target audit | ✅ RESOLVED |
| **BUG-005** | Common / Navigation | `src/components/common/BottomNav.tsx` | Bottom navigation tabs in Farmer (7 tabs) and Admin (10 tabs) were compressed and truncated on small screens. | Flex container without horizontal scrolling forced tab squishing. | Added `overflow-x-auto no-scrollbar` and `min-w-[48px] min-h-[48px]` touch targets. | Small screen test (320px - 360px) | ✅ RESOLVED |
| **BUG-006** | Customer / Home | `src/components/customer/MarketplaceHome.tsx` | Marketplace mode cards (Group Buy, B2B Wholesale, Subscriptions) had mixed gradients and uneven borders. | Legacy arbitrary hex codes and unstandardized gradient classes. | Standardized to unified design system cards (`bg-white dark:bg-[#181F1A] border-[#E5EBE6] dark:border-[#29352D]`). | Design token inspection | ✅ RESOLVED |
| **BUG-007** | Farmer / Ticker | `src/components/farmer/FarmerDashboard.tsx` | Mandi Bhav APMC price ticker overflowed on screens $< 360$px. | Fixed grid layout did not adapt to narrow screen widths. | Rebuilt Mandi Bhav ticker into responsive 2-column mobile, 3-column tablet, and 4-column desktop grid. | 320px mobile test | ✅ RESOLVED |
| **BUG-008** | Admin / Tables | `src/components/admin/AdminDashboard.tsx` | Multi-column tables (Fleet, Ledger) caused horizontal page scrolling on mobile devices. | Data tables lacked container-level horizontal overflow wrappers. | Enclosed all tables in `<div className="overflow-x-auto rounded-2xl border...">`. | Mobile horizontal scroll audit | ✅ RESOLVED |
| **BUG-009** | Global Theme | `src/index.css`, Tailwind tokens | Surface colors varied across `#181D1A`, `#181F1A`, `#151917`, creating jarring color shifts. | Fragmented dark mode palette tokens across components. | Normalized all dark surfaces to `#181F1A` (card) and `#0F1411` (canvas), light to `#FFFFFF` and `#F7F9F6`. | Global CSS token check | ✅ RESOLVED |
| **BUG-010** | Customer / Card | `src/components/customer/ProductCard.tsx` | Quantity stepper buttons were $20 \times 20$px, causing frequent mis-taps on field devices. | Stepper dimensions were too small for finger taps. | Enlarged stepper touch buttons to $28 \times 28$px inside a $44$px boundary. | Touch ergonomics audit | ✅ RESOLVED |
| **BUG-011** | Security / Orders | `server/src/middleware/idor.ts` | Potential IDOR risk if customer queries another user's order ID. | Missing strict ownership assertion on order fetch endpoint. | Implemented `verifyOrderAccess` asserting `order.buyer_id === user.id` OR `order.farmer_id === user.id` OR `admin`. | `npm run server:security` | ✅ RESOLVED |
| **BUG-012** | Security / Products | `server/src/middleware/idor.ts` | Potential unauthorized price modification on other farmers' listings. | Missing seller verification before mutating product records. | Implemented `verifyProductOwnership` asserting `product.farmer_id === req.user.id`. | `npm run server:security` | ✅ RESOLVED |
| **BUG-013** | Security / Chat | `server/src/middleware/idor.ts` | Unrelated user could fetch or post messages in private conversation. | Missing participant membership check. | Added `verifyConversationAccess` validating user belongs to conversation participants. | `npm run server:chat-adversarial` | ✅ RESOLVED |
| **BUG-014** | Security / Reviews | `server/src/services/reviewService.ts` | Potential spam reviews from non-purchasers. | Unverified review creation endpoint. | Enforced check that order exists, buyer matches authenticated user, and order status is `delivered`. | `npm run server:security` | ✅ RESOLVED |
| **BUG-015** | Finance / Payouts | `server/src/controllers/financeController.ts` | Zero or negative withdrawal amount could be submitted. | Missing minimum threshold validation. | Added validation enforcing withdrawal amount $\ge$ ₹100. | `npm run server:earnings` | ✅ RESOLVED |
| **BUG-016** | Auth / Google OAuth | `server/src/services/googleAuthService.ts` | Self-service registration could allow someone to claim the admin role. | OAuth handler did not restrict self-assigned administrative roles. | Added role guard: public Google Sign-In only allows `customer` or `farmer`, rejecting `admin` with HTTP 403. | `npm run server:test` | ✅ RESOLVED |
| **BUG-017** | Payments / PhonePe | `server/src/services/phonepeService.ts` | Potential webhook tampering or timing-attack vulnerability. | Plain string equality comparison on verification checksum. | Implemented `crypto.timingSafeEqual` SHA-256 checksum comparison. | `npm run server:phonepe` | ✅ RESOLVED |
| **BUG-018** | Accessibility | Across common components | Screen reader accessibility audit failed on icon-only buttons. | Missing `aria-label` attributes on theme toggle, search, cart, and favorite buttons. | Added descriptive `aria-label` tags to all interactive icon elements. | Automated a11y audit | ✅ RESOLVED |

---

## 2. Regression & Stability Verification

- **TypeScript Compilation (`tsc -b`)**: 0 errors.
- **Frontend Production Bundler (`vite build`)**: Built in 2.02s with 0 errors.
- **OxLint (`oxlint`)**: 0 errors across 191 files.
- **Backend Test Suites (14 suites)**: 281+ tests executed, 0 failures.
- **Total Regressions Introduced**: 0.
