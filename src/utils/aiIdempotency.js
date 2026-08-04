/**
 * Stable idempotency keys for the AI charge endpoints.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every AI endpoint that spends a token reads an `Idempotency-Key` header:
 *
 *   err = _spend_token(request.user, 'parse_breakdown',
 *                      idempotency_key=request.headers.get('Idempotency-Key', ''))
 *
 * and `spend_token` guards its dedup lookup with `if idempotency_key and ...`.
 * An empty key therefore skips dedup ENTIRELY — the charge always goes through.
 * Until this helper landed, the FE sent no key on cd-feedback, generate-scene,
 * parse-breakdown, parse-sides, scene-partner or tts, so any retry (double-tap,
 * flaky uplink, axios retry) charged the user a second token for one action.
 *
 * WHY CONTENT-DERIVED, NOT RANDOM
 * -------------------------------
 * A key minted fresh per call would be useless: the retry mints a *different*
 * key and dedup never fires. The key has to be stable for one user intent, so
 * we derive it from the action plus the request content. Same content resubmitted
 * => same key => one charge. Different content => different key => charged.
 *
 * The deliberate trade: re-running the SAME input later dedups and comes back
 * free. That's the safe direction to err — this code exists to stop
 * double-charging, and silently under-charging identical repeat work is far
 * cheaper than billing twice for one action. (The BE already handles the other
 * side: once a charge is refunded, its key is retired and a genuine re-run
 * charges again.)
 *
 * Keys stay under the BE's 64-char column. Longer or `refund:`-prefixed keys
 * would be sha256-normalized server-side anyway, but staying in range keeps the
 * ledger readable.
 */

/** FNV-1a, seeded. Not cryptographic — we need stability and spread, not secrecy. */
function hash32(str, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Two independently seeded passes => 64 bits of key, so distinct content
 *  collides only astronomically rarely within one user's history. */
function digest(str) {
  return hash32(str, 0x811c9dc5) + hash32(str, 0x7fffffff);
}

/**
 * Describe a value stably. Files can't be hashed synchronously, so identify
 * them by the tuple that's stable across a retry of the same pick: name, size,
 * and last-modified stamp.
 */
function describe(value) {
  if (value == null) return '';
  if (typeof File !== 'undefined' && value instanceof File) {
    return `file:${value.name}:${value.size}:${value.lastModified}`;
  }
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return `blob:${value.size}:${value.type}`;
  }
  if (typeof FormData !== 'undefined' && value instanceof FormData) {
    // Entry order is insertion order and stable for a given call site.
    const parts = [];
    value.forEach((v, k) => { parts.push(`${k}=${describe(v)}`); });
    return parts.join('&');
  }
  if (Array.isArray(value)) return value.map(describe).join(',');
  if (typeof value === 'object') {
    return Object.keys(value).sort().map((k) => `${k}=${describe(value[k])}`).join('&');
  }
  return String(value);
}

/**
 * Build a stable Idempotency-Key for an AI charge call.
 *
 * @param {string} action  short endpoint tag, e.g. 'parse_breakdown'
 * @param {*} payload      the request body (object / FormData / File / string)
 * @returns {string} key of the form `<action>-<16 hex>`
 */
export function aiIdempotencyKey(action, payload) {
  return `${String(action).slice(0, 40)}-${digest(describe(payload))}`;
}

/**
 * Convenience: the axios config fragment to spread into a charge request.
 *
 *   axiosInstance.post(endPoints.parseBreakdown, body,
 *     aiIdempotencyHeaders('parse_breakdown', body))
 */
export function aiIdempotencyHeaders(action, payload, extraConfig = {}) {
  const { headers, ...rest } = extraConfig;
  return {
    ...rest,
    headers: { ...(headers || {}), 'Idempotency-Key': aiIdempotencyKey(action, payload) },
  };
}

export default aiIdempotencyKey;
