import { useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * First-visit swipe coach for the Find-a-Reader deck. Shows once (localStorage
 * flag), then never again. Mirrors the SLATE / PASS stamps the card itself
 * shows mid-drag so the gesture meaning is unmistakable, in the Aurora gold/
 * cream palette. Inspired by the VertiCast swipe tutorial; styled as ours.
 *
 * Purely an overlay — it never touches the swipe logic. Portaled to body so it
 * sits above the mobile top/bottom bars (same pattern as the consent + age
 * gates) and a tap-belt button so the dismiss can't be dropped on iOS.
 */
const LS_KEY = 'drst_reader_swipe_tutorial_seen';

function Stamp({ text, gold }) {
  return (
    <div
      style={{
        border: gold ? '2.5px solid #FCE072' : '2.5px solid rgba(255,255,255,0.45)',
        color: gold ? '#FCE072' : 'rgba(255,255,255,0.85)',
        fontSize: 18, fontWeight: 900, letterSpacing: 2,
        padding: '3px 12px', borderRadius: 6,
        transform: gold ? 'rotate(-10deg)' : 'rotate(10deg)',
        textShadow: gold ? '0 0 18px rgba(252,224,114,0.55)' : 'none',
        fontFamily: '"Space Grotesk", sans-serif',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
}

function Row({ glyph, glyphColor, badge, title, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ fontSize: 30, lineHeight: 1, width: 34, textAlign: 'center', flexShrink: 0, color: glyphColor }}>
        {glyph}
      </div>
      <div style={{ width: 78, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>{badge}</div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 700, color: '#FFFDF8', lineHeight: 1.2 }}>
          {title}
        </div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12.5, color: 'rgba(255,253,248,0.62)', lineHeight: 1.35, marginTop: 2 }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

export default function SwipeTutorial() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(LS_KEY) === '1'; } catch { return false; }
  });
  if (dismissed) return null;

  const close = () => {
    try { localStorage.setItem(LS_KEY, '1'); } catch { /* storage unavailable */ }
    setDismissed(true);
  };

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How to swipe"
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483000,
        background: 'rgba(12,10,7,0.86)',
        backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, touchAction: 'manipulation',
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.2em', color: '#D4A85F', marginBottom: 8 }}>
            HOW TO CONNECT
          </div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, color: '#FFFDF8', margin: 0, letterSpacing: '-0.4px', lineHeight: 1.2 }}>
            Swipe to find your reader
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 30 }}>
          <Row
            glyph="→" glyphColor="#FCE072" badge={<Stamp text="SLATE" gold />}
            title="Swipe right to connect"
            sub="You both want to run sides. Say hi in the Green Room"
          />
          <Row
            glyph="←" glyphColor="rgba(255,255,255,0.7)" badge={<Stamp text="PASS" gold={false} />}
            title="Swipe left to pass"
            sub="Not the right fit right now"
          />
          <Row
            glyph="👆" glyphColor="#FFFDF8" badge={null}
            title="Tap a card"
            sub="Open their full profile: reels, genres & availability"
          />
        </div>

        <button
          type="button"
          onClick={close}
          onTouchEnd={(e) => { e.preventDefault(); close(); }}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 100, border: 'none',
            background: 'linear-gradient(135deg, #D4A85F, #7A5A18)', color: '#fff',
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 700,
            boxShadow: '0 8px 22px rgba(212,168,95,0.30)', cursor: 'pointer',
            touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
          }}
        >
          Got it. Start swiping →
        </button>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
