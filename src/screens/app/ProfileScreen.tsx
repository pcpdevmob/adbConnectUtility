import React from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export function ProfileScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const { user } = useAuth();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.muted }]}>Email</Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {user?.email ?? 'Not signed in'}
        </Text>
      </View>
    </View>
  );
}

const lightColors = {
  background: '#f5f5f5',
  text: '#111111',
  muted: '#666666',
  card: '#ffffff',
  border: '#dddddd',
};

const darkColors = {
  background: '#121212',
  text: '#f5f5f5',
  muted: '#aaaaaa',
  card: '#1e1e1e',
  border: '#333333',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
  },
  value: {
    fontSize: 17,
    fontWeight: '500',
  },
});
