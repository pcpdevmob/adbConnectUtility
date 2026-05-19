import {
  NativeEventEmitter,
  NativeModules,
  Platform,
  type EmitterSubscription,
} from 'react-native';

export type AdbConnectionDiagnostics = {
  connected: boolean;
  usbPath: boolean;
  wirelessPath: boolean;
  adbEnabled: boolean;
  wirelessAdbEnabled: boolean;
  devOptionsEnabled: boolean;
  usbConnected: boolean;
  usbConfigured: boolean;
  usbConfig: string;
  usbState: string;
  adbdRunning: boolean;
};

type DeviceSecurityModuleType = {
  isAdbConnectedToHost: () => Promise<boolean>;
  getAdbConnectionDiagnostics?: () => Promise<AdbConnectionDiagnostics>;
  addListener: (eventName: string) => void;
  removeListeners: (count: number) => void;
};

const EVENT_ADB_CONNECTION_CHANGED = 'AdbConnectionChanged';

function getDeviceSecurityModule(): DeviceSecurityModuleType | undefined {
  return NativeModules.DeviceSecurityModule as DeviceSecurityModuleType | undefined;
}

function getEventEmitter(): NativeEventEmitter | null {
  const module = getDeviceSecurityModule();
  if (Platform.OS !== 'android' || module == null) {
    return null;
  }
  return new NativeEventEmitter(module);
}

export async function isAdbConnectedToHost(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  const deviceSecurityModule = getDeviceSecurityModule();
  if (deviceSecurityModule?.isAdbConnectedToHost) {
    try {
      const connected = await deviceSecurityModule.isAdbConnectedToHost();

      if (__DEV__) {
        const diagnostics = await getAdbConnectionDiagnostics();
        if (diagnostics != null) {
          console.log('[DeviceSecurity] ADB connection check', {
            connected,
            diagnostics,
          });
        }
      }

      return connected;
    } catch {
      return false;
    }
  }

  return false;
}

export async function getAdbConnectionDiagnostics(): Promise<AdbConnectionDiagnostics | null> {
  if (Platform.OS !== 'android') {
    return null;
  }

  const deviceSecurityModule = getDeviceSecurityModule();
  if (!deviceSecurityModule?.getAdbConnectionDiagnostics) {
    return null;
  }

  try {
    return await deviceSecurityModule.getAdbConnectionDiagnostics();
  } catch {
    return null;
  }
}

export function subscribeToAdbConnectionChanges(
  listener: () => void,
): () => void {
  const eventEmitter = getEventEmitter();
  if (eventEmitter == null) {
    return () => {};
  }

  const subscription: EmitterSubscription = eventEmitter.addListener(
    EVENT_ADB_CONNECTION_CHANGED,
    listener,
  );

  return () => subscription.remove();
}
