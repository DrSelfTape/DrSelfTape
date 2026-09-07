import { useEffect } from 'react';
import { useSelector, useStore } from 'react-redux';
import { flushPendingPersonalization, pendingKey } from './pendingPersonalization';

export default function usePendingPersonalization() {
  const store = useStore();
  const userId = useSelector(state => state.auth?.user?.id);
  const authenticated = useSelector(state => !!state.auth?.user?.token);
  useEffect(() => {
    if (!userId || !authenticated) return;
    const flush = () => {
      if (store.getState().auth?.user?.id === userId) void flushPendingPersonalization(store);
    };
    const onStorage = event => { if (event.key === pendingKey(userId)) flush(); };
    flush();
    window.addEventListener('online', flush);
    window.addEventListener('focus', flush);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('online', flush);
      window.removeEventListener('focus', flush);
      window.removeEventListener('storage', onStorage);
    };
  }, [store, userId, authenticated]);
}
