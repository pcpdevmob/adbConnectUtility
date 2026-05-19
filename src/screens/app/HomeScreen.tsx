import React from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export function HomeScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const { user } = useAuth();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Home</Text>
      <Text style={[styles.body, { color: colors.muted }]}>
        Welcome{user ? `, ${user.email}` : ''}.
      </Text>
      <Text style={[styles.body, { color: colors.muted }]}>
        ADB Connect Demo — manage and explore device connections from here.
      </Text>
    </View>
  );
}

const lightColors = {
  background: '#f5f5f5',
  text: '#111111',
  muted: '#666666',
};

const darkColors = {
  background: '#121212',
  text: '#f5f5f5',
  muted: '#aaaaaa',
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
    marginBottom: 8,
  },
});
