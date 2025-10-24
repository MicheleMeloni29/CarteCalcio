import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type AuthTokens = {
  access: string;
  refresh: string | null;
};

interface AuthContextType {
  accessToken: string | null;
  refreshToken: string | null;
  login: (tokens: { access: string; refresh?: string | null }) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
}

const BASE_URL = 'https://46ee1e42605c.ngrok-free.app';
const STORAGE_KEY = 'authTokens';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  const persistTokens = useCallback(async (tokens: AuthTokens | null) => {
    if (tokens) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const storeTokens = useCallback(
    async (tokens: AuthTokens | null) => {
      if (tokens) {
        setAccessToken(tokens.access);
        setRefreshToken(tokens.refresh ?? null);
        await persistTokens({ access: tokens.access, refresh: tokens.refresh ?? null });
      } else {
        setAccessToken(null);
        setRefreshToken(null);
        await persistTokens(null);
      }
    },
    [persistTokens],
  );

  useEffect(() => {
    const loadTokens = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!stored) {
          return;
        }
        const parsed = JSON.parse(stored) as Partial<AuthTokens> | null;
        if (parsed && typeof parsed.access === 'string') {
          setAccessToken(parsed.access);
        }
        if (parsed && typeof parsed.refresh === 'string') {
          setRefreshToken(parsed.refresh);
        }
      } catch (error) {
        console.error('Failed to load auth tokens', error);
        setAccessToken(null);
        setRefreshToken(null);
      }
    };

    loadTokens();
  }, []);

  const login = useCallback(
    async ({ access, refresh = null }: { access: string; refresh?: string | null }) => {
      await storeTokens({ access, refresh });
    },
    [storeTokens],
  );

  const logout = useCallback(async () => {
    await storeTokens(null);
  }, [storeTokens]);

  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) {
      await storeTokens(null);
      return null;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/users/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) {
        await storeTokens(null);
        return null;
      }

      const data = await response.json();
      if (!data || typeof data.access !== 'string') {
        await storeTokens(null);
        return null;
      }

      await storeTokens({ access: data.access, refresh: refreshToken });
      return data.access;
    } catch (error) {
      console.error('Failed to refresh access token', error);
      await storeTokens(null);
      return null;
    }
  }, [refreshToken, storeTokens]);

  const value = useMemo(
    () => ({
      accessToken,
      refreshToken,
      login,
      logout,
      refreshAccessToken,
    }),
    [accessToken, refreshToken, login, logout, refreshAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
