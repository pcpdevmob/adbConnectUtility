import JailMonkey from 'jail-monkey';
import { Platform } from 'react-native';
import { isAdbConnectedToHost } from './isAdbConnectedToHost';

export const SECURITY_BLOCK_THRESHOLD = 100;

export type SecurityFinding = {
  id: string;
  label: string;
  score: number;
};

export type SecurityAuditResult = {
  score: number;
  findings: SecurityFinding[];
  shouldBlock: boolean;
};

const STRONG_ROOT_BEER_CHECKS: Array<{
  key: keyof RootedDetectionMethods['rootBeer'];
  label: string;
  score: number;
}> = [
  {
    key: 'checkForSuBinary',
    label: 'Superuser binary detected on device',
    score: 50,
  },
  {
    key: 'checkForMagiskBinary',
    label: 'Magisk root framework detected',
    score: 50,
  },
  {
    key: 'detectRootManagementApps',
    label: 'Root management application detected',
    score: 50,
  },
];

const WEAK_ROOT_BEER_CHECKS: Array<{
  key: keyof RootedDetectionMethods['rootBeer'];
  label: string;
  score: number;
}> = [
  {
    key: 'detectPotentiallyDangerousApps',
    label: 'Potentially dangerous application detected',
    score: 20,
  },
  {
    key: 'checkForDangerousProps',
    label: 'Dangerous system properties detected',
    score: 20,
  },
  {
    key: 'checkForRWPaths',
    label: 'Writable system paths detected',
    score: 20,
  },
  {
    key: 'detectTestKeys',
    label: 'Test signing keys detected on device',
    score: 20,
  },
  {
    key: 'checkSuExists',
    label: 'SU command availability detected',
    score: 20,
  },
  {
    key: 'checkForRootNative',
    label: 'Native root indicators detected',
    score: 20,
  },
];

type RootedDetectionMethods = {
  rootBeer: {
    detectRootManagementApps: boolean;
    detectPotentiallyDangerousApps: boolean;
    checkForSuBinary: boolean;
    checkForDangerousProps: boolean;
    checkForRWPaths: boolean;
    detectTestKeys: boolean;
    checkSuExists: boolean;
    checkForRootNative: boolean;
    checkForMagiskBinary: boolean;
  };
  jailMonkey: boolean;
};

type JailMonkeyAndroidApi = {
  rootedDetectionMethods?: () => RootedDetectionMethods;
  androidRootedDetectionMethods?:
    | RootedDetectionMethods
    | (() => RootedDetectionMethods);
};

function safeCall<T>(label: string, fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (error) {
    if (__DEV__) {
      console.warn(`[SecurityAudit] ${label} threw; skipping check`, error);
    }
    return fallback;
  }
}

// jail-monkey 3.0.0 with React Native New Architecture throws a
// ClassCastException inside rootedDetectionMethods() because
// JailMonkeyModuleImpl.java (lines 96-107) casts the nested rootBeer
// HashMap to Boolean. Keep this guarded; do not remove the try/catch
// without first upgrading jail-monkey and verifying on a real device.
function getAndroidRootedDetectionMethods(): RootedDetectionMethods | undefined {
  const source = JailMonkey as typeof JailMonkey & JailMonkeyAndroidApi;

  if (typeof source.rootedDetectionMethods === 'function') {
    return safeCall(
      'JailMonkey.rootedDetectionMethods',
      () => source.rootedDetectionMethods!(),
      undefined,
    );
  }

  const legacy = source.androidRootedDetectionMethods;
  if (typeof legacy === 'function') {
    return safeCall(
      'JailMonkey.androidRootedDetectionMethods',
      () => (legacy as () => RootedDetectionMethods)(),
      undefined,
    );
  }

  return legacy;
}

function buildResult(findings: SecurityFinding[]): SecurityAuditResult {
  const score = findings.reduce((total, finding) => total + finding.score, 0);
  return {
    score,
    findings,
    shouldBlock: score >= SECURITY_BLOCK_THRESHOLD,
  };
}

function auditIos(findings: SecurityFinding[]): void {
  const jailBroken = safeCall(
    'JailMonkey.isJailBroken',
    () => JailMonkey.isJailBroken(),
    false,
  );
  if (!jailBroken) {
    return;
  }

  const message = safeCall(
    'JailMonkey.jailBrokenMessage',
    () => JailMonkey.jailBrokenMessage(),
    '',
  );
  findings.push({
    id: 'ios-jailbroken',
    label: message || 'Device appears to be jailbroken',
    score: 100,
  });
}

function auditAndroidRootBeer(findings: SecurityFinding[]): void {
  const methods = getAndroidRootedDetectionMethods();

  if (!methods) {
    return;
  }

  if (methods.jailMonkey) {
    findings.push({
      id: 'android-jailmonkey-rooted',
      label: 'Device appears to be rooted or compromised',
      score: 100,
    });
  }

  const rootBeer = methods.rootBeer;
  if (rootBeer == null) {
    return;
  }

  for (const check of STRONG_ROOT_BEER_CHECKS) {
    if (rootBeer[check.key]) {
      findings.push({
        id: `android-rootbeer-${check.key}`,
        label: check.label,
        score: check.score,
      });
    }
  }

  for (const check of WEAK_ROOT_BEER_CHECKS) {
    if (rootBeer[check.key]) {
      findings.push({
        id: `android-rootbeer-${check.key}`,
        label: check.label,
        score: check.score,
      });
    }
  }
}

function auditCrossPlatform(findings: SecurityFinding[]): void {
  const hookDetected = safeCall(
    'JailMonkey.hookDetected',
    () => JailMonkey.hookDetected(),
    false,
  );
  if (hookDetected) {
    findings.push({
      id: 'hook-detected',
      label: 'Suspicious hooking or tampering application detected',
      score: 60,
    });
  }

  const onExternalStorage = safeCall(
    'JailMonkey.isOnExternalStorage',
    () => JailMonkey.isOnExternalStorage(),
    false,
  );
  if (onExternalStorage) {
    findings.push({
      id: 'external-storage',
      label: 'Application is running from external storage',
      score: 25,
    });
  }
}

async function auditAndroidAdb(findings: SecurityFinding[]): Promise<void> {
  const adbConnectedToHost = await isAdbConnectedToHost();

  if (adbConnectedToHost) {
    findings.push({
      id: 'adb-connected',
      label: 'Device is connected to a computer via USB or wireless debugging',
      score: 100,
    });
  }
}

async function runSection(
  label: string,
  section: () => void | Promise<void>,
): Promise<void> {
  try {
    await section();
  } catch (error) {
    if (__DEV__) {
      console.warn(`[SecurityAudit] section "${label}" failed; continuing`, error);
    }
  }
}

export async function runSecurityAudit(): Promise<SecurityAuditResult> {
  const findings: SecurityFinding[] = [];

  if (Platform.OS === 'ios') {
    await runSection('ios', () => auditIos(findings));
  } else if (Platform.OS === 'android') {
    await runSection('android-rootbeer', () => auditAndroidRootBeer(findings));
    await runSection('android-adb', () => auditAndroidAdb(findings));
  }

  await runSection('cross-platform', () => auditCrossPlatform(findings));

  return buildResult(findings);
}
