import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useColorScheme } from 'react-native';
import { HomeScreen } from '../screens/app/HomeScreen';
import { ProfileScreen } from '../screens/app/ProfileScreen';
import { SettingsScreen } from '../screens/app/SettingsScreen';
import type { AppTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppNavigator() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
        },
        headerTintColor: isDarkMode ? '#f5f5f5' : '#111111',
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
          borderTopColor: isDarkMode ? '#333333' : '#dddddd',
        },
        tabBarActiveTintColor: isDarkMode ? '#60a5fa' : '#2563eb',
        tabBarInactiveTintColor: isDarkMode ? '#888888' : '#666666',
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home', tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile', tabBarLabel: 'Profile' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings', tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}
