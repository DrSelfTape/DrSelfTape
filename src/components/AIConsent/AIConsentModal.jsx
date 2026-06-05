/**
 * AIConsentModal — Apple Guideline 5.1.1(i) / 5.1.2(i) compliance.
 *
 * Apple requires an in-product affirmative consent BEFORE any user data
 * is sent to a third-party AI processor. We use a single global modal
 * (mounted once at app root) and a window-event API so any feature can
 * pause its flow and call `requestAiConsent()` to wait for the user.
 *
 * Why a global modal + imperative API:
 *   - The 8+ AI feature entry points (CDSim, Jericho, AiScenePartner,
 *     Scripts analyzer, AuditionGenerator, etc.) shouldn't each ship
 *     their own modal — one consent grant covers them all.
 *   - axios 403 responses from `apps/users/permissions.HasAiConsent`
 *     can fire the same prompt without needing React context.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';

import axiosInstance from '../../redux/http';
import { setAiConsentAcceptedAt } from '../../redux/features/auth/authSlice';
import { openExternal } from '../../utils/openExternal';

const PRIVACY_URL = 'https://drselftape.app/privacy-policy.html';

const PROVIDERS = [
  {
    name: 'Anthropic (Claude)',
    role: 'Primary AI for coaching, scene partners, and script analysis',
    data: 'Script text, scene context, your acting profile (strengths, growth areas)',
  },
  {
    name: 'OpenAI (GPT‑4o + Whisper)',
    role: 'Backup AI + speech‑to‑text transcription',
    data: 'Script text, plus your audio when you record a performance for feedback',
  },
  {
    name: 'ElevenLabs',
    role: "Reader voice synthesis (the AI's own dialogue, not yours)",
    data: 'The AI line text only — your voice and video are never sent.',
  },
];

const PRIMARY_GOLD = '#D4A85F';
const DEEP_GOLD = '#7A5A18';

let pendingResolve = null;

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
    pendingResolve = resolve;
    try {
      window.dispatchEvent(new CustomEvent('drst-open-ai-consent'));
    } catch {
      resolve(false);
    }
  });
}

function ProviderRow({ p }) {
  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: 12,
      background: 'rgba(212, 168, 95, 0.08)',
      border: '1px solid rgba(212, 168, 95, 0.2)',
    }}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: '#1A1612' }}>
        {p.name}
      </div>
      <div style={{ marginTop: 4, fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: 'rgba(26,22,18,0.75)', lineHeight: 1.4 }}>
        {p.role}
      </div>
      <div style={{ marginTop: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: DEEP_GOLD }}>
        DATA SENT
      </div>
      <div style={{ marginTop: 2, fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: 'rgba(26,22,18,0.85)', lineHeight: 1.4 }}>
        {p.data}
      </div>
    </div>
  );
}

export default function AIConsentModal() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s?.auth?.user);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const resolveRef = useRef(null);

  const finish = useCallback((accepted) => {
    setOpen(false);
    setError('');
    if (resolveRef.current) {
      resolveRef.current(accepted);
      resolveRef.current = null;
    }
    // Clear the module-level pending slot unconditionally. The previous
    // check (`=== resolveRef.current`) compared against the just-nulled
    // ref, so it stayed pinned to the most-recent resolver across opens.
    pendingResolve = null;
  }, []);

  useEffect(() => {
    const handler = () => {
      // If the user already has consent on file, resolve immediately —
      // the modal never has to render. This makes it safe for every
      // AI feature to `await requestAiConsent()` defensively.
      if (user?.ai_consent_accepted_at) {
        if (pendingResolve) {
          pendingResolve(true);
          pendingResolve = null;
        }
        return;
      }
      resolveRef.current = pendingResolve;
      pendingResolve = null;
      setOpen(true);
    };
    window.addEventListener('drst-open-ai-consent', handler);
    return () => window.removeEventListener('drst-open-ai-consent', handler);
  }, [user?.ai_consent_accepted_at]);

  const onAccept = async () => {
    setSubmitting(true);
    setError('');
    try {
      const { data } = await axiosInstance.post('/v1/users/ai-consent/', {});
      const stamp = data?.data?.ai_consent_accepted_at || data?.ai_consent_accepted_at || new Date().toISOString();
      dispatch(setAiConsentAcceptedAt(stamp));
      finish(true);
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not record consent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-consent-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483000,
        background: 'rgba(14, 12, 8, 0.78)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 460,
        maxHeight: 'calc(100dvh - 40px)',
        background: '#FFFDF8',
        borderRadius: 20,
        border: '1px solid rgba(212, 168, 95, 0.35)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '22px 22px 6px' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, letterSpacing: '0.18em', color: DEEP_GOLD,
          }}>BEFORE YOU USE AI FEATURES</div>
          <h2 id="ai-consent-title" style={{
            margin: '6px 0 0',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px',
            color: '#1A1612', lineHeight: 1.2,
          }}>
            We send some of your data to AI providers — okay?
          </h2>
          <p style={{
            margin: '10px 0 0',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 13, color: 'rgba(26,22,18,0.78)', lineHeight: 1.5,
          }}>
            Dr Self Tape uses third‑party AI services to power scene
            partners, coaching notes, and script analysis. Tap Agree to
            allow us to send the data below to these services. You can
            still use the rest of the app without it.
          </p>
        </div>

        <div style={{
          padding: '12px 22px 6px',
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {PROVIDERS.map((p) => <ProviderRow key={p.name} p={p} />)}
          <div style={{
            marginTop: 4,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 12, color: 'rgba(26,22,18,0.7)', lineHeight: 1.5,
          }}>
            Your video recordings are <strong>never</strong> sent to AI
            providers. See our{' '}
            <button
              type="button"
              onClick={() => openExternal(PRIVACY_URL)}
              style={{
                background: 'none', border: 'none', padding: 0,
                color: DEEP_GOLD, textDecoration: 'underline',
                fontFamily: 'inherit', fontSize: 'inherit', cursor: 'pointer',
              }}
            >Privacy Policy</button>{' '}for the full data‑use details.
          </div>
        </div>

        {error && (
          <div style={{ padding: '0 22px 6px', color: '#B23A48', fontFamily: "'Space Grotesk', sans-serif", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{
          padding: '14px 22px 22px',
          display: 'flex', gap: 10,
          background: '#FFFDF8',
          borderTop: '1px solid rgba(212, 168, 95, 0.18)',
        }}>
          <button
            type="button"
            onClick={() => finish(false)}
            disabled={submitting}
            style={{
              flex: 1, padding: '14px 0',
              borderRadius: 100,
              background: 'transparent',
              border: '1.5px solid rgba(26,22,18,0.22)',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 14, fontWeight: 600, color: '#1A1612',
              cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >Decline</button>
          <button
            type="button"
            onClick={onAccept}
            disabled={submitting}
            style={{
              flex: 1.4, padding: '14px 0',
              borderRadius: 100,
              background: PRIMARY_GOLD,
              border: 'none',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 14, fontWeight: 700, color: '#0E0D0A',
              cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >{submitting ? 'Saving…' : 'I Agree & Continue'}</button>
        </div>
      </div>
    </div>
  );

  // Portal so the modal escapes any stacking-context trap created by
  // `.aurora-orbs` (`isolation: isolate`) — same gotcha the Self-Tapes
  // modal hit. Fixed `position: fixed; zIndex: 2147483000` paints above
  // MobileApp's top + bottom bars (both zIndex 50).
  return createPortal(node, document.body);
}
