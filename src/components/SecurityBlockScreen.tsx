import React from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { SecurityFinding } from '../security/runSecurityAudit';

type SecurityBlockScreenProps = {
  findings: SecurityFinding[];
};

export function SecurityBlockScreen({ findings }: SecurityBlockScreenProps) {
  const isDarkMode = useColorScheme() === 'dark';
  const colors = isDarkMode ? darkColors : lightColors;

  function handleOkPress() {
    // Android: closes the app. iOS does not allow programmatic exit per platform policy.
    BackHandler.exitApp();
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>
          Security issue detected
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          This app cannot run because your device failed security checks. For
          your protection, close the app and use a trusted device.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Why this happened
        </Text>
        {findings.map(finding => (
          <View key={finding.id} style={styles.findingRow}>
            <Text style={[styles.bullet, { color: colors.text }]}>{'\u2022'}</Text>
            <Text style={[styles.findingText, { color: colors.text }]}>
              {finding.label}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="OK"
          onPress={handleOkPress}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}>
          <Text style={styles.buttonText}>OK</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const lightColors = {
  background: '#f5f5f5',
  text: '#111111',
  muted: '#666666',
  primary: '#2563eb',
};

const darkColors = {
  background: '#121212',
  text: '#f5f5f5',
  muted: '#aaaaaa',
  primary: '#3b82f6',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  findingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingRight: 8,
  },
  bullet: {
    fontSize: 16,
    lineHeight: 24,
    marginRight: 10,
  },
  findingText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
