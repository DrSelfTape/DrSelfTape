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
    async run(dispatch, action) {
      if (cancelled || !matches()) return false;
      // Let the HTTP request (including silent refresh) finish. Guard Redux
      // application by actor identity instead of aborting a valid request.
      const request = dispatch((apply, getState, extra) => action(
        next => !cancelled && matches() ? apply(next) : next,
        getState,
        extra,
      ));
      requests.add(request);
      try {
        await request.unwrap();
        return !cancelled && matches();
      } catch {
        return false;
      } finally {
        release(request);
      }
    },
    // Closing a screen is not logout. Keep observing identity while its
    // background request is active, then release the subscription.
    dispose() { disposed = true; if (!requests.size) unsubscribe(); },
  };
}
