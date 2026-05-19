import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

export function LoginScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = isDarkMode ? darkColors : lightColors;

  async function handleSignIn() {
    setError(null);
    setIsSubmitting(true);

    try {
      await signIn(email, password);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to sign in. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Sign in to continue to ADB Connect Demo
        </Text>

        <Text style={[styles.label, { color: colors.text }]}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={colors.placeholder}
          style={[
            styles.input,
            { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border },
          ]}
          value={email}
          onChangeText={setEmail}
          editable={!isSubmitting}
        />

        <Text style={[styles.label, { color: colors.text }]}>Password</Text>
        <TextInput
          secureTextEntry
          placeholder="At least 6 characters"
          placeholderTextColor={colors.placeholder}
          style={[
            styles.input,
            { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border },
          ]}
          value={password}
          onChangeText={setPassword}
          editable={!isSubmitting}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.primary, opacity: pressed || isSubmitting ? 0.85 : 1 },
          ]}
          onPress={handleSignIn}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const lightColors = {
  background: '#f5f5f5',
  text: '#111111',
  muted: '#666666',
  placeholder: '#999999',
  inputBg: '#ffffff',
  border: '#dddddd',
  primary: '#2563eb',
};

const darkColors = {
  background: '#121212',
  text: '#f5f5f5',
  muted: '#aaaaaa',
  placeholder: '#777777',
  inputBg: '#1e1e1e',
  border: '#333333',
  primary: '#3b82f6',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  error: {
    color: '#dc2626',
    marginBottom: 12,
    fontSize: 14,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
