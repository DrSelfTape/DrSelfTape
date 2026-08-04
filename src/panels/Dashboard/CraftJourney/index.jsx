import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { X, Star, Flame, Sparkles as SparklesIcon, Check, Loader2 } from 'lucide-react';
import { V1Sparkles } from '../../../components/Aurora';
import axios from '../../../redux/http';
import endPoints from '../../../redux/constant';
import { showSnackbar } from '../../../redux/features/snackbarSlice/snackbarSlice';
import { fetchCraftJourney, clearLastResult } from '../../../redux/features/craftJourney/craftJourneySlice';
import { aiIdempotencyHeaders } from '../../../utils/aiIdempotency';

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

/* ──────────────────────────────────────────────────────────────────
   Per-skill prompts for the AI scene generator. Tuned for short
   single-scene practice — 1 page, 2 characters — and crafted to
   exercise the specific muscle the node trains. Each skill also
   declares which downstream practice tool the actor lands in.
   ────────────────────────────────────────────────────────────── */
const SKILL_PROMPTS = {
  // ── Foundations ──
  'Cold Reads': {
    tool: 'scene-study',
    genre: 'drama', tone: 'grounded', difficulty: 'medium',
    prompt: 'Write a 1-page contemporary drama scene for a COLD READ exercise. 2 characters with naturalistic dialogue. Include 2-3 quick emotional shifts so the actor must react in real time. Avoid pre-scene context the actor needs to know — every line should land on its own. Proper screenplay format, character names in CAPS.',
  },
  'Objectives': {
    tool: 'scene-study',
    genre: 'drama', tone: 'tense', difficulty: 'medium',
    prompt: 'Write a 1-page drama scene where ONE character wants something specific from the other — concrete, urgent, in-the-moment (apology, confession, permission, money, the truth). The other character has a clear opposing want. The scene escalates as each tries to win. 6-8 lines each. Proper screenplay format, character names in CAPS.',
  },
  'Beat Changes': {
    tool: 'scene-study',
    genre: 'drama', tone: 'shifting', difficulty: 'hard',
    prompt: 'Write a 1-page drama scene with at least THREE distinct emotional beats — for example: small talk → confession → confrontation → reconciliation. Each beat should turn on a specific line. 2 characters, 6-8 lines each. Mark suggested beat transitions with a parenthetical if helpful. Proper screenplay format.',
  },
  'Listening': {
    tool: 'scene-study',
    genre: 'drama', tone: 'intimate', difficulty: 'medium',
    prompt: 'Write a 1-page drama scene where ONE character does most of the talking and the OTHER reacts in short, loaded responses. The listener must show they\'re hearing something painful or unexpected. 70/30 dialogue split. Proper screenplay format, character names in CAPS.',
  },
  // ── Emotional Range ──
  'Vulnerability': {
    tool: 'scene-study',
    genre: 'drama', tone: 'intimate', difficulty: 'hard',
    prompt: 'Write a 1-page intimate two-person scene where ONE character opens up about something they\'ve never said out loud before — a fear, a shame, a love. The other listens with care. Quiet stakes, no shouting. Subtext is high. Proper screenplay format, character names in CAPS.',
  },
  'Anger Work': {
    tool: 'scene-study',
    genre: 'drama', tone: 'volatile', difficulty: 'hard',
    prompt: 'Write a 1-page drama scene built around controlled, simmering anger that surfaces in the second half. Avoid screaming-match clichés; the rage is from love or loyalty betrayed. 2 characters with history. 6-8 lines each. Proper screenplay format.',
  },
  'Grief': {
    tool: 'scene-study',
    genre: 'drama', tone: 'tender', difficulty: 'hard',
    prompt: 'Write a 1-page drama scene set days or weeks after a significant loss. Two characters — both grieving in different ways. They miscommunicate, then connect. Avoid melodrama; let silence do the work. Proper screenplay format, character names in CAPS.',
  },
  'Joy & Lightness': {
    tool: 'scene-study',
    genre: 'comedy', tone: 'warm', difficulty: 'medium',
    prompt: 'Write a 1-page warm comedy scene between two characters who clearly love each other — old friends, siblings, partners. Genuine laughter, no irony, no put-downs. Banter that earns its joy. 6-8 lines each. Proper screenplay format.',
  },
  // ── On Camera (routes to CDSim) ──
  'Eyeline': {
    tool: 'cd-sim',
    genre: 'drama', tone: 'grounded', difficulty: 'medium',
    prompt: 'Write a 1-page contemporary drama scene designed for self-tape practice — 2 characters facing each other. Tight, dialogue-driven, no movement notes. The actor will record alone, so the off-camera role should be brief responses. Proper screenplay format.',
  },
  'Stillness': {
    tool: 'cd-sim',
    genre: 'drama', tone: 'restrained', difficulty: 'hard',
    prompt: 'Write a 1-page two-person scene built for stillness — minimal stage business, the camera holds on the actor. Inner storm beneath a calm exterior. 6-8 lines each. Proper screenplay format.',
  },
  'Self-Tape Frame': {
    tool: 'cd-sim',
    genre: 'drama', tone: 'grounded', difficulty: 'medium',
    prompt: 'Write a 1-page two-person scene optimized for self-tape — single location, simple eyeline, no large gestures. Strong emotional core. Proper screenplay format, character names in CAPS.',
  },
  'The Slate': {
    tool: 'cd-sim',
    genre: 'drama', tone: 'grounded', difficulty: 'hard',
    prompt: 'Write a 1-page two-person scene appropriate for a final-callback self-tape submission. The actor will slate before the scene (name, height, agency). The scene itself should showcase range — start light, go deep. Proper screenplay format.',
  },
};

export default function CraftJourney() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const skillProgress = useSelector((s) => s.craftJourney.skill_progress) || {};
  const lastResult = useSelector((s) => s.craftJourney.lastResult);
  // Celebration is driven by Redux lastResult — set by completeCraftNode
  // fulfilled handler. Watching it here means any session (Cold Reads,
  // CDSim, etc.) that completes a node lights this up on the next render
  // of CraftJourney, no matter which surface fired the dispatch.
  const [celebrate, setCelebrate] = useState(null);
  const craftXp = useSelector((s) => s.craftJourney.craft_xp) || 0;
  const cjLoading = useSelector((s) => s.craftJourney.loading);
  const cjFetched = useSelector((s) => s.craftJourney.hasFetched);
  const [generating, setGenerating] = useState(null); // node id while AI generates

  // When BE confirms a node completion, fire the celebration overlay. We
  // only celebrate first-time completions (xp_awarded > 0); re-runs of the
  // same node return already_done=true and we skip the burst.
  useEffect(() => {
    if (!lastResult) return;
    if (lastResult.already_done) {
      dispatch(clearLastResult());
      return;
    }
    const nid = lastResult.node_id;
    const node = JOURNEY.flatMap((s) => s.nodes).find((n) => n.id === nid);
    if (!node) {
      dispatch(clearLastResult());
      return;
    }
    // Carry the BE-awarded XP so the overlay shows the real number the
    // backend granted, not a client-fabricated stars*20 estimate.
    setCelebrate({
      node,
      stars: lastResult.stars || 2,
      xpAwarded: typeof lastResult.xp_awarded === 'number' ? lastResult.xp_awarded : null,
    });
  }, [lastResult, dispatch]);

  const closeCelebration = () => {
    setCelebrate(null);
    dispatch(clearLastResult());
  };

  // Pull live progress from the BE on mount. The skill_progress map
  // overrides each node's seeded state/stars from the JOURNEY constant.
  useEffect(() => {
    dispatch(fetchCraftJourney());
  }, [dispatch]);

  const total = useMemo(() => JOURNEY.reduce((n, s) => n + s.nodes.length, 0), []);

  // BE map: { node_id: { state: 'locked'|'current'|'done', stars: 0-3 } }
  // Falls back to the JOURNEY constant's seeded values while the fetch
  // is in flight so the UI doesn't blink to all-locked on first paint.
  const effState = (node) => skillProgress[node.id]?.state || node.state;
  const effStars = (node) => skillProgress[node.id]?.stars ?? node.stars;

  const allNodes = useMemo(() => JOURNEY.flatMap((s) => s.nodes), []);
  const liveDone = allNodes.filter((n) => effState(n) === 'done').length;
  const liveStars = allNodes.reduce((sum, n) => sum + effStars(n), 0);

  const nextNode = allNodes.find((n) => effState(n) === 'current')
    || allNodes.find((n) => effState(n) !== 'done');
  const nextLabel = nextNode ? nextNode.label.toUpperCase() : '';

  // Tap a node → generate a skill-specific scene → preload it into the
  // matching practice tool → navigate. The user lands in Scene Study or
  // Acting Coach with a fresh script tuned to the muscle they just
  // tapped, instead of an empty upload screen.
  const handleStart = async (node) => {
    if (effState(node) === 'locked') return;
    if (generating) return; // one at a time

    const config = SKILL_PROMPTS[node.label];
    if (!config) {
      dispatch(showSnackbar({ message: 'This skill isn\'t wired up yet.', variant: 'info' }));
      return;
    }

    setGenerating(node.id);
    try {
      const body = {
        genre: config.genre,
        tone: config.tone,
        difficulty: config.difficulty,
        character_type: 'actor',
        free_prompt: config.prompt,
      };
      const { data } = await axios.post(
        endPoints.generateScene,
        body,
        // Keyed so a retry of the same config dedupes instead of charging twice.
        aiIdempotencyHeaders('scene_generator', body,
          { timeout: 45000 }), // GPT-4o + Railway cold-start can take 15s+
      );

      const sceneText =
        data?.data?.scene || data?.scene ||
        data?.data?.feedback || data?.feedback || '';

      if (!sceneText) throw new Error('No scene returned');

      // Preload script into sessionStorage — both SceneStudy and CDSim
      // read from this key on mount (same handoff pattern as the
      // Audition Generator panel). craft_skill is the BE node label;
      // when the practice tool's session ends, it dispatches
      // completeCraftNode({node: craft_skill}) so the BE marks the
      // node done and unlocks the next one in the path.
      sessionStorage.setItem(
        'preloadedScript',
        JSON.stringify({
          scriptContent: sceneText,
          scriptTitle: `${node.label} · Craft Journey`,
          craft_skill: node.label,
        }),
      );

      // Mobile MobileApp uses tab/panel state, not react-router routes.
      // Fire drst-navigate to switch tabs, then drst-load-virtual-script
      // so ScenesScreen mounts the AI scene as a "virtual script" without
      // the user having to wade through the upload step.
      const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
      const virtualTitle = `${node.label} · Craft Journey`;
      if (isMobile) {
        if (config.tool === 'cd-sim') {
          window.dispatchEvent(new CustomEvent('drst-navigate', { detail: { panel: 'cd-sim' } }));
        } else {
          window.dispatchEvent(new CustomEvent('drst-navigate', { detail: { tab: 'scenes' } }));
          // Slight delay so ScenesScreen has mounted its listener
          // before we fire the script payload.
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('drst-load-virtual-script', {
              // Pass the skill tag through the event so ScenesScreen's
              // setSelectedScript call carries it forward — without it,
              // the handler would clobber the sessionStorage-derived
              // craft_skill and the End-Scene completion would silently
              // no-op for users who launched a node from here.
              detail: { content: sceneText, title: virtualTitle, craft_skill: node.label },
            }));
          }, 50);
        }
      } else {
        const route = config.tool === 'cd-sim' ? '/dashboard/cd-sim' : '/dashboard/scene-study';
        navigate(route, { state: { craft_skill: node.label, scriptContent: sceneText } });
      }
    } catch (err) {
      const msg = err?.response?.status === 402
        ? 'Out of AI tokens. Upgrade to keep practicing.'
        : (err?.response?.data?.message || 'Couldn\'t generate that scene. Try again.');
      dispatch(showSnackbar({ message: msg, variant: 'error' }));
    } finally {
      setGenerating(null);
    }
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
          onTouchEnd={(e) => { e.preventDefault(); navigate(-1); }}
          aria-label="Close Craft Journey"
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--aurora-glass)',
            border: '1px solid var(--aurora-glass-border)',
            backdropFilter: 'blur(12px)',
            color: 'var(--aurora-text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
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

      {/* Celebration overlay — fires when BE confirms a node completion. */}
      {celebrate && (
        <Celebration node={celebrate.node} stars={celebrate.stars} xpAwarded={celebrate.xpAwarded} onClose={closeCelebration} />
      )}

      {/* AI-generation overlay — blocks input while the scene is being
          written so users don't double-tap and queue up two generations
          (each costs an AI token). */}
      {generating && (() => {
        const node = JOURNEY.flatMap((s) => s.nodes).find((n) => n.id === generating);
        const config = node ? SKILL_PROMPTS[node.label] : null;
        const tool = config?.tool === 'cd-sim' ? 'Acting Coach' : 'Scene Study';
        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
            background: 'rgba(14,13,10,0.55)', backdropFilter: 'blur(12px)',
          }}>
            <div style={{
              width: '100%', maxWidth: 320, padding: 28, borderRadius: 28,
              background: 'var(--aurora-surface-solid)',
              border: '1px solid var(--aurora-line)',
              boxShadow: 'var(--aurora-shadow-modal, 0 24px 60px rgba(10,10,10,0.18))',
              textAlign: 'center',
            }}>
              <div style={{
                width: 56, height: 56, margin: '0 auto 16px',
                borderRadius: 18, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #D4A85F, #7A5A18)',
                color: '#FFFFFF',
                boxShadow: '0 12px 30px rgba(212,168,95,0.45)',
              }}>
                <Loader2 size={26} className="animate-spin" />
              </div>
              <div className="aurora-eyebrow" style={{ color: 'var(--aurora-heritage-gold-deep)', marginBottom: 8 }}>
                CRAFT JOURNEY
              </div>
              <div style={{
                fontFamily: 'Playfair Display, serif', fontSize: 22,
                color: 'var(--aurora-text)', lineHeight: 1.3, marginBottom: 8,
              }}>
                Writing your {node?.label} scene…
              </div>
              <div style={{ fontSize: 13, color: 'var(--aurora-sub)', lineHeight: 1.5 }}>
                Generating a 1-page scene tuned for this skill. You'll land in {tool} in a moment.
              </div>
            </div>
          </div>
        );
      })()}
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
        onTouchEnd={(e) => { e.preventDefault(); if (!isLocked) onStart(); }}
        className={isCurrent ? 'craft-current' : ''}
        style={{
          width: size,
          height: size,
          borderRadius: node.boss ? 22 : '50%',
          border: 'none',
          cursor: isLocked ? 'default' : 'pointer',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
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

function Celebration({ node, stars, xpAwarded, onClose }) {
  const [shownStars, setShownStars] = useState(0);
  const [xp, setXp] = useState(0);
  // Use the BE-awarded XP. Only fall back to a stars-based estimate if the
  // backend didn't return xp_awarded (older API), so the overlay never shows
  // a number that contradicts what was actually granted.
  const xpGain = typeof xpAwarded === 'number' ? xpAwarded : stars * 20;

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
          onTouchEnd={(e) => { e.preventDefault(); onClose?.(); }}
          style={{
            marginTop: 16,
            width: '100%',
            padding: 14,
            borderRadius: 100,
            background: '#0E0D0A',
            color: '#FFFFFF',
            border: 'none',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
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
