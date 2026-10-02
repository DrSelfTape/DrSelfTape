export const consentRequestState = { pendingResolve: null, pendingPromise: null };

export function settleAiConsent(accepted) {
  const resolve = consentRequestState.pendingResolve;
  consentRequestState.pendingResolve = null;
  consentRequestState.pendingPromise = null;
  resolve?.(accepted);
}

/**
 * Opens the AI consent modal globally. Returns a Promise that resolves
 * with `true` when the user accepts, `false` when they decline. Callers
 * should be safe with either outcome — typically: bail out / navigate
 * back on `false`, proceed on `true`.
 *
 *   const ok = await requestAiConsent();
 *   if (!ok) return navigate(-1);
 */
export function requestAiConsent({ force = false } = {}) {
  // Concurrent feature gates share one answer; none can overwrite a waiter.
  if (consentRequestState.pendingPromise) return consentRequestState.pendingPromise;
  const promise = new Promise((resolve) => {
    consentRequestState.pendingResolve = resolve;
  });
  consentRequestState.pendingPromise = promise;
  try {
    window.dispatchEvent(new CustomEvent('drst-open-ai-consent', { detail: { force } }));
  } catch {
    settleAiConsent(false);
  }
  return promise;
}
