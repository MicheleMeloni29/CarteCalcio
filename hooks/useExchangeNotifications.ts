import { useCallback, useEffect, useState } from 'react';

import { API_BASE_URL } from '../constants/api';
import { useAuth } from './AuthProvider';

export type ExchangeNotificationPayload = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

export const useExchangeNotifications = () => {
  const { accessToken, refreshAccessToken } = useAuth();
  const [notifications, setNotifications] = useState<ExchangeNotificationPayload[]>([]);
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

  const fetchNotifications = useCallback(async () => {
    if (!accessToken) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    try {
      const response = await callWithAuth(token =>
        fetch(`${API_BASE_URL}/api/exchange/notifications/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      if (!response.ok) {
        throw new Error(`Failed to load exchange notifications (${response.status})`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setNotifications(data);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Unable to load exchange notifications', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, callWithAuth]);

  const markNotificationsRead = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0 || !accessToken) {
        return;
      }
      setNotifications(prev => prev.filter(item => !ids.includes(item.id)));
      try {
        await callWithAuth(token =>
          fetch(`${API_BASE_URL}/api/exchange/notifications/read/`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids }),
          }),
        );
      } catch (error) {
        console.error('Unable to mark exchange notifications as read', error);
        fetchNotifications();
      }
    },
    [accessToken, callWithAuth, fetchNotifications],
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    loading,
    refresh: fetchNotifications,
    markNotificationsRead,
  };
};
