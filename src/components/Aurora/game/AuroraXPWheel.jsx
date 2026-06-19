import { useEffect, useRef, useState } from 'react';
import { Award, Crown, Film, Flame } from 'lucide-react';
import { useGameStore, usePrefersReducedMotion } from './gameStore';

function useCountUp(value, duration = 620) {
  const reducedMotion = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    if (reducedMotion) {
      displayRef.current = value;
      setDisplay(value);
      return undefined;
    }

    const start = displayRef.current;
    const delta = value - start;
    if (!delta) return undefined;

    let frame;
    const startedAt = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(start + delta * eased);
      displayRef.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, reducedMotion, value]);

  return display;
}

export function AuroraXPWheel({ size = 164, stroke = 14, className = '', style = {} }) {
  const game = useGameStore();
  const reducedMotion = usePrefersReducedMotion();
  const xp = useCountUp(game.xp);
  const pct = Math.max(0, Math.min(1, game.xp / game.toNext));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);

  return (
    <div className={`aurora-xp-wheel ${className}`} style={{ width: size, height: size, ...style }}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="aurora-xp-wheel__track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
        <circle
          className="aurora-xp-wheel__progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: reducedMotion ? 'none' : 'stroke-dashoffset 680ms cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="aurora-xp-wheel__center">
        <span>LV {game.level}</span>
        <strong>{xp}</strong>
        <small>/ {game.toNext} XP</small>
      </div>
      <style>{`
        .aurora-xp-wheel {
          position: relative;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          color: var(--aurora-text);
        }
        .aurora-xp-wheel svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
          overflow: visible;
        }
        .aurora-xp-wheel__track {
          fill: none;
          stroke: color-mix(in srgb, var(--aurora-text) 10%, transparent);
        }
        .aurora-xp-wheel__progress {
          fill: none;
          stroke: var(--aurora-heritage-gold);
          stroke-linecap: round;
          filter: drop-shadow(0 0 10px rgba(212,168,95,.55));
        }
        .aurora-xp-wheel__center {
          position: relative;
          z-index: 1;
          display: grid;
          place-items: center;
          width: calc(100% - 42px);
          height: calc(100% - 42px);
          border-radius: 999px;
          background: var(--aurora-glass-strong);
          border: 1px solid var(--aurora-line);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
        }
        .aurora-xp-wheel__center span,
        .aurora-xp-wheel__center small {
          font: 700 10px/1 "JetBrains Mono", monospace;
          letter-spacing: 0;
          color: var(--aurora-sub);
        }
        .aurora-xp-wheel__center strong {
          font: 800 32px/1 "Space Grotesk", sans-serif;
          letter-spacing: 0;
          color: var(--aurora-text);
        }
      `}</style>
    </div>
  );
}

export function AuroraProgressCard({ className = '', style = {} }) {
  const game = useGameStore();
  const takes = useCountUp(game.takes);
  const streak = useCountUp(game.streak);
  const rank = useCountUp(game.rank);

  return (
    <section className={`aurora-progress-card ${className}`} style={style}>
      <div className="aurora-progress-card__wheel">
        <AuroraXPWheel size={148} />
      </div>
      <div className="aurora-progress-card__copy">
        <div className="aurora-progress-card__eyebrow">PROFILE PROGRESS</div>
        <h2>{game.league} league</h2>
        <p>Keep the meter moving with daily reps, clean takes, and reader sessions.</p>
        <div className="aurora-progress-card__grid">
          <span><Award size={16} aria-hidden="true" /><strong>#{rank}</strong><small>Rank</small></span>
          <span><Film size={16} aria-hidden="true" /><strong>{takes}</strong><small>Takes</small></span>
          <span><Flame size={16} aria-hidden="true" /><strong>{streak}</strong><small>Streak</small></span>
          <span><Crown size={16} aria-hidden="true" /><strong>LV {game.level}</strong><small>Level</small></span>
        </div>
      </div>
      <style>{`
        .aurora-progress-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 18px;
          align-items: center;
          width: 100%;
          padding: 18px;
          border-radius: 24px;
          color: var(--aurora-text);
          background:
            radial-gradient(circle at 12% 18%, color-mix(in srgb, var(--aurora-sky) 20%, transparent), transparent 32%),
            radial-gradient(circle at 92% 12%, color-mix(in srgb, var(--aurora-heritage-gold) 18%, transparent), transparent 30%),
            var(--aurora-glass);
          border: 1px solid var(--aurora-line);
          box-shadow: var(--aurora-shadow-card);
          backdrop-filter: blur(24px) saturate(1.35);
          -webkit-backdrop-filter: blur(24px) saturate(1.35);
        }
        .aurora-progress-card__wheel {
          display: grid;
          place-items: center;
        }
        .aurora-progress-card__copy { min-width: 0; }
        .aurora-progress-card__eyebrow {
          margin-bottom: 7px;
          font: 700 10px/1 "JetBrains Mono", monospace;
          letter-spacing: .15em;
          color: var(--aurora-dim);
        }
        .aurora-progress-card h2 {
          margin: 0;
          font: 760 25px/1.05 "Space Grotesk", sans-serif;
          letter-spacing: 0;
          color: var(--aurora-text);
        }
        .aurora-progress-card p {
          margin: 8px 0 14px;
          max-width: 32rem;
          color: var(--aurora-sub);
          font: 500 13px/1.4 "Space Grotesk", sans-serif;
        }
        .aurora-progress-card__grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }
        .aurora-progress-card__grid span {
          display: grid;
          gap: 5px;
          min-width: 0;
          padding: 10px;
          border-radius: 18px;
          background: var(--aurora-glass);
          border: 1px solid var(--aurora-line);
        }
        .aurora-progress-card__grid svg {
          color: var(--aurora-heritage-gold);
        }
        .aurora-progress-card__grid strong {
          color: var(--aurora-text);
          font: 800 15px/1 "JetBrains Mono", monospace;
          letter-spacing: 0;
        }
        .aurora-progress-card__grid small {
          color: var(--aurora-sub);
          font: 650 10px/1 "Space Grotesk", sans-serif;
        }
        @media (max-width: 560px) {
          .aurora-progress-card {
            grid-template-columns: 1fr;
          }
          .aurora-progress-card__grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </section>
  );
}
