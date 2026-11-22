import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';

export interface DeviceSecurityProfile {
  deviceId: string;
  fingerprint: string;
  model: string;
  platform: 'android' | 'ios' | 'web';
  osVersion: string;
}

let cachedProfile: DeviceSecurityProfile | null = null;

/**
 * Deterministically computes a hardware/canvas fingerprint hash in browser environments.
 * Survives cookie and storage deletion.
 */
function generateBrowserHardwareHash(): string {
  if (typeof window === 'undefined') return 'server-env';

  const components: string[] = [];

  // 1. Screen & Hardware features
  components.push(`${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`);
  components.push(`ratio:${window.devicePixelRatio || 1}`);
  components.push(`cores:${navigator.hardwareConcurrency || 4}`);
  components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  components.push(`lang:${navigator.language}`);

  // 2. WebGL GPU Renderer Identification
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        components.push(`gpu:${vendor}~${renderer}`);
      }
    }
  } catch {}

  // 3. Canvas 2D Cryptographic Rendering Hash
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = "14px 'Arial', sans-serif";
      ctx.fillStyle = '#176B45';
      ctx.fillRect(0, 0, 100, 30);
      ctx.fillStyle = '#F2F5F3';
      ctx.fillText('HALDHAR-HARDWARE-SHIELD-2026', 2, 2);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('HALDHAR-HARDWARE-SHIELD-2026', 4, 4);
      components.push(`canvas:${canvas.toDataURL().slice(-40)}`);
    }
  } catch {}

  // Hash components string into deterministic hex string (FNV-1a 64-bit style)
  const rawStr = components.join('||');
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < rawStr.length; i++) {
    const ch = rawStr.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 'fp-' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

/**
 * Multi-layer storage retrieval to ensure persistent device UUID survives cache clears.
 */
function getPersistentWebDeviceId(): string {
  if (typeof window === 'undefined') return 'srv-dev-uuid';

  const STORAGE_KEY = 'halder_permanent_device_id';

  // 1. Try localStorage
  let devId = localStorage.getItem(STORAGE_KEY);
  if (devId && devId.startsWith('hal-dev-')) return devId;

  // 2. Try cookie
  try {
    const match = document.cookie.match(new RegExp('(^| )' + STORAGE_KEY + '=([^;]+)'));
    if (match && match[2] && match[2].startsWith('hal-dev-')) {
      devId = match[2];
      localStorage.setItem(STORAGE_KEY, devId);
      return devId;
    }
  } catch {}

  // 3. Generate fresh cryptographic UUID
  const randomPart = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  devId = `hal-dev-${Date.now().toString(36)}-${randomPart}`;

  // Persist across stores
  try {
    localStorage.setItem(STORAGE_KEY, devId);
  } catch {}

  try {
    // 10-year cookie
    document.cookie = `${STORAGE_KEY}=${devId}; path=/; max-age=315360000; SameSite=Lax`;
  } catch {}

  return devId;
}

/**
 * Returns the device's hardware identification profile.
 * On Android: Uses Capacitor Device ID (SSAID hardware identifier).
 * On Web: Combines persistent storage and hardware canvas fingerprint.
 */
export async function getDeviceSecurityProfile(): Promise<DeviceSecurityProfile> {
  if (cachedProfile) return cachedProfile;

  try {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      const idInfo = await Device.getId();
      const devInfo = await Device.getInfo();

      cachedProfile = {
        deviceId: idInfo?.identifier || `native-${devInfo.platform}-${Date.now()}`,
        fingerprint: `hw-${devInfo.manufacturer}-${devInfo.model}-${idInfo?.identifier || 'native'}`,
        model: `${devInfo.manufacturer || ''} ${devInfo.model || 'Android Device'}`.trim(),
        platform: (devInfo.platform as 'android' | 'ios') || 'android',
        osVersion: devInfo.osVersion || '',
      };
      return cachedProfile;
    }
  } catch (e) {
    console.warn('[DeviceSecurity] Capacitor device lookup fallback:', e);
  }

  // Web Browser fallback
  const webId = getPersistentWebDeviceId();
  const hardwareHash = generateBrowserHardwareHash();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Browser';
  let model = 'Web Browser';
  if (/Android/i.test(ua)) model = 'Android Mobile Browser';
  else if (/iPhone|iPad/i.test(ua)) model = 'Apple Mobile Browser';
  else if (/Windows/i.test(ua)) model = 'Windows PC';
  else if (/Mac/i.test(ua)) model = 'Mac OS';
  else if (/Linux/i.test(ua)) model = 'Linux Desktop';

  cachedProfile = {
    deviceId: webId,
    fingerprint: hardwareHash,
    model,
    platform: 'web',
    osVersion: '',
  };

  return cachedProfile;
}
