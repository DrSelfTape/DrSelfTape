import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Sparkles, Mic, BookOpen, Users2, Target, ChevronDown, ChevronUp, Radio, MessageSquare, Gift, ShoppingBag, Camera } from 'lucide-react';
import StatsCard from '../../../components/StatsCard.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { fetchAuditionStatsThunk } from '../../../redux/features/auditions/auditionsSlice';
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
  film: '#D4A85F',
  commercial: '#3b82f6',
  theatrical: '#8b5cf6',
  industrial: '#6b7280',
  theater: '#22c55e',
  voiceover: '#eab308',
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
const GRADIENT_WELCOME = 'from-[#FFFFFF] via-[#F4F4EE] to-[rgba(212,168,95,0.10)]';
const GRADIENT_PRACTICE = 'from-[#FFFFFF] via-[#FAFAF7] to-[rgba(255,130,128,0.08)]';
const GRADIENT_CONNECT = 'from-[#FFFFFF] via-[#F4F4EE] to-[rgba(159,230,180,0.10)]';
const GRADIENT_TRACK = 'from-[#FFFFFF] via-[#FAFAF7] to-[rgba(96,165,250,0.10)]';

// Ordered onboarding sequence — first incomplete step wins. Most map to
// keys in tutorial_progress; "headshot" is mirrored there as well by
// the TutorialChecklist's auto-detect effect.
const ONBOARDING_STEPS = [
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
    description: 'Pick a genre and tone — get custom audition sides in seconds.',
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
  useEffect(() => {
    if (settingsLoaded && !onboardingSeen) {
      const timer = setTimeout(() => setShowOnboarding(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [settingsLoaded, onboardingSeen]);

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
    color: TYPE_COLORS[key] || '#D4A85F',
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
    <div className="space-y-4 sm:space-y-6">
      {showOnboarding && <ReaderOnboardingModal onClose={() => setShowOnboarding(false)} />}
      {showTutorialAchievement && <TutorialAchievement show onClose={() => setShowTutorialAchievement(false)} />}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A]" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: '-0.5px' }}>{greeting}</h1>
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
        className={`aurora-glow bg-gradient-to-r ${nextStep.gradient} rounded-2xl p-6 border border-[rgba(10,10,10,0.08)] cursor-pointer transition-all duration-300 group relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,_rgba(212,168,95,0.1),_transparent_60%)]" />
        <div className="relative flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-[#D4A85F]/10 flex items-center justify-center shrink-0">
            <nextStep.icon className="w-7 h-7 text-[#7A5A18]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[#0A0A0A] text-xl font-bold">{nextStep.title}</h2>
            <p className="text-[rgba(10,10,10,0.62)] text-sm mt-1">{nextStep.description}</p>
          </div>
          <button className="bg-[#D4A85F] hover:bg-[#C09850] text-[#0A0A0A] font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 group-hover:shadow-lg group-hover:shadow-[#FF8280]/30 whitespace-nowrap cursor-pointer text-sm shrink-0">
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
            className="bg-white border border-[rgba(10,10,10,0.08)] rounded-2xl p-4 text-center hover:border-[#D4A85F]/30 hover:bg-[#F4F4EE] transition-all cursor-pointer group"
          >
            <span className="text-2xl block mb-2">{item.icon}</span>
            <p className="text-[#0A0A0A] text-sm font-semibold">{item.label}</p>
            <p className="text-[rgba(10,10,10,0.4)] text-xs mt-0.5">{item.desc}</p>
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
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest cursor-pointer hover:text-[#7A5A18] transition-colors"
            style={{ color: 'var(--text-secondary, #8a9a96)' }}
          >
            Analytics
            {showAnalytics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAnalytics && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Audition Breakdown by Type — Donut */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">By Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {typeData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                            {typeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip formatter={(value, name) => [value, name]} />
                          <Legend verticalAlign="bottom" iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-[rgba(10,10,10,0.62)]">{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-[#888888] text-center py-12">No audition data yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Pipeline Funnel */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Audition Pipeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={funnelData} layout="vertical" barSize={24}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#888888' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: '#999999', fontWeight: 500 }} axisLine={false} tickLine={false} width={90} />
                        <Tooltip formatter={(value) => [value, 'Auditions']} contentStyle={{ borderRadius: '8px', border: '1px solid #3A3A3A', backgroundColor: '#1E1E1E', color: '#fff' }} />
                        <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                          {funnelData.map((_, i) => <Cell key={i} fill={`rgba(212,168,95, ${1 - i * 0.2})`} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      ) : null /* Empty state removed — Smart Next Step banner + Get
                   Started checklist already prompt this same action.
                   Three CTAs for "log your first audition" was noisy. */}

      {/* Recent Submissions — only when data exists */}
      {recentSubs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Submissions</CardTitle>
              <button onClick={() => navigate('/dashboard/submissions')} className="text-xs text-[#7A5A18] hover:underline font-medium">View all &rarr;</button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-[#1E1E1E]">
              {recentSubs.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#0A0A0A] truncate">{sub.project_name}</p>
                    <p className="text-xs text-[#AAAAAA] truncate">{sub.role} {sub.casting_director ? `· ${sub.casting_director}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <span className="text-xs text-[#888888]">
                      {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      sub.status === 'callback' ? 'bg-orange-500/10 text-orange-400' :
                      sub.status === 'booked' ? 'bg-green-500/10 text-green-400' :
                      sub.status === 'viewed' ? 'bg-purple-500/10 text-purple-400' :
                      'bg-blue-500/10 text-blue-400'
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
