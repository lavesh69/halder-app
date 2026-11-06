# HALDER – Farm to Market: Brand Identity & Design System Guidelines

**Version:** 1.0.0  
**Effective Date:** 2026-11-06  
**Repository:** [github.com/lavesh69/halder-app](https://github.com/lavesh69/halder-app)  
**Live Production URL:** [https://halder-app.vercel.app](https://halder-app.vercel.app)

---

## 1. Executive Summary & Brand Purpose

HALDER is India's premier direct-from-farm agricultural technology platform. The name **HALDER** derives from the Sanskrit root *Haladhara* (the plow bearer), representing agricultural strength, integrity, and farmer empowerment.

### 1.1 Brand Mission
> "Bridging India's hardworking farmers directly to consumers, restaurants, and institutions with zero middlemen, fair prices, total transparency, and field-to-doorstep freshness."

### 1.2 Core Pillars
1. **Farmers First:** Fair, transparent mandi and direct-sale prices with instant payouts and verified farmer profiles.
2. **Fresh Produce:** Harvested at peak ripeness and delivered directly with harvest date and farm provenance tracking.
3. **Direct Delivery:** Optimized cold-chain and local logistics ensuring maximum freshness and minimum transit time.
4. **You:** Empowering every consumer, household, and culinary business with traceable, safe, and nutritious food.

---

## 2. Official Logo Architecture

The HALDER visual brand identity is anchored by a proprietary multi-element master lockup.

### 2.1 The Master Brandmark Anatomy
The emblem integrates six essential agricultural and marketplace symbols into a unified, balanced silhouette:

```
          ┌───────────────────────────────────┐
          │             ╭──────╮              │  <- Shopping Bag Handle
          │          ╭──┘      └──╮           │     (Direct Commerce)
          │    ┌─────┴────────────┴─────┐     │
          │    │    \   \   |   /   /   │     │  <- Harvest Gold Sunrise
          │    │      \   \ | /   /     │     │     (Optimism & Energy)
          │    │       /\     /\        │     │  <- Mountain Horizon
          │    │      /  \   /  \  [⌂]  │     │  <- Rural Farmhouse & Trees
          │    │    ( ~~~~~~~~~~~~~~~ ) │     │  <- Curved Agricultural Furrows
          │    │   (  \   \   /   /    )│     │  <- Sweeping Leaf Motif
          │    └────────────────────────┘     │
          └───────────────────────────────────┘
```

1. **Shopping Bag Silhouette:** Symbolizes an open, trustworthy marketplace connecting agriculture to modern trade.
2. **Harvest Gold Sunrise:** Radiating optimism, new beginnings, daily freshness, and solar energy essential for farming.
3. **Mountain Horizon:** Represents purity, natural origins, and the fertile geography of Indian agriculture.
4. **Farmhouse & Trees:** Rooted in real rural farming communities, family farms, and ecological balance.
5. **Curved Field Furrows:** Illustrate plowed soil contours, cultivation craft, and organic fertility.
6. **Prominent Sweeping Leaf:** Denotes natural freshness, vitality, organic standards, and environmental sustainability.
7. **Bold Wordmark "HALDER":** Typeset in Montserrat Bold with geometric clarity, solid tracking, and commanding presence.
8. **Category Descriptor:** "FARM TO MARKET" in clean, tracked sans-serif caps.
9. **Four Supporting Value Badges:** "1. Farmers • 2. Fresh Produce • 3. Direct Delivery • 4. You".

> **Strict Rule:** Never replace this proprietary identity with a generic single-letter "H" circle, clip-art shopping cart, or arbitrary leaf icon. The shopping-bag landscape silhouette is the legally protected, recognizable brand signature of HALDER.

---

## 3. Logo Assets & Variants

All official assets are maintained as clean, scalable vector SVGs in `public/brand/`:

| Asset File | Dimensions | Use Case |
|---|---|---|
| `public/brand/logo/halder-emblem.svg` | 512×512 | Standalone mark, app icons, favicons, avatars |
| `public/brand/logo/halder-primary.svg` | 640×640 | Full lockup with wordmark, descriptor, and 4 pillars |
| `public/brand/logo/halder-horizontal.svg` | 360×90 | Main web header, mobile app top bar, email headers |
| `public/brand/logo/halder-vertical.svg` | 320×360 | Splash screen, onboarding heroes, auth modal dialogs |
| `public/brand/logo/halder-transparent.svg` | 360×90 | Dark and photography overlays (transparent background) |
| `public/brand/logo/halder-dark.svg` | 360×90 | Dark-mode header with warm cream typography |
| `public/brand/logo/halder-light.svg` | 360×90 | Light-mode header with forest green typography |
| `public/brand/logo/halder-monochrome-black.svg` | 360×90 | Thermal receipt printing, official letters, stamp art |
| `public/brand/logo/halder-monochrome-white.svg` | 360×90 | Solid dark banner placements, vehicle wraps, uniforms |
| `public/brand/app/favicon.svg` | 64×64 | Browser tab icon, PWA shortcut icons |
| `public/brand/app/icon-192.svg` | 192×192 | Android PWA home screen icon |
| `public/brand/app/icon-512.svg` | 512×512 | High-res launcher icon and store listing |
| `public/brand/app/adaptive-icon-background.svg` | 432×432 | Android adaptive icon background (Forest Green contour) |
| `public/brand/app/adaptive-icon-foreground.svg` | 432×432 | Android adaptive icon foreground (Centered emblem) |
| `public/brand/splash/halder-splash.svg` | 1080×1920 | Full-bleed native Android splash screen |
| `public/brand/social/halder-og-image.svg` | 1200×630 | OpenGraph social preview card (WhatsApp, Twitter, LinkedIn) |

---

## 4. Logo Clear Space & Minimum Sizes

### 4.1 Clear Space
Always maintain a minimum exclusion zone around the logo equal to **X**, where **X** is the height of the capital letter **'H'** in the HALDER wordmark. No text, iconography, boundary lines, or competing graphic elements may encroach into this exclusion zone.

### 4.2 Minimum Digital Sizes
- **Primary / Vertical Lockup:** Minimum width **120px** (or 32mm in print).
- **Horizontal Header Lockup:** Minimum width **110px** (height ~28px).
- **Emblem Mark:** Minimum width **24px** (for toolbars/favicons down to 16px).

---

## 5. Official Color Palette & Token System

HALDER uses a nature-inspired, high-contrast palette calibrated for outdoor visibility under sunlight (farmer screens) and comfortable night reading (dark mode).

### 5.1 Primary Brand Palette

| Color Name | Hex Code | RGB | CMYK | Usage Role |
|---|---|---|---|---|
| **Forest Green** | `#0B3D2E` | `11, 61, 46` | `82, 0, 25, 76` | Primary brand color, headers, primary CTAs, dark surfaces |
| **Leaf Green** | `#2E7D32` | `46, 125, 50` | `63, 0, 60, 51` | Secondary brand color, verified badges, active states |
| **Lime Green** | `#A8E063` | `168, 224, 99` | `25, 0, 56, 12` | Freshness highlights, harvest accents, glow rings |
| **Harvest Gold** | `#F4A017` | `244, 160, 23` | `0, 34, 91, 4` | Sunrise accent, premium stars, VIP badges, pricing badges |
| **Warm Cream** | `#F6F4E8` | `246, 244, 232`| `0, 1, 6, 4` | Primary light background, cards, invoice paper texture |
| **Charcoal** | `#17251D` | `23, 37, 29` | `38, 0, 22, 85` | Primary body text, high-contrast headings |
| **Soft Grey** | `#EEF1EA` | `238, 241, 234`| `1, 0, 3, 5` | Subtle borders, muted card backings, skeleton loaders |
| **Pure White** | `#FFFFFF` | `255, 255, 255`| `0, 0, 0, 0` | Elevated cards, modal dialogs, crisp text contrast |

### 5.2 CSS Design Tokens (`src/styles/tokens.css`)

```css
:root {
  /* Brand Primitives */
  --halder-forest: #0B3D2E;
  --halder-forest-dark: #07291F;
  --halder-leaf: #2E7D32;
  --halder-leaf-dark: #1E5C22;
  --halder-lime: #A8E063;
  --halder-gold: #F4A017;
  --halder-gold-hover: #D8890E;
  --halder-cream: #F6F4E8;
  --halder-charcoal: #17251D;
  --halder-charcoal-muted: #4B5A51;
  --halder-white: #FFFFFF;
  --halder-muted: #EEF1EA;
  --halder-border: #D8E0D5;

  /* Semantic Variables (Light Theme) */
  --color-primary: var(--halder-forest);
  --color-primary-hover: var(--halder-forest-dark);
  --color-secondary: var(--halder-leaf);
  --color-accent: var(--halder-gold);
  --color-background: var(--halder-cream);
  --color-surface: var(--halder-white);
  --color-surface-muted: var(--halder-muted);
  --color-border: var(--halder-border);
  --color-text-primary: var(--halder-charcoal);
  --color-text-secondary: var(--halder-charcoal-muted);
}

.dark {
  /* Semantic Variables (Dark Theme) */
  --color-primary: var(--halder-lime);
  --color-primary-hover: #C2F082;
  --color-secondary: #4CAF50;
  --color-accent: var(--halder-gold);
  --color-background: #061B14;
  --color-surface: #0E2920;
  --color-surface-muted: #15382D;
  --color-border: #1E4638;
  --color-text-primary: #F6F4E8;
  --color-text-secondary: #B4C6BC;
}
```

---

## 6. Typography System

### 6.1 Font Families
- **Headings & Display:** `Montserrat`, sans-serif (Weights: 600 SemiBold, 700 Bold, 800 ExtraBold, 900 Black).
- **Body, Inputs & Controls:** `Inter`, -apple-system, BlinkMacSystemFont, sans-serif (Weights: 400 Regular, 500 Medium, 600 SemiBold).
- **Financial & Mandi Pricing:** `Inter` with OpenType tabular figures (`font-variant-numeric: tabular-nums`).

### 6.2 Type Hierarchy

| Level | Size | Weight | Tracking | Line Height | Usage |
|---|---|---|---|---|---|
| **Display** | 44px–48px | 900 Black | `-0.03em` | 1.1 | Splash hero, marketing banners |
| **H1** | 30px–34px | 800 ExtraBold | `-0.025em`| 1.2 | Page titles, primary views |
| **H2** | 22px–26px | 700 Bold | `-0.02em` | 1.25 | Section titles, dashboard cards |
| **H3** | 18px–20px | 700 Bold | `-0.015em`| 1.3 | Modal headers, product names |
| **H4** | 15px–16px | 600 SemiBold | `0em` | 1.35 | Subsection headers, labels |
| **Body Large** | 15px–16px | 400/500 | `0em` | 1.5 | Lead paragraphs, descriptions |
| **Body** | 13px–14px | 400/500 | `0em` | 1.45 | Standard content, tables |
| **Caption** | 11px–12px | 500/600 | `0.01em` | 1.4 | Badges, timestamps, helper text |

---

## 7. Reusable React Brand Components

### 7.1 `<BrandLogo />`
Located in `src/components/brand/BrandLogo.tsx`:
```tsx
import { BrandLogo } from '../brand/BrandLogo';

// Header horizontal placement
<BrandLogo variant="horizontal" size="md" />

// Dark overlay or dark theme
<BrandLogo variant="dark" size="lg" />

// Splash screen or onboarding
<BrandLogo variant="vertical" size="xl" showPillars={true} />

// Receipts / Invoice
<BrandLogo variant="monochrome" size="sm" />
```

### 7.2 `<BrandIcon />`
Located in `src/components/brand/BrandIcon.tsx`:
```tsx
import { BrandIcon } from '../brand/BrandIcon';

// Small avatar or pill icon
<BrandIcon size="sm" />

// Monochrome white on dark button
<BrandIcon size="md" mode="monochrome-white" />
```

### 7.3 Backwards-Compatible `<Logo />`
Located in `src/components/common/Logo.tsx`:
Seamlessly accepts all legacy props (`size`, `variant`, `showTagline`, `showPillars`) and redirects to the master vector artwork.

---

## 8. Role-Based Visual Tone

| User Role | Atmosphere & Mood | Visual Expression |
|---|---|---|
| **Customer** | Premium, fresh, appetizing, effortless | Warm cream surfaces (`#F6F4E8`), forest-green purchase CTAs, gold star badges, appetizing organic imagery. |
| **Farmer** | Respectful, clear, high-contrast, practical | High daylight readability, direct rupee symbols in bold tabular figures, green profit badges, simple cards. |
| **Logistics** | Urgent, mobile-first, actionable | High-contrast status badges (amber/green/blue), 48px touch targets, GPS navigation icons. |
| **Superadmin** | Structured, authoritative, analytical | Clean tabular density, tier-1 control badges, live system circuit breakers, clear audit timestamps. |

---

## 9. Capacitor 8 & Android Native Identity

- **Android App Name:** `HALDER – Farm to Market`
- **Application ID:** `com.halder.app` (Preserved)
- **Primary Color:** `#0B3D2E` (Defined in `android/app/src/main/res/values/colors.xml`)
- **Status Bar Color:** `#0B3D2E`
- **Navigation Bar Color:** `#07291F`
- **Launcher Icon:** Adaptive XML referencing `ic_launcher_background.xml` (Forest Green contour) and `halder-emblem.svg`.
- **Splash Screen:** `halder-splash.svg` with centered vertical lockup and warm cream loader.

---

## 10. Brand Governance: Do's and Don'ts

### ✅ Do:
- Always use the official vector SVGs from `public/brand/logo/`.
- Maintain the warm cream (`#F6F4E8`) and forest green (`#0B3D2E`) visual harmony.
- Use Harvest Gold (`#F4A017`) solely as an accent for badges, stars, and highlights.
- Keep touch targets at minimum 44×44px for accessibility.
- Include harvest dates and farm provenance in product listings.

### ❌ Don't:
- Never stretch, skew, or alter the aspect ratio of the HALDER logo.
- Never recolor the sunrise with blue, purple, or neon pink.
- Never replace the shopping-bag silhouette with a generic supermarket shopping cart.
- Never use low-resolution raster JPEG screenshots as logos.
- Never flood backgrounds with solid Harvest Gold.
