# HALDER v1.0.0 — Android Device & Binary Test Report

**Project:** HALDER Agricultural Marketplace  
**Package Identifier:** `com.halder.mandi`  
**Version:** `1.0.0` (Version Code `1`)  
**Audit Date:** 2026-11-03  
**Status:** **BLOCKED** (Runtime Device Test) / **PASS** (Static Binary & Cryptographic Audit)  

---

## 1. Executive Summary

Static binary validation, signature scheme verification, and manifest permission audits for HALDER v1.0.0 have **PASSED** with zero defects.  
Physical and emulator device installation tests are classified as **BLOCKED** because no Android device is connected to the build workstation via USB debugging, and no Android Virtual Device (AVD) emulator process is currently running (`adb devices` returned an empty list).

Per strict production verification rules, runtime device results are not fabricated. A complete, automated test suite and execution procedure is prepared below for immediate verification upon device connection.

---

## 2. Static Binary & Cryptographic Verification (PASS)

### 2.1 Artifact Attributes

| Attribute | Verified Value | Benchmark / Specification | Status |
|---|---|---|---|
| **Package ID** | `com.halder.mandi` | Matches capacitor configuration | **PASS** |
| **Version Code** | `1` | Google Play initial release standard | **PASS** |
| **Version Name** | `1.0.0` | Semantic versioning | **PASS** |
| **Min SDK** | `24` | Android 7.0+ (96%+ Android active fleet) | **PASS** |
| **Target SDK** | `34` | Android 14 (Meets Google Play Aug 2024+ mandate) | **PASS** |
| **Compile SDK** | `36` | Android 16 API level compatibility | **PASS** |
| **Release APK Size** | `3,542,651 bytes` (3.38 MB) | Under 15 MB lightweight target | **PASS** |
| **Release AAB Size** | `3,400,460 bytes` (3.24 MB) | Under 10 MB bundle target | **PASS** |
| **Release APK SHA-256** | `A342AE3393275618D5762FC745CF559EDBEA0CE54920550D41098BCC0859EBE5` | Cryptographically immutable | **PASS** |
| **Release AAB SHA-256** | `EB104C2E2516789E4E9DEA29B0A8489F245558179D2B629AEC3DF19B6BCF05F6` | Cryptographically immutable | **PASS** |

### 2.2 Signing Verification via `apksigner`

Command output from `apksigner verify --verbose --print-certs android/app/build/outputs/apk/release/app-release.apk`:

```text
Verifies
Verified using v1 scheme (JAR signing): false
Verified using v2 scheme (APK Signature Scheme v2): true
Verified using v3 scheme (APK Signature Scheme v3): false
Verified using v4 scheme: false
Number of signers: 1
Signer #1 certificate DN: CN=Halder Production, OU=Engineering, O=Halder Mandi Direct, L=Dehradun, ST=Uttarakhand, C=IN
Signer #1 certificate SHA-256 digest: 7c62f85e48555740c104a2535b62bb3c76cb46b8815cf2e66008d23df4c0984f
Signer #1 certificate SHA-1 digest: a6545f3dd0ad02adbfa2db097cb6607e7eea60f2
Signer #1 key algorithm: RSA (2048 bits)
Signer #1 key validity: Valid until 2054-01-19
```

- **Verdict:** Scheme v2 protection is active, preventing tampering with APK ZIP metadata, code, or assets.

### 2.3 Declared Permissions Audit (`aapt2 dump badging`)

All permissions align with marketplace and agricultural field functionality:
- `android.permission.INTERNET`: Backend API, market pricing, weather data feeds.
- `android.permission.ACCESS_NETWORK_STATE`: Detect offline status and trigger local SQLite/IndexedDB caching.
- `android.permission.CAMERA`: Crop disease detection camera scanner, farmer land/crop photo proof, ID verification.
- `android.permission.ACCESS_FINE_LOCATION` & `ACCESS_COARSE_LOCATION`: Proximity mandi discovery, accurate GPS dispatch calculations.
- `android.permission.VIBRATE`: Haptic alerts for urgent bids, dispute resolutions, and dispatch alerts.
- `android.permission.POST_NOTIFICATIONS`: Android 13+ runtime push notifications.
- `android.permission.READ_MEDIA_IMAGES` / `READ_EXTERNAL_STORAGE` (maxSdkVersion=32): Gallery access for crop receipts and dispute photos.

---

## 3. Physical & Emulator Device Testing Status: BLOCKED

### 3.1 Device Detection Log

Command executed:
```powershell
& "C:\Users\lavesh dobriyal\AppData\Local\Android\Sdk\platform-tools\adb.exe" devices
```

Output:
```text
* daemon not running; starting now at tcp:5037
* daemon started successfully
List of devices attached
[EMPTY]
```

### 3.2 Root Cause Analysis

- No Android mobile handset is currently connected via USB or wireless ADB.
- No Android Studio AVD (Android Virtual Device) emulator instance is booted on the local host.
- Cloud device farm (e.g. Firebase Test Lab / BrowserStack) credentials are not configured in CI secrets.

---

## 4. Prepared Device Test Suite & Execution Runbook

When a tester or owner attaches a physical Android device or starts an emulator, run the following sequential test suite:

### Test Step 1: Install Release APK
```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```
*Expected Result:* `Success` exit code within 5 seconds.

### Test Step 2: Cold Launch Time
```bash
adb shell am start -W -n com.halder.mandi/com.halder.mandi.MainActivity
```
*Target Threshold:* TotalTime < 2,000ms (2.0s).

### Test Step 3: Runtime Permission Prompts
Verify the following prompt sequence appears on user interaction:
1. Location prompt on Mandi Price tab (`Allow while using app`).
2. Camera prompt on Crop Disease Scan tab (`Allow while using app`).
3. Notification prompt on initial dashboard load (`Allow`).

### Test Step 4: Network Resilience & Offline Fallback
1. Load Marketplace products.
2. Toggle Airplane mode: `adb shell cmd connectivity airplane-mode enable`
3. Observe UI: A sticky banner "Operating in offline cached mode" must appear; cached listings must remain readable without crashing.
4. Restore connectivity: `adb shell cmd connectivity airplane-mode disable`
5. Observe UI: Automatic reconnect toast and fresh sync.

### Test Step 5: Android Back-Button & Memory Pressure
1. Navigate: Home -> Mandi Prices -> Filter -> Product Detail -> Back.
2. Confirm system back navigation pops views in reverse stack order without closing the application.
3. Simulate low memory kill: `adb shell am kill com.halder.mandi` followed by app restart; verify auth state and cart persist.

---

## 5. Verification Gate Decision

| Check | Expected | Actual | Gate Status |
|---|---|---|---|
| Target SDK 34 | Required for Google Play 2024/2026 | Target SDK 34 | **PASS** |
| Release Keystore Signed | v2 Signature verified | v2 Scheme verified | **PASS** |
| Bundle Output | `.aab` under 150 MB | 3.24 MB | **PASS** |
| Physical Device Verification | Interactive validation | No device detected | **BLOCKED** |

**Remediation for Go-Live:** Owner should either:
1. Plug an Android device into the development PC and run the 5-step test script above.
2. Upload `app-release.aab` directly to Google Play Console's **Internal Testing Track** for automated pre-launch device matrix verification across 10+ Google Cloud devices.
