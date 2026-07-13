import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../redux/http';

// Module-level cache — shared across all hook instances, avoids per-component fetches.
// 10s is short enough that a token spent in one place reflects almost immediately
// in another. Hard invalidation happens on the `insufficient_tokens` window event,
// so the cache never hides a real "you're out" state.
let cachedBalance = null;
let cachedUnlimited = false;
let cachedPlan = null;
let cachedStatus = null;
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
  cachedPlan = null;
  cachedStatus = null;
  lastFetch = 0;
  cacheGen += 1;
}

export function useTokenBalance() {
  const [balance, setBalance] = useState(cachedBalance);
  // Premium ("Unlimited") users never deduct from the balance — the BE returns
  // unlimited:true so the UI can show "Unlimited" instead of a frozen number.
  const [unlimited, setUnlimited] = useState(cachedUnlimited);
  // Subscription plan + status power the "any paid plan unlocks the deep read"
  // gate (distinct from `unlimited`, which is Premium-only).
  const [plan, setPlan] = useState(cachedPlan);
  const [status, setStatus] = useState(cachedStatus);
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
      setPlan(cachedPlan);
      setStatus(cachedStatus);
      setLoading(false);
      setError(false);
      return;
    }
    // Hitting the network — mark loading so entitlement-gated consumers know the
    // cached value may be stale and can fail-open until it resolves.
    setLoading(true);
    const gen = cacheGen;
    // /status is a superset of /tokens (balance + unlimited) and also carries the
    // subscription plan + status, so the "any paid plan" gate needs no extra call.
    axiosInstance.get('/v1/subscriptions/status/')
      .then(res => {
        if (gen !== cacheGen) return; // logout/reset happened mid-flight — discard
        const d = res.data.data || {};
        const bal = d.balance ?? 0;
        const unl = d.unlimited ?? false;
        cachedBalance = bal;
        cachedUnlimited = unl;
        cachedPlan = d.plan ?? null;
        cachedStatus = d.status ?? null;
        lastFetch = Date.now();
        setBalance(bal);
        setUnlimited(unl);
        setPlan(cachedPlan);
        setStatus(cachedStatus);
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

  // Any active/trialing paid plan unlocks gated depth; `unlimited` (Premium)
  // additionally lifts token limits.
  const isPaid = !!plan && (status === 'active' || status === 'trialing');
  return { balance, unlimited, plan, status, isPaid, loading, error, refresh };
}
