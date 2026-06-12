/**
 * WhatsNewModal — shows release highlights after an app update.
 *
 * Auto: on the first render where `enabled` is true, if the user hasn't seen the
 * latest release (their stored id < the newest changelog id), it pops up with
 * every unseen release. Dismissing records the latest id, so it won't show again
 * until the next update. New installs see it once too (doubles as feature
 * discovery) — but `enabled` is gated off during onboarding so it never stacks.
 *
 * Manual: pass `forceOpen` to show the latest release on demand (the "What's
 * New" entry in the More menu).
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X } from 'lucide-react';
import { WHATS_NEW } from '../data/whatsNew';

export const WHATS_NEW_SEEN_KEY = 'dst_whats_new_seen';
const GOLD = '#D4A85F';
const latestId = () => (WHATS_NEW[0]?.id || 0);

export default function WhatsNewModal({ enabled = true, forceOpen = false, onClose }) {
  const [autoEntries, setAutoEntries] = useState(null); // array → showing via auto
  const checked = useRef(false);

  // Auto-check once, the first time we're enabled.
  useEffect(() => {
    if (!enabled || checked.current) return;
    checked.current = true;
    try {
      const raw = localStorage.getItem(WHATS_NEW_SEEN_KEY);
      const seen = raw == null ? -1 : parseInt(raw, 10) || 0;
      if (seen < latestId()) {
        const unseen = WHATS_NEW.filter((r) => r.id > seen);
        if (unseen.length) setAutoEntries(unseen);
      }
    } catch { /* private mode — skip */ }
  }, [enabled]);

  // Slide mobile bars away while open.
  const open = forceOpen || !!autoEntries;
  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent('drst-modal-open'));
    return () => window.dispatchEvent(new CustomEvent('drst-modal-closed'));
  }, [open]);

  const releases = forceOpen ? WHATS_NEW.slice(0, 1) : autoEntries;
  if (!open || !releases?.length) return null;

  const markSeen = () => {
    try { localStorage.setItem(WHATS_NEW_SEEN_KEY, String(latestId())); } catch { /* skip */ }
  };
  const dismiss = () => {
    markSeen();
    setAutoEntries(null);
    onClose?.();
  };

  return createPortal(
    <div
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 100001,
        background: 'rgba(10,9,7,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420, maxHeight: '88vh', overflowY: 'auto',
          background: 'var(--aurora-surface-solid, #fff)',
          border: '1px solid var(--aurora-glass-border, rgba(10,10,10,0.08))',
          borderRadius: 26, boxShadow: 'var(--aurora-shadow-modal, 0 20px 60px rgba(0,0,0,0.3))',
          padding: '22px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
          animation: 'whatsNewPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={13} /> What's New
          </span>
          <button onClick={dismiss} aria-label="Close" style={{
            width: 30, height: 30, borderRadius: 9, border: 'none', cursor: 'pointer',
            background: 'var(--aurora-glass, rgba(10,10,10,0.04))', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} color="var(--aurora-sub, rgba(10,10,10,0.5))" />
          </button>
        </div>

        {releases.map((rel, ri) => (
          <div key={rel.id} style={{ marginTop: ri === 0 ? 6 : 22 }}>
            <h2 className="aurora-display" style={{
              fontSize: 21, color: 'var(--aurora-text, #0A0A0A)', margin: 0, letterSpacing: '-0.4px',
              fontFamily: "'Playfair Display', serif",
            }}>{rel.title}</h2>
            <p style={{ fontSize: 12, color: 'var(--aurora-dim, rgba(10,10,10,0.4))', margin: '3px 0 0', fontWeight: 600 }}>
              Version {rel.version} · {rel.date}
            </p>
            {rel.intro && (
              <p style={{ fontSize: 13.5, color: 'var(--aurora-sub, rgba(10,10,10,0.6))', margin: '10px 0 0', lineHeight: 1.5 }}>{rel.intro}</p>
            )}

            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rel.highlights.map((h) => (
                <div key={h.title} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  background: 'var(--aurora-glass, rgba(10,10,10,0.03))',
                  border: '1px solid var(--aurora-glass-border, rgba(10,10,10,0.06))',
                  borderRadius: 16, padding: 12,
                }}>
                  <span style={{ fontSize: 20, lineHeight: 1, marginTop: 1 }}>{h.emoji}</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--aurora-text, #0A0A0A)', margin: '0 0 2px' }}>{h.title}</p>
                    <p style={{ fontSize: 12.5, color: 'var(--aurora-sub, rgba(10,10,10,0.6))', margin: 0, lineHeight: 1.5 }}>{h.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={dismiss}
          style={{
            width: '100%', marginTop: 20, padding: '14px', borderRadius: 16, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${GOLD}, #7A5A18)`, color: '#0E0D0A', fontSize: 14, fontWeight: 800,
          }}
        >
          Got it
        </button>
      </div>
      <style>{`
        @keyframes whatsNewPop {
          from { opacity: 0; transform: scale(0.8) translateY(16px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>,
    document.body,
  );
}
