import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { NAV_GROUPS } from './navGroups';

/**
 * ⌘K command palette — the desktop jump list. Opens on Cmd/Ctrl+K or the
 * sidebar's "Find anything" button (drst-open-palette event). Flat fuzzy
 * filter over the same NAV_GROUPS the sidebar renders, arrow keys + Enter to
 * navigate, Esc to close. Token-styled so it wears light aurora or Aurora
 * Noir without branching. Motion per the console signature: 200ms strong
 * ease-out enter, transform/opacity only.
 */
export default function ConsoleCommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  const commands = useMemo(() => NAV_GROUPS.flatMap((g) =>
    g.items.map((it) => ({ ...it, group: g.label || 'Studio' }))
  ), []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q)
    );
  }, [commands, query]);

  const close = useCallback(() => { setOpen(false); setQuery(''); setCursor(0); }, []);

  const go = useCallback((cmd) => {
    if (!cmd) return;
    close();
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
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => { setCursor(0); }, [query]);

  if (!open) return null;

  return (
    <div
      onClick={close}
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
          placeholder="Jump to…"
          style={{
            width: '100%', padding: '15px 18px', border: 'none', outline: 'none',
            background: 'transparent', color: 'var(--aurora-text)', fontSize: 15,
            borderBottom: '1px solid var(--aurora-line)', fontFamily: 'inherit',
          }}
        />
        <div style={{ maxHeight: '46vh', overflowY: 'auto', padding: 6 }}>
          {results.length === 0 && (
            <p style={{ padding: '14px 12px', fontSize: 13, color: 'var(--aurora-dim)', margin: 0 }}>
              Nothing matches "{query}"
            </p>
          )}
          {results.map((cmd, i) => {
            const Icon = cmd.icon;
            const active = i === cursor;
            return (
              <button
                key={cmd.path}
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
                <Icon style={{ width: 15, height: 15, flexShrink: 0, color: active ? 'var(--aurora-heritage-gold)' : 'var(--aurora-dim)' }} />
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
