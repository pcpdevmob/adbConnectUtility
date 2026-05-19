/**
 * @format
 */

import React from 'react';
import { BackHandler, Text, View } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { subscribeToAdbConnectionChanges } from '../src/security/isAdbConnectedToHost';
import { withJailbreakProtection } from '../src/security/withJailbreakProtection';
import { runSecurityAudit } from '../src/security/runSecurityAudit';

jest.mock('../src/security/isAdbConnectedToHost', () => ({
  isAdbConnectedToHost: jest.fn(),
  subscribeToAdbConnectionChanges: jest.fn(),
}));

jest.mock('../src/security/runSecurityAudit', () => ({
  runSecurityAudit: jest.fn(),
  SECURITY_BLOCK_THRESHOLD: 100,
}));

const mockedRunSecurityAudit = runSecurityAudit as jest.MockedFunction<
  typeof runSecurityAudit
>;
const mockedSubscribeToAdbConnectionChanges =
  subscribeToAdbConnectionChanges as jest.MockedFunction<
    typeof subscribeToAdbConnectionChanges
  >;

function TestApp() {
  return (
    <View testID="protected-app">
      <Text>Protected content</Text>
    </View>
  );
}

const ProtectedTestApp = withJailbreakProtection(TestApp);

function treeContainsText(
  root: ReactTestRenderer.ReactTestInstance,
  text: string,
): boolean {
  return root
    .findAllByType(Text)
    .some(node => node.props.children === text);
}

async function renderProtectedApp() {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<ProtectedTestApp />);
  });

  await ReactTestRenderer.act(async () => {
    await Promise.resolve();
  });

  return renderer!;
}

describe('withJailbreakProtection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSubscribeToAdbConnectionChanges.mockImplementation(listener => {
      return () => {};
    });
  });

  test('re-runs audit when ADB connection changes', async () => {
    let adbListener: (() => void) | undefined;

    mockedSubscribeToAdbConnectionChanges.mockImplementation(listener => {
      adbListener = listener;
      return () => {};
    });

    mockedRunSecurityAudit
      .mockResolvedValueOnce({
        score: 100,
        shouldBlock: true,
        findings: [
          {
            id: 'adb-connected',
            label: 'Device is connected to a computer via USB or wireless debugging',
            score: 100,
          },
        ],
      })
      .mockResolvedValueOnce({
        score: 0,
        findings: [],
        shouldBlock: false,
      });

    const renderer = await renderProtectedApp();
    expect(treeContainsText(renderer.root, 'Security issue detected')).toBe(true);

    await ReactTestRenderer.act(async () => {
      adbListener?.();
      await Promise.resolve();
    });

    expect(mockedRunSecurityAudit).toHaveBeenCalledTimes(2);
    expect(renderer.root.findByProps({ testID: 'protected-app' })).toBeTruthy();
  });

  test('renders wrapped app when audit score is below threshold', async () => {
    mockedRunSecurityAudit.mockResolvedValue({
      score: 0,
      findings: [],
      shouldBlock: false,
    });

    const renderer = await renderProtectedApp();

    expect(renderer.root.findByProps({ testID: 'protected-app' })).toBeTruthy();
    expect(treeContainsText(renderer.root, 'Security issue detected')).toBe(false);
  });

  test('renders block screen when audit score is at or above threshold', async () => {
    mockedRunSecurityAudit.mockResolvedValue({
      score: 100,
      shouldBlock: true,
      findings: [
        {
          id: 'ios-jailbroken',
          label: 'Device appears to be jailbroken',
          score: 100,
        },
      ],
    });

    const renderer = await renderProtectedApp();

    expect(treeContainsText(renderer.root, 'Security issue detected')).toBe(true);
    expect(treeContainsText(renderer.root, 'Device appears to be jailbroken')).toBe(
      true,
    );
    expect(() => renderer.root.findByProps({ testID: 'protected-app' })).toThrow();
  });

  test('fails open and renders wrapped app when audit throws', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockedRunSecurityAudit.mockRejectedValue(new Error('audit failed'));

    const renderer = await renderProtectedApp();

    expect(renderer.root.findByProps({ testID: 'protected-app' })).toBeTruthy();
    expect(treeContainsText(renderer.root, 'Security issue detected')).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[SecurityAudit]'),
      expect.any(Error),
    );

    warnSpy.mockRestore();
  });

  test('OK button calls BackHandler.exitApp', async () => {
    const exitAppMock = jest.fn();
    jest.spyOn(BackHandler, 'exitApp').mockImplementation(exitAppMock);

    mockedRunSecurityAudit.mockResolvedValue({
      score: 100,
      shouldBlock: true,
      findings: [
        {
          id: 'hook-detected',
          label: 'Suspicious hooking or tampering application detected',
          score: 60,
        },
      ],
    });

    const renderer = await renderProtectedApp();
    const okButton = renderer.root.findByProps({ accessibilityLabel: 'OK' });

    await ReactTestRenderer.act(() => {
      okButton.props.onPress();
    });

    expect(exitAppMock).toHaveBeenCalledTimes(1);
  });
});
