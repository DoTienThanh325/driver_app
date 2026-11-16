// @ts-check
import { MAX_NOTIFICATIONS, normalizeNotification, restoreNotifications } from '../utils/notification-state.js';

/**
 * @typedef {{userId: string | null, items: import('../utils/notification-state').NotificationItem[],
 * unreadCount: number, loading: boolean, status: string,
 * banner: import('../utils/notification-state').NotificationItem | null, storageError: boolean}} NotificationSnapshot
 */

/** @returns {NotificationSnapshot} */
const initialSnapshot = () => ({
  userId: null, items: [], unreadCount: 0, loading: false,
  status: 'signed-out', banner: null, storageError: false,
});

/** A session-scoped inbox. Storage operations are ordered, including logout deletion. */
export class NotificationStore {
  constructor({ storage, createTransport, supported = true, setTimer = setTimeout, clearTimer = clearTimeout }) {
    this.storage = storage;
    this.createTransport = createTransport;
    this.supported = supported;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.snapshot = initialSnapshot();
    this.listeners = new Set();
    this.session = null;
    this.epoch = 0;
    this.connection = 0;
    this.active = false;
    this.pendingStorage = Promise.resolve();
  }

  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  update(patch) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.snapshot.unreadCount = this.snapshot.items.filter((item) => !item.readAt).length;
    this.listeners.forEach((listener) => listener());
  }

  storageKey(userId) { return `tm_notifications:${encodeURIComponent(userId)}`; }

  enqueueStorage(operation) {
    const result = this.pendingStorage.then(operation);
    this.pendingStorage = result.catch(() => {});
    return result;
  }

  persist() {
    const { userId, items } = this.snapshot;
    const epoch = this.epoch;
    if (!userId) return;
    this.enqueueStorage(() => this.storage.setItem(this.storageKey(userId), JSON.stringify(items)))
      .catch(() => { if (epoch === this.epoch) this.update({ storageError: true }); });
  }

  dismissBanner = () => {
    this.clearTimer(this.bannerTimer);
    this.update({ banner: null });
  };

  stopConnection() {
    this.connection += 1;
    this.stopTransport?.();
    this.stopTransport = null;
  }

  async setSession(session) {
    if (session?.userId === this.session?.userId && session?.token === this.session?.token) {
      if (session && !this.stopTransport) this.startConnection();
      return;
    }
    const previousUser = this.session?.userId;
    const sameUser = previousUser && previousUser === session?.userId;
    const hydrated = sameUser && !this.snapshot.loading;
    const epoch = ++this.epoch;
    this.stopConnection();
    this.dismissBanner();
    this.session = session;

    if (previousUser && previousUser !== session?.userId) {
      this.enqueueStorage(() => this.storage.removeItem(this.storageKey(previousUser))).catch(() => {});
    }
    if (!session) {
      this.update(initialSnapshot());
      return;
    }
    this.update({
      userId: session.userId, items: sameUser ? this.snapshot.items : [],
      loading: !hydrated, status: 'connecting', storageError: false,
    });
    if (!hydrated) {
      try {
        const raw = await this.enqueueStorage(() => this.storage.getItem(this.storageKey(session.userId)));
        if (epoch !== this.epoch) return;
        this.update({ items: restoreNotifications(raw), loading: false });
      } catch {
        if (epoch !== this.epoch) return;
        this.update({ items: [], loading: false, storageError: true });
      }
    }
    if (epoch === this.epoch) this.startConnection();
  }

  setActive(active) {
    if (this.active === active) return;
    this.active = active;
    this.stopConnection();
    if (!active) this.dismissBanner();
    this.startConnection();
  }

  startConnection() {
    if (!this.session || this.snapshot.loading) return;
    if (!this.supported || !this.active) {
      this.update({ status: this.supported ? 'paused' : 'unsupported' });
      return;
    }
    const connection = ++this.connection;
    this.update({ status: 'connecting' });
    this.stopTransport = this.createTransport({
      onStatus: (status) => { if (connection === this.connection) this.update({ status }); },
      onMessage: (value) => { if (connection === this.connection) this.receive(value); },
    });
  }

  receive(value) {
    const item = normalizeNotification(value);
    if (!item || this.snapshot.items.some((existing) => existing.id === item.id)) return;
    this.update({ items: [item, ...this.snapshot.items].slice(0, MAX_NOTIFICATIONS), banner: item });
    this.persist();
    this.clearTimer(this.bannerTimer);
    this.bannerTimer = this.setTimer(() => this.update({ banner: null }), 5000);
  }

  /** @param {string | null} [id] */
  markRead = (id = null) => {
    const readAt = new Date().toISOString();
    this.update({ items: this.snapshot.items.map((item) =>
      !item.readAt && (!id || item.id === id) ? { ...item, readAt } : item) });
    this.persist();
  };

  dispose() {
    ++this.epoch;
    this.stopConnection();
    this.clearTimer(this.bannerTimer);
    this.session = null;
    this.active = false;
    this.snapshot = initialSnapshot();
  }
}
