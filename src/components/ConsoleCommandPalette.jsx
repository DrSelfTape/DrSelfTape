import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { navGroupsForRole } from './navGroups';
import { consoleSurfaceEnabled } from '../utils/consoleSurface';

/**
 * ⌘K command palette — the desktop jump list. Opens on Cmd/Ctrl+K or the
 * sidebar's "Find anything" button (drst-open-palette event). Flat fuzzy
 * filter over the same NAV_GROUPS the sidebar renders, arrow keys + Enter to
 * navigate, Esc to close. Token-styled so it wears light aurora or Aurora
 * Noir without branching. Motion per the console signature: 200ms strong
 * ease-out enter, transform/opacity only.
 */
// Slash verbs (Aurora Noir Ring 2, §5). Typing "/" turns the palette from a
// jump list into a verb list — the fastest path to the five things people
// actually open the app to do, plus the shortcut sheet.
//
// /compare has no route of its own: Compare Takes renders inside Tape Review
// (TapeReview.jsx mounts <CompareTakes/>), so the verb lands there and the
// hint says so rather than pretending it is a separate screen.
const SLASH_VERBS = [
  { verb: '/record', label: 'Record a take', hint: 'Self-Tapes', path: '/dashboard/self-tapes' },
  { verb: '/review', label: 'Tape Review', hint: 'Casting-grade notes', path: '/dashboard/jericho?tab=tape' },
  { verb: '/compare', label: 'Compare Takes', hint: 'Inside Tape Review', path: '/dashboard/jericho?tab=tape' },
  { verb: '/reader', label: 'Find a reader', hint: 'Connect', path: '/dashboard/find-a-reader' },
  { verb: '/sides', label: 'Bring your own sides', hint: 'Scene Study', path: '/dashboard/scene-study' },
  { verb: '/shortcuts', label: 'Keyboard shortcuts', hint: 'Help', action: 'help' },
];

export default function ConsoleCommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  const role = useSelector((s) => s.auth?.user?.role);
  const commands = useMemo(() => navGroupsForRole(role).flatMap((g) =>
    g.items.map((it) => ({ ...it, group: g.label || 'Studio' }))
  ), [role]);

  // The help slide-over is mounted only on the console surface; off it the
  // /shortcuts verb would dispatch an event nobody hears.
  const helpMounted = consoleSurfaceEnabled();
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    // A leading slash switches modes entirely: verbs only, no nav noise.
    if (q.startsWith('/')) {
      return SLASH_VERBS
        .filter((v) => helpMounted || v.action !== 'help')
        .filter((v) => v.verb.startsWith(q) || v.label.toLowerCase().includes(q.slice(1)))
        .map((v) => ({ ...v, label: v.label, group: v.hint }));
    }
    return commands.filter((c) =>
      c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q)
    );
  }, [commands, query, helpMounted]);

  // Focus returns to the element that had it when the palette opened (a11y
  // dialog contract; the recap card and any other dialog rely on it).
  const restoreFocusRef = useRef(null);
  const close = useCallback(() => {
    setOpen(false); setQuery(''); setCursor(0);
    const previous = restoreFocusRef.current;
    restoreFocusRef.current = null;
    if (previous && typeof previous.focus === 'function') {
      // Checked inside the frame: `go()` closes and then navigates, and the
      // element that had focus may unmount before the frame fires.
      requestAnimationFrame(() => { if (previous.isConnected) previous.focus(); });
    }
  }, []);

  const go = useCallback((cmd) => {
    if (!cmd) return;
    close();
    // A verb can be an action rather than a destination (/shortcuts opens the
    // help slide-over). Dispatched after close() so focus restoration has
    // already run and the slide-over takes focus cleanly.
    if (cmd.action === 'help') {
      try { window.dispatchEvent(new CustomEvent('drst-open-help')); } catch { /* noop */ }
      return;
    }
    if (!cmd.path) return;
    navigate(cmd.path);
  }, [close, navigate]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        close();
      }
    };
    const onOpenEvent = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('drst-open-palette', onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('drst-open-palette', onOpenEvent);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => { setCursor(0); }, [query]);

  if (!open) return null;

  return (
    <div
      onClick={close}
      data-dst-overlay="palette"
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '18vh',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="dst-palette-enter"
        style={{
          width: 'min(560px, calc(100vw - 48px))', borderRadius: 16, overflow: 'hidden',
          background: 'var(--aurora-surface-solid)',
          border: '1px solid var(--aurora-line)',
          boxShadow: 'var(--aurora-shadow-modal)',
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(results.length - 1, c + 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
            else if (e.key === 'Enter') { e.preventDefault(); go(results[cursor]); }
          }}
          placeholder="Jump to… or / for verbs"
          style={{
            width: '100%', padding: '15px 18px', border: 'none', outline: 'none',
            background: 'transparent', color: 'var(--aurora-text)', fontSize: 15,
            borderBottom: '1px solid var(--aurora-line)', fontFamily: 'inherit',
          }}
        />
        <div style={{ maxHeight: '46vh', overflowY: 'auto', padding: 6 }}>
          {results.length === 0 && (
            <p style={{ padding: '14px 12px', fontSize: 13, color: 'var(--aurora-dim)', margin: 0 }}>
              {query.trim().startsWith('/')
                ? <>No verb matches "{query}" — try /record, /review, /compare, /reader{helpMounted ? ', /sides or /shortcuts' : ' or /sides'}</>
                : <>Nothing matches "{query}"</>}
            </p>
          )}
          {!query.trim() && (
            <p style={{
              padding: '8px 12px 10px', margin: 0, fontSize: 11, letterSpacing: '0.06em',
              textTransform: 'uppercase', fontFamily: 'var(--dst-font-mono)', color: 'var(--aurora-dim)',
            }}>
              Type / for verbs
            </p>
          )}
          {results.map((cmd, i) => {
            const Icon = cmd.icon;
            const active = i === cursor;
            return (
              <button
                key={cmd.verb || cmd.path}
                type="button"
                onClick={() => go(cmd)}
                onMouseEnter={() => setCursor(i)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  textAlign: 'left', fontFamily: 'inherit', fontSize: 14,
                  background: active ? 'color-mix(in oklch, var(--aurora-heritage-gold) 16%, transparent)' : 'transparent',
                  color: 'var(--aurora-text)',
                }}
              >
                {Icon
                  ? <Icon style={{ width: 15, height: 15, flexShrink: 0, color: active ? 'var(--aurora-heritage-gold)' : 'var(--aurora-dim)' }} />
                  : <span style={{ width: 15, flexShrink: 0, textAlign: 'center', fontFamily: 'var(--dst-font-mono)', color: active ? 'var(--aurora-heritage-gold)' : 'var(--aurora-dim)' }}>/</span>}
                <span style={{ flex: 1, fontWeight: 500 }}>{cmd.label}</span>
                <span style={{
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 9,
                  letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--aurora-dim)',
                }}>{cmd.group}</span>
              </button>
            );
          })}
        </div>
        <div style={{
          display: 'flex', gap: 14, padding: '8px 14px', borderTop: '1px solid var(--aurora-line)',
          fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 9,
          letterSpacing: '0.08em', color: 'var(--aurora-dim)',
        }}>
          <span>↑↓ NAVIGATE</span>
          <span>↵ OPEN</span>
          <span>ESC CLOSE</span>
        </div>
      </div>
      <style>{`
        .dst-palette-enter { animation: dst-palette-in 200ms cubic-bezier(0.22, 1, 0.36, 1); }
        @keyframes dst-palette-in { from { opacity: 0; transform: scale(0.98) translateY(-6px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .dst-palette-enter { animation: none; } }
      `}</style>
    </div>
  );
}
