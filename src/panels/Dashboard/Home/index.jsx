import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useDispatch, useSelector } from 'react-redux';
import { Sparkles, Mic, BookOpen, Users2, Target, ChevronDown, ChevronUp, Radio, MessageSquare, Gift, ShoppingBag, Camera } from 'lucide-react';
// recharts (~325KB) loads only when the actor expands the collapsed Analytics.
const HomeAnalytics = lazy(() => import('./HomeAnalytics'));
import '../../../styles/studio-panels.css';
import { fetchAuditionStatsThunk } from '../../../redux/features/auditions/auditionsSlice';
import { patchUserSettings } from '../../../redux/features/userSettings/userSettingsSlice';
import { fetchSubmissionsThunk } from '../../../redux/features/submissions/submissionsSlice';
import { fetchMatchingStats } from '../../../redux/features/readers/readersMatchSlice';
import AuditionBadges from '../../../components/AuditionBadges';
import UpcomingCallbacks from '../../../components/UpcomingCallbacks';
import PendingLikesBanner from '../../../components/Dashboard/PendingLikesBanner';
import ProfileCompleteness from '../../../components/Dashboard/ProfileCompleteness';
import AvailabilityToggle from '../../../components/Dashboard/AvailabilityToggle';
import ReaderOnboardingModal from '../../../components/Dashboard/ReaderOnboardingModal';
import NotificationBell from '../../../components/Dashboard/NotificationBell';
import MyStudioCard from '../../../components/Dashboard/MyStudioCard';
import TutorialChecklist from '../../../components/Dashboard/TutorialChecklist';
import VisibilityPrompt from '../../../components/Shared/VisibilityPrompt';
import TutorialAchievement from '../../../components/Dashboard/TutorialAchievement';
import DailyChallengeCard from '../../../components/Dashboard/DailyChallengeCard';

const TYPE_COLORS = {
  film: 'var(--aurora-heritage-gold)',
  commercial: 'var(--aurora-sky)',
  theatrical: 'var(--aurora-rose)',
  industrial: 'var(--aurora-dim)',
  theater: 'var(--aurora-mint)',
  voiceover: 'var(--aurora-peach)',
};

const TYPE_LABELS = {
  film: 'Film/TV',
  commercial: 'Commercial',
  theatrical: 'Theatrical',
  industrial: 'Industrial',
  theater: 'Theater',
  voiceover: 'Voice Over',
};

const FUNNEL_STEPS = ['submitted', 'reviewed', 'callback', 'booked'];
const FUNNEL_LABELS = { submitted: 'Submitted', reviewed: 'In Review', callback: 'Callback', booked: 'Booked' };

/* ── Smart Next Step — figures out what the user should do next ──
 *
 * Reads from `tutorial_progress` (the same server-synced flags the
 * Get Started checklist uses) so completing a step in either surface
 * advances both. When the onboarding sequence is done, rotates through
 * engagement CTAs based on the day-of-month so the banner doesn't get
 * stale but also doesn't change on every render.
 */

/* Native navigation. react-router's navigate() is unreliable inside the
 * Capacitor WebView (iPad mounts this console Outlet, not MobileApp), so every
 * destination on this screen goes through the drst-navigate event that
 * DashboardLayout listens for. Keys are the same paths the step objects carry,
 * values are the panel/tab detail DashboardLayout's routeFor() understands. */
const NAV_DETAIL = {
  '/dashboard/jericho?tab=tape': { tab: 'tape-review' },
  '/dashboard/profile': { panel: 'dash-profile' },
  '/dashboard/generator': { panel: 'generator' },
  '/dashboard/scene-study': { tab: 'scenes' },
  '/dashboard/find-a-reader': { panel: 'find-a-reader' },
  '/dashboard/green-room': { panel: 'green-room' },
  '/dashboard/auditions': { tab: 'auditions' },
  '/dashboard/cd-sim': { panel: 'cd-sim' },
  '/dashboard/marketplace': { panel: 'marketplace' },
  '/dashboard/referral': { panel: 'referral' },
  '/dashboard/self-tapes': { panel: 'self-tapes' },
  '/dashboard/submissions': { panel: 'submissions' },
};

const TAPE_REVIEW_PATH = '/dashboard/jericho?tab=tape';

// Ordered onboarding sequence — first incomplete step wins. Most map to
// keys in tutorial_progress; "headshot" is mirrored there as well by
// the TutorialChecklist's auto-detect effect.
const ONBOARDING_STEPS = [
  {
    // The activation aha — leads the sequence (ahead of profile) so every new
    // actor is routed to the moment that hooks them first. Completed via
    // markStep('first_review') when any Tape Review result lands (TapeReview.jsx).
    key: 'first_review',
    title: 'Get your first AI Tape Review',
    description: 'Submit a self-tape. Casting-grade notes on your performance in minutes.',
    cta: 'Get My Notes',
    path: '/dashboard/jericho?tab=tape',
    icon: Sparkles,
  },
  {
    key: 'headshot',
    title: 'Complete your profile',
    description: 'Add a headshot so scene partners can find you.',
    cta: 'Add Headshot',
    path: '/dashboard/profile',
    icon: Users2,
  },
  {
    key: 'generate_scene',
    title: 'Generate your first scene',
    description: 'Pick a genre and tone. Get custom audition sides in seconds.',
    cta: 'Generate a Scene',
    path: '/dashboard/generator',
    icon: Sparkles,
  },
  {
    key: 'practice_ai',
    title: 'Practice with AI',
    description: 'Run your scene with an AI partner and record your take.',
    cta: 'Start Practicing',
    path: '/dashboard/scene-study',
    icon: Mic,
  },
  {
    key: 'find_reader',
    title: 'Find a reader',
    description: 'Swipe through actors who are available to run lines with you.',
    cta: 'Find a Reader',
    path: '/dashboard/find-a-reader',
    icon: Users2,
  },
  {
    key: 'go_available',
    title: 'Go available',
    description: "Let other actors know you're ready to read right now.",
    cta: 'Go Available',
    path: '/dashboard/find-a-reader',
    icon: Radio,
  },
  {
    key: 'green_room',
    title: 'Check the Green Room',
    description: 'See who you matched with and start a conversation.',
    cta: 'Open Green Room',
    path: '/dashboard/green-room',
    icon: MessageSquare,
  },
  {
    key: 'track_audition',
    title: 'Log an audition',
    description: 'Track every callback, booking, and pass in one place.',
    cta: 'Log Audition',
    path: '/dashboard/auditions',
    icon: Target,
  },
];

// Rotated post-onboarding suggestions. Pick deterministically by
// day-of-month so it changes ~daily but is stable across renders.
const ENGAGEMENT_ROTATION = [
  {
    title: 'Get coaching notes',
    description: 'Run a scene by the AI Acting Coach and get specific feedback.',
    cta: 'Try Acting Coach',
    path: '/dashboard/cd-sim',
    icon: BookOpen,
  },
  {
    title: 'Book a paid reader',
    description: 'Browse pro readers in the Marketplace and book a session.',
    cta: 'Open Marketplace',
    path: '/dashboard/marketplace',
    icon: ShoppingBag,
  },
  {
    title: 'Invite a friend',
    description: 'Earn tokens by sharing your invite code with another actor.',
    cta: 'Invite Friends',
    path: '/dashboard/referral',
    icon: Gift,
  },
  {
    title: 'Upload a self-tape',
    description: 'Keep all your recorded takes organized in one library.',
    cta: 'Open Self-Tapes',
    path: '/dashboard/self-tapes',
    icon: Camera,
  },
];

function useNextStep({ profile, stats, submissions }) {
  const tutorialProgress = useSelector((s) => s.userSettings?.data?.tutorial_progress || {});

  // Cross-signal hints — if the data shows the action's been done but
  // tutorial_progress hasn't caught up yet, treat it as done.
  const hasHeadshot = !!(profile?.actor_profile?.headshot || profile?.user_image);
  const hasAuditions = (stats?.data?.total || 0) > 0;
  const hasSubs = Array.isArray(submissions) && submissions.length > 0;
  const effectiveProgress = {
    ...tutorialProgress,
    headshot: tutorialProgress.headshot || hasHeadshot,
    track_audition: tutorialProgress.track_audition || hasAuditions || hasSubs,
  };

  // First onboarding step not yet done.
  const nextOnboarding = ONBOARDING_STEPS.find((s) => !effectiveProgress[s.key]);
  if (nextOnboarding) return nextOnboarding;

  // All onboarding done — rotate engagement CTAs by day-of-month so
  // the banner stays fresh without being noisy.
  const idx = new Date().getDate() % ENGAGEMENT_ROTATION.length;
  return ENGAGEMENT_ROTATION[idx];
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { stats } = useSelector((state) => state.auditions);
  const { submissions } = useSelector((state) => state.submissions);
  const profile = useSelector((s) => s.profile?.profile);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTutorialAchievement, setShowTutorialAchievement] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const nextStep = useNextStep({ profile, stats, submissions });

  // One navigation door for the whole screen. Inside Capacitor, navigate() is
  // a no-op, so hand the destination to DashboardLayout's drst-navigate
  // listener instead; on web it stays a plain router push.
  const go = useCallback((path) => {
    if (Capacitor.isNativePlatform()) {
      const detail = NAV_DETAIL[path];
      if (detail) {
        window.dispatchEvent(new CustomEvent('drst-navigate', { detail }));
        return;
      }
    }
    navigate(path);
  }, [navigate]);

  // Listen for tutorial completion
  useEffect(() => {
    const handler = () => setShowTutorialAchievement(true);
    window.addEventListener('drst-tutorial-complete', handler);
    return () => window.removeEventListener('drst-tutorial-complete', handler);
  }, []);

  useEffect(() => {
    dispatch(fetchAuditionStatsThunk());
    dispatch(fetchSubmissionsThunk());
    dispatch(fetchMatchingStats());

  }, [dispatch]);

  // Server-synced onboarding flag — see notes in Mobile HomeScreen.
  const onboardingSeen = useSelector((state) => state.userSettings?.data?.reader_onboarding_seen);
  const settingsLoaded = useSelector((state) => state.userSettings?.loaded);
  const firstReviewDone = useSelector((state) => !!state.userSettings?.data?.tutorial_progress?.first_review);
  useEffect(() => {
    if (!settingsLoaded || onboardingSeen) return;
    // New user who hasn't had their first Tape Review: skip the legacy tour
    // modal and route straight into the free first review (the web port of
    // the mobile offer step — Jericho mounts TapeReview in firstReview mode).
    // Marked seen server-side so neither surface fires twice.
    if (!firstReviewDone) {
      dispatch(patchUserSettings({ reader_onboarding_seen: true }));
      go(TAPE_REVIEW_PATH);
      return;
    }
    const timer = setTimeout(() => setShowOnboarding(true), 2000);
    return () => clearTimeout(timer);
  }, [settingsLoaded, onboardingSeen, firstReviewDone, dispatch, go]);

  const recentSubs = Array.isArray(submissions) ? submissions.slice(0, 4) : [];

  const s = stats.data || {};
  const isLoading = stats.loading;
  const hasStats = (s.total || 0) > 0;

  // Pipeline numbers come from the ONE server metrics module (P1-02) —
  // reached-or-beyond semantics, so a booked row still counts as a callback
  // and this card can never disagree with Submissions or the Tracker again.
  // Rate display rule: under 10 submissions a percentage is noise, show the
  // fraction; either way the denominator is stated in words.
  const p = s.pipeline;
  const bookedChange = !p || !p.total ? ''
    : p.use_fraction
      ? `${p.reached_booked} of ${p.total} submissions`
      : `${p.booked_rate}% of ${p.total} submissions`;
  // Values stay numeric; the loading skeleton is rendered by the tile, not
  // smuggled in as a '...' string, so the number never pops in at a
  // different width than the placeholder it replaces.
  const statCards = [
    { title: 'Submissions', value: s.total || 0, note: '' },
    { title: 'This month', value: s.this_month || 0, note: '' },
    { title: 'Callbacks', value: p?.reached_callback ?? s.by_status?.callback ?? 0, note: '' },
    { title: 'Booked', value: p?.reached_booked ?? s.by_status?.booked ?? 0, note: bookedChange },
  ];

  // Type breakdown chart data
  const typeData = Object.entries(s.by_type || {}).map(([key, count]) => ({
    name: TYPE_LABELS[key] || key,
    value: count,
    color: TYPE_COLORS[key] || 'var(--aurora-heritage-gold)',
  }));

  // Funnel data
  const funnelData = FUNNEL_STEPS.map((step) => ({
    name: FUNNEL_LABELS[step],
    count: s.by_status?.[step] || 0,
  }));

  const hour = new Date().getHours();
  const firstName = (profile?.first_name || 'there').trim();
  const greeting = hour < 12 ? `Good morning, ${firstName}` : hour < 17 ? `Hey ${firstName}` : `Working late, ${firstName}?`;

  // The hero already IS the first-review prompt, so don't also show it as the
  // "next step" — one ask, not two for the same action.
  const showNextStep = nextStep.key !== 'first_review';

  return (
    <div className="dst-studio-panel dst-home">
      {showOnboarding && <ReaderOnboardingModal onClose={() => setShowOnboarding(false)} />}
      {showTutorialAchievement && <TutorialAchievement show onClose={() => setShowTutorialAchievement(false)} />}

      {/* ── Header ── */}
      <div className="dst-home-head">
        <h1 className="studio-title">{greeting}</h1>
        <NotificationBell />
      </div>

      {/* Studio clients — desktop only, on purpose. The studio hub is a
          separate product surface from the mobile actor app; see the fork
          decision. Renders nothing for anyone without sessions. */}
      <MyStudioCard />

      {/* ── Pending Matches Banner ── */}
      <PendingLikesBanner />

      {/* ── Profile completeness — auto-hides when 100% ── */}
      <ProfileCompleteness />

      {/* ── Tape Review — the thing this company sells. Permanent and
             primary, not a rotating peer of "invite a friend". ── */}
      <section className="studio-hero">
        <span className="studio-hero-mark" aria-hidden="true"><Sparkles className="w-5 h-5" /></span>
        <span className="studio-eyebrow">Tape Review</span>
        <h2 className="studio-hero-title">An honest read on your own tape</h2>
        <p className="studio-hero-copy">
          Upload a take and get casting-grade notes in minutes — what landed, what read
          as indicated, and the one fix worth making before you send it.
        </p>
        <button type="button" className="studio-cta" onClick={() => go(TAPE_REVIEW_PATH)}>
          {firstReviewDone ? 'Review a new tape' : 'Get my first notes'}
          <span aria-hidden="true">&rarr;</span>
        </button>
      </section>

      {/* ── Next step — one quiet nudge under the hero ── */}
      {showNextStep && (
        <button type="button" className="studio-nextstep" onClick={() => go(nextStep.path)}>
          <span className="studio-nextstep-icon" aria-hidden="true"><nextStep.icon className="w-4 h-4" /></span>
          <span className="studio-nextstep-body">
            <strong>{nextStep.title}</strong>
            <span>{nextStep.description}</span>
          </span>
          <span className="studio-nextstep-go">{nextStep.cta} &rarr;</span>
        </button>
      )}

      {/* ── Everything else, at the weight it deserves ── */}
      <div className="studio-shortcuts">
        {[
          { label: 'Acting Coach', desc: 'Notes on a scene', path: '/dashboard/cd-sim', Icon: BookOpen },
          { label: 'Scene Study', desc: 'Run lines with AI', path: '/dashboard/scene-study', Icon: Mic },
          { label: 'Find a Reader', desc: 'Match with actors', path: '/dashboard/find-a-reader', Icon: Users2 },
        ].map((item) => {
          const Icon = item.Icon;
          return (
            <button key={item.path} type="button" className="studio-shortcut" onClick={() => go(item.path)}>
              <Icon className="w-4 h-4" aria-hidden="true" />
              <span className="studio-shortcut-label">
                {item.label}
                <em>{item.desc}</em>
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Progress Section ── */}
      <div className="space-y-3">
        <DailyChallengeCard />
        {/* Invisible in the deck? Say so where they actually land, not only on
            the Match tab they aren't visiting. `needs_visual` is computed from
            the same rule the deck uses, so this can't nag someone already
            visible. */}
        {profile?.needs_visual && <VisibilityPrompt userId={profile?.id} name={profile?.first_name} />}
        <TutorialChecklist />
      </div>

      {/* ── Stats — Only show when user has data ── */}
      {hasStats ? (
        <>
          <div className="studio-stat-grid">
            {statCards.map((stat) => (
              <div key={stat.title} className="studio-stat">
                <p className="studio-stat-label">{stat.title}</p>
                {/* Fixed-width numeric slot: tabular figures + a 3ch floor mean
                    the skeleton and the loaded number occupy the same box, so
                    nothing jumps when the request lands. */}
                <span className="studio-stat-value" aria-busy={isLoading || undefined}>
                  {isLoading
                    ? <span className="studio-stat-skeleton aurora-skeleton">000</span>
                    : stat.value}
                </span>
                <span className="studio-stat-note">{isLoading ? '' : stat.note}</span>
              </div>
            ))}
          </div>

          {/* Collapsible analytics */}
          <button
            type="button"
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="studio-disclosure"
            aria-expanded={showAnalytics}
          >
            Analytics
            {showAnalytics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAnalytics && (
            <Suspense fallback={<div className="studio-stat-note" style={{ minHeight: 240 }}>Loading charts…</div>}>
              <HomeAnalytics typeData={typeData} funnelData={funnelData} />
            </Suspense>
          )}
        </>
      ) : null /* Empty state removed — the Tape Review hero + Get Started
                   checklist already prompt this same action. */}

      {/* Recent Submissions — only when data exists */}
      {recentSubs.length > 0 && (
        <section className="studio-sheet" style={{ padding: '18px 20px' }}>
          <div className="dst-home-head" style={{ alignItems: 'center', marginBottom: 6 }}>
            <h2 className="studio-title" style={{ fontSize: 20 }}>Recent submissions</h2>
            <button type="button" className="studio-linkish" onClick={() => go('/dashboard/submissions')}>
              View all &rarr;
            </button>
          </div>
          {recentSubs.map((sub) => (
            <div key={sub.id} className="studio-list-row">
              <div className="studio-list-main">
                <p className="studio-list-title">{sub.project_name}</p>
                <p className="studio-list-meta">{sub.role}{sub.casting_director ? ` · ${sub.casting_director}` : ''}</p>
              </div>
              <span className="studio-list-meta" style={{ flex: '0 0 auto' }}>
                {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
              </span>
              <span className="studio-tag" data-tone={sub.status === 'booked' || sub.status === 'callback' ? 'won' : undefined}>
                {sub.status === 'sent' ? 'Submitted' : sub.status}
              </span>
            </div>
          ))}
        </section>
      )}

      {/* Upcoming Callbacks */}
      <UpcomingCallbacks />
    </div>
  );
}
