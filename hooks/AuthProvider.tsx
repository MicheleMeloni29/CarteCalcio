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
}

const STORAGE_KEY = 'authTokens';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    const resetTokens = async () => {
      try {
        await AsyncStorage.removeItem(STORAGE_KEY);
        setAccessToken(null);
        setRefreshToken(null);
      } catch (error) {
        console.error('Failed to reset auth tokens', error);
      }
    };

    resetTokens();
  }, []);

  const persistTokens = useCallback(async (tokens: AuthTokens | null) => {
    if (tokens) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback(
    async ({ access, refresh = null }: { access: string; refresh?: string | null }) => {
      setAccessToken(access);
      setRefreshToken(refresh);
      await persistTokens({ access, refresh });
    },
    [persistTokens],
  );

  const logout = useCallback(async () => {
    setAccessToken(null);
    setRefreshToken(null);
    await persistTokens(null);
  }, [persistTokens]);

  const value = useMemo(
    () => ({
      accessToken,
      refreshToken,
      login,
      logout,
    }),
    [accessToken, refreshToken, login, logout],
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
