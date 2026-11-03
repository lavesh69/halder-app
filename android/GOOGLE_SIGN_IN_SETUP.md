# HALDER — Google Sign-In / OAuth 2.0 Configuration Guide

This guide documents the exact Google Cloud Console setup required for Google Sign-In across HALDER Web and the Android Native application (`com.halder.mandi`).

---

## 1. Google Cloud Console Project Setup

1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select your project: **HALDER Marketplace** (`halder-marketplace`).
3. Navigate to **APIs & Services** → **OAuth consent screen**:
   * **User Type**: External
   * **App Name**: HALDER
   * **User Support Email**: `support@halder.in`
   * **Developer Contact**: `admin@halder.in`
   * **Authorized Domains**: `halder.in`, `trycloudflare.com`
   * **Scopes Requested**:
     * `openid`
     * `https://www.googleapis.com/auth/userinfo.email`
     * `https://www.googleapis.com/auth/userinfo.profile`

---

## 2. Web OAuth Client ID (For Web App & Backend Token Verification)

1. In Google Cloud Console, navigate to **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
2. Select **Application type**: **Web application**.
3. Name: `HALDER Web & Backend API Client`.
4. **Authorized JavaScript origins**:
   * `http://localhost:5173`
   * `http://localhost:4173`
   * `https://develops-mat-eval-make.trycloudflare.com`
   * `https://halder.in` (Production domain)
5. Copy the generated **Client ID** (e.g., `1234567890-abcdefg.apps.googleusercontent.com`).
6. Set in environment:
   * Backend `.env`: `GOOGLE_CLIENT_ID=1234567890-abcdefg.apps.googleusercontent.com`
   * Frontend `.env`: `VITE_GOOGLE_CLIENT_ID=1234567890-abcdefg.apps.googleusercontent.com`

---

## 3. Android OAuth Client ID (For Android Native App)

1. In Google Cloud Console, click **Create Credentials** → **OAuth client ID**.
2. Select **Application type**: **Android**.
3. Name: `HALDER Android Client`.
4. **Package name**:
   ```text
   com.halder.mandi
   ```
5. **SHA-1 Certificate Fingerprint**:
   * **Debug Keystore** (for local testing & development):
     ```bash
     keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
     ```
   * **Release Keystore** (for Google Play Console / Release AAB):
     ```bash
     keytool -list -v -keystore halder-release-key.jks -alias halder-key-alias
     ```
6. Copy the resulting SHA-1 fingerprint (e.g., `AA:BB:CC:DD:...`) and paste it into the Google Cloud Console.

---

## 4. Architectural Data Flow & Security Guarantees

1. **Stable Subject ID**: HALDER records Google's immutable `sub` identifier in `auth_identities(provider_user_id)` with a `UNIQUE(provider, provider_user_id)` constraint.
2. **Sequential HALDER ID**: New customers automatically receive `HAL-CUS-XXXXXXXX`, while new farmers receive `HAL-FRM-XXXXXXXX`.
3. **Account Linking**: If an existing account with the same verified email signs in with Google, HALDER links the Google identity to the existing account rather than duplicating accounts.
4. **Role Safety**: Google self-registration cannot create `admin` accounts (rejected with HTTP `403 Forbidden`).
5. **Session**: HALDER returns an authenticated HS256 JWT session cookie, independent of the external Google token.
