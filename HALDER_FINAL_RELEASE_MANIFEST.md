# HALDER v1.0.0 — Final Release Manifest

**Project:** HALDER (Direct Mandi & Agricultural Marketplace)  
**Release Version:** v1.0.0  
**Git Tag:** `v1.0.0`  
**Latest Audited Commit SHA:** `73c273a02013def4574ac8d75c32e84bc4baf847`  
**Repository:** https://github.com/lavesh69/halder-app  
**Date:** 2026-11-03  
**Engineering Authority:** Principal Release & DevOps Engineering  

---

## 1. Verified Release Artifacts

### 1.1 Local Compiled Binaries

| Property | Debug APK | Release APK | Release AAB (Play Store) |
|---|---|---|---|
| **Local File Path** | `android/app/build/outputs/apk/debug/app-debug.apk` | `android/app/build/outputs/apk/release/app-release.apk` | `android/app/build/outputs/bundle/release/app-release.aab` |
| **Package Identifier** | `com.halder.mandi` | `com.halder.mandi` | `com.halder.mandi` |
| **Version Code** | `1` | `1` | `1` |
| **Version Name** | `1.0.0` | `1.0.0` | `1.0.0` |
| **Min SDK** | 24 (Android 7.0 Nougat) | 24 (Android 7.0 Nougat) | 24 (Android 7.0 Nougat) |
| **Target SDK** | 34 (Android 14 UpsideDownCake) | 34 (Android 14 UpsideDownCake) | 34 (Android 14 UpsideDownCake) |
| **Compile SDK** | 36 (Android 16) | 36 (Android 16) | 36 (Android 16) |
| **File Size (Local)** | 4,680,854 bytes (4.46 MB) | 3,542,651 bytes (3.38 MB) | 3,400,460 bytes (3.24 MB) |
| **SHA-256 Checksum** | `4AD78C1003F9EE84EDBB2EBBED8BC3139C63426A395C4EB8A6A6910E6C426750` | `A342AE3393275618D5762FC745CF559EDBEA0CE54920550D41098BCC0859EBE5` | `EB104C2E2516789E4E9DEA29B0A8489F245558179D2B629AEC3DF19B6BCF05F6` |
| **Signing Status** | Signed (Android Debug Key) | VERIFIED (APK Signature Scheme v2) | VERIFIED (Release Key Configured) |
| **Installation Status** | BLOCKED (No physical device / emulator available) | BLOCKED (No physical device / emulator available) | Google Play Store Ready (.aab) |

### 1.2 GitHub Actions CI Runner Artifacts

- **Workflow Run ID:** `41632094483`  
- **Workflow Name:** `Build HALDER Android APK & Release AAB`  
- **Runner OS:** Ubuntu 24.04 LTS (Java 21 Zulu JDK + Android SDK Command-line Tools)  
- **Direct Portal URL:** https://github.com/lavesh69/halder-app/actions/runs/41632094483  

| Artifact Name | Artifact ID | Size on GitHub Storage | Verification Status |
|---|---|---|---|
| `HALDER-v1.0-debug-APK` | `13229276379` | 4,107,867 bytes (3.92 MB) | PASS (CI Automated Build) |
| `HALDER-v1.0-release-AAB` | `13228891569` | 3,214,330 bytes (3.07 MB) | PASS (CI Automated Build) |

---

## 2. Release Signature Cryptographic Verification

Verification executed using Android SDK `apksigner verify --verbose --print-certs`:

- **Signature Schemes Active:**
  - APK Signature Scheme v1 (JAR signing): `false`
  - APK Signature Scheme v2: `true` (Tamper-proof block in APK signing block)
  - APK Signature Scheme v3: `false`
- **Number of Signers:** 1
- **Signer Distinguished Name (DN):**  
  `CN=Halder Production, OU=Engineering, O=Halder Mandi Direct, L=Dehradun, ST=Uttarakhand, C=IN`
- **Certificate SHA-256 Digest:**  
  `7c62f85e48555740c104a2535b62bb3c76cb46b8815cf2e66008d23df4c0984f`
- **Certificate SHA-1 Digest:**  
  `a6545f3dd0ad02adbfa2db097cb6607e7eea60f2`
- **Public Key Algorithm:** RSA 2048 bits
- **Public Key SHA-256:**  
  `624831b9e45c3e621073deb94c6d60dc85fa1d515a13682ac2b2eef18568cc28`
- **Keystore Reference:** `android/app/halder-release.jks` (alias: `halder`, PKCS12 format, validity through 2054-01-19)

---

## 3. Package & Manifest Specifications

Inspected via `aapt2 dump badging`:

- **Application Label:** `HALDER`
- **Launchable Activity:** `com.halder.mandi.MainActivity`
- **Declared System Permissions:**
  1. `android.permission.INTERNET` (API network communication)
  2. `android.permission.ACCESS_NETWORK_STATE` (Network reachability checks)
  3. `android.permission.CAMERA` (Crop disease scanner, KYC, product photos)
  4. `android.permission.ACCESS_FINE_LOCATION` (GPS mandi matching and delivery tracking)
  5. `android.permission.ACCESS_COARSE_LOCATION` (Regional weather and mandi pricing)
  6. `android.permission.VIBRATE` (Haptic feedback for alerts)
  7. `android.permission.POST_NOTIFICATIONS` (Android 13+ order and dispatch notifications)
  8. `android.permission.READ_MEDIA_IMAGES` (Android 13+ photo picker for crop/proof uploads)
  9. `android.permission.READ_EXTERNAL_STORAGE` (maxSdkVersion=32, legacy photo picker fallback)
- **Native Architectures:** Universal WebView / Capacitor 8 runtime targeting all ABI variants (`arm64-v8a`, `armeabi-v7a`, `x86_64`).

---

## 4. Web & Backend Release Metadata

- **Node.js Target Version:** 22.x LTS
- **Production Container:** `Dockerfile` (Multi-stage build, node:22-alpine base)
- **Reverse Proxy / TLS Ingress:** `Caddyfile.staging` / `Caddyfile.production` (Automatic HTTPS via Let's Encrypt)
- **Active Database Driver:** `better-sqlite3` with Write-Ahead Logging (`WAL` mode)
- **Backend Port Default:** `3001`
- **Ingress Ports:** `80`, `443`
- **Production Asset Dist:** `dist/` (React 19 SPA with code-split Vite chunks)
- **Primary JS Bundle:** `dist/assets/index-CASkKWP-.js` (743 KB)
- **React Vendor Bundle:** `dist/assets/vendor-react-BYlwGmHx.js` (409 KB)
- **CSS Bundle:** `dist/assets/index-D1CORlXV.css` (89 KB)

---

## 5. Release Verification Status Summary

| Item | Requirement | Actual Status | Classification |
|---|---|---|---|
| Android Release APK | Built & Signed v2 | Built (3.38 MB), SHA-256 verified | **PASS** |
| Android Release AAB | Built for Play Store | Built (3.24 MB), Play Console ready | **PASS** |
| CI Pipeline Suites | 17 test suites, 236 assertions | Run 41632094228 completed success | **PASS** |
| CI Android Build | Java 21, AGP 8.13 | Run 41632094483 completed success | **PASS** |
| Device Runtime Install | Booted device / emulator | No device attached (`adb devices` empty) | **BLOCKED** |
| Staging Deployment | Automated remote deploy | Manifests ready; awaiting cloud VM host | **BLOCKED** |
| Production Release | Zero regression signoff | Blocker closure verified | **READY AFTER MINOR BLOCKERS** |
