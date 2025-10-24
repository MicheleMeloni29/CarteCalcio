import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from './AuthProvider';

const BASE_URL = 'https://46ee1e42605c.ngrok-free.app';

type CreditContextType = {
  credits: number | null;
  username: string | null;
  loading: boolean;
  refreshCredits: () => Promise<void>;
  adjustCredits: (delta: number) => Promise<void>;
};

const CreditContext = createContext<CreditContextType | undefined>(undefined);

export const CreditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accessToken, refreshAccessToken } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const callWithAuth = useCallback(
    async (request: (token: string) => Promise<Response>) => {
      const attempt = async (token: string | null, allowRefresh: boolean): Promise<Response> => {
        if (!token) {
          if (!allowRefresh) {
            throw new Error('Missing access token');
          }
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            throw new Error('Missing access token');
          }
          return attempt(refreshed, false);
        }

        const response = await request(token);
        if (response.status === 401 && allowRefresh) {
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            throw new Error('Missing access token');
          }
          return attempt(refreshed, false);
        }

        return response;
      };

      return attempt(accessToken, true);
    },
    [accessToken, refreshAccessToken],
  );

  const refreshCredits = useCallback(async () => {
    setLoading(true);
    try {
      const response = await callWithAuth(token =>
        fetch(`${BASE_URL}/api/users/me/credits/`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch credits (${response.status})`);
      }

      const data = await response.json();
      setCredits(typeof data.credits === 'number' ? data.credits : null);
      setUsername(typeof data.username === 'string' ? data.username : null);
    } catch (error) {
      console.error('Unable to load credits', error);
      if ((error as Error).message === 'Missing access token') {
        setCredits(null);
        setUsername(null);
      }
    } finally {
      setLoading(false);
    }
  }, [callWithAuth]);

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  const adjustCredits = useCallback(
    async (delta: number) => {
      if (!Number.isFinite(delta) || Math.trunc(delta) !== delta) {
        throw new Error('Delta must be an integer');
      }

      const previousCredits = credits;
      const previousUsername = username;
      setCredits(prev => (prev ?? 0) + delta);

      try {
        const response = await callWithAuth(token =>
          fetch(`${BASE_URL}/api/users/me/credits/`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ delta }),
          }),
        );

        if (!response.ok) {
          throw new Error(`Failed to update credits (${response.status})`);
        }

        const data = await response.json();
        setCredits(typeof data.credits === 'number' ? data.credits : null);
        setUsername(typeof data.username === 'string' ? data.username : previousUsername);
      } catch (error) {
        console.error('Unable to adjust credits', error);
        setCredits(previousCredits);
        setUsername(previousUsername);
        throw error;
      }
    },
    [callWithAuth, credits, username],
  );

  const value = useMemo(
    () => ({
      credits,
      username,
      loading,
      refreshCredits,
      adjustCredits,
    }),
    [credits, username, loading, refreshCredits, adjustCredits],
  );

  return <CreditContext.Provider value={value}>{children}</CreditContext.Provider>;
};

export const useCredits = () => {
  const context = useContext(CreditContext);
  if (!context) {
    throw new Error('useCredits must be used within a CreditProvider');
  }
  return context;
};
