import { updateProfileThunk } from '../../redux/features/profile/profileSlice';
import { normalizePersonalization } from '../../data/onboardingPersonalization';
import { createOnboardingSession } from './onboardingSession';

export const pendingKey = userId => `dst_onb_pending:${userId}`;
const flights = new WeakMap();

// The app and onboarding share one writer per account. Storage is the durable
// source when available; an in-memory snapshot still requires a real PATCH
// when quota prevents storing it. A late ACK must not erase newer answers.
export function flushPendingPersonalization(store, dispatch = store.dispatch, memorySnapshot = null) {
  const userId = store.getState().auth?.user?.id;
  if (!userId) return Promise.resolve(false);
  let accounts = flights.get(store);
  if (!accounts) { accounts = new Map(); flights.set(store, accounts); }
  const existing = accounts.get(userId);
  if (existing?.scope.current()) {
    if (memorySnapshot !== null) existing.memorySnapshot = memorySnapshot;
    return existing.promise;
  }
  const scope = createOnboardingSession(store);
  const flight = { scope, memorySnapshot };
  accounts.set(userId, flight);
  flight.promise = (async () => {
    try {
      while (scope.current()) {
        const stored = localStorage.getItem(pendingKey(userId));
        const snapshot = flight.memorySnapshot ?? stored;
        if (snapshot === null) return true;
        const pending = JSON.parse(snapshot);
        if (!pending || typeof pending !== 'object' || Array.isArray(pending)) return false;
        const normalized = normalizePersonalization(pending);
        const answers = Object.fromEntries(Object.keys(pending)
          .filter(key => key in normalized).map(key => [key, normalized[key]]));
        const fd = new FormData();
        fd.append('onboarding_personalization', JSON.stringify(answers));
        if (!await scope.run(dispatch, updateProfileThunk(fd))) return false;
        if (flight.memorySnapshot === snapshot) flight.memorySnapshot = null;
        if (localStorage.getItem(pendingKey(userId)) === stored) {
          localStorage.removeItem(pendingKey(userId));
        }
      }
      return false;
    } catch { return false; } // Offline/storage failure leaves the pending key intact.
    finally {
      scope.dispose();
      if (accounts.get(userId) === flight) accounts.delete(userId);
    }
  })();
  return flight.promise;
}
