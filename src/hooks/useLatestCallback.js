import { useCallback, useLayoutEffect, useRef } from 'react';

// External listeners and one-shot timers need current behavior without being
// torn down whenever a caller renders. Only invoke this callback after commit.
export function useLatestCallback(callback) {
  const callbackRef = useRef(callback);
  useLayoutEffect(() => { callbackRef.current = callback; }, [callback]);
  return useCallback((...args) => callbackRef.current(...args), []);
}
