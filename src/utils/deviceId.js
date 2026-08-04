/**
 * H-01 — per-install device signal.
 *
 * The free first review and the 5 signup tokens are granted per ACCOUNT, so
 * serial re-registration yields unlimited free runs of the most expensive AI
 * path in the product. This module supplies the stable per-install identifier
 * the backend hashes and records (`X-Device-Id`), so that abuse becomes visible
 * and — behind a server flag that is OFF by default — stoppable.
 *
 * WHAT THIS IS NOT: it is not a fingerprint, and it deliberately isn't one.
 *
 *   • On iOS the "right" value is `identifierForVendor`, which needs the
 *     `@capacitor/device` plugin. That plugin is not installed, and adding it
 *     means a native rebuild + App Store release before a single signal is
 *     recorded. A persisted id gets us observing this week instead of next
 *     month. See the H-01 ticket's open questions.
 *
 *   • On web a real fingerprint (canvas / font / WebGL entropy) collides hard
 *     between similar devices. A collision here denies a genuinely new user
 *     their free first review — the single most important activation moment in
 *     the product — so the high-collision option is the wrong trade. A random
 *     persisted id has false NEGATIVES (cleared storage, reinstall) and
 *     essentially no false positives. That is the correct direction to fail.
 *
 * The value is random and carries no personal data; the server stores only an
 * HMAC of it, never this string.
 */

const STORAGE_KEY = 'drst_device_id';

const randomId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch { /* fall through */ }
  // Last resort. Weaker, but a weak id beats no signal at all.
  return `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
};

// Cached so a burst of requests doesn't hit storage repeatedly, and so the id
// stays stable for the session even if storage is cleared mid-flight.
let cached = null;

/**
 * Stable per-install id. Returns '' only when storage is completely unavailable
 * AND id generation failed — in which case the server simply records no signal
 * and grants as it does today (the gate fails open by design).
 */
export const getDeviceId = () => {
  if (cached) return cached;
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
      cached = existing;
      return cached;
    }
  } catch { /* private mode / storage disabled */ }

  const fresh = randomId();
  try {
    localStorage.setItem(STORAGE_KEY, fresh);
  } catch { /* not persistable — still useful for this session */ }
  cached = fresh;
  return cached;
};

export default getDeviceId;
