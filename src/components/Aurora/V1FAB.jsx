import { useState } from 'react';

/**
 * V1FAB — Aurora radial action menu.
 * Default state: gold "+" button bottom-right.
 * Open state: backdrop scrim + 4 satellite buttons fan out on a radial arc.
 * FAB rotates 45° to a close-X on open.
 *
 * Each action receives { label, icon, color, onClick }.
 * `bottom` + `right` props control absolute positioning relative to the
 * nearest positioned ancestor — caller is responsible for placing the
 * component inside a `position: relative` container.
 */
export default function V1FAB({
  actions = [],
  bottom = 96,
  right = 22,
  size = 56,
  radius = 96,
  startAngle = 200,
  endAngle = 290,
}) {
  const [open, setOpen] = useState(false);
  const n = actions.length;
  const positioned = actions.map((a, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const angle = startAngle + (endAngle - startAngle) * t;
    const rad = (angle * Math.PI) / 180;
    return {
      ...a,
      dx: Math.cos(rad) * radius,
      dy: Math.sin(rad) * radius,
    };
  });

  return (
    <>
      <style>{`
        @keyframes v1fab-in {
          from { transform: translate(0, 0) scale(0.4); opacity: 0; }
          to   { transform: translate(var(--to-x), var(--to-y)) scale(1); opacity: 1; }
        }
        @keyframes v1fab-backdrop {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* backdrop scrim */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 39,
            background: 'rgba(10,10,10,0.22)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            animation: 'v1fab-backdrop 0.18s ease',
          }}
        />
      )}

      {/* radial action buttons */}
      <div
        style={{
          position: 'fixed',
          right,
          bottom: `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`,
          width: size,
          height: size,
          zIndex: 41,
          pointerEvents: 'none',
        }}
      >
        {open && positioned.map((a) => (
          <button
            key={a.k || a.label}
            type="button"
            onClick={() => { setOpen(false); a.onClick && a.onClick(); }}
            aria-label={a.label}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: size,
              height: size,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              background: '#FFFFFF',
              color: 'var(--aurora-text)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              pointerEvents: 'auto',
              boxShadow: `0 8px 22px rgba(10,10,10,0.14), 0 0 0 1px rgba(255,255,255,0.5), 0 0 24px ${a.color || 'var(--aurora-heritage-gold)'}55`,
              animation: 'v1fab-in 0.28s cubic-bezier(.2,1.4,.3,1) forwards',
              '--to-x': `${a.dx}px`,
              '--to-y': `${a.dy}px`,
              fontFamily: 'Space Grotesk, system-ui, sans-serif',
            }}
          >
            <span style={{ color: a.color || 'var(--aurora-heritage-gold)' }}>{a.icon}</span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 8,
              letterSpacing: '0.1em',
              color: 'var(--aurora-dim)',
              textTransform: 'uppercase',
            }}>
              {(a.short || a.label.split(' ')[0])}
            </span>
          </button>
        ))}
      </div>

      {/* main FAB */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close quick actions' : 'Open quick actions'}
        style={{
          position: 'fixed',
          right,
          bottom: `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`,
          zIndex: 42,
          width: size,
          height: size,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.5)',
          background: 'linear-gradient(135deg, #C99A4E 0%, #D4A85F 45%, #F0D097 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#1A1408',
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(122,90,24,0.25), 0 16px 38px rgba(212,168,95,0.55), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 0 0 1px rgba(212,168,95,0.3)',
          transition: 'transform 0.22s cubic-bezier(.2,1.4,.3,1)',
          transform: open ? 'rotate(45deg)' : 'rotate(0)',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </>
  );
}
