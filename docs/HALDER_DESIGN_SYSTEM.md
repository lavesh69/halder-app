# HALDER Design System Specification (v2.0)

**Project:** HALDER — Direct Farm to Customer Agricultural Marketplace  
**Author:** Design Systems Architect & Senior UI/UX Engineer  
**Status:** Production Ready  

---

## 1. Design Philosophy & Principles

The HALDER Design System reflects the convergence of **authentic Indian agricultural commerce** and **modern digital efficiency**:
1. **Natural & Fresh**: Inspired by living fields, harvest cycles, and sustainable agro-ecology.
2. **Transparent & Direct**: Eliminating visual noise and middlemen; prioritizing transparent pricing, farm provenance, and clear stock status.
3. **Touch-First & Resilient**: Built for real-world field conditions—operable with one thumb, high contrast in direct sunlight, and lightweight on 2G/3G mobile networks.
4. **Accessible to All (Kisan-Friendly)**: Clear visual icons, multilingual support (Hindi, English, Bengali, Punjabi, Marathi), and consistent 44px+ touch targets.

---

## 2. Color Palette Tokens

### 2.1 Brand & Agricultural Core

| Token Name | Hex Code | Role / Usage |
|---|---|---|
| `halder-forest` | `#176B45` | Primary brand color, main call-to-actions, headers, active tabs |
| `halder-deep` | `#124C36` | Primary hover state, deep typography emphasis, dark accents |
| `halder-fresh` | `#2E8B57` | Secondary accents, status pulses, growth indicators |
| `halder-soft` | `#EAF5EE` | Soft green surface, badge backgrounds, selected item tint |
| `halder-canvas` | `#F7F9F6` | Default light canvas background (gentle, warm surface) |
| `halder-surface` | `#FFFFFF` | Card surface, elevated dialog background |
| `halder-text` | `#202923` | High-contrast primary text (contrast 14.2:1 against canvas) |
| `halder-secondary` | `#66736B` | Secondary explanatory text, subtitles, farmer location |
| `halder-muted` | `#89948C` | Muted placeholders, inactive icons, subtle dividers |
| `halder-border` | `#E5EBE6` | Card borders, table dividers, input borders |

### 2.2 Semantic & State Tokens

| Semantic Token | Light Mode Hex | Dark Mode Hex | Usage |
|---|---|---|---|
| `success` | `#238653` | `#2EA063` | Verified seller badge, completed orders, positive Mandi change |
| `warning` | `#D99A32` | `#E8A838` | Pending review, new incoming orders, negotiable price |
| `danger` | `#D9534F` | `#E25E5A` | Urgent tag, rejected orders, delete actions, stock out |
| `info` | `#4285B8` | `#5097CD` | System announcements, tracking updates, help tooltips |

### 2.3 Dark Mode Surface Tokens

| Dark Token | Hex Code | Role / Usage |
|---|---|---|
| `darkBg` | `#0F1411` | Root background for dark mode (deep forest tint) |
| `darkCard` | `#181F1A` | Elevated card surfaces, bottom navigation bar, headers |
| `darkMuted` | `#222B25` | Hover states, secondary action buttons, input backgrounds |
| `darkBorder` | `#29352D` | Structural borders, card boundaries, list dividers |
| `darkText` | `#F2F5F3` | Primary text in dark mode (contrast 13.8:1) |
| `darkSecondary`| `#A6B3AA` | Secondary and descriptive text in dark mode |
| `darkMutedText`| `#728277` | Inactive icons, subtle labels, timestamps |

---

## 3. Typography Scale & Foundation

- **Primary Font Family:** `Inter`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `sans-serif`
- **Typographic Scale:**

| Level | Size | Weight | Line Height | CSS Utility Class |
|---|---|---|---|---|
| **Display / Hero** | 28px - 32px | Black (900) | 1.15 | `text-2xl sm:text-3xl font-black tracking-tight` |
| **H1 Page Title** | 22px - 24px | Black (900) | 1.2 | `text-xl sm:text-2xl font-black` |
| **H2 Section Header** | 16px - 18px | Bold (700) | 1.25 | `text-base sm:text-lg font-bold` |
| **H3 Card Header** | 14px - 15px | Bold (700) | 1.3 | `text-sm font-bold` |
| **Body Default** | 13px - 14px | Regular/Medium (400/500) | 1.45 | `text-xs sm:text-sm font-medium` |
| **Caption / Badge** | 10px - 11px | SemiBold/Bold (600/700) | 1.3 | `text-[10px] sm:text-[11px] font-bold` |
| **Monospace / ID** | 11px - 12px | Bold (700) | 1.2 | `font-mono text-xs font-bold` |

---

## 4. Spacing System & Responsive Breakpoints

### 4.1 8-Point Spacing Foundations
HALDER uses an 8-point geometric scale:
- `4px` (`p-1`, `gap-1`): Inner icon gaps, micro badges
- `8px` (`p-2`, `gap-2`): Button internal padding, chip spacing
- `12px` (`p-3`, `gap-3`): Card internal padding on compact mobile
- `16px` (`p-4`, `gap-4`): Standard container padding, modal headers
- `20px` (`p-5`, `gap-5`): Section margins, desktop card padding
- `24px` (`p-6`, `gap-6`): Primary grid gaps, hero padding
- `32px` (`p-8`, `gap-8`): Large desktop margins

### 4.2 Breakpoints Matrix

| Viewport Category | Width Range | Columns / Layout Rule |
|---|---|---|
| **Small Phone** | 320px – 360px | 1 column full width, compact 2-column classifieds, sticky bottom nav |
| **Standard Phone** | 375px – 430px | 2-column product grid, 44px min touch buttons, edge-to-edge modals |
| **Tablet** | 768px – 1023px | 3-column product grid, 2-column farmer dashboard, centered modals |
| **Laptop & Desktop**| 1024px – 1920px | 4-column product grid, multi-column dashboard, max-w-7xl centered container |

---

## 5. Standard Component Specifications

### 5.1 Buttons

```css
/* Primary Button */
.btn-primary {
  min-height: 44px;
  padding: 0.625rem 1rem;
  background-color: #176B45;
  color: #FFFFFF;
  font-weight: 700;
  font-size: 0.875rem;
  border-radius: 0.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.btn-primary:hover { background-color: #124C36; }
.btn-primary:active { transform: scale(0.98); }

/* Secondary Button */
.btn-secondary {
  min-height: 44px;
  padding: 0.625rem 1rem;
  background-color: #FFFFFF;
  color: #202923;
  border: 1px solid #E5EBE6;
  font-weight: 700;
  font-size: 0.875rem;
  border-radius: 0.75rem;
}
```

### 5.2 Responsive Cards (`ListingCard.tsx`)
- Aspect ratio: Fixed `aspect-[4/3]` photo wrapper to maintain uniform image heights.
- Border: `1px solid #E5EBE6` (light) / `1px solid #29352D` (dark).
- Radius: `1rem` (`rounded-2xl`).
- Hover elevation: `shadow-soft` to `shadow-soft-md` transition with `scale-105` image zoom.
- Price hierarchy: Price displayed prominently at `16px - 18px font-black text-[#176B45]`.

### 5.3 Form Inputs (`.form-input-responsive`)
- Min height: `44px`
- Font size: `14px` on desktop, `16px` on mobile (prevents automatic iOS Safari zoom).
- Border: `1px solid #E5EBE6` with focus ring `2px solid #176B45`.
- Radius: `0.75rem` (`rounded-xl`).

### 5.4 Responsive Modals (`.modal-sheet-responsive`)
- Mobile (< 640px): Docks to bottom (`items-end`), `rounded-t-3xl`, `max-h-[92dvh]`, smooth slide-up animation.
- Desktop ($\ge$ 640px): Centers in viewport (`items-center`), `rounded-3xl`, `max-h-[88vh]`, backdrop blur.

---

## 6. Accessibility & Performance Guarantees

1. **Touch Target Size**: Every interactive control (button, tab, select, checkbox) guarantees $\ge 44 \times 44$px interactive bounding box.
2. **Accessible Contrast**: All text conforms to WCAG 2.2 AA (minimum 4.5:1 for body, 3:1 for large text).
3. **Focus States**: Visible high-contrast focus rings (`:focus-visible`) on all interactive controls.
4. **Motion Sensitivity**: Honors `prefers-reduced-motion: reduce`, dropping animations to 0.01ms.
5. **Safe-Area Insets**: Uses `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)` for full edge-to-edge support on modern iPhones and Android devices.
