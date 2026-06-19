import { Check, Gift, Lock, Star, Trophy } from 'lucide-react';
import { auroraCelebrate } from './AuroraCelebrate';
import { gameStore, useGameStore, usePrefersReducedMotion } from './gameStore';

const DEFAULT_NODES = [
  { day: 1, level: 1, title: 'Warm Open', reward: '+25 XP', xp: 25, tint: 'mint' },
  { day: 2, level: 2, title: 'Reader Token', reward: '+2 Takes', takes: 2, tint: 'sky' },
  { day: 3, level: 3, title: 'Callback Glow', reward: '+40 XP', xp: 40, tint: 'peach' },
  { day: 4, level: 4, title: 'Slate Pin', reward: '+3 Takes', takes: 3, tint: 'accent' },
  { day: 5, level: 5, title: 'Pilot Wrap', reward: '+75 XP', xp: 75, tint: 'accent', finale: true },
];

const tintVar = {
  peach: 'var(--aurora-peach)',
  sky: 'var(--aurora-sky)',
  mint: 'var(--aurora-mint)',
  accent: 'var(--aurora-heritage-gold)',
};

export function AuroraSeasonNode({ node, state = 'locked' }) {
  const reducedMotion = usePrefersReducedMotion();
  const tint = tintVar[node.tint] || tintVar.accent;

  const claim = () => {
    if (state !== 'ready') return;

    // Only award if the claim was newly recorded — prevents a double-tap (or a
    // stale `state` prop) from granting the reward's XP/Takes twice.
    if (!gameStore.claimReward(node.day)) return;
    if (node.xp) gameStore.addXp(node.xp);
    if (node.takes) {
      gameStore.addXp(node.takes * 5);
    }
    auroraCelebrate('reward', { message: node.reward });
  };

  return (
    <button
      type="button"
      className={`aurora-season-node is-${state} ${node.finale ? 'is-finale' : ''}`}
      onClick={claim}
      style={{
        '--season-tint': tint,
        animation: state === 'ready' && !reducedMotion ? 'aurora-season-ready 1.8s ease-in-out infinite' : 'none',
      }}
      aria-label={`${node.title}, ${state}`}
    >
      <span className="aurora-season-node__orb">
        {state === 'claimed' ? <Check size={20} strokeWidth={2.6} aria-hidden="true" /> : null}
        {state === 'ready' ? <Gift size={20} strokeWidth={2.3} aria-hidden="true" /> : null}
        {state === 'locked' ? <Lock size={18} strokeWidth={2.3} aria-hidden="true" /> : null}
      </span>
      <span className="aurora-season-node__copy">
        <strong>{node.title}</strong>
        <small>{node.reward}</small>
      </span>
      <span className="aurora-season-node__day">D{node.day}</span>
      <style>{`
        .aurora-season-node {
          position: relative;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          min-width: 210px;
          min-height: 88px;
          padding: 14px;
          border-radius: 24px;
          border: 1px solid var(--aurora-line);
          color: var(--aurora-text);
          background: var(--aurora-glass);
          box-shadow: var(--aurora-shadow-card);
          cursor: default;
          text-align: left;
          appearance: none;
        }
        .aurora-season-node.is-ready {
          cursor: pointer;
          border-color: color-mix(in srgb, var(--season-tint) 46%, var(--aurora-line));
          background: linear-gradient(135deg, color-mix(in srgb, var(--season-tint) 18%, transparent), var(--aurora-glass));
        }
        .aurora-season-node.is-claimed {
          background: linear-gradient(135deg, color-mix(in srgb, var(--aurora-mint) 18%, transparent), var(--aurora-glass));
        }
        .aurora-season-node.is-locked {
          opacity: .55;
        }
        .aurora-season-node__orb {
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          border-radius: 18px;
          color: #0A0A0A;
          background: var(--season-tint);
          box-shadow: 0 8px 0 color-mix(in srgb, var(--season-tint) 58%, #000), 0 12px 24px color-mix(in srgb, var(--season-tint) 28%, transparent);
        }
        .aurora-season-node.is-locked .aurora-season-node__orb {
          color: var(--aurora-dim);
          background: color-mix(in srgb, var(--aurora-text) 12%, transparent);
          box-shadow: inset 0 -3px 0 rgba(0,0,0,.12);
        }
        .aurora-season-node__copy {
          display: grid;
          gap: 4px;
          min-width: 0;
        }
        .aurora-season-node__copy strong {
          font: 750 14px/1.15 "Space Grotesk", sans-serif;
          color: var(--aurora-text);
        }
        .aurora-season-node__copy small,
        .aurora-season-node__day {
          font: 700 10px/1 "JetBrains Mono", monospace;
          letter-spacing: 0;
          color: var(--aurora-sub);
        }
        .aurora-season-node__day {
          padding: 7px 8px;
          border-radius: 999px;
          background: var(--aurora-glass);
          border: 1px solid var(--aurora-line);
        }
        .aurora-season-node.is-finale .aurora-season-node__orb {
          border-radius: 20px;
          transform: scale(1.08);
        }
        @keyframes aurora-season-ready {
          0%, 100% { transform: translateY(0); box-shadow: var(--aurora-shadow-card); }
          50% { transform: translateY(-4px); box-shadow: 0 18px 34px color-mix(in srgb, var(--season-tint) 28%, transparent); }
        }
      `}</style>
    </button>
  );
}

export function AuroraSeason({ nodes = DEFAULT_NODES, className = '', style = {} }) {
  const game = useGameStore();
  const claimed = new Set(game.claimedRewards);
  const claimedCount = nodes.filter((node) => claimed.has(String(node.day))).length;

  return (
    <section className={`aurora-season ${className}`} style={style}>
      <div className="aurora-season__head">
        <div>
          <div className="aurora-season__eyebrow">PILOT SEASON</div>
          <h2>Battle-pass track</h2>
        </div>
        <div className="aurora-season__badge">
          <Trophy size={16} fill="currentColor" aria-hidden="true" />
          {claimedCount}/{nodes.length}
        </div>
      </div>

      <div className="aurora-season__rail" aria-label="Pilot Season rewards">
        {nodes.map((node) => {
          const nodeState = claimed.has(String(node.day))
            ? 'claimed'
            : game.level >= node.level
              ? 'ready'
              : 'locked';

          return <AuroraSeasonNode key={node.day} node={node} state={nodeState} />;
        })}
      </div>

      <div className="aurora-season__footer">
        <Star size={15} fill="currentColor" aria-hidden="true" />
        <span>Reach level {nodes[nodes.length - 1]?.level || 5} to finish the Pilot Season pass.</span>
      </div>

      <style>{`
        .aurora-season {
          display: grid;
          gap: 14px;
          width: 100%;
          color: var(--aurora-text);
        }
        .aurora-season__head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 16px;
        }
        .aurora-season__eyebrow {
          margin-bottom: 6px;
          font: 700 10px/1 "JetBrains Mono", monospace;
          letter-spacing: .15em;
          color: var(--aurora-dim);
        }
        .aurora-season h2 {
          margin: 0;
          font: 750 24px/1.05 "Space Grotesk", sans-serif;
          letter-spacing: 0;
          color: var(--aurora-text);
        }
        .aurora-season__badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 12px;
          border-radius: 999px;
          color: #0A0A0A;
          background: var(--aurora-heritage-gold);
          font: 800 11px/1 "JetBrains Mono", monospace;
        }
        .aurora-season__rail {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: minmax(210px, 1fr);
          gap: 12px;
          overflow-x: auto;
          padding: 4px 2px 12px;
          scrollbar-width: none;
        }
        .aurora-season__rail::-webkit-scrollbar { display: none; }
        .aurora-season__footer {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          color: var(--aurora-sub);
          font: 600 12px/1.3 "Space Grotesk", sans-serif;
        }
        .aurora-season__footer svg { color: var(--aurora-heritage-gold); }
      `}</style>
    </section>
  );
}
