import { useEffect, useMemo, useState } from 'react';
import { Flame, Shield, Snowflake } from 'lucide-react';
import { auroraCelebrate } from './AuroraCelebrate';
import { useGameStore, usePrefersReducedMotion } from './gameStore';

const STORAGE_KEY = 'dst_aurora_streak_freeze';
const MAX_FREEZES = 2;

const isBrowser = () => typeof window !== 'undefined';
const todayKey = () => new Date().toISOString().slice(0, 10);

const normalizeFreezeState = (value) => {
  const tokens = Number.isFinite(value?.tokens) ? value.tokens : MAX_FREEZES;

  return {
    tokens: Math.max(0, Math.min(MAX_FREEZES, Math.round(tokens))),
    lastUsed: typeof value?.lastUsed === 'string' ? value.lastUsed : null,
  };
};

const readFreezeState = () => {
  if (!isBrowser()) return normalizeFreezeState();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return normalizeFreezeState(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeFreezeState();
  }
};

const writeFreezeState = (value) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeFreezeState(value)));
  } catch {
    // Streak protection should remain usable even if localStorage is blocked.
  }
};

export function AuroraStreakGuard({ className = '', style = {} }) {
  const { streak } = useGameStore();
  const reducedMotion = usePrefersReducedMotion();
  const today = useMemo(() => todayKey(), []);
  const [freeze, setFreeze] = useState(() => readFreezeState());
  const [confirmed, setConfirmed] = useState(false);

  const usedToday = freeze.lastUsed === today;
  const canUseFreeze = freeze.tokens > 0 && !usedToday;

  useEffect(() => {
    writeFreezeState(freeze);
  }, [freeze]);

  useEffect(() => {
    if (!confirmed) return undefined;

    const timer = window.setTimeout(() => setConfirmed(false), 1800);
    return () => window.clearTimeout(timer);
  }, [confirmed]);

  const useFreeze = () => {
    if (!canUseFreeze) return;

    setFreeze((current) =>
      normalizeFreezeState({
        tokens: current.tokens - 1,
        lastUsed: today,
      }),
    );
    setConfirmed(true);
    auroraCelebrate('streak', { message: 'Streak protected' });
  };

  const statusCopy = usedToday
    ? 'Protected today'
    : freeze.tokens > 0
      ? 'Protect one missed day'
      : 'No freezes left';

  return (
    <section className={`aurora-streak-guard ${className}`} style={style} aria-label="Streak freeze guard">
      <div className="aurora-streak-guard__core">
        <div
          className="aurora-streak-guard__flame"
          style={{ animation: streak > 0 && !reducedMotion ? 'aurora-streak-flame 1.9s ease-in-out infinite' : 'none' }}
        >
          <Flame size={24} fill="currentColor" strokeWidth={2.2} aria-hidden="true" />
        </div>
        <div>
          <div className="aurora-streak-guard__label">CURRENT STREAK</div>
          <div className="aurora-streak-guard__count" aria-label={`${streak} day streak`}>🔥 {streak}</div>
        </div>
      </div>

      <div className="aurora-streak-guard__freeze">
        <div className="aurora-streak-guard__token-row" aria-label={`${freeze.tokens} streak freezes available`}>
          {Array.from({ length: MAX_FREEZES }, (_, index) => {
            const active = index < freeze.tokens;
            return (
              <span key={index} className={`aurora-streak-guard__token ${active ? 'is-active' : ''}`}>
                <Snowflake size={14} strokeWidth={2.4} aria-hidden="true" />
              </span>
            );
          })}
        </div>
        <div className="aurora-streak-guard__copy">
          <strong>{statusCopy}</strong>
          <small>{freeze.tokens}/{MAX_FREEZES} freeze tokens</small>
        </div>
        <button
          type="button"
          className={`aurora-streak-guard__button ${confirmed || usedToday ? 'is-confirmed' : ''}`}
          onClick={useFreeze}
          disabled={!canUseFreeze}
          style={{ animation: confirmed && !reducedMotion ? 'aurora-streak-confirm 520ms ease-out' : 'none' }}
        >
          <Shield size={15} strokeWidth={2.4} aria-hidden="true" />
          <span>{confirmed || usedToday ? 'Protected' : 'Use a freeze'}</span>
        </button>
      </div>

      <style>{`
        .aurora-streak-guard {
          position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto;
          align-items: center; gap: 14px; width: 100%; padding: 16px; overflow: hidden;
          border-radius: 24px; color: var(--aurora-text);
          background:
            radial-gradient(circle at 12% 8%, color-mix(in srgb, var(--aurora-heritage-gold) 22%, transparent), transparent 32%),
            radial-gradient(circle at 88% 18%, color-mix(in srgb, var(--aurora-sky) 18%, transparent), transparent 28%),
            var(--aurora-glass);
          border: 1px solid var(--aurora-line); box-shadow: var(--aurora-shadow-card);
          backdrop-filter: blur(26px) saturate(1.35);
          -webkit-backdrop-filter: blur(26px) saturate(1.35);
        }
        .aurora-streak-guard__core, .aurora-streak-guard__freeze,
        .aurora-streak-guard__button, .aurora-streak-guard__token-row { display: flex; align-items: center; }
        .aurora-streak-guard__core { gap: 12px; min-width: 0; }
        .aurora-streak-guard__flame {
          display: grid; place-items: center; width: 52px; height: 52px;
          flex: 0 0 auto; border-radius: 18px; color: #0A0A0A;
          background: linear-gradient(145deg, var(--aurora-heritage-gold-light, #F0D097), var(--aurora-heritage-gold));
          box-shadow: 0 14px 28px rgba(212,168,95,.28), inset 0 1px 0 rgba(255,255,255,.5);
        }
        .aurora-streak-guard__label {
          margin-bottom: 5px; font: 750 10px/1 "JetBrains Mono", monospace;
          letter-spacing: .12em; color: var(--aurora-dim);
        }
        .aurora-streak-guard__count {
          font: 800 28px/1 "Space Grotesk", sans-serif; letter-spacing: 0; color: var(--aurora-text);
        }
        .aurora-streak-guard__freeze { gap: 10px; justify-content: end; min-width: 0; }
        .aurora-streak-guard__token-row { gap: 5px; }
        .aurora-streak-guard__token {
          display: grid; place-items: center; width: 24px; height: 24px;
          border-radius: 999px; color: var(--aurora-dim);
          background: color-mix(in srgb, var(--aurora-text) 9%, transparent);
          border: 1px solid var(--aurora-line);
        }
        .aurora-streak-guard__token.is-active {
          color: #0A0A0A; background: linear-gradient(145deg, var(--aurora-mint), var(--aurora-sky));
          border-color: color-mix(in srgb, var(--aurora-sky) 58%, var(--aurora-line));
        }
        .aurora-streak-guard__copy { display: grid; gap: 4px; min-width: 118px; }
        .aurora-streak-guard__copy strong {
          font: 750 12px/1.15 "Space Grotesk", sans-serif; color: var(--aurora-text);
        }
        .aurora-streak-guard__copy small {
          font: 700 10px/1 "JetBrains Mono", monospace; letter-spacing: 0; color: var(--aurora-sub);
        }
        .aurora-streak-guard__button {
          justify-content: center; gap: 7px; min-height: 38px; padding: 0 12px;
          border-radius: 999px; color: #0A0A0A; background: var(--aurora-heritage-gold);
          border: 1px solid color-mix(in srgb, var(--aurora-heritage-gold) 50%, var(--aurora-line));
          font: 800 11px/1 "JetBrains Mono", monospace;
          letter-spacing: 0; white-space: nowrap; cursor: pointer; appearance: none;
          -webkit-tap-highlight-color: transparent;
        }
        .aurora-streak-guard__button:disabled {
          cursor: default; color: var(--aurora-sub); background: var(--aurora-glass); border-color: var(--aurora-line);
        }
        .aurora-streak-guard__button.is-confirmed { color: #0A0A0A; background: var(--aurora-mint); }
        @keyframes aurora-streak-flame {
          0%, 100% { transform: translateY(0) scale(1); filter: drop-shadow(0 0 0 rgba(212,168,95,0)); }
          50% { transform: translateY(-2px) scale(1.04); filter: drop-shadow(0 0 14px rgba(212,168,95,.42)); }
        }
        @keyframes aurora-streak-confirm {
          0% { transform: scale(.96); }
          55% { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
        @media (max-width: 620px) {
          .aurora-streak-guard { grid-template-columns: 1fr; }
          .aurora-streak-guard__freeze { justify-content: space-between; }
        }
      `}</style>
    </section>
  );
}
