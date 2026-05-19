import React from 'react';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { AppNavigator } from './AppNavigator';
import { AuthNavigator } from './AuthNavigator';

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const isDarkMode = useColorScheme() === 'dark';

  if (isLoading) {
    return (
      <View
        style={[
          styles.loading,
          { backgroundColor: isDarkMode ? '#121212' : '#f5f5f5' },
        ]}>
        <ActivityIndicator size="large" color={isDarkMode ? '#60a5fa' : '#2563eb'} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
