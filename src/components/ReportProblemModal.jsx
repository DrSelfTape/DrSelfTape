/**
 * ReportProblemModal — in-app bug report / feedback.
 *
 * Posts to /v1/users/feedback/ (lands in the admin support inbox, readable via
 * `manage.py feedback_report`) AND mirrors to Sentry as a tagged message, so a
 * report reaches us through two channels. Auto-attaches light diagnostics
 * (screen, platform, user agent) for triage.
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { captureMessage } from '../utils/sentry';
import { Bug, X, CheckCircle2 } from 'lucide-react';
import axiosInstance from '../redux/http';
import endPoints from '../redux/constant';

const GOLD = '#D4A85F';

function collectContext() {
  let platform = 'web';
  try {
    if (window.Capacitor?.isNativePlatform?.()) platform = 'iOS app';
  } catch { /* ignore */ }
  return {
    screen: `${window.location?.hash || window.location?.pathname || ''} · ${document?.title || ''}`.slice(0, 300),
    platform,
    app_version: import.meta.env?.VITE_APP_VERSION || '',
    user_agent: navigator?.userAgent || '',
  };
}

export default function ReportProblemModal({ onClose }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('drst-modal-open'));
    return () => window.dispatchEvent(new CustomEvent('drst-modal-closed'));
  }, []);

  const submit = async () => {
    const text = message.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    const context = collectContext();
    // Mirror to Sentry first (best-effort) — surfaces it where we triage errors.
    try {
      captureMessage(`User report: ${text.slice(0, 140)}`, {
        level: 'info',
        tags: { type: 'user_feedback' },
        extra: { message: text, ...context },
      });
    } catch { /* ignore */ }
    try {
      await axiosInstance.post(endPoints.feedback, { message: text, kind: 'bug', context });
      setSent(true);
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't send that. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100001,
        background: 'rgba(10,9,7,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460, background: 'var(--aurora-surface-solid, #fff)',
          borderRadius: '24px 24px 0 0',
          padding: '20px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
          boxShadow: 'var(--aurora-shadow-modal, 0 -8px 40px rgba(0,0,0,0.25))',
          animation: 'reportPop 0.32s cubic-bezier(0.34,1.4,0.64,1) forwards',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--aurora-line, #eee)', margin: '0 auto 16px' }} />

        {sent ? (
          <div style={{ textAlign: 'center', padding: '12px 4px 6px' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(34,197,94,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <CheckCircle2 size={26} color="#22c55e" />
            </div>
            <h3 className="aurora-display" style={{ fontSize: 20, color: 'var(--aurora-text, #0A0A0A)', margin: '0 0 6px', fontFamily: "'Playfair Display', serif" }}>
              Got it, thank you
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--aurora-sub, rgba(10,10,10,0.6))', margin: '0 0 18px', lineHeight: 1.5 }}>
              This went straight to the team. If it needs a follow-up, we'll reach out.
            </p>
            <button onClick={onClose} style={{
              width: '100%', padding: 14, borderRadius: 14, border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg, ${GOLD}, #7A5A18)`, color: '#0E0D0A', fontSize: 14, fontWeight: 800,
            }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7A5A18', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Bug size={13} /> Report a problem
              </span>
              <button onClick={onClose} aria-label="Close" style={{
                width: 30, height: 30, borderRadius: 9, border: 'none', cursor: 'pointer',
                background: 'var(--aurora-glass, rgba(10,10,10,0.04))', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={16} color="var(--aurora-sub, rgba(10,10,10,0.5))" />
              </button>
            </div>

            <h3 className="aurora-display" style={{ fontSize: 21, color: 'var(--aurora-text, #0A0A0A)', margin: '0 0 6px', letterSpacing: '-0.4px', fontFamily: "'Playfair Display', serif" }}>
              Something not working?
            </h3>
            <p style={{ fontSize: 13, color: 'var(--aurora-sub, rgba(10,10,10,0.6))', margin: '0 0 14px', lineHeight: 1.5 }}>
              Tell us what happened. The more detail the better. It goes straight to the team.
            </p>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              autoFocus
              rows={5}
              placeholder="What were you doing, and what went wrong?"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 14, fontSize: 15,
                border: '1px solid var(--aurora-line, rgba(10,10,10,0.12))',
                background: 'var(--aurora-glass, #F4F4EE)', color: 'var(--aurora-text, #0A0A0A)',
                outline: 'none', resize: 'none', lineHeight: 1.5,
              }}
            />

            {error && <p style={{ fontSize: 12.5, color: '#b91c1c', margin: '8px 2px 0' }}>{error}</p>}

            <button
              onClick={submit}
              disabled={!message.trim() || sending}
              style={{
                width: '100%', marginTop: 14, padding: 14, borderRadius: 14, border: 'none',
                background: `linear-gradient(135deg, ${GOLD}, #7A5A18)`, color: '#0E0D0A',
                fontSize: 14, fontWeight: 800, cursor: 'pointer',
                opacity: (!message.trim() || sending) ? 0.5 : 1,
              }}
            >
              {sending ? 'Sending…' : 'Send report'}
            </button>
            <p style={{ fontSize: 10.5, color: 'var(--aurora-dim, rgba(10,10,10,0.4))', textAlign: 'center', margin: '8px 0 0' }}>
              We attach your screen + device info to help us fix it faster.
            </p>
          </>
        )}
      </div>
      <style>{`@keyframes reportPop { from { opacity:0; transform:translateY(24px);} to {opacity:1; transform:translateY(0);} }`}</style>
    </div>,
    document.body,
  );
}
