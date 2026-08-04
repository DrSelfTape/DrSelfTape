/**
 * Jericho — Tape Review
 * Submit an existing self-tape; Jericho returns structured acting notes
 * (verdict, what's working, prioritized adjustments, scores + Performance DNA),
 * grounded in the in-house coaching doctrine. Powered by /ai/jericho/tape-review/.
 */
import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTokenBalance } from '../../../hooks/useTokenBalance';
import {
  Upload, Loader2, Film, CheckCircle2, Target, Sparkles, Bell, X, Lock,
  RotateCcw, ChevronDown, Eye, Frame, Lightbulb, Flame, Activity, Theater, Trophy, HelpCircle,
} from 'lucide-react';
import { reviewTape, clearTapeReview, resumeAnalysisJob, clearCompare } from '../../../redux/features/jericho/jerichoSlice';
import CompareTakes from './CompareTakes';
import TapeAnalyzerTutorial, { TAPE_TUTORIAL_KEY } from './TapeAnalyzerTutorial';
import useAIGate from '../../../components/AIConsent/useAIGate';
import { trackEvent, Events } from '../../../utils/analytics';
import { goUpgrade } from '../../../utils/goUpgrade';
import { tapSelect, cheer, warn } from '../../../utils/haptics';
import { useShareImageCapture } from '../../../hooks/useShareImageCapture';
import { saveBlobUrl } from '../../../utils/saveMedia';
import TapeReviewShareCard, { TapeReviewShareCardStory } from './TapeReviewShareCard';
import { recordAndDiffBests, appendScoreHistory, getScoreHistory } from '../../../utils/personalRecords';
import { Share2 } from 'lucide-react';
import { markStep } from '../../../components/Dashboard/TutorialChecklist';
import { PRACTICE_SCENE_TITLE, PRACTICE_SCENE_CONTENT } from '../../../data/practiceScene';
import CameraPresell from '../../../components/Shared/CameraPresell';
import { needsCameraPresell, markCameraPresellSeen } from '../../../components/Shared/cameraPresellGate';
import { Capacitor } from '@capacitor/core';
import { usePushNotifications, isCapacitorNative, openNotificationSettings } from '../../../hooks/usePushNotifications';

const SURFACE = { background: 'var(--bg-surface, #1A1A2E)' };
const MAX_TAPE_MB = 500; // matches the advertised cap; reject before a doomed upload

// Matches the key and TTL used in jerichoSlice's persistence helpers.
const PENDING_JOB_KEY = 'dst_pending_analysis';
const PENDING_JOB_TTL_MS = 30 * 60 * 1000; // 30 minutes

/* Free-first-review paywall — shown right under the result of a new user's one
 * free Tape Review, while the value is still on screen (Day-0 converts best). */
function FirstReviewPaywall({ onUpgrade }) {
  useEffect(() => { trackEvent(Events.FIRST_REVIEW_PAYWALL_SHOWN); }, []);
  return (
    <div className="rounded-2xl border border-[#D4A85F]/30 p-5 text-center tr-reveal" style={{ '--tr-i': 7, background: 'linear-gradient(135deg, rgba(212,168,95,0.12), rgba(122,90,24,0.05))' }}>
      <h3 className="text-base font-bold text-[#0A0A0A] leading-snug">You got the headline. There&apos;s a full casting read behind it.</h3>
      <p className="text-sm text-[rgba(10,10,10,0.6)] mt-1.5 leading-relaxed">
        Unlock the rest on every tape: the full craft breakdown, every adjustment, your technical scorecard, and your Performance DNA. Any plan.
      </p>
      <button
        onClick={onUpgrade}
        className="w-full mt-4 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#0A0A0A] transition-all hover:shadow-lg dst-press"
        style={{ background: 'linear-gradient(135deg, #D4A85F, #7A5A18)' }}
      >
        <Sparkles size={15} /> Unlock my full read
      </button>
    </div>
  );
}

/* Full-read gate for free users outside the first-review flow — the deep casting
 * read (craft breakdown, scores, Performance DNA) is a Premium unlock, shown in
 * its place while the value is still fresh on screen. */
function FullReadLocked({ onUpgrade, hidden }) {
  useEffect(() => { trackEvent('fullread_locked_shown'); }, []);
  // Personalize the pitch with what THIS tape actually generated, so the reason
  // to upgrade is concrete ("3 more adjustments · your technical scorecard · …")
  // rather than a fixed benefits paragraph. Free shows 1 adjustment, so the
  // remainder is what's hidden.
  const extra = Math.max(0, (hidden?.nAdjustments || 0) - 1);
  const bits = [
    extra > 0 && `${extra} more adjustment${extra > 1 ? 's' : ''}`,
    hidden?.hasPerformance && 'the full craft read',
    hidden?.hasScores && 'your technical scorecard',
    hidden?.hasDna && 'your Performance DNA',
  ].filter(Boolean);
  return (
    <div className="rounded-2xl border border-[#D4A85F]/30 p-5 tr-reveal" style={{ '--tr-i': 7, background: 'linear-gradient(135deg, rgba(212,168,95,0.10), rgba(122,90,24,0.04))' }}>
      <div className="flex items-center gap-2">
        <Lock size={15} className="text-[#7A5A18]" />
        <h3 className="text-sm font-bold text-[#0A0A0A]">Your full casting read is ready</h3>
      </div>
      <p className="text-sm text-[rgba(10,10,10,0.62)] mt-1.5 leading-relaxed">
        {bits.length > 0
          ? `You've got the headline. This tape also has ${bits.join(' · ')}. Unlock it on every tape. Any plan.`
          : "You've got the headline. Unlock the full craft breakdown, every adjustment, your technical scorecard, and your Performance DNA, on every tape. Any plan."}
      </p>
      <div className="mt-3 space-y-2" style={{ filter: 'blur(5px)', opacity: 0.5, pointerEvents: 'none' }} aria-hidden="true">
        {['Framing', 'Eyeline', 'Listening', 'Emotional arc'].map((l) => (
          <div key={l} className="flex items-center gap-2">
            <span className="text-[11px] text-[rgba(10,10,10,0.5)]" style={{ width: 90 }}>{l}</span>
            <div className="flex-1 h-1.5 rounded-full bg-[#D4A85F]/20"><div className="h-1.5 rounded-full bg-[#D4A85F]" style={{ width: '72%' }} /></div>
          </div>
        ))}
      </div>
      <button
        onClick={() => { trackEvent('fullread_locked_tap'); onUpgrade?.(); }}
        className="w-full mt-4 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#0A0A0A] transition-all hover:shadow-lg dst-press"
        style={{ background: 'linear-gradient(135deg, #D4A85F, #7A5A18)' }}
      >
        <Sparkles size={15} /> Unlock the full read
      </button>
    </div>
  );
}

/* Actor-native grade bands for the gauge hero — the headline read of the
 * whole tape in the language of the room, not a school grade. */
function gradeBand(avg) {
  if (avg >= 8) return { label: 'Book It', color: '#22c55e' };
  if (avg >= 5.5) return { label: 'Callback Range', color: '#D4A85F' };
  return { label: 'Keep Taping', color: '#FF8280' };
}

/* Staged-reveal hero: animated semicircle gauge + the band verdict, addressed
 * by first name. The arc sweep (800ms, strong ease-out) is the moment; the
 * number and band land on staggered delays behind it. Reduced motion gets the
 * final state without the sweep. */
function GaugeHero({ avg, firstName }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const band = gradeBand(avg);
  const R = 62;
  const C = Math.PI * R;
  const frac = Math.max(0, Math.min(1, avg / 10));
  const landed = (delay) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(6px)',
    transition: `opacity 300ms ease-out ${delay}ms, transform 300ms cubic-bezier(0.23,1,0.32,1) ${delay}ms`,
  });
  return (
    <div className="rounded-2xl border border-[#D4A85F]/25 p-5 text-center tr-reveal" style={{ '--tr-i': 0, background: 'linear-gradient(135deg, rgba(212,168,95,0.10), rgba(122,90,24,0.04))' }}>
      <p className="text-xs font-medium text-[rgba(10,10,10,0.5)]">
        {firstName ? `The verdict on your take, ${firstName}` : 'The verdict on your take'}
      </p>
      <div style={{ position: 'relative', width: 172, height: 96, margin: '10px auto 0' }}>
        <svg width="172" height="96" viewBox="0 0 172 96">
          <path d="M 24 90 A 62 62 0 0 1 148 90" fill="none" stroke="rgba(10,10,10,0.08)" strokeWidth="10" strokeLinecap="round" />
          <path
            d="M 24 90 A 62 62 0 0 1 148 90" fill="none" stroke={band.color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={mounted ? C * (1 - frac) : C}
            className="dst-gauge-arc"
          />
        </svg>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, ...landed(350) }}>
          <span className="text-3xl font-bold text-[#0A0A0A]">{avg.toFixed(1)}</span>
          <span className="text-xs text-[rgba(10,10,10,0.4)]"> /10</span>
        </div>
      </div>
      <p className="text-base font-bold mt-1" style={{ color: band.color, ...landed(550) }}>
        {band.label}
      </p>
      <style>{`.dst-gauge-arc{transition:stroke-dashoffset 800ms cubic-bezier(0.23,1,0.32,1) 150ms;}@media (prefers-reduced-motion: reduce){.dst-gauge-arc{transition:none;}}`}</style>
    </div>
  );
}

const NOTIF_NUDGE_KEY = 'dst_notif_nudge_dismissed';

/* Denied-state recovery — once a user has denied push, iOS never re-prompts,
 * so after a completed review (the moment notifications have obvious value)
 * we offer the only road back: the app's page in Settings. Dismissible and
 * remembered per device. */
function NotificationsNudge() {
  const { permission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(NOTIF_NUDGE_KEY) === '1'; } catch { return false; }
  });
  // iOS-only: `app-settings:` is an iOS URL scheme — on Android the Open
  // Settings tap would silently no-op (codex review catch), and the Android
  // build ships without push anyway.
  if (!isCapacitorNative() || Capacitor.getPlatform() !== 'ios' || permission !== 'denied' || dismissed) return null;
  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(NOTIF_NUDGE_KEY, '1'); } catch { /* private mode */ }
  };
  return (
    <div className="rounded-2xl border border-[#D4A85F]/25 p-4 flex items-start gap-3" style={{ background: 'rgba(212,168,95,0.06)' }}>
      <Bell size={16} className="text-[#7A5A18] flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#0A0A0A] font-medium leading-snug">
          Turn on notifications to get your notes the moment they&apos;re ready.
        </p>
        <button
          type="button"
          onClick={openNotificationSettings}
          onTouchEnd={(e) => { e.preventDefault(); openNotificationSettings(); }}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          className="text-xs font-bold text-[#7A5A18] underline mt-1.5"
        >
          Open Settings
        </button>
      </div>
      <button
        type="button"
        onClick={dismiss}
        onTouchEnd={(e) => { e.preventDefault(); dismiss(); }}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        aria-label="Dismiss"
        className="flex-shrink-0 text-[rgba(10,10,10,0.35)]"
      >
        <X size={14} />
      </button>
    </div>
  );
}

const TECH_SCORES = [
  { key: 'framing', label: 'Framing', icon: Frame },
  { key: 'eyeline', label: 'Eyeline', icon: Eye },
  { key: 'lighting', label: 'Lighting', icon: Lightbulb },
  { key: 'energy_commitment', label: 'Energy & Commitment', icon: Flame },
  { key: 'dynamic_range', label: 'Dynamic Range', icon: Activity },
];

const DNA = [
  { key: 'emotional_range', label: 'Emotional Range', color: '#D4A85F' },
  { key: 'cold_read', label: 'Cold Read', color: '#3b82f6' },
  { key: 'comedy_timing', label: 'Comedy Timing', color: '#FCE072' },
  { key: 'dramatic_depth', label: 'Dramatic Depth', color: '#ef4444' },
  { key: 'physicality', label: 'Physicality', color: '#22c55e' },
  { key: 'vocal_variety', label: 'Vocal Variety', color: '#A7ECDA' },
];

const PERF_FIELDS = [
  { key: 'emotional_arc', label: 'Emotional arc' },
  { key: 'strongest_beat', label: 'Strongest beat' },
  { key: 'choices', label: 'The choice' },
  { key: 'listening_presence', label: 'Listening & presence' },
  { key: 'truth_vs_indicated', label: 'Truth vs. indicated' },
];

// Verdict chip for a rubric row — the score in the language of the room.
function scoreChip(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n >= 8) return { text: 'Casting-ready', color: '#15803d', bg: 'rgba(34,197,94,0.12)' };
  if (n >= 6) return { text: 'Solid', color: '#7A5A18', bg: 'rgba(212,168,95,0.14)' };
  return { text: 'Needs work', color: '#b91c1c', bg: 'rgba(255,130,128,0.14)' };
}

function ScoreBar({ label, value, color = '#D4A85F', chip = null }) {
  const v = Math.max(0, Math.min(10, Number(value) || 0));
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[rgba(10,10,10,0.62)] flex-1 truncate">{label}</span>
      {chip && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ color: chip.color, background: chip.bg }}>
          {chip.text}
        </span>
      )}
      <div className="w-28 h-2 rounded-full bg-[#F4F4EE] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${v * 10}%`, background: color }} />
      </div>
      <span className="text-xs font-bold text-[#0A0A0A] w-5 text-right">{v}</span>
    </div>
  );
}

export default function TapeReview({ firstReview = false, onUpgrade, onExitFirstReview }) {
  // Apple 5.1.1(i) — the analyzer pipes video frames + audio through Claude /
  // Whisper. Gate here too: on mobile this screen mounts standalone (not inside
  // the Jericho panel that already gates), so without this the consent prompt
  // would be skipped and the API would hard-403.
  useAIGate();
  const dispatch = useDispatch();
  const { tapeReviewLoading, tapeReviewResult, tapeReviewError, uploadProgress, compareLoading, compareResult } = useSelector((s) => s.jericho);
  // Full-read gate: Premium (unlimited) sees the complete casting read; free
  // users see the headline + an unlock CTA. onUpgrade is passed in the
  // first-review flow; elsewhere fall back to the global panel-nav event.
  const { isPaid, loading: entitlementLoading, error: entitlementError, balance: tokenBalance } = useTokenBalance();
  const handleUpgrade = () => {
    if (onUpgrade) { onUpgrade(); return; }
    goUpgrade({ source: 'tape_full_read', returnTo: 'jericho' });
  };
  const tutorialProgress = useSelector((s) => s.userSettings?.data?.tutorial_progress || {});
  // Kind of the pending notes-ready cue ('review' | 'compare' | false). Read
  // in the mode initializer below so a compare finished on another tab
  // reopens IN compare mode — the parent clears the flag in an effect, which
  // runs after this render (codex review catch).
  const notesReadyKind = useSelector((s) => s.jericho?.notesReady);

  // 'single' | 'compare'. The Home "Compare Takes" card and the More-grid
  // tile deep-link here via the dst_compare_takes sessionStorage flag (same
  // handoff shape as dst_first_review) — consumed once on mount. Never during
  // the free first review: Compare costs tokens and would wall a Day-0 user
  // mid-activation, bypassing the free-review paywall.
  const [mode, setMode] = useState(() => {
    let wantsCompare = false;
    try {
      wantsCompare = window.sessionStorage.getItem('dst_compare_takes') === '1';
      if (wantsCompare) window.sessionStorage.removeItem('dst_compare_takes');
    } catch { /* private mode — just skip */ }
    if (notesReadyKind === 'compare' && !firstReview) return 'compare';
    return wantsCompare && !firstReview ? 'compare' : 'single';
  });
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  // Next Take Mission: carry the original tape + a casting note into Compare Takes
  // so the actor re-records against the note and sees if the new take improved.
  const [compareSeed, setCompareSeed] = useState(null);
  const startNextTakeMission = (note) => {
    // Clear any stale comparison so Compare Takes opens on the seeded upload form,
    // not a previous ranked result.
    dispatch(clearCompare());
    setCompareSeed({ file, note });
    trackEvent('next_take_mission_start', { seeded: !!file });
    setMode('compare');
  };
  // Which onboarding offer card was chosen (AuroraOnboarding sets it just
  // before the handoff). 'record' = "record our practice scene": show the
  // bundled sides in-screen and promote the record CTA to primary. Read once
  // at mount — the flag outlives remounts (same rationale as dst_first_review).
  const [practiceVariant] = useState(() => {
    try { return firstReview && window.sessionStorage.getItem('dst_first_review_variant') === 'record'; } catch { return false; }
  });
  // Mutable: uploading an OWN tape via the generic picker exits the practice
  // framing (card + prefill), otherwise an unrelated take would be graded
  // against the bundled Morgan sides. Recording via the card keeps it.
  const [practiceActive, setPracticeActive] = useState(practiceVariant);
  const [role, setRole] = useState(practiceVariant ? 'Morgan' : '');
  const [tone, setTone] = useState('');
  const [sides, setSides] = useState(practiceVariant ? PRACTICE_SCENE_CONTENT : '');
  const [showOptional, setShowOptional] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  // Staged reveal of the result: 0 = gauge + quick read, 1 = + what's working,
  // 2 = + the fix (adjustments/one thing/mission), 3 = everything (scores,
  // share, paywall, actions). Progressive disclosure makes the notes land as
  // a moment instead of a wall; "Show everything" skips for repeat readers.
  const [revealStage, setRevealStage] = useState(0);
  const firstName = useSelector((s) => s.profile?.profile?.first_name || '');
  const inputRef = useRef(null);
  const recordInputRef = useRef(null); // capture="user" input for the no-tape record path
  // First-ever record attempt on native: pre-sell the camera/mic OS prompts
  // before capture="user" fires them (a denial here is unrecoverable in-app).
  const [showCamPresell, setShowCamPresell] = useState(false);
  const startRecord = () => {
    if (needsCameraPresell()) { setShowCamPresell(true); return; }
    recordInputRef.current?.click();
  };

  // Share card — render an actor's result as a branded image for social. Free
  // distribution: an actor posting their casting-grade read is our UGC engine.
  const shareRef = useRef(null);
  const shareStoryRef = useRef(null);
  // Personal-records diff runs once per result (ref-guarded — render-time
  // compute keeps it beside the derived scores it needs).
  const recordsRef = useRef({ key: null, records: [] });
  const [sharing, setSharing] = useState(false);
  const { captureImage } = useShareImageCapture({ onError: () => {} });
  // 'story' (1080×1920, IG/TikTok — the primary destination) or 'square'.
  const handleShare = async (format = 'story') => {
    const isStory = format === 'story';
    const node = isStory ? shareStoryRef.current : shareRef.current;
    if (sharing || !node) return;
    setSharing(true);
    tapSelect();
    trackEvent('tape_review_share_tap', { format });
    let url = null;
    try {
      url = await captureImage(node, { width: 1080, height: isStory ? 1920 : 1080, scale: 1 });
      const res = await saveBlobUrl(url, isStory ? 'my-tape-review-story.png' : 'my-tape-review.png');
      if (res?.ok) cheer(); else warn();
    } catch { warn(); } finally {
      if (url) setTimeout(() => { try { URL.revokeObjectURL(url); } catch { /* noop */ } }, 3000);
      setSharing(false);
    }
  };
  // F2: one stable idempotency key per analysis action. Generated on submit,
  // reused if the user re-submits the SAME tape after a lost response (so the
  // BE dedupes instead of double-charging), cleared when the action resets or a
  // new file is chosen.
  const idemKeyRef = useRef(null);
  const uploadShownRef = useRef(false); // fire first_review_upload_shown once
  const notesViewedRef = useRef(false); // fire first_review_notes_viewed once

  // Staged analysis progress (Tier 2 item 3): once the R2 upload completes,
  // the multi-minute wait is split into two honest, time-based stages —
  // "watching" (frames + audio pass) then "writing" (the notes come together).
  // No fake percentages; the stage flip just keeps the screen visibly alive.
  const [analysisStage, setAnalysisStage] = useState('watching');
  const analysisUploading = tapeReviewLoading && uploadProgress < 100;
  useEffect(() => {
    if (!tapeReviewLoading) { setAnalysisStage('watching'); return; }
    if (analysisUploading) return; // stage clock starts when the upload lands
    const t = setTimeout(() => setAnalysisStage('writing'), 45000);
    return () => clearTimeout(t);
  }, [tapeReviewLoading, analysisUploading]);

  // First time an actor opens the analyzer → show the walkthrough. Suppressed
  // during the free first review (it would stack on the fresh offer handoff);
  // that user gets it AFTER their first result instead — see below.
  useEffect(() => {
    if (firstReview) return;
    try {
      if (!localStorage.getItem(TAPE_TUTORIAL_KEY)) setShowTutorial(true);
    } catch { /* private mode — just skip */ }
  }, [firstReview]);

  // The activation aha — fire COMPLETED once when the free first review lands.
  // MUST stay above the early returns below (compare / loading / result): a
  // hook placed AFTER a conditional return crashes the whole tree with
  // "Rendered fewer hooks than expected" the moment the branch flips — which
  // is exactly what happened when tapping "Compare takes" (mode → 'compare'
  // hit the early return and skipped this effect).
  useEffect(() => {
    if (!tapeReviewResult) return;
    // Read the server-synced flag BEFORE markStep sets it, so we can tell a
    // repeat review (the activation-metric "came back for another") from the
    // very first one.
    const alreadyReviewed = !!tutorialProgress.first_review;
    // Any completed review claims the "first AI Tape Review" step — this is
    // the server-synced flag that retires the Home free-review offer + the
    // Get Started checklist entry (markStep no-ops once set).
    markStep('first_review');
    if (firstReview) {
      trackEvent(Events.FIRST_REVIEW_COMPLETED);
      // The pre-upload tutorial was suppressed for this flow — surface it now
      // as the "how to read your notes" walkthrough, with the result behind it.
      try {
        if (!localStorage.getItem(TAPE_TUTORIAL_KEY)) setShowTutorial(true);
      } catch { /* private mode — just skip */ }
    } else if (alreadyReviewed) {
      // A returning actor finished another review — the repeat half of ACTIVE.
      trackEvent(Events.REPEAT_REVIEW_COMPLETED);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstReview, tapeReviewResult]);

  // Upload-screen reached: the free-review offer was accepted and the actor
  // landed on the upload step. Fires once; the gap to FIRST_REVIEW_STARTED is
  // the no-tape "upload dead-end" — the biggest suspected activation leak.
  useEffect(() => {
    if (firstReview && !uploadShownRef.current) {
      uploadShownRef.current = true;
      trackEvent(Events.FIRST_REVIEW_UPLOAD_SHOWN);
    }
  }, [firstReview]);

  // Notes actually SEEN, not just "analysis completed": the multi-minute job
  // can finish while the app is backgrounded, so gate on visibility and fall
  // through to the next foreground. This is the real "reached the aha payoff".
  useEffect(() => {
    if (!tapeReviewResult || notesViewedRef.current) return;
    const fire = () => {
      if (document.visibilityState !== 'visible' || notesViewedRef.current) return;
      notesViewedRef.current = true;
      trackEvent(Events.FIRST_REVIEW_NOTES_VIEWED, { first_review: !!firstReview });
      document.removeEventListener('visibilitychange', fire);
    };
    if (document.visibilityState === 'visible') fire();
    else document.addEventListener('visibilitychange', fire);
    return () => document.removeEventListener('visibilitychange', fire);
  }, [tapeReviewResult, firstReview]);

  // Success haptic the moment notes land — the app's payoff should feel native.
  const cheeredRef = useRef(false);
  useEffect(() => {
    if (tapeReviewResult && !cheeredRef.current) { cheeredRef.current = true; cheer(); }
    if (!tapeReviewResult) cheeredRef.current = false;
  }, [tapeReviewResult]);

  // Resume a job that was actively polling when the user reloaded the page or
  // restarted the app. Runs once on mount; the guard prevents a double-dispatch
  // if Redux already carries an in-flight or completed result from the current
  // session (e.g. the user navigated away and back without reloading).
  useEffect(() => {
    if (tapeReviewLoading || tapeReviewResult || compareLoading || compareResult) return;
    let slot = null;
    try { slot = JSON.parse(localStorage.getItem(PENDING_JOB_KEY)); } catch { return; }
    if (!slot?.jobId || !slot?.startedAt) return;
    if (Date.now() - slot.startedAt > PENDING_JOB_TTL_MS) {
      // Slot is older than 30 minutes — the job almost certainly expired on the
      // BE. Clear silently; no point polling a dead job.
      try { localStorage.removeItem(PENDING_JOB_KEY); } catch { /* private mode */ }
      return;
    }
    dispatch(resumeAnalysisJob({ jobId: slot.jobId, kind: slot.kind || 'review' }));
  // Mount-only: reads Redux snapshot at mount to guard against double-dispatch.
  // Adding these as deps would re-trigger the effect on every state change,
  // which is the opposite of what we want — run once, check once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fix: the mode initializer reads notesReadyKind synchronously at mount, but
  // a resumed job sets notesReady only after the poll resolves (post-mount).
  // Sync mode BOTH ways so a resumed result always lands in the mode that can
  // show it: compare results flip to compare, and a resumed REVIEW flips back
  // to single even when the user arrived via the compare deep-link (the
  // final-review FIX-SOON — otherwise a paid review sat invisible behind
  // compare mode). notesReady is Redux-only and false at mount, so these fire
  // exactly when a job resolves, never fighting the deep-link initializer.
  useEffect(() => {
    if (notesReadyKind === 'compare' && !firstReview) setMode('compare');
    else if (notesReadyKind === 'review' && !firstReview) setMode('single');
  }, [notesReadyKind, firstReview]);

  // A plain element (not an inline component) so re-renders reconcile it in
  // place — otherwise the tutorial overlay would remount + replay its
  // animation on every keystroke. Renders in both modes.
  const modeToggle = (
    <>
      {showTutorial && <TapeAnalyzerTutorial onClose={() => setShowTutorial(false)} />}
      <div className="flex items-center gap-1.5 mb-4">
        <div className="flex gap-1.5 p-1 rounded-xl bg-[#F4F4EE] flex-1">
          <button
            onClick={() => setMode('single')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${mode === 'single' ? 'bg-white text-[#0A0A0A] shadow-sm' : 'text-[rgba(10,10,10,0.5)]'}`}
          >
            <Sparkles size={13} /> Review a take
          </button>
          {/* Compare Takes costs 1 token/take and would wall a Day-0 free user
              mid-activation, bypassing the free-review paywall — hide it while
              the free first review is in flight. */}
          {!firstReview && (
            <button
              onClick={() => setMode('compare')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${mode === 'compare' ? 'bg-white text-[#0A0A0A] shadow-sm' : 'text-[rgba(10,10,10,0.5)]'}`}
            >
              <Trophy size={13} /> Compare takes
            </button>
          )}
        </div>
        <button
          onClick={() => setShowTutorial(true)}
          aria-label="How the analyzer works"
          className="w-9 h-9 rounded-xl bg-[#F4F4EE] flex items-center justify-center text-[#7A5A18] flex-shrink-0 hover:bg-[#D4A85F]/15 transition-colors"
        >
          <HelpCircle size={17} />
        </button>
      </div>
    </>
  );

  // Compare mode owns its own screen (upload / loading / ranked result).
  if (mode === 'compare') {
    return (
      <div>
        {modeToggle}
        <CompareTakes seed={compareSeed} />
      </div>
    );
  }

  const onPick = (e) => {
    const f = e.target.files?.[0];
    // Clear the input value so re-selecting the SAME file still fires onChange
    // (iOS/Safari dedupes an identical pick otherwise — the retry looks dead).
    e.target.value = '';
    if (!f) return;
    if (f.type && !f.type.startsWith('video/')) {
      warn();
      setFileError("That doesn't look like a video. Upload an mp4, mov, or webm.");
      return;
    }
    if (f.size > MAX_TAPE_MB * 1024 * 1024) {
      warn();
      setFileError(`That tape is ${(f.size / 1048576).toFixed(0)}MB. Keep it under ${MAX_TAPE_MB}MB (a single-scene take exports small).`);
      return;
    }
    setFileError('');
    // Own tape via the generic picker: drop the practice-scene framing so the
    // bundled sides never grade an unrelated take. Card-recorded takes
    // (recordInputRef) keep the prefill.
    if (practiceActive && e.target === inputRef.current) {
      setPracticeActive(false); setRole(''); setSides('');
    }
    tapSelect();
    idemKeyRef.current = null; setFile(f); // new file = new action
  };

  const submit = async () => {
    if (!file || tapeReviewLoading) return;
    if (firstReview) {
      trackEvent(Events.FIRST_REVIEW_STARTED, { source: 'onboarding' });
      // Past the consent-remount window now — retire the durable handoff flag.
      try { window.sessionStorage.removeItem('dst_first_review'); } catch { /* noop */ }
      try { window.sessionStorage.removeItem('dst_first_review_variant'); } catch { /* noop */ }
    } else if (tutorialProgress.first_review) {
      // A returning actor started another review — the repeat half of ACTIVE.
      trackEvent(Events.REPEAT_REVIEW_STARTED);
    }
    if (!idemKeyRef.current) {
      idemKeyRef.current = (crypto?.randomUUID?.() || `tape-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    }
    const res = await dispatch(reviewTape({ video: file, role, tone, sides, idempotencyKey: idemKeyRef.current }));
    // The server definitively responded and the BE already refunded this attempt
    // → a retry must RE-CHARGE, so mint a fresh key. Keep the key only on a true
    // network/timeout (reuseKey), where dedup must protect against a double charge.
    if (reviewTape.rejected.match(res) && res.payload?.reuseKey === false) {
      idemKeyRef.current = null;
    }
  };

  const reset = () => {
    idemKeyRef.current = null; // next analysis is a new action
    setRevealStage(0); // next result gets its own staged reveal
    setFile(null); setFileError(''); setTone('');
    // Practice framing still up ("Review another take" on the practice scene):
    // re-seed the sides so take #2 gets the same text-aware notes as take #1.
    setRole(practiceActive ? 'Morgan' : '');
    setSides(practiceActive ? PRACTICE_SCENE_CONTENT : '');
    dispatch(clearTapeReview());
  };

  // ─── Loading — staged progress (upload → watching → writing) ────────
  if (tapeReviewLoading) {
    const uploading = analysisUploading;
    const stages = [
      {
        key: 'upload',
        label: uploading ? `Uploading your take… ${uploadProgress}%` : 'Take uploaded',
        active: uploading,
        done: !uploading,
      },
      {
        key: 'watching',
        label: 'Watching your performance',
        active: !uploading && analysisStage === 'watching',
        done: !uploading && analysisStage === 'writing',
      },
      {
        key: 'writing',
        label: 'Writing your casting notes',
        active: !uploading && analysisStage === 'writing',
        done: false,
      },
    ];
    return (
      <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-8" style={SURFACE}>
        <div className="max-w-xs mx-auto">
          {/* Real percentage bar while the upload is the real work */}
          {uploading && (
            <div className="h-1.5 rounded-full mb-6 overflow-hidden" style={{ background: 'rgba(10,10,10,0.08)' }}>
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #D4A85F, #7A5A18)' }}
              />
            </div>
          )}
          <div className="space-y-4">
            {stages.map((st) => (
              <div key={st.key} className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  {st.done ? (
                    <CheckCircle2 size={18} className="text-[#7A5A18]" />
                  ) : st.active ? (
                    <Loader2 size={18} className="animate-spin text-[#7A5A18]" />
                  ) : (
                    <span className="w-2 h-2 rounded-full" style={{ background: 'rgba(10,10,10,0.18)' }} />
                  )}
                </span>
                <p className={`text-sm ${st.active ? 'font-bold text-[#0A0A0A]' : st.done ? 'font-medium text-[rgba(10,10,10,0.55)]' : 'font-medium text-[rgba(10,10,10,0.35)]'}`}>
                  {st.label}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-[rgba(10,10,10,0.4)] mt-6 leading-relaxed">
            {uploading
              ? 'Large tapes can take a few minutes to upload on a mobile connection. Keep the app open until the upload finishes.'
              : 'Reading your framing, eyeline, lighting, and the performance arc beat by beat. You can close the app. We’ll notify you when your notes are ready.'}
          </p>
        </div>
      </div>
    );
  }

  // ─── Result ────────────────────────────────────────────────────────
  if (tapeReviewResult) {
    const raw = tapeReviewResult;
    const rawWorking = Array.isArray(raw.whats_working) ? raw.whats_working : [];
    const rawAdjustments = Array.isArray(raw.adjustments) ? raw.adjustments : [];
    const rawHasScores = TECH_SCORES.some((s) => (raw.scores || {})[s.key] != null);
    const rawHasDna = DNA.some((d) => (raw.performance_dna || {})[d.key] != null);
    const rawHasPerformance = !!(raw.performance && Object.values(raw.performance).some(Boolean));

    // Defense in depth (BUG 3): a 200 with an empty/near-empty body resolves
    // truthy, so the result screen renders. If NOTHING real came back, show the
    // incomplete-result card instead of zeroed scores. Judged on the RAW result,
    // before any free/premium gating.
    if (!raw.verdict && rawWorking.length === 0 && rawAdjustments.length === 0 && !rawHasPerformance && !rawHasScores && !rawHasDna) {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#FF8280]/30 p-5 text-center" style={SURFACE}>
            <p className="text-sm font-bold text-[#0A0A0A]">This review came back incomplete, so your token was refunded. Please try again.</p>
          </div>
          <button
            onClick={reset}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#0A0A0A] transition-all hover:shadow-lg dst-press"
            style={{ background: 'linear-gradient(135deg, #D4A85F, #7A5A18)' }}
          >
            <RotateCcw size={15} /> Try again
          </button>
        </div>
      );
    }

    // Free users get the HEADLINE read (verdict + top strength + the one thing);
    // the full casting read — deep craft, all adjustments, technical scores, and
    // Performance DNA — is a Premium unlock. Trimming the gated result makes the
    // deep sections self-hide (their presence-guards go false); a <FullReadLocked/>
    // teaser takes their place before the actions.
    // Gate ONLY when we positively know the user is free. Fail-open: while the
    // plan is still loading, or if the plan lookup failed (balance null), never
    // gate — better to briefly show a paying user their full read than to lock
    // one out on a network hiccup. Also require a headline to exist so a rare
    // deep-only partial response never trims a free user down to nothing.
    const hasHeadline = !!raw.verdict || rawWorking.length > 0 || rawAdjustments.length > 0;
    const entitlementKnown = !entitlementLoading && !entitlementError && tokenBalance !== null;
    const locked = entitlementKnown && !isPaid && hasHeadline;
    const r = locked
      ? { verdict: raw.verdict, tone_tags: raw.tone_tags, whats_working: rawWorking.slice(0, 1), adjustments: rawAdjustments.slice(0, 1) }
      : raw;
    const working = Array.isArray(r.whats_working) ? r.whats_working : [];
    const adjustments = Array.isArray(r.adjustments) ? r.adjustments : [];
    const scores = r.scores || {};
    const dna = r.performance_dna || {};
    const tags = Array.isArray(r.tone_tags) ? r.tone_tags : [];
    const hasScores = TECH_SCORES.some((s) => scores[s.key] != null);
    const hasDna = DNA.some((d) => dna[d.key] != null);

    // Headline average from RAW scores (shared by gauge + records + share).
    // Prefer the server's `headline_score`: the API now trims a free user's
    // payload, and once REVIEW_GATE_STRIP_SCORES is on there is no per-dimension
    // `scores` map left to average — `headline_score` is the same number,
    // computed server-side, so the gauge survives the strip. Falls back to the
    // local average for paid users and for any older payload.
    const heroVals = TECH_SCORES.map((sc) => raw.scores?.[sc.key]).map(Number).filter((n) => Number.isFinite(n));
    const localHeroAvg = heroVals.length ? heroVals.reduce((a, b) => a + b, 0) / heroVals.length : null;
    const heroAvg = Number.isFinite(Number(raw.headline_score)) ? Number(raw.headline_score) : localHeroAvg;

    // Personal records (rank 14): once per result. LOCKED users only compete
    // on the overall number — per-dimension records would leak gated scores.
    const resultKey = raw?._meta?.job_id || `${raw?.verdict || ''}:${heroAvg ?? ''}`;
    if (recordsRef.current.key !== resultKey && heroAvg != null) {
      recordsRef.current = {
        key: resultKey,
        records: recordAndDiffBests(locked ? {} : (raw.scores || {}), locked ? [] : TECH_SCORES, heroAvg),
        history: appendScoreHistory(heroAvg),
      };
    }
    const newRecords = recordsRef.current.key === resultKey ? recordsRef.current.records : [];
    const scoreHistory = recordsRef.current.key === resultKey ? (recordsRef.current.history || getScoreHistory()) : getScoreHistory();

    return (
      <div className="space-y-4 sm:space-y-5">
        {/* First-review "how to read your notes" walkthrough — the pre-upload
            tutorial is deferred to here for that flow (modeToggle, which
            normally hosts the overlay, doesn't render on the result screen). */}
        {showTutorial && <TapeAnalyzerTutorial onClose={() => setShowTutorial(false)} />}

        {/* Push-denied recovery — notifications just became obviously useful */}
        <NotificationsNudge />

        {/* Gauge hero — headline grade from the RAW scores (a single teaser
            number never leaks the gated per-dimension scorecard). */}
        {heroAvg != null && <GaugeHero avg={heroAvg} firstName={firstName} />}

        {/* Personal records — review #5 should motivate like review #1.
            Only renders when this tape actually beat a previous best. */}
        {revealStage >= 3 && newRecords.length > 0 && (
          <div className="rounded-2xl border border-[#D4A85F]/35 p-4 tr-reveal" style={{ '--tr-i': 1, background: 'linear-gradient(135deg, rgba(212,168,95,0.14), rgba(122,90,24,0.05))' }}>
            <h3 className="text-xs font-bold text-[#7A5A18] mb-2 uppercase tracking-wider">New personal best{newRecords.length > 1 ? 's' : ''}</h3>
            <div className="flex flex-wrap gap-2">
              {newRecords.slice(0, 4).map((rec) => (
                <span key={rec.key} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(212,168,95,0.18)', color: '#7A5A18', border: '1px solid rgba(212,168,95,0.4)' }}>
                  🏅 {rec.label} {rec.value.toFixed(1)}
                  <span style={{ opacity: 0.6, fontWeight: 400 }}>was {rec.prev.toFixed(1)}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* The climb — overall score across this device's reviews. Sold as a
            loop, not a verdict: the reason to tape again is to move the line. */}
        {revealStage >= 3 && scoreHistory.length >= 2 && (() => {
          const pts = scoreHistory.slice(-12);
          const min = Math.min(...pts.map((e) => e.avg), 4);
          const max = Math.max(...pts.map((e) => e.avg), 8);
          const W = 260, H = 48;
          const x = (i) => (i / (pts.length - 1)) * W;
          const y = (v) => H - ((v - min) / Math.max(0.1, max - min)) * H;
          const path = pts.map((e, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(e.avg).toFixed(1)}`).join(' ');
          const delta = pts[pts.length - 1].avg - pts[0].avg;
          return (
            <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4 tr-reveal" style={{ '--tr-i': 2, background: 'rgba(255,255,255,0.6)' }}>
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-xs font-bold text-[#0A0A0A]">Your scores over time</h3>
                <span className="text-[11px] font-semibold" style={{ color: delta >= 0 ? '#22c55e' : 'rgba(10,10,10,0.45)' }}>
                  {delta >= 0.1 ? `▲ +${delta.toFixed(1)} since your first tape here` : `${pts.length} reviews tracked`}
                </span>
              </div>
              <svg width="100%" height={H + 8} viewBox={`0 0 ${W} ${H + 8}`} preserveAspectRatio="none" aria-hidden="true">
                <path d={path} fill="none" stroke="#D4A85F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(0,4)" />
                <circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1].avg) + 4} r="3.5" fill="#7A5A18" />
              </svg>
              <p className="text-[11px] mt-1" style={{ color: 'rgba(10,10,10,0.5)' }}>
                Every tape moves the line. Record another take to keep it climbing.
              </p>
            </div>
          );
        })()}

        {/* Verdict */}
        {r.verdict && (
          <div className="rounded-2xl border border-[#D4A85F]/25 p-4 sm:p-5 tr-reveal" style={{ '--tr-i': 1, background: 'linear-gradient(135deg, rgba(212,168,95,0.10), rgba(122,90,24,0.04))' }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#D4A85F]/15 flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} className="text-[#7A5A18]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-[#7A5A18] uppercase tracking-wide mb-1">Quick read</h3>
                <p className="text-sm text-[#0A0A0A] leading-relaxed font-medium">{r.verdict}</p>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {tags.map((t, i) => (
                      <span key={i} className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#D4A85F]/12 text-[#7A5A18] border border-[#D4A85F]/20">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* What's working — reveal stage 1 */}
        {revealStage >= 1 && working.length > 0 && (
          <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4 sm:p-5 tr-reveal" style={{ '--tr-i': 0, ...SURFACE }}>
            <h3 className="text-sm font-bold text-[#0A0A0A] mb-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" /> What&apos;s working
            </h3>
            <div className="space-y-3">
              {working.map((w, i) => (
                <div key={i} className="flex gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <div>
                    {w.title && <p className="text-xs font-bold text-[#0A0A0A]">{w.title}</p>}
                    <p className="text-sm text-[rgba(10,10,10,0.62)] leading-relaxed">{w.detail || w}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance read — the deep craft analysis (reveal stage 2) */}
        {revealStage >= 2 && r.performance && Object.values(r.performance).some(Boolean) && (
          <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4 sm:p-5 tr-reveal" style={{ '--tr-i': 0, ...SURFACE }}>
            <h3 className="text-sm font-bold text-[#0A0A0A] mb-4 flex items-center gap-2">
              <Theater size={16} className="text-[#7A5A18]" /> Performance read
            </h3>
            <div className="space-y-3.5">
              {PERF_FIELDS.filter((f) => r.performance[f.key]).map((f) => (
                <div key={f.key}>
                  <p className="text-[11px] font-bold text-[#7A5A18] uppercase tracking-wide mb-1">{f.label}</p>
                  <p className="text-sm text-[rgba(10,10,10,0.72)] leading-relaxed">{r.performance[f.key]}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Adjustments (reveal stage 2) */}
        {revealStage >= 2 && adjustments.length > 0 && (
          <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4 sm:p-5 tr-reveal" style={{ '--tr-i': 1, ...SURFACE }}>
            <h3 className="text-sm font-bold text-[#0A0A0A] mb-4 flex items-center gap-2">
              <Target size={16} className="text-[#7A5A18]" /> Your next take
            </h3>
            <div className="space-y-4">
              {adjustments.map((a, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#D4A85F]/15 text-[#7A5A18] flex items-center justify-center flex-shrink-0 text-xs font-bold">{i + 1}</div>
                  <div className="min-w-0">
                    {a.title && <p className="text-sm font-bold text-[#0A0A0A] mb-0.5">{a.title}</p>}
                    <p className="text-sm text-[rgba(10,10,10,0.78)] leading-relaxed">{a.note || a}</p>
                    {a.why && <p className="text-xs text-[rgba(10,10,10,0.45)] leading-relaxed mt-1 italic">{a.why}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* The one thing (reveal stage 2) */}
        {revealStage >= 2 && r.the_one_thing && (
          <div className="rounded-2xl border border-[#FF8280]/25 p-4 tr-reveal" style={{ '--tr-i': 2, background: 'rgba(255,130,128,0.06)' }}>
            <h3 className="text-xs font-bold text-[#FF8280] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Flame size={13} /> The one thing
            </h3>
            <p className="text-sm text-[#0A0A0A] leading-relaxed font-medium">{r.the_one_thing}</p>
          </div>
        )}

        {/* Next Take Mission — turn the note into action: re-record against it and
            compare to this take. Focus = the one thing, else the first fix. */}
        {(() => {
          if (revealStage < 2) return null;
          const a0 = adjustments[0];
          const focus = r.the_one_thing || a0?.note || (typeof a0 === 'string' ? a0 : '');
          if (!focus) return null;
          return (
            <button
              type="button"
              onClick={() => startNextTakeMission(focus)}
              className="w-full text-left rounded-2xl p-4 border border-[#D4A85F]/40 tr-reveal"
              style={{ '--tr-i': 3, background: 'linear-gradient(135deg, rgba(212,168,95,0.14), rgba(122,90,24,0.05))' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Target size={15} className="text-[#7A5A18]" />
                <span className="text-sm font-bold text-[#0A0A0A]">Next Take Mission</span>
              </div>
              <p className="text-xs text-[rgba(10,10,10,0.65)] leading-relaxed">
                Re-record working on this note{file ? ' and compare it against this take' : ''}. See if your next take lands it. →
              </p>
            </button>
          );
        })()}

        {/* Scores — only render a card when its data actually came back, so an
            empty/partial result never shows a wall of clamped-to-0 bars. */}
        {revealStage >= 3 && (hasScores || hasDna) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 tr-reveal" style={{ '--tr-i': 0 }}>
            {hasScores && (
              <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4" style={SURFACE}>
                <h3 className="text-xs font-bold text-[#0A0A0A] mb-3">Tape scores</h3>
                <div className="space-y-2.5">
                  {TECH_SCORES.map((s) => (
                    <ScoreBar key={s.key} label={s.label} value={scores[s.key]} chip={scoreChip(scores[s.key])} />
                  ))}
                </div>
              </div>
            )}
            {hasDna && (
              <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4" style={SURFACE}>
                <h3 className="text-xs font-bold text-[#0A0A0A] mb-3">Performance DNA</h3>
                <div className="space-y-2.5">
                  {/* The BE now OMITS dimensions the tape gives no evidence for
                      (e.g. comedy_timing on a straight drama) instead of
                      guessing a middle number — skip them rather than render
                      a "0" bar that reads as a terrible score. */}
                  {DNA.filter((d) => dna[d.key] != null).map((d) => (
                    <ScoreBar key={d.key} label={d.label} value={dna[d.key]} color={d.color} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Free (non-first-review) users: the deep sections above are gated —
            offer the full read here, in their place. */}
        {revealStage >= 3 && locked && !firstReview && (
          <FullReadLocked
            onUpgrade={handleUpgrade}
            hidden={{ nAdjustments: rawAdjustments.length, hasScores: rawHasScores, hasDna: rawHasDna, hasPerformance: rawHasPerformance }}
          />
        )}

        {/* Share your read — a branded card for social. Offered to everyone
            (free too): an actor posting their casting-grade read is free
            distribution. The template renders far offscreen; the button captures
            it to an image and opens the native share sheet. */}
        {/* Scene Coach (stolen from a competitor doing it right): a chat
            pinned to THESE notes. Slate receives the review as context, so
            "what does adjustment 2 mean" answers about this exact tape.
            Mobile shell only — the desktop web has no Slate host. */}
        {revealStage >= 3 && typeof window !== 'undefined' && window.__dstSlateHost && (r.verdict || adjustments.length > 0) && (
          <button
            type="button"
            onClick={() => {
              trackEvent('scene_coach_open');
              window.dispatchEvent(new CustomEvent('drst-open-slate', {
                detail: { review: {
                  band: (Number.isFinite(heroAvg) ? gradeBand(heroAvg).label : undefined),
                  verdict: r.verdict || '',
                  adjustments: adjustments.slice(0, 3).map((a) => (typeof a === 'string' ? a : a?.text || a?.note || '')),
                } },
              }));
            }}
            onTouchEnd={(e) => { e.preventDefault(); e.currentTarget.click(); }}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border border-[#D4A85F]/40 transition-all hover:bg-[#D4A85F]/10 tr-reveal"
            style={{ '--tr-i': 2, color: '#7A5A18', background: 'rgba(212,168,95,0.06)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            🎬 Talk these notes through with Slate
          </button>
        )}

        {revealStage >= 3 && (r.verdict || tags.length > 0) && (() => {
          // Identity claim for the card: same band the gauge hero shows.
          const vals = TECH_SCORES.map((sc) => raw.scores?.[sc.key]).map(Number).filter((n) => Number.isFinite(n));
          const localShareAvg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
          // Same server-first rule as the gauge hero — see heroAvg above.
          const shareAvg = Number.isFinite(Number(raw.headline_score)) ? Number(raw.headline_score) : localShareAvg;
          const shareBand = shareAvg != null ? gradeBand(shareAvg) : null;
          return (
            <>
              <div className="flex gap-2 tr-reveal" style={{ '--tr-i': 1 }}>
                <button
                  type="button"
                  disabled={sharing}
                  onClick={() => handleShare('story')}
                  className="flex-[2] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-[#7A5A18] border border-[#D4A85F]/40 bg-[#D4A85F]/8 transition-all hover:bg-[#D4A85F]/15 disabled:opacity-60"
                >
                  {sharing ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />}
                  {sharing ? 'Preparing your card…' : 'Share to Story'}
                </button>
                <button
                  type="button"
                  disabled={sharing}
                  onClick={() => handleShare('square')}
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-semibold text-[#7A5A18]/80 border border-[#D4A85F]/25 transition-all hover:bg-[#D4A85F]/10 disabled:opacity-60"
                >
                  Square post
                </button>
              </div>
              <TapeReviewShareCard ref={shareRef} verdict={r.verdict} tags={tags} band={shareBand} avg={shareAvg} />
              <TapeReviewShareCardStory ref={shareStoryRef} verdict={r.verdict} tags={tags} band={shareBand} avg={shareAvg} />
            </>
          );
        })()}

        {/* Actions — in first-review mode the paywall leads; otherwise the
            standard "review another take" reset plus the Compare Takes
            handoff (hidden during the free first review for the same
            token-wall reason as the mode toggle). */}
        {revealStage >= 3 && (firstReview ? (
          <>
            <FirstReviewPaywall onUpgrade={() => { trackEvent(Events.FIRST_REVIEW_PAYWALL_TAP); onUpgrade?.(); }} />
            <button
              onClick={reset}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-[rgba(10,10,10,0.55)] tr-reveal"
              style={{ '--tr-i': 7 }}
            >
              <RotateCcw size={14} /> Review another take
            </button>
          </>
        ) : (
          <>
            {/* The exact moment the need exists: notes are on screen, the
                obvious next question is "which of my takes is stronger?" */}
            <button
              type="button"
              onClick={() => setMode('compare')}
              onTouchEnd={(e) => { e.preventDefault(); setMode('compare'); }}
              style={{ '--tr-i': 7, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#7A5A18] border border-[#D4A85F]/40 bg-[#D4A85F]/8 transition-all hover:bg-[#D4A85F]/15 tr-reveal"
            >
              <Trophy size={15} /> Compare this take against another →
            </button>
            <button
              onClick={reset}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#0A0A0A] transition-all hover:shadow-lg tr-reveal dst-press"
              style={{ '--tr-i': 7, background: 'linear-gradient(135deg, #D4A85F, #7A5A18)' }}
            >
              <RotateCcw size={15} /> Review another take
            </button>
            {/* Clearance for the Slate FAB so it can't cover the last action */}
            <div aria-hidden="true" style={{ height: 76 }} />
          </>
        ))}

        {/* Staged-reveal advance — one primary CTA that walks the notes in
            three beats (worked → the fix → full read + share), with a quiet
            skip for repeat readers. onClick only: a tap-belt double-fire here
            would advance two stages. */}
        {revealStage < 3 && (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                trackEvent('reveal_stage_advance', { to: revealStage + 1 });
                setRevealStage((v) => Math.min(3, v + 1));
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#0A0A0A] transition-all hover:shadow-lg dst-press"
              style={{ background: 'linear-gradient(135deg, #D4A85F, #7A5A18)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              {revealStage === 0 ? "See what's working →" : revealStage === 1 ? 'The one thing to fix →' : 'See your full casting notes →'}
            </button>
            <button
              type="button"
              onClick={() => { trackEvent('reveal_stage_advance', { to: 3, skipped: true }); setRevealStage(3); }}
              className="w-full text-center text-xs font-medium text-[rgba(10,10,10,0.4)] py-1.5"
            >
              Show everything
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Submit form ───────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {modeToggle}
      {showCamPresell && (
        <CameraPresell
          onReady={() => {
            markCameraPresellSeen();
            setShowCamPresell(false);
            // Synchronous within the tap gesture, so WKWebView honors the click.
            recordInputRef.current?.click();
          }}
          onDismiss={() => { markCameraPresellSeen(); setShowCamPresell(false); }}
        />
      )}
      {/* Escape hatch for the free-first-review flow: a user who declines AI
          consent or doesn't want to upload must be able to leave instead of
          being pinned here on every remount. */}
      {firstReview && onExitFirstReview && (
        <button
          onClick={onExitFirstReview}
          className="w-full text-center text-xs font-medium text-[rgba(10,10,10,0.45)] py-1 hover:text-[#7A5A18]"
        >
          Maybe later. Explore the app first →
        </button>
      )}
      <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] p-4 sm:p-5" style={SURFACE}>
        <h3 className="text-sm font-bold text-[#0A0A0A] mb-1 flex items-center gap-2">
          <Film size={16} className="text-[#7A5A18]" /> Submit a self-tape
        </h3>
        <p className="text-xs text-[rgba(10,10,10,0.45)] mb-4 leading-relaxed">
          Upload or record a take and Jericho gives you real casting-grade notes: framing, eyeline, your choices, and the performance arc.
        </p>

        {/* Honest sample: primes what the notes LOOK like for a first-timer who
            has nothing to compare against. Explicitly labeled "not your tape" —
            never a fabricated result presented as the user's own. */}
        {firstReview && (
          <div className="rounded-xl border border-[#D4A85F]/30 bg-[#D4A85F]/[0.06] p-3 mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles size={12} className="text-[#7A5A18]" />
              <span className="text-[10px] font-bold tracking-wider text-[#7A5A18] uppercase">Example · sample notes, not your tape</span>
            </div>
            <div className="flex gap-2 mb-2">
              {[['Framing', '8'], ['Eyeline', '7'], ['Energy', '9']].map(([k, v]) => (
                <div key={k} className="flex-1 text-center rounded-lg bg-white/50 py-1.5">
                  <div className="text-sm font-bold text-[#0A0A0A]">{v}<span className="text-[10px] text-[rgba(10,10,10,0.4)]">/10</span></div>
                  <div className="text-[9px] text-[rgba(10,10,10,0.5)]">{k}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] leading-snug text-[rgba(10,10,10,0.6)]">
              <span className="font-semibold text-[#0A0A0A]">The one thing:</span> your listening drops on line 3. Let the reader's line land before you react. <span className="text-[rgba(10,10,10,0.45)]">Record or upload your take to get notes like this on YOUR performance.</span>
            </p>
          </div>
        )}

        {/* Practice-scene path: the onboarding "record our scene" card landed
            here. The actor needs the LINES before the camera opens, so the
            sides render in-screen with the record CTA as the primary action.
            The sides/role fields are already prefilled for sharper notes. */}
        {practiceActive && (
          <div className="rounded-xl border border-[#D4A85F]/40 bg-[#D4A85F]/[0.08] p-4 mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Film size={12} className="text-[#7A5A18]" />
              <span className="text-[10px] font-bold tracking-wider text-[#7A5A18] uppercase">{PRACTICE_SCENE_TITLE}</span>
            </div>
            <p className="text-[11px] text-[rgba(10,10,10,0.5)] mb-2">
              You're Morgan, leaving a voicemail you weren't supposed to leave. Read it once, then tape it any way you feel it.
            </p>
            <div className="rounded-lg bg-white/60 p-3 max-h-44 overflow-y-auto">
              {PRACTICE_SCENE_CONTENT.split('\n\n').map((line, k) => (
                <p key={k} className="text-[12.5px] leading-relaxed text-[#0A0A0A] mb-2 last:mb-0">
                  {line.replace(/^MORGAN: /, '')}
                </p>
              ))}
            </div>
            <button
              type="button"
              onClick={startRecord}
              onTouchEnd={(e) => { e.preventDefault(); startRecord(); }}
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', background: 'linear-gradient(135deg, #D4A85F, #7A5A18)' }}
              className="w-full mt-3 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg"
            >
              <Film size={15} /> Ready? Record your take
            </button>
          </div>
        )}

        {/* Drop / pick */}
        <button
          onClick={() => inputRef.current?.click()}
          className={`w-full rounded-xl border-2 border-dashed p-6 flex flex-col items-center justify-center gap-2 transition-colors ${
            file ? 'border-[#D4A85F]/50 bg-[#D4A85F]/5' : 'border-[rgba(10,10,10,0.14)] hover:border-[#D4A85F]/40'
          }`}
        >
          {file ? (
            <>
              <Film size={22} className="text-[#7A5A18]" />
              <span className="text-sm font-medium text-[#0A0A0A] truncate max-w-full px-2">{file.name}</span>
              <span className="text-[10px] text-[rgba(10,10,10,0.4)]">{(file.size / (1024 * 1024)).toFixed(1)} MB · tap to change</span>
            </>
          ) : (
            <>
              <Upload size={22} className="text-[rgba(10,10,10,0.4)]" />
              <span className="text-sm font-medium text-[rgba(10,10,10,0.62)]">Choose a video</span>
              <span className="text-[10px] text-[rgba(10,10,10,0.4)]">mp4, mov, or webm · up to 500 MB</span>
            </>
          )}
        </button>
        <input ref={inputRef} type="file" accept="video/*" onChange={onPick} className="hidden" />

        {/* No tape yet? Record one right here — the no-tape user's path to the
            aha in one session. capture="user" opens the camera on mobile; desktop
            falls back to a normal picker. Reuses the exact same onPick flow, so a
            recorded clip lands as a File identical to an uploaded one. Hidden on
            the practice-scene variant, whose card above owns the record CTA. */}
        {!practiceActive && (
        <button
          type="button"
          onClick={startRecord}
          onTouchEnd={(e) => { e.preventDefault(); startRecord(); }}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#7A5A18] border border-[#D4A85F]/40 bg-[#D4A85F]/8 transition-all hover:bg-[#D4A85F]/15"
        >
          <Film size={15} /> No tape? Record one now
        </button>
        )}
        <input ref={recordInputRef} type="file" accept="video/*" capture="user" onChange={onPick} className="hidden" />

        {fileError && <p className="text-xs text-red-500 mt-3 text-center">{fileError}</p>}

        {/* Optional context */}
        <button
          onClick={() => setShowOptional((v) => !v)}
          className="w-full flex items-center justify-between mt-3 px-1 py-2 text-xs font-medium text-[rgba(10,10,10,0.45)]"
        >
          <span>Add context for sharper notes (optional)</span>
          <ChevronDown size={14} className={`transition-transform ${showOptional ? 'rotate-180' : ''}`} />
        </button>
        {showOptional && (
          <div className="space-y-2.5 mt-1">
            <input
              value={role} onChange={(e) => setRole(e.target.value)}
              placeholder="Character name (e.g. MaryBeth)"
              className="w-full px-3 py-2.5 rounded-lg text-sm bg-[#F4F4EE] border border-[rgba(10,10,10,0.08)] text-[#0A0A0A] placeholder:text-[rgba(10,10,10,0.35)] outline-none focus:border-[#D4A85F]/50"
            />
            <input
              value={tone} onChange={(e) => setTone(e.target.value)}
              placeholder="Tone target from the brief (e.g. grounded and warm)"
              className="w-full px-3 py-2.5 rounded-lg text-sm bg-[#F4F4EE] border border-[rgba(10,10,10,0.08)] text-[#0A0A0A] placeholder:text-[rgba(10,10,10,0.35)] outline-none focus:border-[#D4A85F]/50"
            />
            <textarea
              value={sides} onChange={(e) => setSides(e.target.value)}
              placeholder="Paste the sides / scene text…"
              rows={4}
              className="w-full px-3 py-2.5 rounded-lg text-sm bg-[#F4F4EE] border border-[rgba(10,10,10,0.08)] text-[#0A0A0A] placeholder:text-[rgba(10,10,10,0.35)] outline-none focus:border-[#D4A85F]/50 resize-none"
            />
          </div>
        )}

        {tapeReviewError && (
          <p className="text-xs text-red-500 mt-3 text-center">{String(tapeReviewError)}</p>
        )}

        {file && file.size > 60 * 1024 * 1024 && (
          <p className="text-[11px] text-[#7A5A18] mt-3 text-center leading-relaxed">
            Heads up: this is a large tape ({(file.size / (1024 * 1024)).toFixed(0)} MB). On a slower
            connection the upload can take a few minutes; keep the app open and watch the progress.
          </p>
        )}

        <button
          onClick={submit}
          disabled={!file}
          className="w-full mt-4 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#0A0A0A] transition-all enabled:hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed dst-press"
          style={{ background: 'linear-gradient(135deg, #D4A85F, #7A5A18)' }}
        >
          <Sparkles size={15} /> Get my notes
        </button>
        <p className="text-[10px] text-[rgba(10,10,10,0.35)] text-center mt-2">
          {(firstReview || !tutorialProgress.first_review)
            ? 'Your first review is free · your tape is analyzed, not stored for training'
            : 'Uses 1 token · your tape is analyzed, not stored for training'}
        </p>
      </div>
    </div>
  );
}
