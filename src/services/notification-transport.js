// @ts-check
import { getTokenClaims } from '../utils/notification-state.js';

/** Injectable STOMP lifecycle so late callbacks cannot reconnect a disposed session. */
export function startNotificationTransport({
  createClient, createWebSocket, getToken, refreshToken, url, onStatus, onMessage,
  setTimer = setTimeout, clearTimer = clearTimeout, random = Math.random, now = Date.now,
}) {
  let stopped = false;
  let client;
  let retryTimer;
  let expiryTimer;
  let attempt = 0;
  let sequence = 0;
  let authRefreshAttempted = false;

  const closeClient = () => {
    const previous = client;
    client = null;
    if (previous) Promise.resolve(previous.deactivate({ force: true })).catch(() => {});
  };

  const retry = () => {
    if (stopped) return;
    onStatus('reconnecting');
    const delay = Math.min(30000, 1000 * 2 ** Math.min(attempt++, 5)) * (0.8 + random() * 0.2);
    retryTimer = setTimer(connect, delay);
  };

  const connect = async () => {
    const current = ++sequence;
    const valid = () => !stopped && current === sequence;
    try {
      let token = await getToken();
      if (!valid()) return;
      if (!token) { onStatus('expired'); return; }

      let expiry = getTokenClaims(token)?.exp;
      if (typeof expiry === 'number' && expiry * 1000 <= now() + 30000) {
        const refreshed = await refreshToken();
        if (!valid()) return;
        token = await getToken();
        if (!valid()) return;
        if (!token) { onStatus('expired'); return; }
        if (!refreshed) { retry(); return; }
        expiry = getTokenClaims(token)?.exp;
      }

      onStatus('connecting');
      let finished = false;
      let authenticationError = false;
      const failed = async () => {
        if (!valid() || finished) return;
        finished = true;
        clearTimer(expiryTimer);
        closeClient();
        if (authenticationError) {
          if (authRefreshAttempted) { onStatus('auth-error'); return; }
          authRefreshAttempted = true;
          const refreshed = await refreshToken();
          if (!valid()) return;
          if (!refreshed) { onStatus('auth-error'); return; }
        }
        retry();
      };

      client = createClient({
        reconnectDelay: 0, // A single retry timer is owned here, not by STOMP as well.
        connectionTimeout: 8000,
        heartbeatIncoming: 0, // Backend simple broker does not configure STOMP heartbeats.
        heartbeatOutgoing: 10000,
        connectHeaders: { Authorization: `Bearer ${token}` },
        webSocketFactory: () => createWebSocket(url, token),
        debug: () => {}, // STOMP debug frames include credentials.
        onConnect: () => {
          if (!valid() || finished) return;
          attempt = 0;
          client.subscribe('/user/queue/notifications', (frame) => {
            if (!valid() || finished) return;
            try { onMessage(JSON.parse(frame.body)); } catch { /* Ignore malformed frames. */ }
          });
          onStatus('connected');
          if (typeof expiry === 'number') {
            expiryTimer = setTimer(() => {
              if (!valid()) return;
              finished = true;
              closeClient();
              void connect(); // Reads/refreshes the token before opening the next socket.
            }, Math.min(2147483647, Math.max(1000, expiry * 1000 - now() - 30000)));
          }
        },
        onStompError: (frame) => {
          if (typeof __DEV__ !== 'undefined' && __DEV__) {
            console.warn('[WS STOMP Error]', frame.headers?.message, frame.body);
          }
          authenticationError = /auth|jwt|token|denied|unauthorized/i.test(
            `${frame.headers?.message || ''} ${frame.body || ''}`,
          );
          void failed();
        },
        onWebSocketError: (event) => {
          if (typeof __DEV__ !== 'undefined' && __DEV__) {
            console.warn('[WS Socket Error]', event?.message || event);
          }
          authenticationError = /401|403|unauthorized|forbidden/i.test(event.message || '');
          void failed();
        },
        onWebSocketClose: () => { void failed(); },
      });
      client.activate();
    } catch (err) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[WS Transport Error]', err);
      }
      if (valid()) {
        closeClient();
        onStatus('reconnecting');
        retry();
      }
    }
  };

  void connect();
  return () => {
    stopped = true;
    ++sequence;
    clearTimer(retryTimer);
    clearTimer(expiryTimer);
    closeClient();
  };
}
