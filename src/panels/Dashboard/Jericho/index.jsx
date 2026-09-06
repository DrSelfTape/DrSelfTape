/**
 * Jericho — Actor Growth Dashboard
 * Shows performance DNA, coaching insights, evolution timeline, and session history.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
import TapeReviewNotes from './TapeReviewNotes';
import TapeReviewShareCard, { TapeReviewShareCardStory } from './TapeReviewShareCard';
import { TECH_SCORES } from './reviewResultFields';
import { useShareImageCapture } from '../../../hooks/useShareImageCapture';
import { saveBlobUrl } from '../../../utils/saveMedia';
import { trackEvent } from '../../../utils/analytics';
import { Share2 } from 'lucide-react';
import axios from '../../../redux/http';
import useHideMobileHeader from '../../../components/Shared/useHideMobileHeader';
import { useTokenBalance } from '../../../hooks/useTokenBalance';
import { goUpgrade } from '../../../utils/goUpgrade';
import { Lock } from 'lucide-react';

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

// Includes current results and the older review shape. Unknown sessions retain
// the labeled fallback; history never reads notes from Redux or localStorage.
const TAPE_REVIEW_KEYS = ['verdict', 'scores', 'performance', 'the_one_thing', 'tone_tags', 'whats_working', 'adjustments', 'performance_dna'];
const TAP_STYLE = { touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' };

// ─── ReviewDetailSheet ─────────────────────────────────────────────────

function ReviewDetailSheet({ session, onClose }) {
  useHideMobileHeader(true);
  const { isPaid, loading: entLoading, error: entError, balance } = useTokenBalance();
  const locked = !entLoading && !entError && balance !== null && !isPaid;
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const shareRef = useRef(null);
  const shareStoryRef = useRef(null);
  const sharingRef = useRef(false);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState(null);
  const { captureImage } = useShareImageCapture({ onError: () => {} });

  useEffect(() => {
    const opener = document.activeElement;
    closeRef.current?.focus();
    return () => { if (opener?.isConnected) opener.focus(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);
    setDetail(null);
    // Fetch the durable session, even when the original analysis job expired.
    // Never fall back to a cached full payload after a downgrade or an error.
    axios.get(`/v1/ai/session-log/${session.id}/`, { signal: controller.signal })
      .then((res) => {
        if (!active) return;
        const payload = res.data;
        const body = payload && Object.hasOwn(payload, 'data') ? payload.data : payload;
        if (payload?.success === false || !body || typeof body !== 'object' || Array.isArray(body) || !Object.hasOwn(body, 'ai_feedback')) {
          setError('Unexpected empty response.');
          return;
        }
        setDetail(body);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.response?.status === 404
          ? 'This review is no longer available.'
          : 'Could not load your review. Please try again.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [session.id, attempt]);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    if (event.key !== 'Tab') return;
    const buttons = [...dialogRef.current.querySelectorAll('button:not(:disabled)')];
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus();
    }
  };

  const handleShare = async (format) => {
    const node = format === 'story' ? shareStoryRef.current : shareRef.current;
    if (sharingRef.current || !node) return;
    sharingRef.current = true;
    setSharing(true);
    setShareError(null);
    trackEvent('tape_review_share_tap', { format, source: 'history' });
    let url = null;
    try {
      url = await captureImage(node, { width: 1080, height: format === 'story' ? 1920 : 1080, scale: 1 });
      const result = await saveBlobUrl(url, format === 'story' ? 'my-tape-review-story.png' : 'my-tape-review.png');
      if (!result?.ok) setShareError('Could not save your card. Please try again.');
    } catch {
      setShareError('Could not save your card. Please try again.');
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url), 3000);
      sharingRef.current = false;
      setSharing(false);
    }
  };

  const feedback = detail?.ai_feedback;
  const isObject = feedback && typeof feedback === 'object' && !Array.isArray(feedback);
  const hasTapeKeys = isObject && TAPE_REVIEW_KEYS.some((key) => {
    const value = feedback[key];
    return typeof value === 'string' ? value.trim().length > 0
      : value && typeof value === 'object' && Object.keys(value).length > 0;
  });
  const legacyFields = isObject ? Object.entries(feedback).filter(([key]) => !key.startsWith('_')) : [];
  // The server owns the deep-read trim. Scores alone still need the legacy
  // display guard until REVIEW_GATE_STRIP_SCORES flips. Wait for entitlement
  // before showing that map; preserve the existing fail-open error policy.
  const hideScores = entLoading || locked || (!entError && balance === null);
  const notes = hasTapeKeys && hideScores ? { ...feedback, scores: undefined } : feedback;
  const tags = Array.isArray(feedback?.tone_tags) ? feedback.tone_tags : [];
  const values = TECH_SCORES.map(({ key }) => feedback?.scores?.[key])
    .filter((v) => v != null && v !== '').map(Number).filter(Number.isFinite);
  const headline = feedback?.headline_score;
  const avg = headline != null && headline !== '' && Number.isFinite(Number(headline))
    ? Number(headline) : values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const band = avg == null ? null : avg >= 8
    ? { label: 'Book It', color: '#22c55e' }
    : avg >= 5.5 ? { label: 'Callback Range', color: '#D4A85F' } : { label: 'Keep Taping', color: '#FF8280' };
  const retry = () => setAttempt((n) => n + 1);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-review-title"
      onKeyDown={handleKeyDown}
      className="fixed inset-0 flex flex-col overflow-y-auto"
      style={{ zIndex: 110, background: 'var(--aurora-bg)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div
        className="flex items-center justify-between px-4 py-4 border-b border-[rgba(10,10,10,0.08)] sticky top-0 z-10"
        style={{ background: 'var(--aurora-bg)', paddingTop: 'max(16px, env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex items-center gap-2">
          <Film size={16} className="text-[#7A5A18]" />
          <h2 id="history-review-title" className="text-base font-bold text-[#0A0A0A]">Tape Review</h2>
          {session.created_at && (
            <span className="text-xs text-[rgba(10,10,10,0.4)]">
              {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>
        <button
          ref={closeRef}
          type="button"
          onTouchEnd={(e) => { e.preventDefault(); onClose(); }}
          onClick={onClose}
          className="w-11 h-11 rounded-full flex items-center justify-center border border-[rgba(10,10,10,0.14)] text-[rgba(10,10,10,0.62)]"
          style={TAP_STYLE}
          aria-label="Close review"
        ><X size={16} /></button>
      </div>
      <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        {loading && (
          <div role="status" className="flex items-center justify-center gap-3 py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#7A5A18]" />
            <span className="text-sm">Loading your review…</span>
          </div>
        )}
        {error && (
          <div className="text-center py-20">
            <p role="alert" className="text-sm text-[rgba(10,10,10,0.62)] mb-4">{error}</p>
            <button type="button" onClick={retry} onTouchEnd={(e) => { e.preventDefault(); retry(); }}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#0A0A0A]"
              style={{ ...TAP_STYLE, background: 'linear-gradient(135deg, #D4A85F, #7A5A18)' }}>Try again</button>
          </div>
        )}
        {detail && !loading && !error && (
          <div className="space-y-4 sm:space-y-5">
            {band && <p className="text-sm font-bold text-[#7A5A18]">{band.label} · {avg.toFixed(1)}/10</p>}
            {hasTapeKeys ? (
              <>
                <TapeReviewNotes review={notes} />
                {/* Old tone-only responses have no verdict card to host chips. */}
                {!feedback.verdict && tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">{tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-full text-xs bg-[#D4A85F]/10 text-[#7A5A18]">{tag}</span>
                  ))}</div>
                )}
                {locked && (
                  <button type="button"
                    onClick={() => goUpgrade({ source: 'history_full_read', returnTo: 'jericho' })}
                    onTouchEnd={(e) => { e.preventDefault(); e.currentTarget.click(); }}
                    className="w-full text-left rounded-2xl p-4 border border-[#D4A85F]/35"
                    style={{ ...TAP_STYLE, background: 'rgba(212,168,95,0.08)' }}>
                    <span className="flex items-center gap-2 text-sm font-bold text-[#0A0A0A]">
                      <Lock size={14} className="text-[#7A5A18]" />Unlock the full read with any plan
                    </span>
                  </button>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4" style={{ background: 'var(--bg-surface, #1A1A2E)' }}>
                <h3 className="text-xs font-bold text-[rgba(10,10,10,0.4)] uppercase tracking-wide mb-4">Session Notes</h3>
                {legacyFields.length > 0
                  ? legacyFields.map(([key, value]) => (
                    <div key={key} className="mb-3">
                      <p className="text-xs font-bold text-[#7A5A18]">{key.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-[rgba(10,10,10,0.62)]">{typeof value === 'string' ? value : JSON.stringify(value)}</p>
                    </div>
                  ))
                  : <p className="text-sm text-[rgba(10,10,10,0.4)]">{typeof feedback === 'string' && feedback ? feedback : 'No notes stored for this session.'}</p>}
              </div>
            )}
            {(feedback?.verdict || tags.length > 0) && (
              <>
                <div className="flex gap-2">
                  {['story', 'square'].map((format) => (
                    <button key={format} type="button" disabled={sharing}
                      onClick={() => handleShare(format)}
                      onTouchEnd={(e) => { e.preventDefault(); handleShare(format); }}
                      className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-[#7A5A18] border border-[#D4A85F]/40 disabled:opacity-60"
                      style={TAP_STYLE}>
                      <Share2 size={15} className="inline mr-2" />
                      {sharing ? 'Preparing your card…' : format === 'story' ? 'Share to Story' : 'Square post'}
                    </button>
                  ))}
                </div>
                {shareError && <p role="alert" className="text-sm text-[#b91c1c]">{shareError}</p>}
                <TapeReviewShareCard ref={shareRef} verdict={feedback.verdict} tags={tags} band={band} avg={avg} />
                <TapeReviewShareCardStory ref={shareStoryRef} verdict={feedback.verdict} tags={tags} band={band} avg={avg} />
              </>
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
    evolution,
    recentSessions, sessionsLoading,
  } = useSelector((s) => s.jericho);

  // Deep-link support: the desktop sidebar's "Tape Review" links to
  // /dashboard/jericho?tab=tape so it opens straight on the Tape tab. Valid
  // tabs: overview | tape | insights | history. (In the mobile shell there's
  // no query string, so this no-ops to the overview default.)
  const [searchParams] = useSearchParams();
  const deepTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(deepTab || 'overview');
  const navigate = useNavigate();
  // Web port of the forced first review (mobile does this via MobileApp):
  // a user who has never had a Tape Review gets the firstReview flow (free
  // review + post-result paywall) on the tape tab. Captured ONCE per mount —
  // completing the review marks tutorial_progress.first_review, and a live
  // prop would flip mid-flow and hide the paywall while the result is up.
  const settingsLoaded = useSelector((s) => !!s.userSettings?.loaded);
  const firstReviewDone = useSelector((s) => !!s.userSettings?.data?.tutorial_progress?.first_review);
  const [webFirstReview, setWebFirstReview] = useState(null); // null = undecided
  useEffect(() => {
    if (webFirstReview === null && settingsLoaded) setWebFirstReview(!firstReviewDone);
  }, [webFirstReview, settingsLoaded, firstReviewDone]);
  const [showStylePicker, setShowStylePicker] = useState(false);
  // Detail sheet — null when closed, or the session object to show.
  const [selectedSession, setSelectedSession] = useState(null);
  // Lets a brand-new actor (no sessions yet) jump straight into Tape Review
  // instead of being held on the empty state — also true when deep-linked to
  // the Tape tab, which works without any prior sessions.
  const [entered, setEntered] = useState(deepTab === 'tape');

  // The growth-dashboard data (memory, insights, evolution, sessions) is four
  // requests that NONE of the Tape Review tab needs. When an actor deep-links
  // straight to Tape Review — the most common path — defer them until they
  // actually open a data tab, then fetch once.
  const growthFetchedRef = useRef(false);
  const loadGrowthData = useCallback(() => {
    if (growthFetchedRef.current) return;
    growthFetchedRef.current = true;
    dispatch(fetchActorMemory());
    dispatch(fetchInsights());
    dispatch(fetchEvolution());
    dispatch(fetchRecentSessions(10));
  }, [dispatch]);

  useEffect(() => {
    if (activeTab !== 'tape') loadGrowthData();
  }, [activeTab, loadGrowthData]);

  // The Tape Review tab needs NO growth data. Since that fetch is now deferred
  // while on 'tape', don't block the tab on memory loading/error — a ?tab=tape
  // deep link would otherwise hang on the skeleton forever (memory never fetched).
  const loading = activeTab !== 'tape' && (!memoryHasFetched || (memoryLoading && !memory));
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

  // ── Fetch failed — surface a retry so users don't think the screen is broken.
  //    Not on the Tape tab, which doesn't need memory at all. ──
  if (memoryError && !memory && activeTab !== 'tape') {
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
            Your self-evolving AI acting coach. Jericho learns your strengths,
            patterns, and growth areas from every session to give you increasingly
            personalized coaching.
          </p>
          <p className="text-[rgba(10,10,10,0.4)] text-xs mb-8">
            Start a coaching session or scene study to begin building your actor profile.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => { setActiveTab('tape'); setEntered(true); }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#0A0A0A] transition-all hover:shadow-lg dst-press"
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
          key={selectedSession.id}
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
                ? `${totalSessions} session${totalSessions !== 1 ? 's' : ''} analyzed · always evolving`
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
            {activeTab === 'tape' && (
              <TapeReview
                firstReview={webFirstReview === true}
                onUpgrade={() => { setWebFirstReview(false); navigate('/dashboard/membership'); }}
                onExitFirstReview={() => { setWebFirstReview(false); navigate('/dashboard'); }}
              />
            )}

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
