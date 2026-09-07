// A deferred onboarding action belongs to the session that started it. Redux
// subscriptions catch logout even when React batches logout + login together.
export function createOnboardingSession(store) {
  const origin = store.getState().auth?.user;
  let cancelled = false;
  const requests = new Set();
  const matches = () => {
    const user = store.getState().auth?.user;
    return !!origin?.id && user?.id === origin.id && user?.token === origin.token;
  };
  const cancel = () => {
    cancelled = true;
    requests.forEach(request => request.abort?.());
    requests.clear();
  };
  const unsubscribe = store.subscribe(() => { if (!matches()) cancel(); });
  return {
    current: () => !cancelled && matches(),
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
        requests.delete(request);
      }
    },
    dispose() { cancel(); unsubscribe(); },
  };
}
