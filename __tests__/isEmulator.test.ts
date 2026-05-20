/**
 * @format
 */

import { NativeModules, Platform } from 'react-native';
import { isEmulator } from '../src/security/isEmulator';

describe('isEmulator', () => {
  const originalPlatform = Platform.OS;
  const originalDev = (global as { __DEV__?: boolean }).__DEV__;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    (global as { __DEV__?: boolean }).__DEV__ = originalDev;
    jest.clearAllMocks();
    NativeModules.DeviceSecurityModule = undefined;
  });

  test('returns false on unsupported platforms', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });

    await expect(isEmulator()).resolves.toBe(false);
  });

  test('uses native module on Android when available', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    NativeModules.DeviceSecurityModule = {
      isEmulator: jest.fn().mockResolvedValue(true),
    };

    await expect(isEmulator()).resolves.toBe(true);
    expect(NativeModules.DeviceSecurityModule.isEmulator).toHaveBeenCalled();
  });

  test('uses native module on iOS when available', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    NativeModules.DeviceSecurityModule = {
      isEmulator: jest.fn().mockResolvedValue(true),
    };

    await expect(isEmulator()).resolves.toBe(true);
    expect(NativeModules.DeviceSecurityModule.isEmulator).toHaveBeenCalled();
  });

  test('returns false when native module is missing', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

    await expect(isEmulator()).resolves.toBe(false);
  });

  test('returns false when native module throws', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    NativeModules.DeviceSecurityModule = {
      isEmulator: jest.fn().mockRejectedValue(new Error('native failure')),
    };

    await expect(isEmulator()).resolves.toBe(false);
  });

  test('returns false when native reports not an emulator', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    NativeModules.DeviceSecurityModule = {
      isEmulator: jest.fn().mockResolvedValue(false),
    };

    await expect(isEmulator()).resolves.toBe(false);
  });
});
