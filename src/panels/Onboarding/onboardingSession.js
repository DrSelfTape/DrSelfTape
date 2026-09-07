// A deferred onboarding action belongs to the session that started it. Redux
// subscriptions catch logout even when React batches logout + login together.
export function createOnboardingSession(store) {
  const origin = store.getState().auth?.user;
  let cancelled = false;
  let disposed = false;
  const requests = new Set();
  const matches = () => {
    const user = store.getState().auth?.user;
    // Tokens rotate during ordinary silent refresh; the actor is unchanged.
    return !!origin?.id && user?.id === origin.id;
  };
  const cancel = () => {
    cancelled = true;
    requests.forEach(request => request.abort?.());
    requests.clear();
  };
  const unsubscribe = store.subscribe(() => { if (!matches()) cancel(); });
  const release = request => {
    requests.delete(request);
    if (disposed && !requests.size) unsubscribe();
  };
  return {
    current: () => !cancelled && matches(),
    // Keep identity observation across deferred preparation/shared saves too,
    // not just the HTTP thunk. Logout + login may otherwise be batched while
    // an unmounted caller waits for its next dispatch.
    wait(promise) {
      requests.add(promise);
      return promise.finally(() => release(promise));
    },
    async run(dispatch, action, timeoutMs = 8000) {
      if (cancelled || !matches()) return false;
      const request = dispatch(action);
      requests.add(request);
      let timeout;
      try {
        await Promise.race([
          request.unwrap(),
          new Promise((_, reject) => {
            timeout = setTimeout(() => { request.abort?.(); reject(new Error('Onboarding save timed out')); }, timeoutMs);
          }),
        ]);
        return !cancelled && matches();
      } catch {
        return false;
      } finally {
        clearTimeout(timeout);
        release(request);
      }
    },
    // Closing a screen is not logout. Keep observing identity while its
    // background request is active, then release the subscription.
    dispose() { disposed = true; if (!requests.size) unsubscribe(); },
  };
}
