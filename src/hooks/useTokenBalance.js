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

export function useTokenBalance() {
  const [balance, setBalance] = useState(cachedBalance);
  // Premium ("Unlimited") users never deduct from the balance — the BE returns
  // unlimited:true so the UI can show "Unlimited" instead of a frozen number.
  const [unlimited, setUnlimited] = useState(cachedUnlimited);
  const [loading, setLoading] = useState(cachedBalance === null);

  const refresh = useCallback((force = false) => {
    const now = Date.now();
    if (!force && cachedBalance !== null && (now - lastFetch) < CACHE_TTL) {
      setBalance(cachedBalance);
      setUnlimited(cachedUnlimited);
      setLoading(false);
      return;
    }
    axiosInstance.get('/v1/subscriptions/tokens/')
      .then(res => {
        const bal = res.data.data?.balance ?? 0;
        const unl = res.data.data?.unlimited ?? false;
        cachedBalance = bal;
        cachedUnlimited = unl;
        lastFetch = Date.now();
        setBalance(bal);
        setUnlimited(unl);
      })
      .catch(() => setBalance(cachedBalance))
      .finally(() => setLoading(false));
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

  return { balance, unlimited, loading, refresh };
}
