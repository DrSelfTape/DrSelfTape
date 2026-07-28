import { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Sparkles, Mic, BookOpen, Users2, Target, ChevronDown, ChevronUp, Radio, MessageSquare, Gift, ShoppingBag, Camera } from 'lucide-react';
// recharts (~325KB) loads only when the actor expands the collapsed Analytics.
const HomeAnalytics = lazy(() => import('./HomeAnalytics'));
import StatsCard from '../../../components/StatsCard.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
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
import TutorialChecklist from '../../../components/Dashboard/TutorialChecklist';
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

// Soft cream-to-warm-white gradients so the banner reads on the Aurora
// light page. Each step uses a different gold-tinted accent for visual
// variety without going dark.
const GRADIENT_WELCOME = 'from-[var(--aurora-surface-solid)] via-[var(--aurora-bg)] to-[color-mix(in_oklch,var(--aurora-heritage-gold)_14%,transparent)]';
const GRADIENT_PRACTICE = 'from-[var(--aurora-surface-solid)] via-[var(--aurora-bg)] to-[color-mix(in_oklch,var(--aurora-rose)_16%,transparent)]';
const GRADIENT_CONNECT = 'from-[var(--aurora-surface-solid)] via-[var(--aurora-bg)] to-[color-mix(in_oklch,var(--aurora-mint)_18%,transparent)]';
const GRADIENT_TRACK = 'from-[var(--aurora-surface-solid)] via-[var(--aurora-bg)] to-[color-mix(in_oklch,var(--aurora-sky)_18%,transparent)]';

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
    gradient: GRADIENT_WELCOME,
  },
  {
    key: 'headshot',
    title: 'Complete your profile',
    description: 'Add a headshot so scene partners can find you.',
    cta: 'Add Headshot',
    path: '/dashboard/profile',
    icon: Users2,
    gradient: GRADIENT_WELCOME,
  },
  {
    key: 'generate_scene',
    title: 'Generate your first scene',
    description: 'Pick a genre and tone. Get custom audition sides in seconds.',
    cta: 'Generate a Scene',
    path: '/dashboard/generator',
    icon: Sparkles,
    gradient: GRADIENT_PRACTICE,
  },
  {
    key: 'practice_ai',
    title: 'Practice with AI',
    description: 'Run your scene with an AI partner and record your take.',
    cta: 'Start Practicing',
    path: '/dashboard/scene-study',
    icon: Mic,
    gradient: GRADIENT_PRACTICE,
  },
  {
    key: 'find_reader',
    title: 'Find a reader',
    description: 'Swipe through actors who are available to run lines with you.',
    cta: 'Find a Reader',
    path: '/dashboard/find-a-reader',
    icon: Users2,
    gradient: GRADIENT_CONNECT,
  },
  {
    key: 'go_available',
    title: 'Go available',
    description: "Let other actors know you're ready to read right now.",
    cta: 'Go Available',
    path: '/dashboard/find-a-reader',
    icon: Radio,
    gradient: GRADIENT_CONNECT,
  },
  {
    key: 'green_room',
    title: 'Check the Green Room',
    description: 'See who you matched with and start a conversation.',
    cta: 'Open Green Room',
    path: '/dashboard/green-room',
    icon: MessageSquare,
    gradient: GRADIENT_CONNECT,
  },
  {
    key: 'track_audition',
    title: 'Log an audition',
    description: 'Track every callback, booking, and pass in one place.',
    cta: 'Log Audition',
    path: '/dashboard/auditions',
    icon: Target,
    gradient: GRADIENT_TRACK,
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
    gradient: GRADIENT_PRACTICE,
  },
  {
    title: 'Book a paid reader',
    description: 'Browse pro readers in the Marketplace and book a session.',
    cta: 'Open Marketplace',
    path: '/dashboard/marketplace',
    icon: ShoppingBag,
    gradient: GRADIENT_CONNECT,
  },
  {
    title: 'Invite a friend',
    description: 'Earn tokens by sharing your invite code with another actor.',
    cta: 'Invite Friends',
    path: '/dashboard/referral',
    icon: Gift,
    gradient: GRADIENT_WELCOME,
  },
  {
    title: 'Upload a self-tape',
    description: 'Keep all your recorded takes organized in one library.',
    cta: 'Open Self-Tapes',
    path: '/dashboard/self-tapes',
    icon: Camera,
    gradient: GRADIENT_TRACK,
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
      navigate('/dashboard/jericho?tab=tape');
      return;
    }
    const timer = setTimeout(() => setShowOnboarding(true), 2000);
    return () => clearTimeout(timer);
  }, [settingsLoaded, onboardingSeen, firstReviewDone, dispatch, navigate]);

  const recentSubs = Array.isArray(submissions) ? submissions.slice(0, 4) : [];

  const s = stats.data || {};
  const isLoading = stats.loading;
  const hasStats = (s.total || 0) > 0;

  const statCards = [
    { title: 'Total Submissions', value: isLoading ? '...' : String(s.total || 0), change: '', positive: true },
    { title: 'This Month', value: isLoading ? '...' : String(s.this_month || 0), change: '', positive: true },
    { title: 'Callbacks', value: isLoading ? '...' : String(s.by_status?.callback || 0), change: '', positive: true },
    { title: 'Booked', value: isLoading ? '...' : String(s.by_status?.booked || 0), change: s.booked_rate ? `${s.booked_rate}%` : '', positive: true },
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
  const firstName = profile?.first_name || 'there';
  const greeting = hour < 12 ? `Good morning, ${firstName}` : hour < 17 ? `Hey ${firstName}` : `Working late, ${firstName}?`;

  return (
    <div className="aurora-orbs space-y-4 sm:space-y-6" style={{ color: 'var(--aurora-text)', fontFamily: "'Space Grotesk', sans-serif" }}>
      {showOnboarding && <ReaderOnboardingModal onClose={() => setShowOnboarding(false)} />}
      {showTutorialAchievement && <TutorialAchievement show onClose={() => setShowTutorialAchievement(false)} />}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="aurora-display text-3xl" style={{ color: 'var(--aurora-text)' }}>{greeting}</h1>
        </div>
        <div className="flex items-center gap-3">
          <AvailabilityToggle />
          <NotificationBell />
        </div>
      </div>

      {/* ── Pending Matches Banner ── */}
      <PendingLikesBanner />

      {/* ── Profile completeness — auto-hides when 100% ── */}
      <ProfileCompleteness />

      {/* ── Smart Next Step — ONE primary CTA ── */}
      <div
        onClick={() => navigate(nextStep.path)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(nextStep.path); }}
        className={`aurora-card bg-gradient-to-r ${nextStep.gradient} p-6 cursor-pointer transition-all duration-300 group relative overflow-hidden hover:-translate-y-0.5`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,_color-mix(in_oklch,var(--aurora-heritage-gold)_16%,transparent),_transparent_60%)]" />
        <div className="relative flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'color-mix(in oklch, var(--aurora-heritage-gold) 18%, transparent)', color: 'var(--aurora-accent-deep)' }}>
            <nextStep.icon className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="aurora-display text-xl" style={{ color: 'var(--aurora-text)' }}>{nextStep.title}</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--aurora-sub)' }}>{nextStep.description}</p>
          </div>
          <button className="aurora-mono px-5 py-2.5 rounded-full transition-all duration-200 whitespace-nowrap cursor-pointer text-sm shrink-0" style={{ background: 'var(--aurora-heritage-gold)', color: 'var(--aurora-text)', boxShadow: 'var(--aurora-shadow-coral)' }}>
            {nextStep.cta} &rarr;
          </button>
        </div>
      </div>

      {/* ── Quick Access Grid — 3 icons ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Acting Coach', icon: '🎭', path: '/dashboard/cd-sim', desc: 'Get AI feedback' },
          { label: 'Scene Study', icon: '📖', path: '/dashboard/scene-study', desc: 'Practice lines' },
          { label: 'Find a Reader', icon: '🤝', path: '/dashboard/find-a-reader', desc: 'Match & connect' },
        ].map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="aurora-card p-4 text-center transition-all cursor-pointer group hover:-translate-y-0.5 hover:border-[color:var(--aurora-heritage-gold)]"
          >
            <span className="text-2xl block mb-2">{item.icon}</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--aurora-text)' }}>{item.label}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--aurora-dim)' }}>{item.desc}</p>
          </button>
        ))}
      </div>

      {/* ── Progress Section ── */}
      <div className="space-y-3">
        <DailyChallengeCard />
        <TutorialChecklist />
      </div>

      {/* ── Stats — Only show when user has data ── */}
      {hasStats ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statCards.map((stat) => <StatsCard key={stat.title} {...stat} />)}
          </div>

          {/* Collapsible analytics */}
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="aurora-eyebrow flex items-center gap-2 cursor-pointer transition-colors hover:text-[color:var(--aurora-accent-deep)]"
            style={{ color: 'var(--aurora-dim)' }}
          >
            Analytics
            {showAnalytics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAnalytics && (
            <Suspense fallback={<div className="h-[240px] flex items-center justify-center text-sm" style={{ color: 'var(--aurora-dim)' }}>Loading charts…</div>}>
              <HomeAnalytics typeData={typeData} funnelData={funnelData} />
            </Suspense>
          )}
        </>
      ) : null /* Empty state removed — Smart Next Step banner + Get
                   Started checklist already prompt this same action.
                   Three CTAs for "log your first audition" was noisy. */}

      {/* Recent Submissions — only when data exists */}
      {recentSubs.length > 0 && (
        <Card className="aurora-card" style={{ background: 'var(--aurora-surface-solid)', borderColor: 'var(--aurora-line)' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="aurora-display text-base" style={{ color: 'var(--aurora-text)' }}>Recent Submissions</CardTitle>
              <button onClick={() => navigate('/dashboard/submissions')} className="aurora-mono text-xs hover:underline" style={{ color: 'var(--aurora-accent-deep)' }}>View all &rarr;</button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-[color:var(--aurora-line)]">
              {recentSubs.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--aurora-text)' }}>{sub.project_name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--aurora-sub)' }}>{sub.role} {sub.casting_director ? `· ${sub.casting_director}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <span className="aurora-mono text-xs" style={{ color: 'var(--aurora-dim)' }}>
                      {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </span>
                    <span className={`aurora-mono text-xs px-2 py-0.5 rounded-full ${
                      sub.status === 'callback' ? 'bg-[color-mix(in_oklch,var(--aurora-peach)_24%,transparent)] text-[color:var(--aurora-accent-deep)]' :
                      sub.status === 'booked' ? 'bg-[color-mix(in_oklch,var(--aurora-mint)_30%,transparent)] text-[color:var(--aurora-accent-deep)]' :
                      sub.status === 'viewed' ? 'bg-[color-mix(in_oklch,var(--aurora-rose)_26%,transparent)] text-[color:var(--aurora-accent-deep)]' :
                      'bg-[color-mix(in_oklch,var(--aurora-sky)_28%,transparent)] text-[color:var(--aurora-accent-deep)]'
                    }`}>
                      {sub.status === 'sent' ? 'Submitted' : sub.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Callbacks */}
      <UpcomingCallbacks />
    </div>
  );
}
