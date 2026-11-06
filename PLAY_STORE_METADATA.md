# HALDER — Google Play Store Listing Metadata & Submission Guide

This file provides the complete, copy-paste ready metadata and assets checklist required for publishing **HALDER: Direct Mandi & Kisan** to the Google Play Console.

---

## 1. App Details

* **App Name:** `HALDER: Direct Mandi & Kisan` (30 characters max - compliant)
* **Short Description:** `Direct farm-to-mandi agricultural marketplace for farmers, buyers & mandis.` (76 characters max - 80 max limit compliant)
* **Application ID / Package:** `com.halder.mandi`
* **Default Language:** `English (India)` (with Hindi localization in-app)
* **Category:** `Business` / `Shopping` (Secondary: `Food & Drink`)
* **Content Rating:** `Everyone (3+)`
* **Contains Ads:** `No`
* **Free or Paid:** `Free`

---

## 2. Full Description (4,000 characters max - Copy & Paste into Play Console)

```text
HALDER: Direct Mandi & Kisan is India’s premier agricultural marketplace connecting farmers directly with retail consumers, bulk wholesale buyers, and local mandis without predatory middlemen.

🌾 FOR FARMERS (किसान):
• Direct Mandi Selling: List your fresh harvest (vegetables, grains, fruits, spices, pulses) with custom prices per kg, quintal, or ton.
• Live Mandi APMC Prices: Check daily modal, minimum, and maximum commodity rates across regional APMC mandis.
• 5-Day Weather & Crop Advisory: Get agro-meteorological forecasts and frost/rain alerts to protect your crops.
• AI Crop Disease Scanner: Take a photo of damaged crop leaves with your camera to detect plant diseases and get instant treatment advisories.
• Zero Middlemen: Keep 100% of your earnings with direct order notifications and transparent payout records.

🛒 FOR BUYERS & FAMILIES:
• Farm-Fresh Quality: Buy produce directly from verified local farmers within hours of harvest.
• Community Group Buying: Join neighborhood bulk-buying pools to unlock wholesale farmgate rates.
• Real-Time Order Tracking: Live 5-step delivery tracking from farm pickup to your doorstep with OTP security.
• Buyer Protection: 24-hour grievance redressal with photo upload and instant refund resolution.

🏢 FOR B2B WHOLESALE TRADERS & RESTAURANTS:
• Wholesale Catalog: Browse high-volume agricultural listings across states.
• Request for Quotation (RFQ): Negotiate volume pricing directly with farmers and secure forward procurement contracts.

🚚 TRANSPARENT LOGISTICS & SAFETY:
• Distance-based fair freight calculation.
• Tamper-proof digital Proof of Delivery (POD).
• Secure transaction audit trails complying with Indian agricultural standards.

Download HALDER today and empower local Indian farmers while enjoying fresh, affordable produce!
```

---

## 3. Contact & Store Settings

* **Developer Email:** `support@halder.in`
* **Website:** `https://halder-app.vercel.app` (or custom domain `https://halder.in`)
* **Privacy Policy URL:** `https://halder-app.vercel.app/privacy.html`
* **Target Audience:** `18 and over`

---

## 4. Graphics & Media Asset Checklist

| Asset | Specifications | Status / Instructions |
|---|---|---|
| **App Icon** | 512 x 512 px, 32-bit PNG | Available in `android/app/src/main/res/mipmap-*` |
| **Feature Graphic** | 1024 x 500 px, JPG or 24-bit PNG | Create a banner showcasing "Direct Mandi & Kisan" |
| **Phone Screenshots** | Minimum 4, Maximum 8 (1080 x 1920 or 1080 x 2400) | Take screenshots from app: 1) Marketplace Home, 2) Mandi Prices, 3) Disease Scanner, 4) Order Tracking |

---

## 5. Binary File to Upload

* **File Location:** `android/app/build/outputs/bundle/release/app-release.aab`
* **Version Code:** `1`
* **Version Name:** `1.0.0`
* **Target SDK:** `34` (Meets Google Play mandate)
* **Signing Scheme:** Signed with official production release keystore (`CN=Halder Production, OU=Engineering...`).
