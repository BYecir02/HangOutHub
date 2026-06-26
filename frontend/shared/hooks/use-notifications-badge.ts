import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import api, { isUnauthorizedError, storage } from '@/services/api';

// Compteur de notifications non lues, pour le badge de l'onglet Notifications.
// Rafraichi au montage, periodiquement, et quand l'app revient au premier plan.
const POLL_INTERVAL_MS = 30_000;

type UnreadCountResponse = {
  unreadCount?: number;
};

export function useNotificationsBadge() {
  const [count, setCount] = useState(0);
  const isFetchingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;

    try {
      const token = await storage.getItem('userToken');
      if (!token) {
        setCount(0);
        return;
      }

      const response = await api.get<UnreadCountResponse>(
        '/notifications/unread-count',
      );
      setCount(Number(response.data.unreadCount || 0));
    } catch (error) {
      // Si la session est invalide, on remet a zero ; sinon on garde la
      // derniere valeur connue (erreur reseau transitoire).
      if (isUnauthorizedError(error)) {
        setCount(0);
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh();

    const interval = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    const subscription = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (state === 'active') {
          void refresh();
        }
      },
    );

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [refresh]);

  return { count, refresh };
}
