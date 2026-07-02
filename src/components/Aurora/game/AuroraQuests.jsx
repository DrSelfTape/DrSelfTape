import { useState } from 'react';
import { Check, ChevronRight, Mic, Play, ScrollText, Users } from 'lucide-react';
import { auroraCelebrate } from './AuroraCelebrate';
import { gameStore, useGameStore, usePrefersReducedMotion } from './gameStore';
import { SlateAurora } from './Slate';

const DEFAULT_QUESTS = [
  { id: 'warmup', title: 'Warm up your voice', sub: 'One focused breath and articulation pass.', xp: 20, tint: 'mint', Icon: Mic },
  { id: 'run-sides', title: 'Run one page', sub: 'Practice a scene beat from today’s sides.', xp: 35, tint: 'sky', Icon: ScrollText },
  { id: 'record-take', title: 'Record a clean take', sub: 'Keep framing steady and listen back once.', xp: 45, tint: 'peach', Icon: Play },
  { id: 'reader-rep', title: 'Read for someone', sub: 'Help a peer get one better take.', xp: 50, tint: 'accent', Icon: Users },
];

const tintVar = {
  peach: 'var(--aurora-peach)',
  sky: 'var(--aurora-sky)',
  mint: 'var(--aurora-mint)',
  accent: 'var(--aurora-heritage-gold)',
};

const todayKey = () => new Date().toISOString().slice(0, 10);

export function AuroraQuestRow({ quest, completed = false }) {
  const [floatXp, setFloatXp] = useState(false);
  const [pressed, setPressed] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const Icon = quest.Icon || Mic;
  const tint = tintVar[quest.tint] || tintVar.accent;

  const complete = () => {
    if (completed) return;

    // Award XP only when the store confirms a NEW completion — guards against a
    // stale `completed` closure double-awarding on a rapid second tap.
    const newlyCompleted = gameStore.completeQuest(quest.id);
    if (!newlyCompleted) return;

    setPressed(true);
    setFloatXp(true);
    gameStore.addXp(quest.xp);
    auroraCelebrate('quest', { message: `+${quest.xp} XP earned` });

    window.setTimeout(() => setFloatXp(false), reducedMotion ? 900 : 1200);
    window.setTimeout(() => setPressed(false), 320);
  };

  return (
    <button
      type="button"
      className={`aurora-quest-row ${completed ? 'is-complete' : ''} ${pressed ? 'is-pressed' : ''}`}
      onClick={complete}
      style={{ '--quest-tint': tint, animation: pressed && !reducedMotion ? 'aurora-quest-bounce 320ms ease-out' : 'none' }}
    >
      <span className="aurora-quest-row__icon"><Icon size={18} strokeWidth={2.3} aria-hidden="true" /></span>
      <span className="aurora-quest-row__copy">
        <strong>{quest.title}</strong>
        <small>{quest.sub}</small>
      </span>
      <span className="aurora-quest-row__xp">+{quest.xp} XP</span>
      <span className="aurora-quest-row__state">
        {completed ? <Check size={17} strokeWidth={2.5} aria-hidden="true" /> : <ChevronRight size={17} strokeWidth={2.5} aria-hidden="true" />}
      </span>
      {floatXp ? <span className="aurora-quest-row__float" style={{ animation: reducedMotion ? 'none' : undefined }}>+{quest.xp}</span> : null}
      <style>{`
        .aurora-quest-row {
          position: relative;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto auto;
          align-items: center;
          gap: 12px;
          width: 100%;
          min-height: 76px;
          padding: 14px;
          border: 1px solid var(--aurora-line);
          border-radius: 24px;
          color: var(--aurora-text);
          background: linear-gradient(135deg, color-mix(in srgb, var(--quest-tint) 16%, transparent), var(--aurora-glass));
          box-shadow: var(--aurora-shadow-card);
          text-align: left;
          cursor: pointer;
          appearance: none;
          -webkit-tap-highlight-color: transparent;
        }
        .aurora-quest-row:disabled { cursor: default; }
        .aurora-quest-row__icon,
        .aurora-quest-row__state {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 16px;
          background: color-mix(in srgb, var(--quest-tint) 34%, transparent);
          color: var(--aurora-text);
          border: 1px solid color-mix(in srgb, var(--quest-tint) 42%, transparent);
        }
        .aurora-quest-row__copy { display: grid; gap: 4px; min-width: 0; }
        .aurora-quest-row__copy strong {
          font: 700 14px/1.15 "Space Grotesk", sans-serif;
          color: var(--aurora-text);
        }
        .aurora-quest-row__copy small {
          font: 500 12px/1.3 "Space Grotesk", sans-serif;
          color: var(--aurora-sub);
        }
        .aurora-quest-row__xp {
          padding: 7px 9px;
          border-radius: 999px;
          font: 700 10px/1 "JetBrains Mono", monospace;
          letter-spacing: 0;
          color: #0A0A0A;
          background: var(--quest-tint);
          white-space: nowrap;
        }
        .aurora-quest-row__state {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          color: var(--quest-tint);
          background: var(--aurora-glass);
        }
        .aurora-quest-row.is-complete {
          opacity: .78;
          cursor: default;
        }
        .aurora-quest-row.is-complete .aurora-quest-row__state {
          color: #0A0A0A;
          background: var(--aurora-mint);
        }
        .aurora-quest-row__float {
          position: absolute;
          right: 54px;
          top: 8px;
          color: var(--aurora-heritage-gold);
          font: 800 12px/1 "JetBrains Mono", monospace;
          text-shadow: 0 0 18px rgba(212,168,95,.5);
          animation: aurora-quest-xp 1000ms ease-out forwards;
        }
        @keyframes aurora-quest-bounce {
          0%, 100% { transform: scale(1); }
          45% { transform: scale(.985) translateY(2px); }
          72% { transform: scale(1.018) translateY(-2px); }
        }
        @keyframes aurora-quest-xp {
          0% { opacity: 0; transform: translateY(8px) scale(.92); }
          20% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-28px) scale(1); }
        }
        @media (max-width: 420px) {
          .aurora-quest-row {
            grid-template-columns: auto minmax(0, 1fr) auto;
          }
          .aurora-quest-row__xp { grid-column: 2; justify-self: start; }
          .aurora-quest-row__state { grid-column: 3; grid-row: 1 / span 2; }
        }
      `}</style>
    </button>
  );
}

export function AuroraQuests({ quests = DEFAULT_QUESTS, className = '', style = {} }) {
  const game = useGameStore();
  const today = todayKey();
  const completed = game.questCompletions[today] || {};
  const doneCount = quests.filter((quest) => completed[quest.id]).length;

  return (
    <section className={`aurora-quests ${className}`} style={style}>
      <div className="aurora-quests__header">
        <SlateAurora size={64} mood={doneCount === quests.length ? 'proud' : 'steady'} />
        <div>
          <div className="aurora-quests__eyebrow">DAILY QUESTS</div>
          <h2>{doneCount}/{quests.length} reps complete</h2>
        </div>
      </div>
      {/* SlateTip removed — Home already renders Slate's rotating daily note
          right below this stack, so this static line was a duplicate mascot
          tip on the same screen. */}
      <div className="aurora-quests__list">
        {quests.map((quest) => (
          <AuroraQuestRow key={quest.id} quest={quest} completed={Boolean(completed[quest.id])} />
        ))}
      </div>
      <style>{`
        .aurora-quests {
          display: grid;
          gap: 14px;
          width: 100%;
          color: var(--aurora-text);
        }
        .aurora-quests__header {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .aurora-quests__eyebrow {
          margin-bottom: 5px;
          font: 700 10px/1 "JetBrains Mono", monospace;
          letter-spacing: .15em;
          color: var(--aurora-dim);
        }
        .aurora-quests h2 {
          margin: 0;
          color: var(--aurora-text);
          font: 750 24px/1.05 "Space Grotesk", sans-serif;
          letter-spacing: 0;
        }
        .aurora-quests__list {
          display: grid;
          gap: 10px;
        }
      `}</style>
    </section>
  );
}
