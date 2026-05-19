/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();

  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => store.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        store.delete(key);
      }),
      multiGet: jest.fn(async (keys: string[]) =>
        keys.map(key => [key, store.get(key) ?? null]),
      ),
      multiSet: jest.fn(async (pairs: [string, string][]) => {
        pairs.forEach(([key, value]) => store.set(key, value));
      }),
      multiRemove: jest.fn(async (keys: string[]) => {
        keys.forEach(key => store.delete(key));
      }),
    },
  };
});

jest.mock('../src/security/withJailbreakProtection', () => ({
  withJailbreakProtection: <P extends object>(Component: React.ComponentType<P>) =>
    Component,
}));

jest.mock('../src/navigation/RootNavigator', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');

  return {
    RootNavigator: () => ReactMock.createElement(View, { testID: 'root-navigator' }),
  };
});

test('renders correctly', async () => {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<App />);
  });
});
