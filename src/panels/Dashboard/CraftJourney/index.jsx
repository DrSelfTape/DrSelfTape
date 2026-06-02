import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Star, Flame, Sparkles as SparklesIcon, Check } from 'lucide-react';
import { V1Sparkles } from '../../../components/Aurora';

/* ──────────────────────────────────────────────────────────────────
   Craft Journey — Duolingo-style serpentine skill path.
   Handoff: design_handoff_dr_self_tape_aurora/screens/v1-journey.jsx
   For now, JOURNEY is local static data. Persistence target is a
   `skill_progress` map on the Jericho/growth model so completions
   carry across devices and feed Craft XP elsewhere.
   ────────────────────────────────────────────────────────────────── */

const JOURNEY = [
  {
    section: 'FOUNDATIONS', color: '#9FE6B4', tint: '#E8F8EE',
    nodes: [
      { id: 'f1', label: 'Cold Reads',      icon: 'doc',    state: 'done',    stars: 3 },
      { id: 'f2', label: 'Objectives',      icon: 'target', state: 'done',    stars: 3 },
      { id: 'f3', label: 'Beat Changes',    icon: 'flash',  state: 'done',    stars: 2 },
      { id: 'f4', label: 'Listening',       icon: 'ear',    state: 'done',    stars: 3 },
    ],
  },
  {
    section: 'EMOTIONAL RANGE', color: '#A7D6FF', tint: '#E8F2FF',
    nodes: [
      { id: 'e1', label: 'Vulnerability',   icon: 'heart',  state: 'done',    stars: 2 },
      { id: 'e2', label: 'Anger Work',      icon: 'flame',  state: 'current', stars: 0 },
      { id: 'e3', label: 'Grief',           icon: 'drop',   state: 'locked',  stars: 0 },
      { id: 'e4', label: 'Joy & Lightness', icon: 'sun',    state: 'locked',  stars: 0 },
    ],
  },
  {
    section: 'ON CAMERA', color: '#D4A85F', tint: '#FBF1DE',
    nodes: [
      { id: 'c1', label: 'Eyeline',         icon: 'eye',    state: 'locked',  stars: 0 },
      { id: 'c2', label: 'Stillness',       icon: 'pause',  state: 'locked',  stars: 0 },
      { id: 'c3', label: 'Self-Tape Frame', icon: 'frame',  state: 'locked',  stars: 0 },
      { id: 'c4', label: 'The Slate',       icon: 'star',   state: 'locked',  stars: 0, boss: true },
    ],
  },
];

const JOURNEY_GLYPHS = {
  doc:    <path d="M8 3h6l4 4v14H6V5a2 2 0 0 1 2-2z M14 3v4h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
  target: <g fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></g>,
  flash:  <path d="M13 2 4 14h6l-1 8 9-12h-6z" fill="currentColor" />,
  ear:    <path d="M7 10a5 5 0 0 1 10 0c0 3-3 4-3 7a2.5 2.5 0 0 1-5 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
  heart:  <path d="M12 21S4 14 4 8.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8 2.5C20 14 12 21 12 21z" fill="currentColor" />,
  flame:  <path d="M13 3s2 4 2 7c0 1.5-.7 2.4-1.5 3 .5-3-1.5-4-1.5-4S10 12 10 14c0 1.5 1 2 1 2-3 0-5 2.5-5 5.5 0 3 2.7 5.5 6 5.5s6-2.5 6-5.5C18 14 13 11 13 3z" fill="currentColor" />,
  drop:   <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" fill="currentColor" />,
  sun:    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4" fill="currentColor" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" /></g>,
  eye:    <g fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" fill="currentColor" /></g>,
  pause:  <g fill="currentColor"><rect x="7" y="5" width="3.5" height="14" rx="1.5" /><rect x="13.5" y="5" width="3.5" height="14" rx="1.5" /></g>,
  frame:  <g fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="6" width="16" height="12" rx="2" /><path d="M9 6V4M15 6V4" /></g>,
  star:   <path d="M12 2l2.6 7.1 7.4.4-5.7 4.7 1.9 7.2L12 17.6 5.8 21.4l1.9-7.2L2 9.5l7.4-.4z" fill="currentColor" />,
};

function shade(hex, amt) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const adj = (c) => Math.max(0, Math.min(255, c + amt));
  return `#${adj(r).toString(16).padStart(2, '0')}${adj(g).toString(16).padStart(2, '0')}${adj(b).toString(16).padStart(2, '0')}`;
}

function readProgress() {
  try {
    const raw = localStorage.getItem('dst_craft_journey');
    if (raw) return JSON.parse(raw);
  } catch { /* swallow */ }
  return {};
}

function writeProgress(map) {
  try {
    localStorage.setItem('dst_craft_journey', JSON.stringify(map));
  } catch { /* swallow */ }
}

export default function CraftJourney() {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState(() => readProgress());
  const [celebrate, setCelebrate] = useState(null);

  const total = useMemo(() => JOURNEY.reduce((n, s) => n + s.nodes.length, 0), []);
  const seedDone = useMemo(
    () => JOURNEY.reduce((n, s) => n + s.nodes.filter((x) => x.state === 'done').length, 0),
    []
  );
  const seedStars = useMemo(
    () => JOURNEY.reduce((n, s) => n + s.nodes.reduce((m, x) => m + x.stars, 0), 0),
    []
  );

  const effState = (node) => (completed[node.id] != null ? 'done' : node.state);
  const effStars = (node) => (completed[node.id] != null ? completed[node.id] : node.stars);

  const liveDone = seedDone + Object.keys(completed).filter((k) => !JOURNEY.flatMap((s) => s.nodes).find((n) => n.id === k && n.state === 'done')).length;
  const liveStars = JOURNEY.flatMap((s) => s.nodes).reduce((sum, n) => sum + effStars(n), 0);

  const nextNode = JOURNEY.flatMap((s) => s.nodes).find((n) => effState(n) !== 'done');
  const nextLabel = nextNode ? nextNode.label.toUpperCase() : '';

  const handleStart = (node) => {
    if (effState(node) === 'locked') return;
    // For v1: simulate finishing a practice rep with 2 or 3 stars.
    // Production: tie to real practice scores (CD Sim feedback >= 8 = 3, 6-7 = 2, else 1).
    const earned = 2 + (Math.random() < 0.5 ? 1 : 0);
    setCelebrate({ node, stars: earned });
  };

  const confirmComplete = () => {
    if (!celebrate) return;
    const next = { ...completed, [celebrate.node.id]: celebrate.stars };
    setCompleted(next);
    writeProgress(next);
    setCelebrate(null);
  };

  return (
    <div
      className="aurora-orbs aurora-orbs-live aurora-page-in"
      style={{
        position: 'relative',
        minHeight: '100%',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
      }}
    >
      <style>{`
        @keyframes craft-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        .craft-current { animation: craft-bob 1.8s ease-in-out infinite; }
        @keyframes craft-ring { 0% { box-shadow: 0 0 0 0 currentColor; opacity: 0.5; } 100% { box-shadow: 0 0 0 18px transparent; opacity: 0; } }
        .craft-ring { animation: craft-ring 2s ease-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ padding: '12px 18px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Close Craft Journey"
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--aurora-glass)',
            border: '1px solid var(--aurora-glass-border)',
            backdropFilter: 'blur(12px)',
            color: 'var(--aurora-text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={14} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="aurora-eyebrow" style={{ color: 'var(--aurora-dim)' }}>CRAFT JOURNEY</span>
          <div className="aurora-display" style={{ fontSize: 20, color: 'var(--aurora-text)', letterSpacing: '-0.4px' }}>
            Scene Study Path
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Pill icon={<Star size={12} />} iconColor="#D4A85F">{liveStars}</Pill>
          <Pill icon={<Flame size={12} />} iconColor="#5BC97D">{(JOURNEY.flatMap((s) => s.nodes).filter((n) => effState(n) === 'done').length)}</Pill>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '0 18px 14px' }}>
        <div style={{ height: 8, background: 'rgba(10,10,10,0.06)', borderRadius: 100, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${(liveDone / total) * 100}%`,
              background: 'linear-gradient(90deg, #9FE6B4, #D4A85F)',
              borderRadius: 100,
              boxShadow: '0 0 10px rgba(212,168,95,0.55)',
              transition: 'width 0.6s cubic-bezier(.2,.7,.3,1)',
            }}
          />
        </div>
        <div
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9,
            color: 'var(--aurora-dim)',
            letterSpacing: '0.12em',
            marginTop: 8,
          }}
        >
          {liveDone} / {total} SKILLS{nextLabel ? ` · NEXT: ${nextLabel}` : ' · ALL CLEAR'}
        </div>
      </div>

      {/* Serpentine path */}
      <div style={{ padding: '8px 0 40px' }}>
        {JOURNEY.map((sec) => (
          <Section
            key={sec.section}
            sec={sec}
            effState={effState}
            effStars={effStars}
            onStart={handleStart}
          />
        ))}

        {/* finish flag */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 18 }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: 18,
              background: 'rgba(10,10,10,0.05)',
              border: '1px dashed rgba(10,10,10,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--aurora-dim)',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 21V4M5 4h11l-2 4 2 4H5" strokeLinejoin="round" />
            </svg>
          </div>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9,
              color: 'var(--aurora-dim)',
              letterSpacing: '0.15em',
              marginTop: 8,
            }}
          >
            BOOKED-ACTOR STATUS
          </div>
        </div>
      </div>

      {celebrate && (
        <Celebration node={celebrate.node} stars={celebrate.stars} onClose={confirmComplete} />
      )}
    </div>
  );
}

function Pill({ icon, iconColor, children }) {
  return (
    <div
      style={{
        padding: '6px 10px',
        borderRadius: 100,
        background: 'var(--aurora-glass)',
        border: '1px solid var(--aurora-glass-border)',
        backdropFilter: 'blur(12px)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <span style={{ color: iconColor, display: 'flex' }}>{icon}</span>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600 }}>{children}</span>
    </div>
  );
}

function Section({ sec, effState, effStars, onStart }) {
  return (
    <div style={{ position: 'relative', marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 18px' }}>
        <div
          style={{
            padding: '7px 16px',
            borderRadius: 100,
            background: sec.tint,
            border: `1px solid ${sec.color}`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: sec.color }} />
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              letterSpacing: '0.18em',
              fontWeight: 600,
              color: '#0E0D0A',
            }}
          >
            {sec.section}
          </span>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        {sec.nodes.map((node, ni) => {
          const offsets = [0, 64, 0, -64];
          const dx = offsets[ni % offsets.length];
          return (
            <Node
              key={node.id}
              node={node}
              dx={dx}
              color={sec.color}
              state={effState(node)}
              stars={effStars(node)}
              onStart={() => onStart(node)}
            />
          );
        })}
      </div>
    </div>
  );
}

function Node({ node, dx, color, state, stars, onStart }) {
  const isLocked = state === 'locked';
  const isCurrent = state === 'current';
  const isDone = state === 'done';
  const size = node.boss ? 76 : 64;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: `translateX(${dx}px)`,
        marginBottom: 18,
        position: 'relative',
      }}
    >
      {isCurrent && (
        <div
          style={{
            position: 'absolute',
            top: -26,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '4px 10px',
            borderRadius: 100,
            background: '#0E0D0A',
            color: '#FFF',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9,
            letterSpacing: '0.12em',
            whiteSpace: 'nowrap',
            zIndex: 3,
          }}
        >
          START HERE
          <div
            style={{
              position: 'absolute',
              bottom: -4,
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: 8,
              height: 8,
              background: '#0E0D0A',
            }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => !isLocked && onStart()}
        className={isCurrent ? 'craft-current' : ''}
        style={{
          width: size,
          height: size,
          borderRadius: node.boss ? 22 : '50%',
          border: 'none',
          cursor: isLocked ? 'default' : 'pointer',
          position: 'relative',
          background: isLocked
            ? 'rgba(10,10,10,0.06)'
            : `linear-gradient(135deg, ${color}, ${shade(color, -22)})`,
          boxShadow: isLocked
            ? 'inset 0 -3px 0 rgba(10,10,10,0.05)'
            : `0 6px 0 ${shade(color, -45)}, 0 10px 20px ${color}66`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isLocked ? 'rgba(10,10,10,0.28)' : '#0E0D0A',
          transition: 'transform 0.12s',
        }}
      >
        {isCurrent && <div className="craft-ring" style={{ position: 'absolute', inset: 0, borderRadius: '50%', color }} />}

        {isLocked ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        ) : (
          <svg width={node.boss ? 32 : 26} height={node.boss ? 32 : 26} viewBox="0 0 24 24">{JOURNEY_GLYPHS[node.icon]}</svg>
        )}

        {isDone && (
          <div
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: '#5BC97D',
              border: '2px solid #FAFAF7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
            }}
          >
            <Check size={11} strokeWidth={3} />
          </div>
        )}
      </button>

      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '-0.1px',
          marginTop: 8,
          color: isLocked ? 'var(--aurora-dim)' : 'var(--aurora-text)',
        }}
      >
        {node.label}{node.boss ? ' ★' : ''}
      </div>

      {(isDone || isCurrent) && (
        <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
          {[0, 1, 2].map((i) => (
            <Star key={i} size={11} fill={i < stars ? '#D4A85F' : 'rgba(10,10,10,0.12)'} stroke="none" />
          ))}
        </div>
      )}
    </div>
  );
}

function Celebration({ node, stars, onClose }) {
  const [shownStars, setShownStars] = useState(0);
  const [xp, setXp] = useState(0);
  const xpGain = stars * 20;

  useEffect(() => {
    const timers = [];
    for (let i = 1; i <= stars; i++) {
      timers.push(setTimeout(() => setShownStars(i), 350 + i * 320));
    }
    timers.push(setTimeout(() => {
      let v = 0;
      const iv = setInterval(() => {
        v += Math.ceil(xpGain / 18);
        if (v >= xpGain) { v = xpGain; clearInterval(iv); }
        setXp(v);
      }, 40);
      timers.push(iv);
    }, 350 + stars * 320 + 200));
    return () => timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
  }, [stars, xpGain]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'radial-gradient(circle at 50% 40%, rgba(212,168,95,0.22), rgba(10,10,10,0.55))',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'craft-fade-in 0.3s ease',
      }}
    >
      <style>{`
        @keyframes craft-star-pop {
          0% { transform: scale(0) rotate(-40deg); opacity: 0; }
          60% { transform: scale(1.3) rotate(10deg); }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        @keyframes craft-rayspin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        @keyframes craft-card-in {
          from { transform: translateY(20px) scale(0.92); opacity: 0; }
          to   { transform: none; opacity: 1; }
        }
        @keyframes craft-fade-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <V1Sparkles count={30} radius={140} size={8} color="#D4A85F" duration={1200} delayStagger={40} />

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 320,
          textAlign: 'center',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(28px) saturate(1.5)',
          border: '1px solid rgba(255,255,255,0.6)',
          borderRadius: 28,
          padding: '32px 24px 24px',
          boxShadow: '0 24px 60px rgba(10,10,10,0.25)',
          animation: 'craft-card-in 0.4s cubic-bezier(.2,.9,.3,1)',
        }}
      >
        <div style={{ position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)', width: 130, height: 130, pointerEvents: 'none' }}>
          <svg viewBox="0 0 130 130" style={{ width: '100%', height: '100%', animation: 'craft-rayspin 12s linear infinite' }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <rect
                key={i}
                x="63"
                y="2"
                width="4"
                height="22"
                rx="2"
                fill="#D4A85F"
                opacity={i % 2 ? 0.3 : 0.6}
                transform={`rotate(${i * 30} 65 65)`}
              />
            ))}
          </svg>
        </div>

        <div
          style={{
            position: 'relative',
            width: 92,
            height: 92,
            borderRadius: 26,
            margin: '6px auto 0',
            background: 'linear-gradient(135deg, #D4A85F, #F0D097)',
            border: '2px solid rgba(255,255,255,0.6)',
            boxShadow: '0 12px 30px rgba(212,168,95,0.55), inset 0 1px 0 rgba(255,255,255,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1A1408',
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24">{JOURNEY_GLYPHS[node.icon]}</svg>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 18, height: 40 }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                color: i < shownStars ? '#D4A85F' : 'rgba(10,10,10,0.10)',
                animation: i < shownStars ? 'craft-star-pop 0.45s cubic-bezier(.2,1.5,.4,1)' : 'none',
                filter: i < shownStars ? 'drop-shadow(0 4px 10px rgba(212,168,95,0.55))' : 'none',
                transform: i === 1 ? 'translateY(-6px)' : 'none',
                display: 'inline-flex',
              }}
            >
              <Star size={i === 1 ? 38 : 32} fill="currentColor" stroke="none" />
            </span>
          ))}
        </div>

        <div
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            color: 'var(--aurora-heritage-gold-deep)',
            letterSpacing: '0.2em',
            marginTop: 16,
          }}
        >
          SKILL COMPLETE
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', marginTop: 4, color: 'var(--aurora-text)' }}>
          {node.label}
        </div>
        <div style={{ fontSize: 13, color: 'var(--aurora-sub)', marginTop: 8, lineHeight: 1.45 }}>
          {stars === 3 ? 'Flawless run. The next skill is unlocked.' : 'Nicely done. Run it again for a 3-star.'}
        </div>

        <div
          style={{
            marginTop: 18,
            padding: '12px 14px',
            borderRadius: 14,
            background: 'rgba(159,230,180,0.20)',
            border: '1px solid #9FE6B4',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                color: '#2E6B3E',
                letterSpacing: '0.15em',
              }}
            >
              CRAFT XP
            </div>
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: '-1px',
                color: '#0E0D0A',
              }}
            >
              +{xp}
            </div>
          </div>
          <SparklesIcon size={20} color="#2E6B3E" />
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 16,
            width: '100%',
            padding: 14,
            borderRadius: 100,
            background: '#0E0D0A',
            color: '#FFFFFF',
            border: 'none',
            fontFamily: 'Space Grotesk, system-ui, sans-serif',
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '-0.2px',
            cursor: 'pointer',
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
