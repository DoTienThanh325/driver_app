// @ts-check
import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationStore } from '../services/notification-store';
import { createNotificationTransport } from '../services/notification-realtime.service';
import { tokenStorage } from '../services/storage/token.storage';
import { userStorage } from '../services/storage/user.storage';
import { getTokenClaims } from '../utils/notification-state';
import { notificationService } from '../services/notification.service';

/** @type {React.Context<(import('../services/notification-store').NotificationSnapshot & {
 * markRead: (id?: string) => void
 * }) | null>} */
const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [store] = useState(() => new NotificationStore({
    storage: AsyncStorage,
    createTransport: createNotificationTransport,
    supported: Platform.OS === 'android' || Platform.OS === 'ios',
    onNewNotification: notificationService.showInNotificationCenter,
  }));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useEffect(() => {
    let version = 0;
    let disposed = false;
    const syncSession = async () => {
      const current = ++version;
      const [token, savedProfile] = await Promise.all([
        tokenStorage.getAccessToken(), userStorage.getUserProfile(),
      ]);
      if (disposed || version !== current) return;
      const profile = /** @type {{ id?: string } | null} */ (savedProfile);
      const subject = getTokenClaims(token)?.sub;
      // Never pair a newly logged-in token with the previous account's cached profile.
      const userId = profile?.id && subject === String(profile.id) ? subject : null;
      await store.setSession(token && userId ? { token, userId } : null);
    };
    const unsubscribeToken = tokenStorage.subscribe((token) => {
      store.stopConnection();
      if (!token) {
        ++version;
        void store.setSession(null);
      } else {
        void syncSession();
      }
    });
    const unsubscribeProfile = userStorage.subscribe((profile) => {
      if (!profile) {
        ++version;
        void store.setSession(null);
      } else {
        void syncSession();
      }
    });
    const appState = AppState.addEventListener('change', (state) => store.setActive(state === 'active'));
    store.setActive(AppState.currentState === 'active');
    void syncSession();
    return () => {
      disposed = true;
      ++version;
      unsubscribeToken();
      unsubscribeProfile();
      appState.remove();
      store.dispose();
    };
  }, [store]);

  return (
    <NotificationContext.Provider value={{ ...snapshot, markRead: store.markRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error('useNotifications requires NotificationProvider');
  return value;
}
