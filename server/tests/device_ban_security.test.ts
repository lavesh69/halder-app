import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DeviceBanService } from '../src/services/deviceBanService';
import { Database } from '../src/db/database';

describe('Permanent Hardware Device Ban Security Suite', () => {
  it('1. Initializes banned_devices schema properly', () => {
    DeviceBanService.initTable();
    const table = Database.get<any>(`SELECT name FROM sqlite_master WHERE type='table' AND name='banned_devices'`);
    assert.ok(table, 'banned_devices table must exist');
  });

  it('2. Blacklists a device by hardware ID and enforces restriction', () => {
    const testDeviceId = `test-hw-uuid-${Date.now()}`;
    const testFp = `test-fp-${Date.now()}`;

    // Initially not banned
    const check1 = DeviceBanService.isDeviceBanned(testDeviceId, testFp);
    assert.strictEqual(check1.banned, false);

    // Ban device
    const banRes = DeviceBanService.banDevice({
      deviceId: testDeviceId,
      fingerprint: testFp,
      reason: 'Automated Security Fraud Detection',
      bannedBy: 'Security Lead',
      deviceModel: 'Samsung Galaxy Ultra',
    });
    assert.strictEqual(banRes.success, true);

    // Now it must be banned
    const check2 = DeviceBanService.isDeviceBanned(testDeviceId, testFp);
    assert.strictEqual(check2.banned, true);
    assert.strictEqual(check2.banInfo.reason, 'Automated Security Fraud Detection');
    assert.strictEqual(check2.banInfo.device_model, 'Samsung Galaxy Ultra');

    // Matching only by fingerprint must also trigger ban
    const checkFp = DeviceBanService.isDeviceBanned(null, testFp);
    assert.strictEqual(checkFp.banned, true);

    // Matching only by device ID must also trigger ban
    const checkId = DeviceBanService.isDeviceBanned(testDeviceId, null);
    assert.strictEqual(checkId.banned, true);
  });

  it('3. Unbanning revokes hardware blacklist', () => {
    const testDeviceId = `test-unban-${Date.now()}`;
    const banRes = DeviceBanService.banDevice({
      deviceId: testDeviceId,
      reason: 'Temporary investigation',
    });

    const unbanRes = DeviceBanService.unbanDevice(banRes.banId);
    assert.strictEqual(unbanRes.success, true);

    const check = DeviceBanService.isDeviceBanned(testDeviceId, null);
    assert.strictEqual(check.banned, false);
  });

  it('4. Listing banned devices returns active blacklist', () => {
    const list = DeviceBanService.listBannedDevices();
    assert.ok(Array.isArray(list), 'List must be an array');
    assert.ok(list.length >= 1, 'Must contain active bans');
  });
});
