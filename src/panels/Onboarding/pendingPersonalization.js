import { updateProfileThunk } from '../../redux/features/profile/profileSlice';
import { normalizePersonalization } from '../../data/onboardingPersonalization';
import { createOnboardingSession } from './onboardingSession';

export const pendingKey = userId => `dst_onb_pending:${userId}`;
const flights = new WeakMap();

// The app and onboarding share one writer per account. Storage is the durable
// source; a late acknowledgment must never remove a newer answer set.
export function flushPendingPersonalization(store, dispatch = store.dispatch) {
  const userId = store.getState().auth?.user?.id;
  if (!userId) return Promise.resolve(false);
  let accounts = flights.get(store);
  if (!accounts) { accounts = new Map(); flights.set(store, accounts); }
  const existing = accounts.get(userId);
  if (existing?.scope.current()) return existing.promise;
  const scope = createOnboardingSession(store);
  const flight = { scope };
  accounts.set(userId, flight);
  flight.promise = (async () => {
    try {
      while (scope.current()) {
        const snapshot = localStorage.getItem(pendingKey(userId));
        if (snapshot === null) return true;
        const pending = JSON.parse(snapshot);
        if (!pending || typeof pending !== 'object' || Array.isArray(pending)) return false;
        const normalized = normalizePersonalization(pending);
        const answers = Object.fromEntries(Object.keys(pending)
          .filter(key => key in normalized).map(key => [key, normalized[key]]));
        const fd = new FormData();
        fd.append('onboarding_personalization', JSON.stringify(answers));
        if (!await scope.run(dispatch, updateProfileThunk(fd))) return false;
        if (localStorage.getItem(pendingKey(userId)) === snapshot) {
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
