// @ts-check
// Polyfill TextEncoding safely if not provided by Hermes / Node
if (typeof TextDecoder === 'undefined') {
  try {
    // eslint-disable-next-line no-undef
    require('fast-text-encoding');
  } catch {
    // Hermes RN 0.74+ and Node have native TextDecoder
  }
}
import { toByteArray } from 'base64-js';
export const MAX_NOTIFICATIONS = 200;

const notificationClock = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** @param {string} timestamp */
export function formatNotificationTimestamp(timestamp) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = Object.fromEntries(notificationClock.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.hour}:${parts.minute} ${parts.day}/${parts.month}/${parts.year}`;
}

/**
 * @typedef {Object} NotificationItem
 * @property {string} id
 * @property {string} type
 * @property {string} title
 * @property {string} content
 * @property {Record<string, unknown>} data
 * @property {string} timestamp
 * @property {string} receivedAt
 * @property {string | null} readAt
 */

/** @returns {NotificationItem | null} */
export function normalizeNotification(value, now = new Date().toISOString()) {
  if (!value || typeof value !== 'object' ||
      !['id', 'title', 'content'].every((key) => typeof value[key] === 'string' && value[key].trim())) {
    return null;
  }
  return {
    id: value.id,
    type: typeof value.type === 'string' ? value.type : 'GENERAL',
    title: value.title,
    content: value.content,
    data: value.data && typeof value.data === 'object' && !Array.isArray(value.data) ? value.data : {},
    timestamp: typeof value.timestamp === 'string' && Number.isFinite(Date.parse(value.timestamp))
      ? value.timestamp : now,
    receivedAt: now,
    readAt: null,
  };
}

export function restoreNotifications(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    return parsed.flatMap((value) => {
      const item = normalizeNotification(value);
      if (!item || seen.has(item.id)) return [];
      seen.add(item.id);
      return [{
        ...item,
        receivedAt: typeof value.receivedAt === 'string' && Number.isFinite(Date.parse(value.receivedAt))
          ? value.receivedAt : item.timestamp,
        readAt: typeof value.readAt === 'string' && Number.isFinite(Date.parse(value.readAt))
          ? value.readAt : null,
      }];
    }).sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt)).slice(0, MAX_NOTIFICATIONS);
  } catch {
    return [];
  }
}

// JWT claims are used only for lifecycle/expiry; the server validates the signature.
export function getTokenClaims(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(new TextDecoder().decode(toByteArray(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='))));
  } catch {
    return null;
  }
}

export function notificationSocketUrl(gatewayUrl, override) {
  const url = override?.trim() || `${gatewayUrl.replace(/\/+$/, '')}/ws/notifications`;
  const normalized = url.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  if (!/^wss?:\/\//.test(normalized)) throw new Error('Invalid notification WebSocket URL');
  return normalized;
}
