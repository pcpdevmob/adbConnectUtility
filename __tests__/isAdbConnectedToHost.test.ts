/**
 * @format
 */

import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import {
  getAdbConnectionDiagnostics,
  isAdbConnectedToHost,
  subscribeToAdbConnectionChanges,
} from '../src/security/isAdbConnectedToHost';

describe('isAdbConnectedToHost', () => {
  const originalPlatform = Platform.OS;
  const originalDev = (global as { __DEV__?: boolean }).__DEV__;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    (global as { __DEV__?: boolean }).__DEV__ = originalDev;
    jest.clearAllMocks();
    NativeModules.DeviceSecurityModule = undefined;
  });

  test('returns false on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    await expect(isAdbConnectedToHost()).resolves.toBe(false);
  });

  test('uses native module on Android when available', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    NativeModules.DeviceSecurityModule = {
      isAdbConnectedToHost: jest.fn().mockResolvedValue(true),
      getAdbConnectionDiagnostics: jest.fn().mockResolvedValue({
        connected: true,
        usbPath: true,
        wirelessPath: false,
        adbEnabled: true,
        wirelessAdbEnabled: false,
        devOptionsEnabled: true,
        usbConnected: true,
        usbConfigured: true,
        usbConfig: 'mtp,adb',
        usbState: 'CONFIGURED',
        adbdRunning: true,
      }),
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    };

    await expect(isAdbConnectedToHost()).resolves.toBe(true);
    expect(NativeModules.DeviceSecurityModule.isAdbConnectedToHost).toHaveBeenCalled();
  });

  test('returns false when native module is missing', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

    await expect(isAdbConnectedToHost()).resolves.toBe(false);
  });

  test('returns false when native module throws', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    NativeModules.DeviceSecurityModule = {
      isAdbConnectedToHost: jest.fn().mockRejectedValue(new Error('native failure')),
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    };

    await expect(isAdbConnectedToHost()).resolves.toBe(false);
  });

  test('getAdbConnectionDiagnostics returns native diagnostics', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const diagnostics = {
      connected: false,
      usbPath: false,
      wirelessPath: false,
      adbEnabled: false,
      wirelessAdbEnabled: false,
      devOptionsEnabled: false,
      usbConnected: false,
      usbConfigured: false,
      usbConfig: '',
      usbState: '',
      adbdRunning: false,
    };

    NativeModules.DeviceSecurityModule = {
      isAdbConnectedToHost: jest.fn(),
      getAdbConnectionDiagnostics: jest.fn().mockResolvedValue(diagnostics),
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    };

    await expect(getAdbConnectionDiagnostics()).resolves.toEqual(diagnostics);
  });

  test('subscribeToAdbConnectionChanges registers and removes listener', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const remove = jest.fn();
    const addListener = jest.fn(() => ({ remove }));

    NativeModules.DeviceSecurityModule = {
      isAdbConnectedToHost: jest.fn(),
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    };

    jest.spyOn(NativeEventEmitter.prototype, 'addListener').mockImplementation(addListener);

    const listener = jest.fn();
    const unsubscribe = subscribeToAdbConnectionChanges(listener);

    expect(addListener).toHaveBeenCalledWith('AdbConnectionChanged', listener);
    unsubscribe();
    expect(remove).toHaveBeenCalled();
  });

  test('subscribeToAdbConnectionChanges is a no-op on iOS', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    const unsubscribe = subscribeToAdbConnectionChanges(jest.fn());
    expect(() => unsubscribe()).not.toThrow();
  });
});
