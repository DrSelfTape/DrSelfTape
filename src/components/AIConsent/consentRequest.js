export const consentRequestState = { pendingResolve: null };

/**
 * Opens the AI consent modal globally. Returns a Promise that resolves
 * with `true` when the user accepts, `false` when they decline. Callers
 * should be safe with either outcome — typically: bail out / navigate
 * back on `false`, proceed on `true`.
 *
 *   const ok = await requestAiConsent();
 *   if (!ok) return navigate(-1);
 */
export function requestAiConsent() {
  return new Promise((resolve) => {
    consentRequestState.pendingResolve = resolve;
    try {
      window.dispatchEvent(new CustomEvent('drst-open-ai-consent'));
    } catch {
      resolve(false);
    }
  });
}

