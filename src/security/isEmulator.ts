import { NativeModules, Platform } from 'react-native';

type DeviceSecurityEmulatorModule = {
  isEmulator: () => Promise<boolean>;
};

function getDeviceSecurityModule(): DeviceSecurityEmulatorModule | undefined {
  return NativeModules.DeviceSecurityModule as DeviceSecurityEmulatorModule | undefined;
}

export async function isEmulator(): Promise<boolean> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return false;
  }

  const deviceSecurityModule = getDeviceSecurityModule();
  if (!deviceSecurityModule?.isEmulator) {
    return false;
  }

  try {
    const emulator = await deviceSecurityModule.isEmulator();

    if (__DEV__) {
      console.log('[DeviceSecurity] Emulator check', { emulator });
    }

    return emulator;
  } catch {
    return false;
  }
}
