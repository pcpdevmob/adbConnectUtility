import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

export function SettingsScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const colors = isDarkMode ? darkColors : lightColors;

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      <Text style={[styles.body, { color: colors.muted }]}>
        Manage your session and app preferences.
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.danger, opacity: pressed || isSigningOut ? 0.85 : 1 },
        ]}
        onPress={handleSignOut}
        disabled={isSigningOut}>
        {isSigningOut ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Log out</Text>
        )}
      </Pressable>
    </View>
  );
}

const lightColors = {
  background: '#f5f5f5',
  text: '#111111',
  muted: '#666666',
  danger: '#dc2626',
};

const darkColors = {
  background: '#121212',
  text: '#f5f5f5',
  muted: '#aaaaaa',
  danger: '#ef4444',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
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
