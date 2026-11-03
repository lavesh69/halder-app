# HALDER v1.0 — Release Manifest

**Project:** HALDER (Direct Mandi & Agricultural Marketplace)  
**Release Version:** v1.0  
**Commit SHA:** `375c688` (main)  
**Date:** 2026-11-03  
**Engineering Authority:** Principal Release & DevOps Engineering  

---

## 1. Release Artifact Summary

| Property | Debug APK | Release APK | Release AAB (Play Store) |
|---|---|---|---|
| **File Path** | `android/app/build/outputs/apk/debug/app-debug.apk` | `android/app/build/outputs/apk/release/app-release.apk` | `android/app/build/outputs/bundle/release/app-release.aab` |
| **Package Name** | `com.halder.mandi` | `com.halder.mandi` | `com.halder.mandi` |
| **Version Code** | `1` | `1` | `1` |
| **Version Name** | `1.0.0` | `1.0.0` | `1.0.0` |
| **Min SDK** | 24 (Android 7.0 Nougat) | 24 (Android 7.0 Nougat) | 24 (Android 7.0 Nougat) |
| **Target SDK** | 34 (Android 14 UpsideDownCake) | 34 (Android 14 UpsideDownCake) | 34 (Android 14 UpsideDownCake) |
| **Compile SDK** | 36 (Android 16) | 36 (Android 16) | 36 (Android 16) |
| **File Size (Local)** | 4,680,854 bytes (4.46 MB) | 3,542,651 bytes (3.38 MB) | 3,400,460 bytes (3.24 MB) |
| **SHA-256 Checksum** | `4AD78C1003F9EE84EDBB2EBBED8BC3139C63426A395C4EB8A6A6910E6C426750` | `A342AE3393275618D5762FC745CF559EDBEA0CE54920550D41098BCC0859EBE5` | `EB104C2E2516789E4E9DEA29B0A8489F245558179D2B629AEC3DF19B6BCF05F6` |
| **Build Timestamp** | 2026-11-03 12:09:00 IST | 2026-11-03 12:10:49 IST | 2026-11-03 12:10:03 IST |
| **Signing Status** | Signed (Android Debug Key) | VERIFIED (APK Signature Scheme v2) | VERIFIED (Release Key Configured) |
| **Installation Status**| NOT TESTED (No attached physical device or booted emulator) | NOT TESTED (Requires adb target) | Play Console Ready (Bundle format) |

---

## 2. Release Signature Details

Cryptographic verification performed via Android SDK `apksigner verify --verbose --print-certs`:

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

## 3. GitHub Actions CI/CD Verified Artifacts

- **Workflow File:** `.github/workflows/build-apk.yml`
- **Workflow Name:** `Build HALDER Android APK & Release AAB`
- **Workflow Run ID:** `41631538860`
- **Workflow Run Status:** **SUCCESS**
- **Workflow Run URL:** https://github.com/lavesh69/halder-app/actions/runs/41631538860
- **Artifact Retention:** 30 Days

### Uploaded Release Artifacts (Publicly Downloadable):

| Artifact Name | Artifact ID | Size on GitHub | Status |
|---|---|---|---|
| **`HALDER-v1.0-debug-APK`** | `13228052851` | 4,107,860 bytes (3.92 MB) | **AVAILABLE (30-day retention)** |
| **`HALDER-v1.0-release-AAB`** | `13227664582` | 3,214,330 bytes (3.07 MB) | **AVAILABLE (30-day retention)** |

---

## 4. Hardware Verification / Installation Note

- `adb devices` execution returned an empty list (0 devices / emulators attached).
- In accordance with non-fabrication principles, local device/emulator installation testing is explicitly classified as **NOT TESTED**.
- Static bytecode, manifest permissions (`INTERNET`, `ACCESS_FINE_LOCATION`, `CAMERA`, `POST_NOTIFICATIONS`), and layout bundle integrity are 100% verified via `aapt2` and `apksigner`.
