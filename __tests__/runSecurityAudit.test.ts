/**
 * @format
 */

import JailMonkey from 'jail-monkey';
import { Platform } from 'react-native';
import { isAdbConnectedToHost } from '../src/security/isAdbConnectedToHost';
import { isEmulator } from '../src/security/isEmulator';
import {
  runSecurityAudit,
  SECURITY_BLOCK_THRESHOLD,
} from '../src/security/runSecurityAudit';

jest.mock('../src/security/isAdbConnectedToHost', () => ({
  isAdbConnectedToHost: jest.fn(),
  subscribeToAdbConnectionChanges: jest.fn(() => () => {}),
}));

jest.mock('../src/security/isEmulator', () => ({
  isEmulator: jest.fn(),
}));

jest.mock('jail-monkey', () => ({
  __esModule: true,
  default: {
    isJailBroken: jest.fn(() => false),
    jailBrokenMessage: jest.fn(() => ''),
    rootedDetectionMethods: jest.fn(() => ({
      jailMonkey: false,
      rootBeer: {
        detectRootManagementApps: false,
        detectPotentiallyDangerousApps: false,
        checkForSuBinary: false,
        checkForDangerousProps: false,
        checkForRWPaths: false,
        detectTestKeys: false,
        checkSuExists: false,
        checkForRootNative: false,
        checkForMagiskBinary: false,
      },
    })),
    hookDetected: jest.fn(() => false),
    isOnExternalStorage: jest.fn(() => false),
    AdbEnabled: jest.fn(() => true),
    isDebuggedMode: jest.fn(async () => true),
    isDevelopmentSettingsMode: jest.fn(async () => true),
  },
}));

const mockedIsAdbConnectedToHost = isAdbConnectedToHost as jest.MockedFunction<
  typeof isAdbConnectedToHost
>;
const mockedIsEmulator = isEmulator as jest.MockedFunction<typeof isEmulator>;

describe('runSecurityAudit', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    mockedIsAdbConnectedToHost.mockResolvedValue(false);
    mockedIsEmulator.mockResolvedValue(false);
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    jest.clearAllMocks();
  });

  test('blocks on Android when emulator is detected', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    mockedIsEmulator.mockResolvedValue(true);

    const result = await runSecurityAudit();

    expect(result.score).toBeGreaterThanOrEqual(SECURITY_BLOCK_THRESHOLD);
    expect(result.shouldBlock).toBe(true);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'emulator-detected',
          label: 'Application is running on an emulator or simulator',
          score: 100,
        }),
      ]),
    );
  });

  test('blocks on iOS when simulator is detected', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    mockedIsEmulator.mockResolvedValue(true);

    const result = await runSecurityAudit();

    expect(result.score).toBeGreaterThanOrEqual(SECURITY_BLOCK_THRESHOLD);
    expect(result.shouldBlock).toBe(true);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'emulator-detected',
          score: 100,
        }),
      ]),
    );
    expect(mockedIsAdbConnectedToHost).not.toHaveBeenCalled();
  });

  test('continues audit when isEmulator throws', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    mockedIsEmulator.mockRejectedValue(new Error('emulator check unavailable'));

    const result = await runSecurityAudit();

    expect(result.shouldBlock).toBe(false);
    expect(result.findings).toHaveLength(0);
  });

  test('does not block when developer settings are off or ADB is not connected', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    mockedIsAdbConnectedToHost.mockResolvedValue(false);

    const result = await runSecurityAudit();

    expect(result.score).toBe(0);
    expect(result.shouldBlock).toBe(false);
    expect(result.findings).toHaveLength(0);
  });

  test('blocks on Android when ADB is connected to a host', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    mockedIsAdbConnectedToHost.mockResolvedValue(true);

    const result = await runSecurityAudit();

    expect(result.score).toBeGreaterThanOrEqual(SECURITY_BLOCK_THRESHOLD);
    expect(result.shouldBlock).toBe(true);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'adb-connected',
          label: 'Device is connected to a computer via USB or wireless debugging',
          score: 100,
        }),
      ]),
    );
  });

  test('does not block from jail-monkey AdbEnabled alone when not connected', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    mockedIsAdbConnectedToHost.mockResolvedValue(false);

    const result = await runSecurityAudit();

    expect(result.shouldBlock).toBe(false);
    expect(mockedIsAdbConnectedToHost).toHaveBeenCalled();
  });

  test('blocks on iOS when jailbroken', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    (JailMonkey as jest.Mocked<typeof JailMonkey>).isJailBroken.mockReturnValue(true);
    (JailMonkey as jest.Mocked<typeof JailMonkey>).jailBrokenMessage.mockReturnValue(
      'Cydia detected',
    );

    const result = await runSecurityAudit();

    expect(result.score).toBeGreaterThanOrEqual(SECURITY_BLOCK_THRESHOLD);
    expect(result.shouldBlock).toBe(true);
    expect(result.findings[0]?.label).toBe('Cydia detected');
    expect(mockedIsAdbConnectedToHost).not.toHaveBeenCalled();
  });

  test('blocks on Android when two strong root checks fire', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    (JailMonkey as jest.Mocked<
      typeof JailMonkey & { rootedDetectionMethods: jest.Mock }
    >).rootedDetectionMethods.mockReturnValue({
      jailMonkey: false,
      rootBeer: {
        detectRootManagementApps: false,
        detectPotentiallyDangerousApps: false,
        checkForSuBinary: true,
        checkForDangerousProps: false,
        checkForRWPaths: false,
        detectTestKeys: false,
        checkSuExists: false,
        checkForRootNative: false,
        checkForMagiskBinary: true,
      },
    });

    const result = await runSecurityAudit();

    expect(result.score).toBe(100);
    expect(result.shouldBlock).toBe(true);
    expect(result.findings).toHaveLength(2);
  });

  test('skips rooted detection when jail-monkey throws but still runs ADB check', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    (JailMonkey as jest.Mocked<
      typeof JailMonkey & { rootedDetectionMethods: jest.Mock }
    >).rootedDetectionMethods.mockImplementation(() => {
      throw new Error('ClassCastException: HashMap cannot be cast to Boolean');
    });
    mockedIsAdbConnectedToHost.mockResolvedValue(true);

    const result = await runSecurityAudit();

    expect(mockedIsAdbConnectedToHost).toHaveBeenCalled();
    expect(result.shouldBlock).toBe(true);
    expect(result.findings).toEqual([
      expect.objectContaining({ id: 'adb-connected', score: 100 }),
    ]);
  });

  test('does not block when only jail-monkey throws and ADB is not connected', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    (JailMonkey as jest.Mocked<
      typeof JailMonkey & { rootedDetectionMethods: jest.Mock }
    >).rootedDetectionMethods.mockImplementation(() => {
      throw new Error('ClassCastException: HashMap cannot be cast to Boolean');
    });
    mockedIsAdbConnectedToHost.mockResolvedValue(false);

    const result = await runSecurityAudit();

    expect(result.shouldBlock).toBe(false);
    expect(result.score).toBe(0);
    expect(result.findings).toHaveLength(0);
  });

  test('continues audit when hookDetected throws', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    (JailMonkey as jest.Mocked<typeof JailMonkey>).hookDetected.mockImplementation(
      () => {
        throw new Error('hook detection unavailable');
      },
    );
    mockedIsAdbConnectedToHost.mockResolvedValue(false);

    const result = await runSecurityAudit();

    expect(result.shouldBlock).toBe(false);
    expect(result.findings).toHaveLength(0);
  });

  test('continues audit when isOnExternalStorage throws', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    (
      JailMonkey as jest.Mocked<typeof JailMonkey>
    ).isOnExternalStorage.mockImplementation(() => {
      throw new Error('external storage check unavailable');
    });
    mockedIsAdbConnectedToHost.mockResolvedValue(true);

    const result = await runSecurityAudit();

    expect(result.shouldBlock).toBe(true);
    expect(result.findings).toEqual([
      expect.objectContaining({ id: 'adb-connected', score: 100 }),
    ]);
  });

  test('does not produce a finding when isJailBroken throws on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    (JailMonkey as jest.Mocked<typeof JailMonkey>).isJailBroken.mockImplementation(
      () => {
        throw new Error('jailbreak check unavailable');
      },
    );

    const result = await runSecurityAudit();

    expect(result.shouldBlock).toBe(false);
    expect(result.findings).toHaveLength(0);
  });
});
