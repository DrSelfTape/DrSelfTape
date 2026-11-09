import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { HelpCircle, X, Keyboard, BookOpen, Sparkles, MessageSquareWarning } from 'lucide-react';
import { WHATS_NEW } from '../data/whatsNew';

// Report a Problem is a whole form; keep it out of the console boot chunk.
const ReportProblemModal = lazy(() => import('./ReportProblemModal.jsx'));

/**
 * The "?" help slide-over (Aurora Noir Ring 2, §5).
 *
 * Consolidates four things that were scattered — the self-tape guide, the
 * keyboard shortcuts, the What's New changelog (same WHATS_NEW the mobile
 * modal reads) and Report a Problem — into one pro affordance, so the console
 * has somewhere to put help that isn't a support email.
 *
 * Opens on "?" or a drst-open-help event, closes on Esc. Motion is per the
 * console signature: transform/opacity only, under 300ms, strong ease-out,
 * and nothing at all under prefers-reduced-motion.
 */

// Only what the app genuinely binds. An invented shortcut list is worse than a
// short true one — it sends people pressing keys that do nothing.
const SHORTCUTS = [
  { keys: ['⌘', 'K'], label: 'Open the command palette', note: 'Ctrl K on Windows' },
  { keys: ['?'], label: 'Open this panel' },
  { keys: ['Esc'], label: 'Close the palette or this panel' },
  { keys: ['↑', '↓'], label: 'Move through palette results' },
  { keys: ['↵'], label: 'Go to the highlighted result' },
];

const GUIDE = [
  ['Frame', 'Chest up, eyeline just off lens, head room tight. The read is your face, not the room.'],
  ['Light', 'One soft source in front, slightly above. Kill overheads — they put shadows where your eyes are.'],
  ['Sound', 'Soft room, phone close, no fan. Casting forgives grain. They do not forgive hiss.'],
  ['Background', 'Plain, mid-tone, a metre behind you. Anything with pattern competes with you and wins.'],
  ['Take', 'Slate once, then act. Send the take where something actually happened, not the tidiest one.'],
];

// `icon` is a rendered element, not a component: this project's eslint has
// react-hooks but not eslint-plugin-react, so jsx-uses-vars is off and a
// destructured `icon: Icon` reads as unused. Element-as-prop sidesteps it.
function Section({ icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderTop: '1px solid var(--dst-line-soft)' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 2px', background: 'none', border: 0, cursor: 'pointer',
          font: '600 13px/1.3 var(--dst-font-sans)', color: 'var(--dst-ink)', textAlign: 'left',
        }}
      >
        <span aria-hidden="true" style={{ color: 'var(--dst-brass-ui)', display: 'flex', flex: '0 0 auto' }}>{icon}</span>
        <span style={{ flex: 1 }}>{title}</span>
        <span aria-hidden="true" style={{ color: 'var(--dst-ink-3)', fontSize: 11 }}>{open ? '−' : '+'}</span>
      </button>
      {open && <div style={{ paddingBottom: 16 }}>{children}</div>}
    </div>
  );
}

export default function HelpSlideOver() {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const panelRef = useRef(null);
  const restoreFocusTo = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && open) { close(); return; }
      if (e.key !== '?') return;
      // Never steal "?" from someone typing it.
      const el = e.target;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      e.preventDefault();
      restoreFocusTo.current = document.activeElement;
      setOpen((v) => !v);
    };
    const onOpenEvent = () => { restoreFocusTo.current = document.activeElement; setOpen(true); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('drst-open-help', onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('drst-open-help', onOpenEvent);
    };
  }, [open, close]);

  // Move focus in on open, and give it back to whatever had it on close.
  useEffect(() => {
    if (open) { panelRef.current?.focus(); return; }
    const el = restoreFocusTo.current;
    if (el && typeof el.focus === 'function') el.focus();
  }, [open]);

  if (!open) return null;

  const reduce = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={close}
        style={{
          position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.45)',
          animation: reduce ? undefined : 'dst-help-fade 160ms var(--dst-ease-out) both',
        }}
      />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Help"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 71,
          width: 'min(420px, 92vw)', overflowY: 'auto', outline: 'none',
          background: 'var(--dst-paper-raised)',
          borderLeft: '1px solid var(--dst-line)',
          boxShadow: 'var(--dst-shadow-raised)',
          padding: '22px 24px 40px',
          animation: reduce ? undefined : 'dst-help-in var(--dst-dur-enter, 220ms) var(--dst-ease-out) both',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <HelpCircle size={16} style={{ color: 'var(--dst-brass-ui)' }} aria-hidden="true" />
          <h2 style={{ flex: 1, margin: 0, font: '600 15px/1.2 var(--dst-font-sans)', color: 'var(--dst-ink)' }}>
            Help
          </h2>
          <button
            type="button" onClick={close} aria-label="Close help"
            style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--dst-ink-3)', padding: 4, display: 'flex' }}
          >
            <X size={16} />
          </button>
        </div>
        <p style={{ margin: '0 0 14px', font: '400 11px/1.5 var(--dst-font-mono)', letterSpacing: '0.08em', color: 'var(--dst-ink-3)', textTransform: 'uppercase' }}>
          Esc to close
        </p>

        <Section icon={<BookOpen size={15} />} title="Self-tape guide" defaultOpen>
          <dl style={{ margin: 0 }}>
            {GUIDE.map(([term, copy]) => (
              <div key={term} style={{ marginBottom: 10 }}>
                <dt style={{ font: '600 12px/1.4 var(--dst-font-sans)', color: 'var(--dst-ink)' }}>{term}</dt>
                <dd style={{ margin: '2px 0 0', font: '400 12.5px/1.6 var(--dst-font-sans)', color: 'var(--dst-ink-2)' }}>{copy}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section icon={<Keyboard size={15} />} title="Keyboard shortcuts">
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {SHORTCUTS.map((s) => (
              <li key={s.label} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '5px 0' }}>
                <span style={{ display: 'flex', gap: 3, flex: '0 0 auto' }}>
                  {s.keys.map((k) => (
                    <kbd key={k} style={{
                      font: '500 10.5px/1 var(--dst-font-mono)', color: 'var(--dst-ink-2)',
                      border: '1px solid var(--dst-line)', borderRadius: 5, padding: '3px 5px',
                      background: 'var(--dst-surface)',
                    }}>{k}</kbd>
                  ))}
                </span>
                <span style={{ font: '400 12.5px/1.5 var(--dst-font-sans)', color: 'var(--dst-ink-2)' }}>
                  {s.label}
                  {s.note && <em style={{ color: 'var(--dst-ink-3)', fontStyle: 'normal' }}> · {s.note}</em>}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={<Sparkles size={15} />} title="What's new">
          {WHATS_NEW.slice(0, 3).map((rel) => (
            <div key={rel.id} style={{ marginBottom: 14 }}>
              <p style={{ margin: 0, font: '400 10px/1.4 var(--dst-font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--dst-brass-ui)' }}>
                {rel.version}
              </p>
              <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0 }}>
                {(rel.items || rel.notes || []).slice(0, 4).map((it, i) => (
                  <li key={i} style={{ font: '400 12.5px/1.6 var(--dst-font-sans)', color: 'var(--dst-ink-2)', paddingLeft: 12, position: 'relative' }}>
                    <span aria-hidden="true" style={{ position: 'absolute', left: 0, color: 'var(--dst-ink-3)' }}>·</span>
                    {typeof it === 'string' ? it : (it.title || it.text || it.label)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Section>

        <Section icon={<MessageSquareWarning size={15} />} title="Report a problem">
          <p style={{ margin: '0 0 10px', font: '400 12.5px/1.6 var(--dst-font-sans)', color: 'var(--dst-ink-2)' }}>
            Something broken or wrong? Tell us what happened and it lands in the support inbox with your account attached.
          </p>
          <button
            type="button"
            onClick={() => setReporting(true)}
            style={{
              font: '600 12.5px/1 var(--dst-font-sans)', color: 'var(--dst-ink)',
              background: 'var(--dst-brass-tint)', border: '1px solid var(--dst-brass-tint-line)',
              borderRadius: 999, padding: '9px 16px', cursor: 'pointer',
            }}
          >
            Report a problem
          </button>
        </Section>
      </aside>

      {reporting && (
        <Suspense fallback={null}>
          <ReportProblemModal onClose={() => setReporting(false)} />
        </Suspense>
      )}
    </>
  );
}
