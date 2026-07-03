/**
 * Jericho — Actor Growth Dashboard
 * Shows performance DNA, coaching insights, evolution timeline, and session history.
 */
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Brain, TrendingUp, Zap, Target, Star, ChevronRight, X,
  Sparkles, Loader2, BarChart3, Clock, Flame, Shield,
  Eye, Mic, Theater, Laugh, Heart, Volume2, Film,
} from 'lucide-react';
import {
  fetchActorMemory,
  fetchInsights,
  fetchEvolution,
  fetchRecentSessions,
  updateActorMemory,
} from '../../../redux/features/jericho/jerichoSlice';
import useAIGate from '../../../components/AIConsent/useAIGate';
import TapeReview from './TapeReview';
import axios from '../../../redux/http';
import useHideMobileHeader from '../../../components/Shared/useHideMobileHeader';

// ─── Performance DNA Metrics ───────────────────────────────────────────

const DNA_METRICS = [
  { key: 'emotional_range', label: 'Emotional Range', icon: Heart, color: '#D4A85F' },
  { key: 'cold_read', label: 'Cold Read', icon: Eye, color: '#3b82f6' },
  { key: 'comedy_timing', label: 'Comedy Timing', icon: Laugh, color: '#FCE072' },
  { key: 'dramatic_depth', label: 'Dramatic Depth', icon: Theater, color: '#ef4444' },
  { key: 'physicality', label: 'Physicality', icon: Zap, color: '#22c55e' },
  { key: 'vocal_variety', label: 'Vocal Variety', icon: Volume2, color: '#A7ECDA' },
];

const COACHING_STYLES = [
  { id: 'supportive', label: 'Supportive', desc: 'Encouraging, positive reinforcement', emoji: '🤗' },
  { id: 'balanced', label: 'Balanced', desc: 'Mix of praise and constructive critique', emoji: '⚖️' },
  { id: 'challenging', label: 'Challenging', desc: 'Push harder, direct feedback', emoji: '🔥' },
];

const INSIGHT_ICONS = {
  strength: { icon: Star, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  weakness: { icon: Target, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  pattern: { icon: BarChart3, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  breakthrough: { icon: Zap, color: '#FCE072', bg: 'rgba(252,224,114,0.1)' },
  recommendation: { icon: Sparkles, color: '#D4A85F', bg: 'rgba(212,168,95,0.1)' },
};

const SESSION_TYPE_LABELS = {
  cd_coach: { label: 'CD Coach', emoji: '🎬' },
  live_scene: { label: 'Live Scene', emoji: '🎙️' },
  scene_generator: { label: 'Scene Gen', emoji: '✨' },
  audition_prep: { label: 'Audition Prep', emoji: '📋' },
  self_tape_review: { label: 'Tape Review', emoji: '🎥' },
  take_compare: { label: 'Compare Takes', emoji: '🏆' },
};

// ─── Review Detail Sheet constants ────────────────────────────────────

// Human-readable labels for tape-review score keys.
const SCORE_LABELS = {
  framing: 'Framing',
  eyeline: 'Eyeline',
  lighting: 'Lighting',
  energy_commitment: 'Energy / Commitment',
  dynamic_range: 'Dynamic Range',
};

// Human-readable labels for tape-review performance keys.
const PERF_LABELS = {
  emotional_arc: 'Emotional Arc',
  strongest_beat: 'Strongest Beat',
  choices: 'Choices',
  listening_presence: 'Listening Presence',
  truth_vs_indicated: 'Truth vs. Indicated',
};

// Keys that identify a tape-review-shaped ai_feedback dict. If NONE of
// these are present we fall back to a generic labeled list.
const TAPE_REVIEW_KEYS = ['verdict', 'scores', 'performance', 'the_one_thing', 'tone_tags'];

// ─── ReviewDetailSheet ─────────────────────────────────────────────────

/**
 * Full-screen overlay that fetches and renders the stored Jericho notes
 * for a single `self_tape_review` session. Hides the Aurora mobile
 * header via useHideMobileHeader for its lifetime so the X button is
 * fully reachable.
 */
function ReviewDetailSheet({ session, onClose }) {
  // Suppress the persistent Aurora top bar while this overlay is open.
  useHideMobileHeader(true);

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetail = useCallback(() => {
    setLoading(true);
    setError(null);
    axios
      .get(`/v1/ai/session-log/${session.id}/`)
      .then((res) => {
        // House envelope is {data, message, success} — unwrap like the rest
        // of the app (data?.data || data), and guard the null/empty body that
        // would otherwise leave all three body states false → blank sheet.
        const body = res.data?.data || res.data;
        if (!body || typeof body !== 'object') { setError('Unexpected empty response.'); setLoading(false); return; }
        setDetail(body); setLoading(false);
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || 'Failed to load review details.');
        setLoading(false);
      });
  }, [session.id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const feedback = detail?.ai_feedback || null;
  // True when the response has at least one structured tape-review field.
  const hasTapeKeys = feedback && TAPE_REVIEW_KEYS.some((k) => k in feedback);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
      style={{ background: 'var(--aurora-bg)' }}
    >
      {/* ── Sheet header ── */}
      <div
        className="flex items-center justify-between px-4 py-4 border-b border-[rgba(10,10,10,0.08)] sticky top-0 z-10"
        style={{ background: 'var(--aurora-bg)' }}
      >
        <div className="flex items-center gap-2">
          <Film size={16} className="text-[#7A5A18]" />
          <h2 className="text-base font-bold text-[#0A0A0A]">Tape Review</h2>
          {session.created_at && (
            <span className="text-xs text-[rgba(10,10,10,0.4)]">
              {new Date(session.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </span>
          )}
        </div>
        <button
          type="button"
          onTouchEnd={(e) => { e.preventDefault(); onClose(); }}
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center border border-[rgba(10,10,10,0.14)] text-[rgba(10,10,10,0.62)] hover:text-[#0A0A0A] transition-colors"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Sheet body ── */}
      <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">

        {/* Loading spinner */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#7A5A18]" />
          </div>
        )}

        {/* Error state with retry */}
        {error && (
          <div className="text-center py-20">
            <p className="text-sm text-[rgba(10,10,10,0.62)] mb-4">{error}</p>
            <button
              type="button"
              onTouchEnd={(e) => { e.preventDefault(); fetchDetail(); }}
              onClick={fetchDetail}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-[#0A0A0A]"
              style={{
                background: 'linear-gradient(135deg, #D4A85F, #7A5A18)',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Try again
            </button>
          </div>
        )}

        {/* Loaded content */}
        {detail && !loading && (
          <div className="space-y-5">
            {hasTapeKeys ? (
              <>
                {/* Verdict — headline treatment */}
                {feedback.verdict && (
                  <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4 sm:p-5" style={{ background: 'var(--bg-surface, #1A1A2E)' }}>
                    <h3 className="text-xs font-bold text-[rgba(10,10,10,0.4)] uppercase tracking-wide mb-2">Verdict</h3>
                    <p className="text-base font-bold text-[#0A0A0A] leading-snug">{feedback.verdict}</p>
                  </div>
                )}

                {/* Scores — labeled 1–10 progress bars */}
                {feedback.scores && Object.keys(feedback.scores).length > 0 && (
                  <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4 sm:p-5" style={{ background: 'var(--bg-surface, #1A1A2E)' }}>
                    <h3 className="text-xs font-bold text-[rgba(10,10,10,0.4)] uppercase tracking-wide mb-4">Scores</h3>
                    <div className="space-y-3">
                      {Object.entries(feedback.scores).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-3">
                          <span className="text-xs text-[rgba(10,10,10,0.62)] w-32 truncate flex-shrink-0">
                            {SCORE_LABELS[k] || k.replace(/_/g, ' ')}
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-[#F4F4EE] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${(Number(v) / 10) * 100}%`, background: '#D4A85F' }}
                            />
                          </div>
                          <span className="text-xs font-bold text-[#0A0A0A] w-6 text-right">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Performance — readable-label sections */}
                {feedback.performance && Object.keys(feedback.performance).length > 0 && (
                  <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4 sm:p-5" style={{ background: 'var(--bg-surface, #1A1A2E)' }}>
                    <h3 className="text-xs font-bold text-[rgba(10,10,10,0.4)] uppercase tracking-wide mb-4">Performance</h3>
                    <div className="space-y-4">
                      {Object.entries(feedback.performance).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] uppercase tracking-wide">
                            {PERF_LABELS[k] || k.replace(/_/g, ' ')}
                          </span>
                          <p className="text-sm text-[rgba(10,10,10,0.62)] leading-relaxed mt-0.5">{String(v)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* The One Thing — highlighted callout */}
                {feedback.the_one_thing && (
                  <div
                    className="rounded-2xl p-4 sm:p-5 border border-[#D4A85F]/30"
                    style={{ background: 'rgba(212,168,95,0.08)' }}
                  >
                    <h3 className="text-xs font-bold text-[#7A5A18] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Sparkles size={12} /> The One Thing
                    </h3>
                    <p className="text-sm font-semibold text-[#0A0A0A] leading-relaxed">{feedback.the_one_thing}</p>
                  </div>
                )}

                {/* Tone tags — chips */}
                {feedback.tone_tags && feedback.tone_tags.length > 0 && (
                  <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4 sm:p-5" style={{ background: 'var(--bg-surface, #1A1A2E)' }}>
                    <h3 className="text-xs font-bold text-[rgba(10,10,10,0.4)] uppercase tracking-wide mb-3">Tone</h3>
                    <div className="flex flex-wrap gap-2">
                      {feedback.tone_tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#D4A85F]/10 text-[#7A5A18] border border-[#D4A85F]/20"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Fallback: generic / unknown session shape — list all present fields */
              <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4 sm:p-5" style={{ background: 'var(--bg-surface, #1A1A2E)' }}>
                <h3 className="text-xs font-bold text-[rgba(10,10,10,0.4)] uppercase tracking-wide mb-4">Session Notes</h3>
                {feedback && Object.keys(feedback).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(feedback).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] uppercase tracking-wide">
                          {k.replace(/_/g, ' ')}
                        </span>
                        <p className="text-sm text-[rgba(10,10,10,0.62)] leading-relaxed mt-0.5">
                          {typeof v === 'string' ? v : JSON.stringify(v)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[rgba(10,10,10,0.4)]">No notes stored for this session.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DNA Radar Chart (SVG) ─────────────────────────────────────────────

function DNARadar({ dna = {} }) {
  const cx = 120, cy = 120, r = 90;
  const metrics = DNA_METRICS.map((m, i) => {
    const val = (dna[m.key] || 0) / 10;
    const angle = (Math.PI * 2 * i) / DNA_METRICS.length - Math.PI / 2;
    return { ...m, val, angle };
  });

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const points = metrics.map((m) => ({
    x: cx + r * m.val * Math.cos(m.angle),
    y: cy + r * m.val * Math.sin(m.angle),
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <svg viewBox="0 0 240 240" className="w-full max-w-[280px] mx-auto">
      {/* Grid */}
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={metrics.map((m) => {
            const x = cx + r * level * Math.cos(m.angle);
            const y = cy + r * level * Math.sin(m.angle);
            return `${x},${y}`;
          }).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      ))}
      {/* Axis lines */}
      {metrics.map((m) => (
        <line
          key={m.key}
          x1={cx} y1={cy}
          x2={cx + r * Math.cos(m.angle)}
          y2={cy + r * Math.sin(m.angle)}
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="1"
        />
      ))}
      {/* Data shape */}
      <path d={pathD} fill="rgba(212,168,95,0.15)" stroke="#FF8280" strokeWidth="2" />
      {/* Data points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill={metrics[i].color} />
      ))}
      {/* Labels */}
      {metrics.map((m) => {
        const labelR = r + 22;
        const x = cx + labelR * Math.cos(m.angle);
        const y = cy + labelR * Math.sin(m.angle);
        return (
          <text
            key={m.key}
            x={x} y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(255,255,255,0.5)"
            fontSize="8"
            fontWeight="600"
          >
            {m.label}
          </text>
        );
      })}
    </svg>
  );
}

// ─── DNA Bar (fallback for mobile) ─────────────────────────────────────

function DNABars({ dna = {} }) {
  return (
    <div className="space-y-3">
      {DNA_METRICS.map((m) => {
        const val = dna[m.key] || 0;
        const Icon = m.icon;
        return (
          <div key={m.key} className="flex items-center gap-3">
            <Icon size={16} style={{ color: m.color, flexShrink: 0 }} />
            <span className="text-xs text-[rgba(10,10,10,0.62)] w-24 truncate">{m.label}</span>
            <div className="flex-1 h-2 rounded-full bg-[#F4F4EE] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${val * 10}%`, background: m.color }}
              />
            </div>
            <span className="text-xs font-bold text-[#0A0A0A] w-6 text-right">{val}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function JerichoDashboard() {
  // Apple Guideline 5.1.1(i) — affirmative AI consent required before
  // we fetch the actor-memory profile (which the BE then mixes into
  // every AI prompt).
  useAIGate();
  const dispatch = useDispatch();
  const {
    memory, memoryLoading, memoryHasFetched, memoryError,
    insights, insightsLoading,
    evolution, evolutionLoading,
    recentSessions, sessionsLoading,
  } = useSelector((s) => s.jericho);

  // Deep-link support: the desktop sidebar's "Tape Review" links to
  // /dashboard/jericho?tab=tape so it opens straight on the Tape tab. Valid
  // tabs: overview | tape | insights | history. (In the mobile shell there's
  // no query string, so this no-ops to the overview default.)
  const [searchParams] = useSearchParams();
  const deepTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(deepTab || 'overview');
  const [showStylePicker, setShowStylePicker] = useState(false);
  // Detail sheet — null when closed, or the session object to show.
  const [selectedSession, setSelectedSession] = useState(null);
  // Lets a brand-new actor (no sessions yet) jump straight into Tape Review
  // instead of being held on the empty state — also true when deep-linked to
  // the Tape tab, which works without any prior sessions.
  const [entered, setEntered] = useState(deepTab === 'tape');

  useEffect(() => {
    dispatch(fetchActorMemory());
    dispatch(fetchInsights());
    dispatch(fetchEvolution());
    dispatch(fetchRecentSessions(10));
  }, [dispatch]);

  const loading = !memoryHasFetched || (memoryLoading && !memory);
  const dna = memory?.performance_dna || {};
  const totalSessions = memory?.total_sessions || 0;
  const strengths = memory?.strengths || [];
  const weaknesses = memory?.weaknesses || [];
  const growthAreas = memory?.growth_areas || [];
  const coachingStyle = memory?.coaching_style || 'balanced';

  // ── Initial-load skeleton — keeps the screen from flashing the empty
  // state on first paint or on a network blip. ──
  if (loading) {
    return (
      <div className="min-h-screen px-4 py-6 sm:p-8 flex items-center justify-center" style={{ background: 'var(--aurora-bg)' }}>
        <Loader2 className="w-8 h-8 animate-spin text-[#7A5A18]" />
      </div>
    );
  }

  // ── Fetch failed — surface a retry so users don't think the screen is broken. ──
  if (memoryError && !memory) {
    return (
      <div className="min-h-screen px-4 py-6 sm:p-8" style={{ background: 'var(--aurora-bg)' }}>
        <div className="max-w-md mx-auto text-center py-20">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <Brain className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-[#0A0A0A] mb-2">Couldn&apos;t load Jericho</h2>
          <p className="text-sm text-[rgba(10,10,10,0.62)] mb-6">{String(memoryError)}</p>
          <button
            onClick={() => {
              dispatch(fetchActorMemory());
              dispatch(fetchInsights());
              dispatch(fetchEvolution());
              dispatch(fetchRecentSessions(10));
            }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#0A0A0A]"
            style={{ background: 'linear-gradient(135deg, #D4A85F, #7A5A18)' }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Empty state (BE returned no sessions yet) ──
  if ((!memory || (memory.total_sessions || 0) === 0) && !entered) {
    return (
      <div className="min-h-screen px-4 py-6 sm:p-8" style={{ background: 'var(--aurora-bg)' }}>
        <div className="max-w-2xl mx-auto text-center py-20">
          <div className="w-24 h-24 rounded-full bg-[#D4A85F]/10 border border-[#D4A85F]/20 flex items-center justify-center mx-auto mb-6">
            <Brain className="w-12 h-12 text-[#7A5A18]" />
          </div>
          <h1 className="text-2xl font-bold text-[#0A0A0A] mb-3">Meet Jericho</h1>
          <p className="text-[rgba(10,10,10,0.62)] text-sm mb-2 max-w-md mx-auto leading-relaxed">
            Your self-evolving AI acting coach. Jericho learns from every session —
            your strengths, patterns, and growth areas — to give you increasingly
            personalized coaching.
          </p>
          <p className="text-[rgba(10,10,10,0.4)] text-xs mb-8">
            Start a coaching session or scene study to begin building your actor profile.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => { setActiveTab('tape'); setEntered(true); }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#0A0A0A] transition-all hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #D4A85F, #7A5A18)' }}
            >
              <Film size={16} /> Review a Self-Tape
            </button>
            <a
              href="/dashboard/scene-study"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium border border-[rgba(10,10,10,0.14)] text-[rgba(10,10,10,0.62)] hover:text-[#0A0A0A] hover:border-[#555] transition-colors"
            >
              <Mic size={16} /> Practice a Scene
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Detail sheet — mounts as a fixed overlay when a review row is tapped */}
      {selectedSession && (
        <ReviewDetailSheet
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    <div className="min-h-screen px-4 py-6 sm:p-8" style={{ background: 'var(--aurora-bg)' }}>
      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-5 h-5 text-[#7A5A18]" />
              <h1 className="text-xl font-bold text-[#0A0A0A]">Jericho</h1>
              <span className="text-xs bg-[#D4A85F]/15 text-[#7A5A18] px-2 py-0.5 rounded-full font-semibold">AI Coach</span>
            </div>
            <p className="text-sm text-[rgba(10,10,10,0.4)]">
              {totalSessions > 0
                ? `${totalSessions} session${totalSessions !== 1 ? 's' : ''} analyzed — always evolving`
                : 'Your personal acting coach is learning...'}
            </p>
          </div>
          {memory?.summary && (
            <button
              onClick={() => setShowStylePicker(!showStylePicker)}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-[rgba(10,10,10,0.14)] text-[rgba(10,10,10,0.62)] hover:text-[#0A0A0A] hover:border-[#555] transition-colors"
            >
              {COACHING_STYLES.find((s) => s.id === coachingStyle)?.emoji} {coachingStyle}
            </button>
          )}
        </div>

        {/* ── Coaching Style Picker ── */}
        {showStylePicker && (
          <div className="mb-6 rounded-2xl border border-[rgba(10,10,10,0.08)] p-4" style={{ background: 'var(--bg-surface, #1A1A2E)' }}>
            <h3 className="text-sm font-bold text-[#0A0A0A] mb-3">Coaching Style</h3>
            <div className="flex gap-2">
              {COACHING_STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    dispatch(updateActorMemory({ coaching_style: s.id }));
                    setShowStylePicker(false);
                  }}
                  className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                    coachingStyle === s.id
                      ? 'border-[#D4A85F] bg-[#D4A85F]/10'
                      : 'border-[rgba(10,10,10,0.08)] hover:border-[rgba(10,10,10,0.14)]'
                  }`}
                >
                  <span className="text-xl">{s.emoji}</span>
                  <span className="text-xs font-semibold text-[#0A0A0A]">{s.label}</span>
                  <span className="text-[10px] text-[rgba(10,10,10,0.4)] leading-tight text-center">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab Navigation ── */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 border border-[rgba(10,10,10,0.08)]">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'tape', label: 'Tape', icon: Film },
            { id: 'insights', label: 'Insights', icon: Sparkles },
            { id: 'history', label: 'History', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? 'bg-[#D4A85F]/15 text-[#7A5A18] border border-[#D4A85F]/20'
                    : 'text-[rgba(10,10,10,0.4)] hover:text-[rgba(10,10,10,0.62)]'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#7A5A18]" />
          </div>
        ) : (
          <>
            {/* ═══ OVERVIEW TAB ═══ */}
            {activeTab === 'overview' && (
              <div className="space-y-4 sm:space-y-6">
                {/* Actor Summary */}
                {memory?.summary && (
                  <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4 sm:p-5" style={{ background: 'var(--bg-surface, #1A1A2E)' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#D4A85F]/10 flex items-center justify-center flex-shrink-0">
                        <Brain size={18} className="text-[#7A5A18]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#0A0A0A] mb-1">Jericho&apos;s Assessment</h3>
                        <p className="text-sm text-[rgba(10,10,10,0.62)] leading-relaxed">{memory.summary}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Performance DNA */}
                <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4 sm:p-5" style={{ background: 'var(--bg-surface, #1A1A2E)' }}>
                  <h3 className="text-sm font-bold text-[#0A0A0A] mb-4 flex items-center gap-2">
                    <Zap size={16} className="text-[#7A5A18]" /> Performance DNA
                  </h3>
                  {/* Radar on desktop, bars on mobile */}
                  <div className="hidden sm:block">
                    <DNARadar dna={dna} />
                  </div>
                  <div className="sm:hidden">
                    <DNABars dna={dna} />
                  </div>
                </div>

                {/* Strengths & Growth Areas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Strengths */}
                  <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4" style={{ background: 'var(--bg-surface, #1A1A2E)' }}>
                    <h3 className="text-sm font-bold text-[#0A0A0A] mb-3 flex items-center gap-2">
                      <Star size={14} className="text-emerald-400" /> Strengths
                    </h3>
                    {strengths.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {strengths.map((s, i) => (
                          <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[rgba(10,10,10,0.4)]">Complete more sessions for Jericho to identify your strengths.</p>
                    )}
                  </div>

                  {/* Growth Areas */}
                  <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4" style={{ background: 'var(--bg-surface, #1A1A2E)' }}>
                    <h3 className="text-sm font-bold text-[#0A0A0A] mb-3 flex items-center gap-2">
                      <Target size={14} className="text-amber-400" /> Growth Areas
                    </h3>
                    {(growthAreas.length > 0 || weaknesses.length > 0) ? (
                      <div className="flex flex-wrap gap-2">
                        {growthAreas.map((g, i) => (
                          <span key={`g-${i}`} className="px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {g}
                          </span>
                        ))}
                        {weaknesses.filter((w) => !growthAreas.includes(w)).map((w, i) => (
                          <span key={`w-${i}`} className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                            {w}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[rgba(10,10,10,0.4)]">Areas for improvement will appear as Jericho learns your patterns.</p>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Sessions', value: totalSessions, icon: Flame, color: '#D4A85F' },
                    { label: 'Insights', value: insights.length, icon: Sparkles, color: '#A7ECDA' },
                    { label: 'Streak', value: memory?.current_streak || 0, icon: TrendingUp, color: '#FCE072' },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={stat.label}
                        className="rounded-xl border border-[rgba(10,10,10,0.08)] p-3 text-center"
                        style={{ background: 'var(--bg-surface, #1A1A2E)' }}
                      >
                        <Icon size={18} style={{ color: stat.color }} className="mx-auto mb-1" />
                        <p className="text-lg font-bold text-[#0A0A0A]">{stat.value}</p>
                        <p className="text-[10px] text-[rgba(10,10,10,0.4)] font-medium">{stat.label}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Evolution Timeline Preview */}
                {evolution.length > 0 && (
                  <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4 sm:p-5" style={{ background: 'var(--bg-surface, #1A1A2E)' }}>
                    <h3 className="text-sm font-bold text-[#0A0A0A] mb-3 flex items-center gap-2">
                      <TrendingUp size={16} className="text-[#A7ECDA]" /> Evolution
                    </h3>
                    <div className="space-y-2">
                      {evolution.slice(0, 5).map((e, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-[rgba(10,10,10,0.08)] last:border-0">
                          <div>
                            <span className="text-xs font-medium text-[#0A0A0A]">{e.metric_name?.replace(/_/g, ' ')}</span>
                            {e.notes && <p className="text-[10px] text-[rgba(10,10,10,0.4)] mt-0.5">{e.notes}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#0A0A0A]">{e.value}</span>
                            <span className="text-[10px] text-[rgba(10,10,10,0.4)]">/10</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ TAPE REVIEW TAB ═══ */}
            {activeTab === 'tape' && <TapeReview />}

            {/* ═══ INSIGHTS TAB ═══ */}
            {activeTab === 'insights' && (
              <div className="space-y-3">
                {insightsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#7A5A18]" />
                  </div>
                ) : insights.length > 0 ? (
                  insights.map((insight, i) => {
                    const style = INSIGHT_ICONS[insight.insight_type] || INSIGHT_ICONS.recommendation;
                    const Icon = style.icon;
                    return (
                      <div
                        key={i}
                        className="rounded-xl border border-[rgba(10,10,10,0.08)] p-4 flex gap-3"
                        style={{ background: 'var(--bg-surface, #1A1A2E)' }}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: style.bg }}
                        >
                          <Icon size={16} style={{ color: style.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-[#0A0A0A] capitalize">
                              {insight.insight_type}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                              style={{
                                background: `${style.color}20`,
                                color: style.color,
                              }}
                            >
                              {insight.category?.replace(/_/g, ' ')}
                            </span>
                            {insight.confidence >= 0.8 && (
                              <Shield size={10} className="text-emerald-400" title="High confidence" />
                            )}
                          </div>
                          <p className="text-sm text-[rgba(10,10,10,0.62)] leading-relaxed">{insight.description}</p>
                          <p className="text-[10px] text-[rgba(10,10,10,0.4)] mt-1">
                            Based on {insight.evidence_count} session{insight.evidence_count !== 1 ? 's' : ''}
                            {' · '}
                            {Math.round(insight.confidence * 100)}% confidence
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <Sparkles className="w-10 h-10 text-[#3A3A3A] mx-auto mb-3" />
                    <p className="text-sm text-[rgba(10,10,10,0.4)]">Insights will appear after a few coaching sessions.</p>
                    <p className="text-xs text-[#555] mt-1">Jericho needs at least 3 sessions to start spotting patterns.</p>
                  </div>
                )}
              </div>
            )}

            {/* ═══ HISTORY TAB ═══ */}
            {activeTab === 'history' && (
              <div className="space-y-2">
                {sessionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#7A5A18]" />
                  </div>
                ) : recentSessions.length > 0 ? (
                  recentSessions.map((session, i) => {
                    const typeInfo = SESSION_TYPE_LABELS[session.session_type] || { label: String(session.session_type || 'Session').replace(/_/g, ' '), emoji: '🎭' };
                    const date = session.created_at ? new Date(session.created_at) : null;
                    // Only tape-review rows open the detail sheet; other types
                    // stay non-tappable to match their current rendering.
                    const isTapeReview = session.session_type === 'self_tape_review';
                    const Wrapper = isTapeReview ? 'button' : 'div';
                    return (
                      <Wrapper
                        key={session.id || i}
                        {...(isTapeReview && {
                          type: 'button',
                          onTouchEnd: (e) => { e.preventDefault(); setSelectedSession(session); },
                          onClick: () => setSelectedSession(session),
                        })}
                        className={`rounded-xl border border-[rgba(10,10,10,0.08)] p-3 sm:p-4 flex items-center gap-3${isTapeReview ? ' w-full text-left' : ''}`}
                        style={{
                          background: 'var(--bg-surface, #1A1A2E)',
                          ...(isTapeReview && { touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }),
                        }}
                      >
                        <span className="text-lg">{typeInfo.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#0A0A0A]">{typeInfo.label}</span>
                            {session.role_played && (
                              <span className="text-[10px] text-[#7A5A18] font-medium">as {session.role_played}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {session.user_mood && (
                              <span className="text-[10px] text-[rgba(10,10,10,0.62)]">{session.user_mood}</span>
                            )}
                            {session.user_rating && (
                              <span className="text-[10px] text-amber-400">
                                {'★'.repeat(session.user_rating)}{'☆'.repeat(5 - session.user_rating)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {date && (
                            <p className="text-[10px] text-[rgba(10,10,10,0.4)]">
                              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          )}
                          {session.duration_seconds > 0 && (
                            <p className="text-[10px] text-[#555]">{Math.round(session.duration_seconds / 60)}m</p>
                          )}
                        </div>
                        <ChevronRight size={14} className="text-[#3A3A3A] flex-shrink-0" />
                      </Wrapper>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <Clock className="w-10 h-10 text-[#3A3A3A] mx-auto mb-3" />
                    <p className="text-sm text-[rgba(10,10,10,0.4)]">No sessions yet.</p>
                    <p className="text-xs text-[#555] mt-1">Your coaching and practice sessions will appear here.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </>
  );
}
