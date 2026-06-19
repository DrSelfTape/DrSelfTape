import { useEffect, useRef, useState } from 'react';
import { Crown } from 'lucide-react';
import { useGameStore, usePrefersReducedMotion } from './gameStore';

function useCountUp(value, duration = 520) {
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

export function AuroraHUD({ className = '', style = {} }) {
  const game = useGameStore();
  const reducedMotion = usePrefersReducedMotion();
  const xp = useCountUp(game.xp);
  const takes = useCountUp(game.takes);
  const streak = useCountUp(game.streak);
  const rank = useCountUp(game.rank);
  const pct = Math.max(0, Math.min(100, (game.xp / game.toNext) * 100));

  return (
    <section className={`aurora-game-hud ${className}`} style={style} aria-label="Aurora progression">
      <div className="aurora-game-hud__level">
        <span>LV</span>
        <strong>{game.level}</strong>
      </div>

      <div className="aurora-game-hud__main">
        <div className="aurora-game-hud__topline">
          <span>Rank #{rank}</span>
          <span>{xp}/{game.toNext} XP</span>
        </div>
        <div className="aurora-game-hud__bar" aria-label={`${Math.round(pct)} percent to next level`}>
          <i
            style={{
              width: `${pct}%`,
              transition: reducedMotion ? 'none' : 'width 600ms cubic-bezier(.2,.8,.2,1)',
            }}
          />
        </div>
      </div>

      <div className="aurora-game-hud__stats" aria-label="Streak, takes, and league">
        <span>🔥 {streak}</span>
        <span>◈ {takes}</span>
        <span><Crown size={13} fill="currentColor" aria-hidden="true" /> {game.league}</span>
      </div>

      <style>{`
        .aurora-game-hud {
          position: sticky;
          top: max(10px, env(safe-area-inset-top));
          z-index: 30;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px;
          border-radius: 24px;
          color: var(--aurora-text);
          background: var(--aurora-glass-strong);
          border: 1px solid var(--aurora-line);
          box-shadow: var(--aurora-shadow-dock);
          backdrop-filter: blur(28px) saturate(1.45);
          -webkit-backdrop-filter: blur(28px) saturate(1.45);
        }
        .aurora-game-hud__level {
          display: grid;
          place-items: center;
          width: 52px;
          height: 52px;
          border-radius: 18px;
          color: #0A0A0A;
          background: linear-gradient(145deg, var(--aurora-heritage-gold-light, #F0D097), var(--aurora-heritage-gold));
          box-shadow: 0 12px 22px rgba(212,168,95,.24), inset 0 1px 0 rgba(255,255,255,.55);
        }
        .aurora-game-hud__level span,
        .aurora-game-hud__topline,
        .aurora-game-hud__stats {
          font-family: "JetBrains Mono", monospace;
          letter-spacing: 0;
        }
        .aurora-game-hud__level span {
          font-size: 9px;
          font-weight: 700;
          opacity: .72;
        }
        .aurora-game-hud__level strong {
          margin-top: -4px;
          font: 800 22px/1 "Space Grotesk", sans-serif;
        }
        .aurora-game-hud__main { min-width: 0; }
        .aurora-game-hud__topline {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 7px;
          color: var(--aurora-sub);
          font-size: 10px;
          font-weight: 650;
        }
        .aurora-game-hud__bar {
          height: 9px;
          overflow: hidden;
          border-radius: 999px;
          background: color-mix(in srgb, var(--aurora-text) 10%, transparent);
          box-shadow: inset 0 1px 3px rgba(0,0,0,.18);
        }
        .aurora-game-hud__bar i {
          display: block;
          height: 100%;
          min-width: 6px;
          border-radius: inherit;
          background: linear-gradient(90deg, var(--aurora-mint), var(--aurora-sky), var(--aurora-heritage-gold));
          box-shadow: 0 0 16px rgba(212,168,95,.34);
        }
        .aurora-game-hud__stats {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--aurora-text);
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }
        .aurora-game-hud__stats span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 8px 9px;
          border-radius: 999px;
          background: var(--aurora-glass);
          border: 1px solid var(--aurora-line);
        }
        .aurora-game-hud__stats span:last-child {
          color: var(--aurora-heritage-gold);
        }
        @media (max-width: 520px) {
          .aurora-game-hud {
            grid-template-columns: auto minmax(0, 1fr);
          }
          .aurora-game-hud__stats {
            grid-column: 1 / -1;
            justify-content: space-between;
          }
          .aurora-game-hud__stats span { flex: 1; justify-content: center; }
        }
      `}</style>
    </section>
  );
}
