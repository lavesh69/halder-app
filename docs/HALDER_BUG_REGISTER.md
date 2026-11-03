# HALDER — Bug Register & Resolution Log

**Project:** HALDER — Direct Farm to Customer Agricultural Marketplace  
**Date:** November 2026  
**Quality Assurance:** Full-Stack QA & Frontend Performance Engineering  

---

## 1. Defect & Inconsistency Register

| Bug ID | Component / Area | Severity | Root Cause | Fix Applied | Verification Result |
|---|---|---|---|---|---|
| **BUG-001** | `src/components/common/Header.tsx` | Medium | Location pill text was causing header overflow on 320px viewport when location string was long (e.g., "Rajpur Road, Dehradun"). | Implemented dynamic responsive truncation: `max-w-[100px] xs:max-w-[125px] sm:max-w-[155px] truncate` and reduced icon padding. | Header fits cleanly within 320px screen width with 0 overflow. |
| **BUG-002** | `src/components/common/ListingCard.tsx` | High | Fixed pixel height (`h-36`) on product images resulted in distorted aspect ratios on wider mobile screens (390px - 430px). | Replaced fixed pixel heights with responsive `aspect-[4/3]` container, using `object-cover`. | Produce images scale proportionally across all screens. |
| **BUG-003** | `src/components/common/ListingCard.tsx` | Medium | In `compact-grid` and `vertical-feed` variants, Cart and Buy Now buttons had sub-44px touch targets on mobile devices. | Upgraded interactive button heights to `min-h-[44px]` with proper active scale feedback. | Compliant with WCAG 2.2 AA target size criteria. |
| **BUG-004** | `src/components/common/BottomNav.tsx` | High | On Farmer view (7 tabs) and Admin view (10 tabs), small phone viewports (320px - 360px) caused tabs to compress and truncate illegibly. | Added `overflow-x-auto no-scrollbar` to navigation bar with `min-w-[48px] min-h-[48px]` interactive bounds. | Smooth horizontal scroll navigation on small phones; no tab squishing. |
| **BUG-005** | `src/components/customer/MarketplaceHome.tsx` | Medium | Special marketplace mode banners (Group Buy, B2B Wholesale, Daily Subscriptions) used inconsistent arbitrary gradients and non-standard dark surface colors. | Standardized all three cards to clean surface containers (`bg-white dark:bg-[#181F1A] border-[#E5EBE6] dark:border-[#29352D]`) with soft green icon backgrounds. | Harmonious aesthetic aligned with the HALDER Design System. |
| **BUG-006** | `src/components/farmer/FarmerDashboard.tsx` | Medium | APMC Mandi Bhav ticker was rendered in a fixed grid that overflowed on screens $< 360$px. | Refactored Mandi Bhav ticker into responsive 2-column on small screens, 3-column on tablet, and 4-column on desktop. | No overflow on 320px; legible APMC price cards. |
| **BUG-007** | `src/components/admin/AdminDashboard.tsx` | High | Multi-column tables in Logistics Fleet (6 columns) and Double-Entry Ledger (7 columns) caused horizontal viewport expansion on mobile viewports. | Wrapped all data tables in `<div className="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800">`. | Document body maintains 0 horizontal overflow; tables scroll smoothly within their containers. |
| **BUG-008** | Global Design Tokens | Medium | Surface background tokens varied across `#181D1A`, `#181F1A`, `#151917`, `#111412`, and `#FAF9F6`, causing visual inconsistencies between pages. | Normalized all dark surfaces to `#181F1A` (card) and `#0F1411` (canvas), and all light surfaces to `#FFFFFF` (card) and `#F7F9F6` (canvas). | 100% unified theme across customer, farmer, and admin panels. |
| **BUG-009** | `src/components/customer/ProductCard.tsx` | Low | Quantity increment/decrement buttons were sized $20 \times 20$px (`w-5 h-5`), difficult for field workers and farmers to tap accurately. | Increased stepper button size to $28 \times 28$px (`w-7 h-7`) within a `min-h-[44px]` touch container. | Stepper is easy to tap on all touch devices. |
| **BUG-010** | Accessibility / A11y | Low | Interactive icon buttons lacked explicit `aria-label` attributes for screen readers. | Added descriptive `aria-label` tags to theme toggle, device frame toggle, search button, notification bell, favorite heart, and cart buttons. | Passes automated screen reader accessibility checks. |

---

## 2. Regression Testing Summary

- **TypeScript Compilation:** `tsc -b` $\to$ **0 errors**
- **Vite Production Bundler:** `vite build` $\to$ **Built successfully (dist generated)**
- **Express Backend Test Suite:** `npm run server:test` $\to$ **63 / 63 tests passed**
- **Ecosystem Test Suite:** `npx tsx server/tests/ecosystem.test.ts` $\to$ **18 / 18 tests passed**
- **Regressions Introduced:** **0**
