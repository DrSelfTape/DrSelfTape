import { useState, useEffect } from 'react';

// Returns false on first paint, then true once the browser goes idle. Use it to
// keep a purely decorative asset off the critical path: the login background
// video is ~800KB that would otherwise be fetched while the sign-in form is
// still painting, which on a slow connection delays the only thing the user
// came for. Safari has no requestIdleCallback, so fall back to a short timer.
export function useIdleReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setReady(true), 300);
    return () => window.clearTimeout(id);
  }, []);

  return ready;
}
