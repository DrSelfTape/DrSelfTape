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
import { useDispatch, useStore } from 'react-redux';

import axiosInstance from '../../redux/http';
import { setAiConsentAcceptedAt } from '../../redux/features/auth/authSlice';
import { openExternal } from '../../utils/openExternal';

import { settleAiConsent } from './consentRequest';

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
    data: 'The AI line text only. Your voice and video are never sent.',
  },
];

const PRIMARY_GOLD = '#D4A85F';
const DEEP_GOLD = '#7A5A18';

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
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const activeUser = useRef(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const dialogRef = useRef(null);

  const finish = useCallback((accepted) => {
    generation.current++;
    activeUser.current = null;
    busy.current = false;
    setSubmitting(false);
    setOpen(false);
    setError('');
    settleAiConsent(accepted);
  }, []);

  useEffect(() => {
    const invalidate = () => { generation.current++; };
    const handler = (event) => {
      const user = store.getState().auth?.user;
      if (!user?.id) { finish(false); return; }
      if (activeUser.current === user.id) return;
      if (user.ai_consent_accepted_at && !event.detail?.force) {
        settleAiConsent(true);
        return;
      }
      activeUser.current = user.id;
      if (event.detail?.force) dispatch(setAiConsentAcceptedAt(null));
      setOpen(true);
    };
    const unsubscribe = store.subscribe(() => {
      if (activeUser.current && store.getState().auth?.user?.id !== activeUser.current) finish(false);
    });
    window.addEventListener('drst-open-ai-consent', handler);
    return () => {
      window.removeEventListener('drst-open-ai-consent', handler);
      unsubscribe();
      invalidate();
      settleAiConsent(false);
    };
  }, [dispatch, store, finish]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    dialogRef.current?.querySelector('button')?.focus();
    window.dispatchEvent(new CustomEvent('drst-modal-open'));
    const back = (event) => {
      // Consume native Back while saving too: an accepted write is underway.
      if (event.cancelable) event.preventDefault();
      if (!busy.current) finish(false);
    };
    window.addEventListener('popstate', back);
    window.addEventListener('drst-back', back);
    return () => {
      window.removeEventListener('popstate', back);
      window.removeEventListener('drst-back', back);
      window.dispatchEvent(new CustomEvent('drst-modal-closed'));
      if (previous?.isConnected) previous.focus();
    };
  }, [open, finish]);

  const onAccept = async () => {
    if (busy.current || !activeUser.current) return;
    busy.current = true;
    const requestGeneration = generation.current;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await axiosInstance.post('/v1/users/ai-consent/', {});
      if (generation.current !== requestGeneration) return;
      const stamp = data?.data?.ai_consent_accepted_at || data?.ai_consent_accepted_at;
      if (!stamp) throw new Error('Consent was not confirmed. Please try again.');
      dispatch(setAiConsentAcceptedAt(stamp));
      finish(true);
    } catch {
      if (generation.current === requestGeneration) setError('Could not record consent. Please try again.');
    } finally {
      if (generation.current === requestGeneration) { busy.current = false; setSubmitting(false); }
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (!busy.current) finish(false);
    }
    if (event.key === 'Tab') {
      const buttons = [...dialogRef.current.querySelectorAll('button:not(:disabled)')];
      const first = buttons[0], last = buttons.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  };

  if (!open) return null;

  const node = (
    <div
      ref={dialogRef}
      onKeyDown={onKeyDown}
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
            We send some of your data to AI providers. Okay?
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
            When you run an AI feature like Tape Review, your tape&apos;s
            extracted frames, audio, and transcript are sent to the AI
            providers above to generate your notes. See our{' '}
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
