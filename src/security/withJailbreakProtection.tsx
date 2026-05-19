import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';
import { SecurityBlockScreen } from '../components/SecurityBlockScreen';
import { subscribeToAdbConnectionChanges } from './isAdbConnectedToHost';
import {
  runSecurityAudit,
  type SecurityAuditResult,
} from './runSecurityAudit';

// Fail OPEN on internal audit error: a bug in the audit pipeline (e.g. a
// throwing third-party native call) must not lock every user out. Real
// positive signals (ADB connected, jailbreak, hook) still block via the
// normal shouldBlock path. runSecurityAudit isolates each section, so this
// catch is the last-resort safety net.
const AUDIT_FAILURE_RESULT: SecurityAuditResult = {
  score: 0,
  findings: [],
  shouldBlock: false,
};

export function withJailbreakProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
) {
  function JailbreakProtectedComponent(props: P) {
    const [auditResult, setAuditResult] = useState<SecurityAuditResult | null>(
      null,
    );

    const performAudit = useCallback(async () => {
      try {
        return await runSecurityAudit();
      } catch (error) {
        console.warn(
          '[SecurityAudit] fatal error in runSecurityAudit; failing open',
          error,
        );
        return AUDIT_FAILURE_RESULT;
      }
    }, []);

    useEffect(() => {
      let isMounted = true;

      async function runAudit() {
        const result = await performAudit();
        if (isMounted) {
          setAuditResult(result);
        }
      }

      // Fresh audit on every mount (kill + reopen reads latest native state).
      runAudit();

      const appStateSubscription = AppState.addEventListener('change', nextState => {
        if (nextState === 'active') {
          runAudit();
        }
      });

      const adbSubscription = subscribeToAdbConnectionChanges(() => {
        if (isMounted) {
          runAudit();
        }
      });

      return () => {
        isMounted = false;
        appStateSubscription.remove();
        adbSubscription();
      };
    }, [performAudit]);

    if (auditResult === null) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      );
    }

    if (auditResult.shouldBlock) {
      return <SecurityBlockScreen findings={auditResult.findings} />;
    }

    return <WrappedComponent {...props} />;
  }

  const wrappedName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  JailbreakProtectedComponent.displayName = `withJailbreakProtection(${wrappedName})`;

  return JailbreakProtectedComponent;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
