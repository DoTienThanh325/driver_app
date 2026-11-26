import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { test } from 'node:test';
import { Client } from '@stomp/stompjs';
import { NotificationStore } from '../src/services/notification-store.js';
import { startNotificationTransport } from '../src/services/notification-transport.js';
import { createSessionRefresher } from '../src/services/refresh-session.js';
import { formatNotificationTimestamp, normalizeNotification, restoreNotifications, notificationSocketUrl } from '../src/utils/notification-state.js';

const message = (id = 'one') => ({ id, title: 'Cập nhật chuyến đi', content: 'Tài xế đang đến', type: 'TRIP_ACCEPTED' });
const session = (userId = 'alice', token = 'token') => ({ userId, token });
const flush = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
function timers() {
  let nextId = 0;
  const pending = new Map();
  return {
    pending,
    setTimer: (callback, delay) => { const id = ++nextId; pending.set(id, { callback, delay }); return id; },
    clearTimer: (id) => pending.delete(id),
    runNext: () => {
      const [id, timer] = pending.entries().next().value;
      pending.delete(id);
      timer.callback();
      return timer.delay;
    },
  };
}
function inbox(storageOverrides = {}) {
  const values = new Map();
  const connections = [];
  const delivered = [];
  const storage = {
    getItem: async (key) => values.get(key) || null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
    ...storageOverrides,
  };
  const store = new NotificationStore({
    storage,
    onNewNotification: (item) => delivered.push(item.id),
    createTransport: (callbacks) => {
      const connection = { ...callbacks, stopped: false };
      connections.push(connection);
      return () => { connection.stopped = true; };
    },
  });
  store.setActive(true);
  return { store, values, connections, delivered };
}

test('rejects malformed payloads and normalizes unknown types/timestamps', () => {
  for (const value of [null, {}, 'bad', message(''), { ...message(), content: 12 }]) {
    assert.equal(normalizeNotification(value), null);
  }
  const normalized = normalizeNotification({ ...message(), timestamp: 'bad', data: [] }, '2026-01-01T00:00:00Z');
  assert.equal(normalized.timestamp, '2026-01-01T00:00:00Z');
  assert.deepEqual(normalized.data, {});
  assert.equal(normalized.readAt, null);
});

test('restores valid records, read state, ordering, and ignores corrupt/duplicate entries', () => {
  assert.deepEqual(restoreNotifications('bad-json'), []);
  assert.deepEqual(restoreNotifications('{}'), []);
  const result = restoreNotifications(JSON.stringify([
    { ...message('old'), receivedAt: '2026-01-01', readAt: '2026-01-02' },
    {}, { ...message('new'), receivedAt: '2026-02-01' }, message('old'),
  ]));
  assert.deepEqual(result.map((item) => item.id), ['new', 'old']);
  assert.equal(result[1].readAt, '2026-01-02');
});

test('builds gateway/direct socket URLs without placing credentials in the URL', () => {
  assert.equal(notificationSocketUrl('https://api.example/'), 'wss://api.example/ws/notifications');
  assert.equal(notificationSocketUrl('http://10.0.2.2:8080'), 'ws://10.0.2.2:8080/ws/notifications');
  assert.equal(notificationSocketUrl('https://api', 'ws://192.168.1.2:8086/ws/notifications'), 'ws://192.168.1.2:8086/ws/notifications');
  assert.throws(() => notificationSocketUrl('ftp://host'));
});

test('formats timestamps in Vietnam time without seconds or locale punctuation', () => {
  assert.equal(formatNotificationTimestamp('2026-11-22T02:59:00Z'), '09:59 22/11/2026');
  assert.equal(formatNotificationTimestamp('2026-11-22T17:05:00Z'), '00:05 23/11/2026');
  assert.equal(formatNotificationTimestamp('invalid'), '');
});

test('hydrates before subscribing, presents each new event once, and persists reads', async () => {
  const { store, values, connections, delivered } = inbox();
  values.set(store.storageKey('alice'), JSON.stringify([message('saved')]));
  await store.setSession(session());
  assert.equal(store.getSnapshot().items[0].id, 'saved');
  connections[0].onMessage(message());
  connections[0].onMessage(message());
  assert.equal(store.getSnapshot().items.length, 2);
  assert.equal(store.getSnapshot().unreadCount, 2);
  store.markRead('one');
  assert.equal(store.getSnapshot().unreadCount, 1);
  store.markRead();
  assert.equal(store.getSnapshot().unreadCount, 0);
  assert.deepEqual(delivered, ['one']);
  await store.pendingStorage;
  assert.ok(JSON.parse(values.get(store.storageKey('alice'))).every((item) => item.readAt));
});

test('retains the most recent 200 notifications', async () => {
  const { store, connections } = inbox();
  await store.setSession(session());
  for (let id = 0; id < 205; id++) connections[0].onMessage(message(String(id)));
  assert.equal(store.getSnapshot().items.length, 200);
  assert.equal(store.getSnapshot().items[0].id, '204');
  assert.equal(store.getSnapshot().items.at(-1).id, '5');
  await store.pendingStorage;
});

test('logout during hydration ignores old results and removes previously queued writes', async () => {
  const read = deferred();
  const { store, values, connections } = inbox({ getItem: () => read.promise });
  const hydration = store.setSession(session());
  await flush();
  await store.setSession(null);
  read.resolve(JSON.stringify([message('private')]));
  await hydration;
  await store.pendingStorage;
  assert.equal(store.getSnapshot().userId, null);
  assert.deepEqual(store.getSnapshot().items, []);
  assert.equal(connections.length, 0);
  assert.equal(values.has(store.storageKey('alice')), false);
});

test('account switching isolates inboxes and late socket callbacks', async () => {
  const { store, values, connections } = inbox();
  await store.setSession(session());
  connections[0].onMessage(message('private-alice'));
  await store.setSession(session('bob'));
  connections[0].onMessage(message('late-alice'));
  connections[0].onStatus('connected');
  assert.equal(connections[0].stopped, true);
  assert.equal(store.getSnapshot().userId, 'bob');
  assert.deepEqual(store.getSnapshot().items, []);
  assert.equal(store.getSnapshot().status, 'connecting');
  await store.pendingStorage;
  assert.equal(values.has(store.storageKey('alice')), false);
});

test('background stops delivery; foreground and rotated token create one subscription each', async () => {
  const { store, connections } = inbox();
  await store.setSession(session());
  store.setActive(false);
  connections[0].onMessage(message('background'));
  assert.deepEqual(store.getSnapshot().items, []);
  assert.equal(store.getSnapshot().status, 'paused');
  store.setActive(true);
  store.setActive(true);
  assert.equal(connections.length, 2);
  connections[1].onMessage(message());
  await store.setSession(session('alice', 'new-token'));
  assert.equal(connections.length, 3);
  assert.equal(connections[1].stopped, true);
  assert.equal(store.getSnapshot().items.length, 1);
  await store.setSession(session('alice', 'new-token'));
  assert.equal(connections.length, 3);
});

test('repeated token save can restart a connection stopped by a token event', async () => {
  const { store, connections } = inbox();
  await store.setSession(session());
  store.stopConnection();
  await store.setSession(session());
  assert.equal(connections.length, 2);
});

test('storage failures keep realtime usable and expose a persistence error', async () => {
  const { store, connections } = inbox({
    getItem: async () => { throw new Error('unavailable'); },
    setItem: async () => { throw new Error('full'); },
  });
  await store.setSession(session());
  connections[0].onMessage(message());
  await flush();
  assert.equal(store.getSnapshot().items.length, 1);
  assert.equal(store.getSnapshot().storageError, true);
});

test('web does not create a socket', async () => {
  const { store, connections } = inbox();
  store.supported = false;
  await store.setSession(session());
  assert.equal(connections.length, 0);
  assert.equal(store.getSnapshot().status, 'unsupported');
});

function transport(overrides = {}) {
  const clock = timers();
  const clients = [];
  const statuses = [];
  const messages = [];
  const sockets = [];
  const stop = startNotificationTransport({
    ...clock,
    createClient: (config) => {
      const client = {
        config, stopped: false,
        activate: () => { config.webSocketFactory(); },
        deactivate: async () => { client.stopped = true; config.onWebSocketClose(); },
        subscribe: (destination, callback) => { client.destination = destination; client.deliver = callback; },
      };
      clients.push(client);
      return client;
    },
    createWebSocket: (url, token) => { sockets.push({ url, token }); return {}; },
    getToken: async () => 'access-token',
    refreshToken: async () => false,
    url: 'ws://host/ws/notifications',
    onStatus: (status) => statuses.push(status),
    onMessage: (value) => messages.push(value),
    random: () => 1,
    ...overrides,
  });
  return { clock, clients, statuses, messages, sockets, stop };
}

test('STOMP authenticates both layers and subscribes to the private destination', async () => {
  const { clients, sockets, messages, stop } = transport();
  await flush();
  const first = clients[0];
  first.config.onConnect();
  assert.equal(first.config.connectHeaders.Authorization, 'Bearer access-token');
  assert.equal(sockets[0].token, 'access-token');
  assert.equal(first.destination, '/user/queue/notifications');
  first.deliver({ body: 'bad-json' });
  first.deliver({ body: JSON.stringify(message()) });
  assert.equal(messages.length, 1);
  stop();
  first.deliver({ body: JSON.stringify(message('late')) });
  assert.equal(messages.length, 1);
});

test('socket error and close schedule only one retry, with fresh credentials and capped backoff', async () => {
  let token = 'first';
  const { clients, clock, sockets, stop } = transport({ getToken: async () => token });
  await flush();
  clients[0].config.onWebSocketError({ message: 'network failed' });
  clients[0].config.onWebSocketClose();
  assert.equal(clock.pending.size, 1);
  token = 'second';
  assert.equal(clock.runNext(), 1000);
  await flush();
  assert.equal(sockets[1].token, 'second');
  for (let i = 1; i <= 7; i++) {
    clients.at(-1).config.onWebSocketClose();
    assert.ok(clock.runNext() <= 30000);
    await flush();
  }
  stop();
  assert.equal(clock.pending.size, 0);
});

test('disposing during token read never opens a socket', async () => {
  const token = deferred();
  const { stop, clients, clock } = transport({ getToken: () => token.promise });
  stop();
  token.resolve('late');
  await flush();
  assert.equal(clients.length, 0);
  assert.equal(clock.pending.size, 0);
});

test('expired token is refreshed before connection and missing token stops retrying', async () => {
  const expired = `header.${Buffer.from(JSON.stringify({ exp: 1 })).toString('base64url')}.sig`;
  let token = expired;
  let refreshes = 0;
  const running = transport({
    getToken: async () => token,
    refreshToken: async () => { refreshes++; token = 'fresh'; return true; },
  });
  await flush();
  assert.equal(refreshes, 1);
  assert.equal(running.sockets[0].token, 'fresh');
  running.stop();
  const signedOut = transport({ getToken: async () => null });
  await flush();
  assert.equal(signedOut.clients.length, 0);
  assert.equal(signedOut.statuses.at(-1), 'expired');
  assert.equal(signedOut.clock.pending.size, 0);
  signedOut.stop();
});

test('rejected authentication stops reconnecting when refresh fails', async () => {
  const { clients, statuses, clock, stop } = transport();
  await flush();
  clients[0].config.onStompError({ headers: { message: 'Invalid JWT token' } });
  await flush();
  assert.equal(statuses.at(-1), 'auth-error');
  assert.equal(clock.pending.size, 0);
  stop();
});

test('real STOMP client parses a UTF-8 notification from a simulated broker', async () => {
  const received = deferred();
  const sent = [];
  class Socket {
    readyState = 1;
    constructor() { queueMicrotask(() => this.onopen?.()); }
    send(frame) {
      sent.push(frame);
      if (frame.startsWith('CONNECT\n')) {
        queueMicrotask(() => this.onmessage?.({ data: 'CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\0' }));
      } else if (frame.startsWith('SUBSCRIBE\n')) {
        const subscription = frame.match(/\nid:([^\n]+)/)[1];
        const body = JSON.stringify(message('unicode'));
        const response = `MESSAGE\nsubscription:${subscription}\nmessage-id:1\ndestination:/user/queue/notifications\ncontent-type:application/json\ncontent-length:${Buffer.byteLength(body)}\n\n${body}\0`;
        queueMicrotask(() => this.onmessage?.({ data: response }));
      }
    }
    close() { this.readyState = 3; this.onclose?.({ code: 1000 }); }
  }
  const stop = startNotificationTransport({
    createClient: (config) => new Client(config),
    createWebSocket: () => new Socket(),
    getToken: async () => 'real-client-token', refreshToken: async () => false,
    url: 'ws://simulated', onStatus: () => {}, onMessage: received.resolve,
  });
  let timeout;
  try {
    const result = await Promise.race([
      received.promise,
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('STOMP did not deliver')), 1500); }),
    ]);
    assert.equal(result.content, 'Tài xế đang đến');
    assert.ok(sent[0].includes('Authorization:Bearer real-client-token'));
    assert.ok(sent.some((frame) => frame.includes('destination:/user/queue/notifications')));
  } finally {
    clearTimeout(timeout);
    stop();
  }
});

function refreshHarness(request) {
  let revision = 0;
  const saved = [];
  const storage = {
    getRevision: () => revision,
    getRefreshToken: async () => 'refresh',
    saveTokens: async (...tokens) => { saved.push(tokens); revision++; },
    clearTokens: async () => { revision++; },
  };
  return { storage, saved, refresh: createSessionRefresher({ tokenStorage: storage, request }) };
}

test('REST and socket refresh share one request and preserve a non-rotated refresh token', async () => {
  let requests = 0;
  const { refresh, saved } = refreshHarness(async () => {
    requests++;
    return { ok: true, json: async () => ({ accessToken: 'new' }) };
  });
  const first = refresh();
  assert.equal(first, refresh());
  assert.deepEqual(await Promise.all([first, refresh()]), [true, true]);
  assert.equal(requests, 1);
  assert.deepEqual(saved, [['new', 'refresh']]);
});

test('logout/new login during refresh prevents stale tokens from resurrecting the session', async () => {
  const response = deferred();
  const { refresh, storage, saved } = refreshHarness(() => response.promise);
  const pending = refresh();
  await flush();
  await storage.clearTokens();
  response.resolve({ ok: true, json: async () => ({ accessToken: 'obsolete' }) });
  assert.equal(await pending, false);
  assert.deepEqual(saved, []);
});

test('refresh 5xx preserves credentials; 401/403 invalidate them', async () => {
  for (const status of [500, 503, 401, 403]) {
    const { refresh, storage } = refreshHarness(async () => ({ ok: false, status }));
    assert.equal(await refresh(), false);
    assert.equal(storage.getRevision(), status >= 500 ? 0 : 1);
  }
});

test('subscribeMessages delivers realtime trip updates immediately and unsubscribes cleanly', async () => {
  const { store, connections } = inbox();
  await store.setSession(session());
  const received = [];
  const unsubscribe = store.subscribeMessages((item) => received.push(item));

  connections[0].onMessage({
    id: 'evt-trip-1',
    type: 'TRIP_DRIVER_ASSIGNED',
    title: 'Cập nhật chuyến đi',
    content: 'Tài xế đã nhận chuyến',
    data: { tripId: 'trip-99', tripStatus: 'DRIVER_ASSIGNED' },
  });
  assert.equal(received.length, 1);
  assert.equal(received[0].data.tripId, 'trip-99');
  assert.equal(received[0].data.tripStatus, 'DRIVER_ASSIGNED');

  unsubscribe();
  connections[0].onMessage({
    id: 'evt-trip-2',
    type: 'TRIP_COMPLETED',
    title: 'Cập nhật chuyến đi',
    content: 'Chuyến đi đã hoàn thành',
    data: { tripId: 'trip-99', tripStatus: 'COMPLETED' },
  });
  assert.equal(received.length, 1);
});

test('DRIVER_OFFER_UPDATED notifies subscribeMessages without appearing in UI inbox or notification center', async () => {
  const { store, connections, delivered } = inbox();
  await store.setSession(session());
  const received = [];
  store.subscribeMessages((item) => received.push(item));

  connections[0].onMessage({
    id: 'offer-trip-1:1:1-PENDING',
    type: 'DRIVER_OFFER_UPDATED',
    title: 'Cập nhật lời mời chuyến đi',
    content: 'Trạng thái lời mời: PENDING',
    data: { offerId: 'trip-1:1:1', tripId: 'trip-1', status: 'PENDING' },
  });

  assert.equal(received.length, 1);
  assert.equal(received[0].type, 'DRIVER_OFFER_UPDATED');
  assert.equal(store.getSnapshot().items.length, 0);
  assert.equal(store.getSnapshot().unreadCount, 0);
  assert.deepEqual(delivered, []);
});
