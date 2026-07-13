import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../redux/http';

// Module-level cache — shared across all hook instances, avoids per-component fetches.
// 10s is short enough that a token spent in one place reflects almost immediately
// in another. Hard invalidation happens on the `insufficient_tokens` window event,
// so the cache never hides a real "you're out" state.
let cachedBalance = null;
let cachedUnlimited = false;
let lastFetch = 0;
const CACHE_TTL = 10000;
// Bumped on logout/reset. An in-flight fetch captures the generation at start and
// discards its result if the generation changed — so User A's request can never
// repopulate the cache after A logs out (which would leak A's plan to User B).
let cacheGen = 0;

// Clear the module-level cache. Called from performLogout so a new user on this
// device can never inherit the previous user's plan (which would briefly unlock
// gated Premium content — see the TapeReview full-read gate).
export function resetTokenCache() {
  cachedBalance = null;
  cachedUnlimited = false;
  lastFetch = 0;
  cacheGen += 1;
}

export function useTokenBalance() {
  const [balance, setBalance] = useState(cachedBalance);
  // Premium ("Unlimited") users never deduct from the balance — the BE returns
  // unlimited:true so the UI can show "Unlimited" instead of a frozen number.
  const [unlimited, setUnlimited] = useState(cachedUnlimited);
  const [loading, setLoading] = useState(cachedBalance === null);
  // Whether the LAST plan lookup failed. Entitlement-gated consumers treat an
  // errored (stale) value as unknown and fail-open, so a network hiccup after a
  // plan change never locks a paying user out of gated content.
  const [error, setError] = useState(false);

  const refresh = useCallback((force = false) => {
    const now = Date.now();
    if (!force && cachedBalance !== null && (now - lastFetch) < CACHE_TTL) {
      setBalance(cachedBalance);
      setUnlimited(cachedUnlimited);
      setLoading(false);
      setError(false);
      return;
    }
    // Hitting the network — mark loading so entitlement-gated consumers know the
    // cached value may be stale and can fail-open until it resolves.
    setLoading(true);
    const gen = cacheGen;
    axiosInstance.get('/v1/subscriptions/tokens/')
      .then(res => {
        if (gen !== cacheGen) return; // logout/reset happened mid-flight — discard
        const bal = res.data.data?.balance ?? 0;
        const unl = res.data.data?.unlimited ?? false;
        cachedBalance = bal;
        cachedUnlimited = unl;
        lastFetch = Date.now();
        setBalance(bal);
        setUnlimited(unl);
        setError(false);
      })
      .catch(() => { if (gen === cacheGen) { setBalance(cachedBalance); setError(true); } })
      .finally(() => { if (gen === cacheGen) setLoading(false); });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Hard invalidation events: insufficient_tokens (a spend was refused) and
  // dst-tokens-changed (an AI charge just settled — fired by the jericho
  // slice's fulfilled reducers so every charge path, including the recorder's
  // record→review handoff, shows the post-charge balance immediately).
  useEffect(() => {
    const handler = () => {
      cachedBalance = null;
      lastFetch = 0;
      refresh(true);
    };
    window.addEventListener('insufficient_tokens', handler);
    window.addEventListener('dst-tokens-changed', handler);
    return () => {
      window.removeEventListener('insufficient_tokens', handler);
      window.removeEventListener('dst-tokens-changed', handler);
    };
  }, [refresh]);

  return { balance, unlimited, loading, error, refresh };
}
