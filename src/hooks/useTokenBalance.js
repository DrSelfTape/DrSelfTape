import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../redux/http';

// Module-level cache — shared across all hook instances, avoids per-component fetches
let cachedBalance = null;
let lastFetch = 0;
const CACHE_TTL = 30000; // 30 seconds

export function useTokenBalance() {
  const [balance, setBalance] = useState(cachedBalance);
  const [loading, setLoading] = useState(cachedBalance === null);

  const refresh = useCallback((force = false) => {
    const now = Date.now();
    if (!force && cachedBalance !== null && (now - lastFetch) < CACHE_TTL) {
      setBalance(cachedBalance);
      setLoading(false);
      return;
    }
    axiosInstance.get('/v1/subscriptions/tokens/')
      .then(res => {
        const bal = res.data.data?.balance ?? 0;
        cachedBalance = bal;
        lastFetch = Date.now();
        setBalance(bal);
      })
      .catch(() => setBalance(cachedBalance))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Listen for insufficient_tokens event to invalidate and refresh
  useEffect(() => {
    const handler = () => {
      cachedBalance = null;
      lastFetch = 0;
      refresh(true);
    };
    window.addEventListener('insufficient_tokens', handler);
    return () => window.removeEventListener('insufficient_tokens', handler);
  }, [refresh]);

  return { balance, loading, refresh };
}
