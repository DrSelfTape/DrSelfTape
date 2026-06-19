/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Sparkles, Trophy, Flame, Gift, Star } from 'lucide-react';
import { usePrefersReducedMotion } from './gameStore';

const CELEBRATION_COPY = {
  levelup: { title: 'Level up', sub: 'Your craft meter climbed.', Icon: Trophy },
  quest: { title: 'Quest complete', sub: 'A clean rep for today.', Icon: Sparkles },
  streak: { title: 'Streak saved', sub: 'Momentum stays warm.', Icon: Flame },
  reward: { title: 'Reward claimed', sub: 'Pilot Season progress banked.', Icon: Gift },
};

let root;
let host;
// Celebrations fired before the overlay's effect registers the real handler
// (notably the very first auroraCelebrate() call, which mounts the host) are
// buffered here and flushed on mount so the first one is never dropped.
const pendingQueue = [];
let pushCelebration = (item) => { pendingQueue.push(item); };

const ensureHost = () => {
  if (typeof document === 'undefined') return null;
  if (host && root) return root;

  host = document.createElement('div');
  host.setAttribute('data-aurora-celebrate-root', '');
  document.body.appendChild(host);
  root = createRoot(host);
  root.render(<AuroraCelebrate />);

  return root;
};

export function auroraCelebrate(type = 'quest', opts = {}) {
  if (typeof window === 'undefined') return;

  ensureHost();
  pushCelebration({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    ...opts,
  });
}

function SparkBurst({ reducedMotion }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const angle = (i / 22) * Math.PI * 2;
        const distance = 82 + (i % 5) * 12;
        return {
          x: `${Math.cos(angle) * distance}px`,
          y: `${Math.sin(angle) * distance}px`,
          delay: `${i * 22}ms`,
          size: 4 + (i % 4),
        };
      }),
    [],
  );

  if (reducedMotion) return null;

  return (
    <div className="aurora-celebrate-burst" aria-hidden="true">
      {sparks.map((spark, index) => (
        <span
          key={index}
          style={{
            '--ax': spark.x,
            '--ay': spark.y,
            animationDelay: spark.delay,
            width: spark.size,
            height: spark.size,
          }}
        />
      ))}
    </div>
  );
}

export function AuroraCelebrate() {
  const [items, setItems] = useState([]);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    pushCelebration = (item) => {
      setItems((current) => [...current.slice(-2), item]);
      window.setTimeout(() => {
        setItems((current) => current.filter((entry) => entry.id !== item.id));
      }, item.duration || 1900);
    };

    // Flush anything queued before the handler was registered.
    if (pendingQueue.length) {
      pendingQueue.splice(0, pendingQueue.length).forEach((item) => pushCelebration(item));
    }

    return () => {
      // Restore the buffering handler (not a noop) so an unmount→remount cycle
      // doesn't silently drop celebrations.
      pushCelebration = (item) => { pendingQueue.push(item); };
    };
  }, []);

  if (!items.length) return null;

  const item = items[items.length - 1];
  const copy = CELEBRATION_COPY[item.type] || CELEBRATION_COPY.quest;
  const Icon = copy.Icon;

  return (
    <div className="aurora-celebrate-layer" aria-live="polite" aria-atomic="true">
      <div
        className="aurora-celebrate-toast"
        style={{ animation: reducedMotion ? 'none' : 'aurora-celebrate-in 420ms cubic-bezier(.2,.8,.2,1)' }}
      >
        <SparkBurst reducedMotion={reducedMotion} />
        <div className="aurora-celebrate-medal">
          <Icon size={26} strokeWidth={2.2} aria-hidden="true" />
          {!reducedMotion ? <Star className="aurora-celebrate-star" size={14} fill="currentColor" aria-hidden="true" /> : null}
        </div>
        <div>
          <div className="aurora-celebrate-title">{item.title || copy.title}</div>
          <div className="aurora-celebrate-sub">{item.message || item.sub || copy.sub}</div>
        </div>
      </div>
      <style>{`
        .aurora-celebrate-layer {
          position: fixed;
          inset: 0;
          z-index: 9999;
          pointer-events: none;
          display: grid;
          place-items: start center;
          padding: max(18px, env(safe-area-inset-top)) 16px 16px;
          background:
            radial-gradient(circle at 50% 12%, rgba(212,168,95,.14), transparent 34%),
            radial-gradient(circle at 18% 18%, rgba(167,214,255,.13), transparent 28%);
        }
        .aurora-celebrate-toast {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          width: min(358px, calc(100vw - 32px));
          padding: 14px 16px;
          overflow: hidden;
          border-radius: 24px;
          color: var(--aurora-text);
          background: var(--aurora-glass-strong);
          border: 1px solid var(--aurora-line);
          box-shadow: var(--aurora-shadow-modal);
          backdrop-filter: blur(28px) saturate(1.45);
          -webkit-backdrop-filter: blur(28px) saturate(1.45);
        }
        .aurora-celebrate-toast::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 0 24%, rgba(255,255,255,.22) 44%, transparent 62%);
          transform: translateX(-120%);
          animation: aurora-celebrate-sheen 1100ms ease-out 180ms;
        }
        .aurora-celebrate-medal {
          position: relative;
          display: grid;
          place-items: center;
          width: 52px;
          height: 52px;
          border-radius: 18px;
          color: #0A0A0A;
          background: linear-gradient(145deg, var(--aurora-heritage-gold-light, #F0D097), var(--aurora-heritage-gold));
          box-shadow: 0 12px 28px rgba(212,168,95,.32), inset 0 1px 0 rgba(255,255,255,.5);
          flex: 0 0 auto;
        }
        .aurora-celebrate-star {
          position: absolute;
          right: -3px;
          top: -3px;
          color: var(--aurora-gold, #FCE072);
          filter: drop-shadow(0 0 8px rgba(252,224,114,.7));
          animation: aurora-celebrate-twinkle 900ms ease-in-out infinite;
        }
        .aurora-celebrate-title {
          font: 700 15px/1.05 "Space Grotesk", sans-serif;
          color: var(--aurora-text);
        }
        .aurora-celebrate-sub {
          margin-top: 5px;
          font: 500 12px/1.25 "Space Grotesk", sans-serif;
          color: var(--aurora-sub);
        }
        .aurora-celebrate-burst {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
        }
        .aurora-celebrate-burst span {
          position: absolute;
          border-radius: 999px;
          background: var(--aurora-heritage-gold);
          box-shadow: 0 0 16px rgba(212,168,95,.8);
          animation: aurora-celebrate-spark 900ms cubic-bezier(.2,.8,.2,1) forwards;
        }
        @keyframes aurora-celebrate-in {
          from { opacity: 0; transform: translateY(-14px) scale(.94); }
          to { opacity: 1; transform: none; }
        }
        @keyframes aurora-celebrate-spark {
          0% { opacity: 0; transform: translate(0, 0) scale(0); }
          20% { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--ax), var(--ay)) scale(1); }
        }
        @keyframes aurora-celebrate-sheen {
          to { transform: translateX(140%); }
        }
        @keyframes aurora-celebrate-twinkle {
          50% { transform: scale(1.25) rotate(12deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .aurora-celebrate-toast::before,
          .aurora-celebrate-star,
          .aurora-celebrate-burst span {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
