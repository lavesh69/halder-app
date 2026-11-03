# 📱 HALDER — Google Play Store Listing & Compliance Metadata

---

## 1. App Listing Information

| Field | Value |
| :--- | :--- |
| **App Name** | **HALDER — Direct Farmer Mandi** |
| **Package Name (Application ID)** | `com.halder.mandi` |
| **Category** | Shopping / Food & Drink |
| **Default Language** | English (India) [en-IN] |
| **Additional Languages** | Hindi [hi-IN] |
| **Short Description** (Max 80 chars) | `Fresh produce & farm harvest directly from verified local farmers at fair mandi prices.` |

---

## 2. Full Description (Max 4,000 chars)

```text
HALDER connects you directly with local farmers — eliminating middlemen so farmers earn fair prices and families receive fresh, nutritious harvest straight from the farm.

🌾 DIRECT FROM THE FARM, NOT COLD STORAGE
Unlike conventional grocery apps that store produce in warehouses for days, HALDER facilitates direct same-day harvest orders from local verified farmers in your district.

✨ KEY FEATURES:
• 🚜 Direct Farmer Marketplace: Browse fresh seasonal vegetables, fruits, pure Desi cow milk, organic pulses, and artisanal farm honey.
• 🛡️ 100% Direct UPI Payments: Your produce money goes directly to the farmer's personal UPI address or Cash on Delivery. HALDER charges only a nominal ₹5 platform fee.
• 📍 Hyperlocal Discovery: Find farmers within 5 to 25 km of your neighborhood.
• 💬 In-App Farmer Chat: Talk directly with your grower. Ask harvest timings, organic certification details, and custom crate quantities.
• 📦 Live Harvest Tracking: Real-time status updates as the farmer harvests, packs, and delivers your eco-crate.
• 👨‍🌾 Farmer Seller Mode: Are you a farmer? Switch to Farmer Mode with 1-tap, list your morning harvest in 30 seconds, and sell directly to thousands of nearby buyers.
• 🇮🇳 Made for Bharat: Simple interface in Hindi and English, voice-friendly navigation, and smooth performance on all Android devices.

HALDER — Kisani ki takat, shuddhata ki guarantee.
```

---

## 3. Data Safety Declarations (Google Play User Data Policy)

| Data Category | Data Type | Purpose | Ephemeral? | Encrypted in Transit? | Deletion Mechanism |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Personal Info** | Name, Phone number | Account management, Farmer-Buyer contact | No | Yes (HTTPS / TLS 1.3) | In-App Deletion Button (`DELETE /api/v1/users/me`) |
| **Location** | Approximate & Precise GPS | Calculate distance to nearby farms & delivery routing | No (session only) | Yes (HTTPS) | Revoke permission in Android Settings |
| **Photos & Videos** | Crop photos (optional) | Farmer product listing upload | No | Yes (HTTPS) | Delete listing in Farmer Dashboard |
| **Messages** | In-app buyer/farmer chat | Customer service & order coordination | No | Yes (HTTPS) | Automatic deletion with account |
| **Financial Info** | ₹5 Platform Fee / Order Payout record | Platform commission invoice & verification | No | Yes (HTTPS) | Archived securely according to tax laws |

- **Third-Party Sharing**: HALDER does **NOT** sell or share user data with third-party advertisers or data brokers.
- **Children's Policy**: App is not directed to children under the age of 13.

---

## 4. Google Play Reviewer Demo Credentials

Provide these credentials in the Play Console **App Content** > **App access** section:

| Role | Username / Phone | Password / Login Flow |
| :--- | :--- | :--- |
| **Customer Reviewer** | `+91 98765 43210` / `aman@halder.com` | Guest 1-Tap Entry or Password: `Customer@123` |
| **Farmer Reviewer** | `+91 98450 12345` / `rajesh@halder.com` | Switch to Farmer Mode > Password: `Farmer@123` |
| **Admin Reviewer** | `+91 98000 11111` / `admin@halder.com` | Protected Admin Console: `Admin@123` |

---

## 5. Store Graphics Specification Checklist

- **App Icon**: 512 x 512 px, 32-bit PNG with alpha, max 1024 KB (`res/mipmap-xxxhdpi/ic_launcher.png`).
- **Feature Graphic**: 1024 x 500 px, JPG or 24-bit PNG (no alpha).
- **Phone Screenshots**: Minimum 2 screenshots, 1080 x 1920 px (9:16 aspect ratio), showcasing:
  1. Home Marketplace & Fresh Harvest Feed
  2. Direct Farmer Profile & Verified Badge
  3. Direct UPI Payment Breakdown (100% to farmer)
  4. Real-time Order Tracking & Farmer Chat
  5. Farmer 30-Second Fast Listing Mode
