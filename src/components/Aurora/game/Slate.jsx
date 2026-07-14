import { Clapperboard } from 'lucide-react';
import { usePrefersReducedMotion } from './gameStore';

export function SlateAurora({ size = 72, mood = 'steady', accent, className = '', style = {} }) {
  const reducedMotion = usePrefersReducedMotion();
  const px = Number(size) || 72;
  // `accent` colors the clapper stripes (copilot FAB passes '#FFFFFF' for white
  // stripes on the gold orb; the console passes the brand gold). Falls back to
  // the original translucent white so existing usages are unchanged.
  const stripeFill = accent || 'rgba(255,255,255,.72)';
  const wink = mood === 'wink';

  return (
    <div
      className={`aurora-slate ${className}`}
      style={{
        width: px,
        height: px,
        animation: reducedMotion ? 'none' : 'aurora-slate-idle 3.8s ease-in-out infinite',
        ...style,
      }}
      aria-label="Slate, the Dr Self Tape companion"
      role="img"
    >
      <svg viewBox="0 0 112 112" aria-hidden="true">
        <defs>
          <linearGradient id="slateIvory" x1="16" x2="96" y1="10" y2="104">
            <stop stopColor="#fff9eb" />
            <stop offset="1" stopColor="#efe0be" />
          </linearGradient>
          <linearGradient id="slateGold" x1="16" x2="96" y1="0" y2="56">
            <stop stopColor="var(--aurora-heritage-gold-light, #F0D097)" />
            <stop offset="1" stopColor="var(--aurora-heritage-gold)" />
          </linearGradient>
        </defs>
        <rect x="12" y="24" width="88" height="76" rx="20" fill="url(#slateIvory)" />
        <rect x="12" y="24" width="88" height="76" rx="20" fill="none" stroke="rgba(122,90,24,.34)" />
        <path d="M20 36h72v16H20z" fill="url(#slateGold)" />
        <path d="M30 24h22l-16 28H14zM58 24h22L64 52H42zM86 24h14v18L94 52H72z" fill={stripeFill} />
        <path d="M28 70c6-7 16-7 22 0M62 70c6-7 16-7 22 0" stroke="#7A5A18" strokeWidth="5" strokeLinecap="round" />
        <g className={reducedMotion ? '' : 'aurora-slate-eyes'}>
          <circle cx="40" cy="68" r="4" fill="#0A0A0A" />
          {wink ? (
            <path d="M70 68h8" stroke="#0A0A0A" strokeWidth="4" strokeLinecap="round" />
          ) : (
            <circle cx="74" cy="68" r="4" fill="#0A0A0A" />
          )}
        </g>
        <path
          d={mood === 'proud' ? 'M44 83c8 7 18 7 26 0' : 'M46 84c7 4 15 4 22 0'}
          stroke="#7A5A18"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="28" cy="79" r="5" fill="var(--aurora-peach)" opacity=".75" />
        <circle cx="84" cy="79" r="5" fill="var(--aurora-peach)" opacity=".75" />
      </svg>
      <style>{`
        .aurora-slate {
          position: relative;
          display: inline-grid;
          place-items: center;
          flex: 0 0 auto;
          filter: drop-shadow(0 14px 24px rgba(212,168,95,.22));
          transform-origin: 50% 90%;
        }
        .aurora-slate svg { width: 100%; height: 100%; display: block; }
        .aurora-slate::after {
          content: '';
          position: absolute;
          left: 20%;
          right: 20%;
          bottom: -5%;
          height: 12%;
          border-radius: 999px;
          background: rgba(10,10,10,.12);
          filter: blur(6px);
        }
        @keyframes aurora-slate-idle {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-5px) rotate(1deg); }
        }
        @keyframes aurora-slate-blink {
          0%, 90%, 100% { transform: scaleY(1); }
          94% { transform: scaleY(.12); }
        }
        .aurora-slate-eyes { transform-origin: center; animation: aurora-slate-blink 4.8s infinite; }
      `}</style>
    </div>
  );
}

export function SlateTip({
  children = 'Slate says: one clean take beats ten rushed ones.',
  icon = true,
  className = '',
  style = {},
}) {
  return (
    <div className={`aurora-slate-tip ${className}`} style={style}>
      {icon ? <Clapperboard size={16} strokeWidth={2.2} aria-hidden="true" /> : null}
      <span>{children}</span>
      <style>{`
        .aurora-slate-tip {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          color: var(--aurora-sub);
          background: var(--aurora-glass);
          border: 1px solid var(--aurora-line);
          border-radius: 18px;
          padding: 12px 14px;
          font: 500 13px/1.35 "Space Grotesk", sans-serif;
          box-shadow: var(--aurora-shadow-card);
          backdrop-filter: blur(18px) saturate(1.35);
          -webkit-backdrop-filter: blur(18px) saturate(1.35);
        }
        .aurora-slate-tip svg {
          color: var(--aurora-heritage-gold);
          flex: 0 0 auto;
        }
      `}</style>
    </div>
  );
}
