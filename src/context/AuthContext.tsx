import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from '../constants/storage';

export type User = {
  email: string;
};

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const MIN_PASSWORD_LENGTH = 6;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const [token, email] = await AsyncStorage.multiGet([
          AUTH_TOKEN_KEY,
          AUTH_USER_KEY,
        ]);

        const storedToken = token[1];
        const storedEmail = email[1];

        if (storedToken && storedEmail && isMounted) {
          setUser({ email: storedEmail });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      throw new Error('Email is required.');
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }

    const token = `mock-token-${Date.now()}`;

    await AsyncStorage.multiSet([
      [AUTH_TOKEN_KEY, token],
      [AUTH_USER_KEY, trimmedEmail],
    ]);

    setUser({ email: trimmedEmail });
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      signIn,
      signOut,
    }),
    [user, isLoading, signIn, signOut],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
