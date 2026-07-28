import { forwardRef } from 'react';

/**
 * Offscreen 1080×1080 share-card template for a Tape Review result. Rendered far
 * off-screen (not display:none — html2canvas needs real dimensions) and captured
 * by useShareImageCapture. ALL styles are explicit hex/px (no CSS variables, no
 * Tailwind tokens) so html2canvas renders it faithfully. This is the UGC/growth
 * surface: an actor sharing their casting-grade read is free distribution.
 */
const TapeReviewShareCard = forwardRef(function TapeReviewShareCard({ verdict, tags = [] }, ref) {
  const quote = (verdict || 'Casting-grade notes on my self-tape.').trim();
  return (
    <div
      ref={ref}
      data-html2canvas-ignore="true"
      style={{
        position: 'fixed', left: -99999, top: 0,
        width: 1080, height: 1080,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        boxSizing: 'border-box', padding: 88,
        background: 'linear-gradient(135deg, #1A1305 0%, #3A2A0E 46%, #7A5A18 100%)',
        fontFamily: "'Playfair Display', Georgia, serif",
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16, background: 'rgba(252,224,114,0.16)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30,
          }}>🎬</div>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 26, letterSpacing: 4,
            color: '#FCE072', fontWeight: 700, textTransform: 'uppercase',
          }}>Dr Self Tape</span>
        </div>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 22, letterSpacing: 2,
          color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase',
        }}>AI Tape Review</span>
      </div>

      {/* Verdict quote — the hero */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <span style={{ fontSize: 120, lineHeight: 0.8, color: '#FCE072', opacity: 0.5 }}>“</span>
        <p style={{
          margin: 0, fontSize: quote.length > 150 ? 52 : 64, lineHeight: 1.18,
          color: '#FFFFFF', fontWeight: 600, letterSpacing: '-0.5px',
        }}>
          {quote.length > 240 ? `${quote.slice(0, 237)}…` : quote}
        </p>
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 8 }}>
            {tags.slice(0, 4).map((t, i) => (
              <span key={i} style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 24,
                padding: '10px 22px', borderRadius: 100,
                background: 'rgba(252,224,114,0.14)', color: '#FCE072',
                border: '1px solid rgba(252,224,114,0.35)',
              }}>{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 32, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
          Get your own casting-grade read
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 26, color: '#FCE072', letterSpacing: 1,
        }}>drselftape.app</span>
      </div>
    </div>
  );
});

export default TapeReviewShareCard;
