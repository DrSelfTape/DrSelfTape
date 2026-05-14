/**
 * Per-user localStorage helper.
 *
 * Wraps localStorage with auto-namespacing by user ID so multiple users
 * on the same device (or a logged-out browsing session before login) don't
 * leak preferences into each other.
 *
 * Pair this with `userSettings` redux slice for cross-device sync via the
 * server. localStorage acts as the offline cache; server is the source of
 * truth when a user logs in on a new device.
 */

const PREFIX = 'u:';
const ANON_PREFIX = 'anon:';

const keyFor = (userId, key) => {
  if (userId == null || userId === '') return `${ANON_PREFIX}${key}`;
  return `${PREFIX}${userId}:${key}`;
};

export function getUserItem(userId, key, fallback = null) {
  try {
    const v = localStorage.getItem(keyFor(userId, key));
    return v != null ? v : fallback;
  } catch {
    return fallback;
  }
}

export function setUserItem(userId, key, value) {
  try {
    localStorage.setItem(keyFor(userId, key), String(value));
  } catch { /* quota / private mode — silently ignore */ }
}

export function removeUserItem(userId, key) {
  try { localStorage.removeItem(keyFor(userId, key)); } catch { /* */ }
}

/* JSON wrapper for objects */
export function getUserJSON(userId, key, fallback = null) {
  const raw = getUserItem(userId, key);
  if (raw == null) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

export function setUserJSON(userId, key, value) {
  try { setUserItem(userId, key, JSON.stringify(value)); } catch { /* */ }
}

/* Read current user id from the redux-persist blob without importing
 * the store (we may be called from outside React, e.g. theme init). */
export function getCurrentUserId() {
  try {
    const raw = localStorage.getItem('persist:root');
    if (!raw) return null;
    const root = JSON.parse(raw);
    const auth = typeof root.auth === 'string' ? JSON.parse(root.auth) : root.auth;
    return auth?.user?.id ?? null;
  } catch {
    return null;
  }
}
