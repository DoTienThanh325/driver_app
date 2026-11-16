// @ts-check
import { Client } from '@stomp/stompjs';
import { getGatewayUrl } from '../constants/api';
import { notificationSocketUrl } from '../utils/notification-state';
import { apiClient } from './api-client';
import { tokenStorage } from './storage/token.storage';
import { startNotificationTransport } from './notification-transport';

export function createNotificationTransport(callbacks) {
  try {
    return startNotificationTransport({
      ...callbacks,
      url: notificationSocketUrl(getGatewayUrl(), process.env.EXPO_PUBLIC_NOTIFICATION_WS_URL),
      getToken: tokenStorage.getAccessToken,
      refreshToken: apiClient.tryRefreshToken,
      createClient: (config) => new Client(config),
      // React Native supports an HTTP-header options argument, unlike browser WebSocket.
      createWebSocket: (url, token) => new NativeWebSocket(url, ['v12.stomp'], {
        headers: { Authorization: `Bearer ${token}` },
      }),
    });
  } catch {
    callbacks.onStatus('configuration-error');
    return () => {};
  }
}

/** @type {new (url: string, protocols: string[], options: {headers: Record<string, string>}) => WebSocket} */
const NativeWebSocket = WebSocket;
