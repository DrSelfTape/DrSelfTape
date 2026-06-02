import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { requestAiConsent } from './AIConsentModal';

/**
 * useAIGate — Apple Guideline 5.1.1(i) consent gate for AI panels.
 *
 * Drop this at the top of any panel that triggers AI calls. On mount:
 *   - Resolves immediately if the user already has consent.
 *   - Otherwise opens the global AIConsentModal.
 *   - If the user declines, navigates back to the supplied fallback
 *     route (default `/dashboard`) so the panel doesn't render in a
 *     half-broken "AI rejected by BE" state.
 */
export default function useAIGate({ fallback = '/dashboard' } = {}) {
  const navigate = useNavigate();
  const user = useSelector((s) => s?.auth?.user);
  const askedRef = useRef(false);

  useEffect(() => {
    if (askedRef.current) return;
    if (user?.ai_consent_accepted_at) return;
    askedRef.current = true;
    requestAiConsent().then((ok) => {
      if (!ok) navigate(fallback);
    });
  }, [user?.ai_consent_accepted_at, fallback, navigate]);
}
