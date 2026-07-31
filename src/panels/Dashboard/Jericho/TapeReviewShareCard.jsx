import { forwardRef } from 'react';

/**
 * Offscreen share-card templates for a Tape Review result — the app's ONLY
 * organic-acquisition surface. Rendered far off-screen (not display:none —
 * html2canvas needs real dimensions) and captured by useShareImageCapture.
 * ALL styles are explicit hex/px (no CSS variables, no Tailwind tokens) so
 * html2canvas renders faithfully.
 *
 * Rank-7 layout (Duolingo pattern): lead with the IDENTITY CLAIM (the band —
 * "Callback Range") over the verdict quote; App Store attribution + the
 * repost promise are baked into pixels so they survive any re-share.
 * Two formats: 1080×1080 (feed/messages) and 1080×1920 (IG/TikTok Story).
 */

function CardContent({ verdict, tags, band, avg, story }) {
  const quote = (verdict || 'Casting-grade notes on my self-tape.').trim();
  const bandColor = band?.color || '#FCE072';
  return (
    <>
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

      {/* Identity claim — the hero. The band is what an actor WANTS to say
          about themselves; the quote is supporting evidence. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: story ? 34 : 26 }}>
        {band?.label && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: story ? 96 : 84, lineHeight: 1, fontWeight: 700,
              color: bandColor, letterSpacing: '-1px',
            }}>
              {band.label}
            </span>
            {Number.isFinite(avg) && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 40,
                color: 'rgba(255,255,255,0.75)',
              }}>
                {avg.toFixed(1)}<span style={{ fontSize: 26, color: 'rgba(255,255,255,0.45)' }}> /10</span>
              </span>
            )}
          </div>
        )}
        <p style={{
          margin: 0, fontSize: quote.length > 150 ? 40 : 48, lineHeight: 1.25,
          color: 'rgba(255,255,255,0.92)', fontWeight: 500, letterSpacing: '-0.3px',
        }}>
          “{quote.length > 200 ? `${quote.slice(0, 197)}…` : quote}”
        </p>
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
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

      {/* Footer — attribution + the repost promise live IN the pixels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 30, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
            Free AI tape review — on the App Store
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 26, color: '#FCE072', letterSpacing: 1,
          }}>drselftape.app</span>
        </div>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 22,
          color: 'rgba(255,255,255,0.55)',
        }}>
          Tag @dr.selftape — we repost the best tapes weekly
        </span>
      </div>
    </>
  );
}

const frameStyle = (w, h) => ({
  position: 'fixed', left: -99999, top: 0,
  width: w, height: h,
  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
  boxSizing: 'border-box', padding: 88,
  background: 'linear-gradient(135deg, #1A1305 0%, #3A2A0E 46%, #7A5A18 100%)',
  fontFamily: "'Playfair Display', Georgia, serif",
  overflow: 'hidden',
});

const TapeReviewShareCard = forwardRef(function TapeReviewShareCard({ verdict, tags = [], band, avg }, ref) {
  return (
    <div ref={ref} data-html2canvas-ignore="true" style={frameStyle(1080, 1080)}>
      <CardContent verdict={verdict} tags={tags} band={band} avg={avg} story={false} />
    </div>
  );
});

export const TapeReviewShareCardStory = forwardRef(function TapeReviewShareCardStory({ verdict, tags = [], band, avg }, ref) {
  return (
    <div ref={ref} data-html2canvas-ignore="true" style={{ ...frameStyle(1080, 1920), padding: '160px 88px' }}>
      <CardContent verdict={verdict} tags={tags} band={band} avg={avg} story />
    </div>
  );
});

export default TapeReviewShareCard;
