# 🔐 HALDER Android App — Production Release Signing Guide

This guide describes how to securely generate release signing keys and build the production **Android App Bundle (.aab)** for Google Play Console submission.

---

## 1. Security Directive: Zero Secrets in Source Control
In accordance with production security standards:
- **NEVER** commit `.keystore`, `.jks`, or plaintext passwords to Git.
- The `android/.gitignore` file automatically excludes `*.keystore`, `*.jks`, and `local.properties`.
- Build configurations in `android/app/build.gradle` read signing credentials exclusively from environment variables.

---

## 2. Generate Production Release Keystore

Run the following command in your terminal using the JDK `keytool` utility:

```bash
keytool -genkey -v -keystore halder-release.jks \
    -alias halder-release \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=HALDER Marketplace, OU=Mobile, O=HALDER Tech, L=Dehradun, ST=Uttarakhand, C=IN"
```

> **Security Note**: Store `halder-release.jks` in a secure password manager or offline cold storage. If you lose this key before enabling **Google Play App Signing**, you will not be able to push updates.

---

## 3. Configure Release Environment Variables

Before building your production release bundle, export the following environment variables:

### Windows (PowerShell):
```powershell
$env:KEYSTORE_PATH = "C:\path\to\halder-release.jks"
$env:KEYSTORE_PASSWORD = "YourStrongKeystorePassword"
$env:KEY_ALIAS = "halder-release"
$env:KEY_PASSWORD = "YourStrongKeyPassword"
```

### macOS / Linux / CI (GitHub Actions):
```bash
export KEYSTORE_PATH="/path/to/halder-release.jks"
export KEYSTORE_PASSWORD="YourStrongKeystorePassword"
export KEY_ALIAS="halder-release"
export KEY_PASSWORD="YourStrongKeyPassword"
```

---

## 4. Build Commands

### A. Build Production Release Android App Bundle (.aab)
```bash
npm run build:aab
```
*Output location*: `android/app/build/outputs/bundle/release/app-release.aab`

### B. Build Production Debug APK (for physical device testing)
```bash
npm run build:apk
```
*Output location*: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 5. Google Play App Signing (Recommended)
1. In Google Play Console, go to **Release** > **Setup** > **App integrity**.
2. Opt in to **Google Play App Signing**.
3. Upload `app-release.aab`. Google Play automatically manages your production key while optimizing download sizes via dynamic feature delivery.
