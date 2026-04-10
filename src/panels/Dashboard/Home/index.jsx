import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Sparkles, Mic, BookOpen, Users2, Target, ChevronDown, ChevronUp } from 'lucide-react';
import StatsCard from '../../../components/StatsCard.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { fetchAuditionStatsThunk } from '../../../redux/features/auditions/auditionsSlice';
import { fetchSubmissionsThunk } from '../../../redux/features/submissions/submissionsSlice';
import { fetchMatchingStats } from '../../../redux/features/readers/readersMatchSlice';
import AuditionBadges from '../../../components/AuditionBadges';
import UpcomingCallbacks from '../../../components/UpcomingCallbacks';
import PendingLikesBanner from '../../../components/Dashboard/PendingLikesBanner';
import AvailabilityToggle from '../../../components/Dashboard/AvailabilityToggle';
import ReaderOnboardingModal from '../../../components/Dashboard/ReaderOnboardingModal';
import NotificationBell from '../../../components/Dashboard/NotificationBell';
import TutorialChecklist from '../../../components/Dashboard/TutorialChecklist';
import TutorialAchievement from '../../../components/Dashboard/TutorialAchievement';
import DailyChallengeCard from '../../../components/Dashboard/DailyChallengeCard';

const TYPE_COLORS = {
  film: '#C855F0',
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

/* ── Smart Next Step — figures out what the user should do next ── */
function useNextStep({ profile, stats, submissions }) {
  const hasHeadshot = profile?.actor_profile?.headshot;
  const hasAuditions = (stats?.data?.total || 0) > 0;
  const hasSubs = Array.isArray(submissions) && submissions.length > 0;

  if (!hasHeadshot) {
    return {
      title: 'Complete your profile',
      description: 'Add a headshot so scene partners can find you.',
      cta: 'Add Headshot',
      path: '/dashboard/profile',
      icon: Users2,
      gradient: 'from-[#1a1a2e] to-[#16213e]',
    };
  }

  if (!hasAuditions && !hasSubs) {
    return {
      title: 'Generate your first scene',
      description: 'Pick a genre and tone — get custom audition sides in seconds.',
      cta: 'Generate a Scene',
      path: '/dashboard/generator',
      icon: Sparkles,
      gradient: 'from-[#1a1a2e] via-[#16213e] to-[#0f0f23]',
    };
  }

  if (!hasSubs) {
    return {
      title: 'Practice with AI',
      description: 'Run your scene with an AI partner and record your take.',
      cta: 'Start Practicing',
      path: '/dashboard/scene-study',
      icon: Mic,
      gradient: 'from-[#0f0f23] via-[#16213e] to-[#1a1a2e]',
    };
  }

  // Returning user — suggest continuing their work
  return {
    title: 'Ready to work?',
    description: 'Jump back into scene study or try the AI acting coach for notes.',
    cta: 'Continue Practicing',
    path: '/dashboard/scene-study',
    icon: BookOpen,
    gradient: 'from-[#1a1a2e] to-[#0f0f23]',
  };
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

    // Show onboarding for first-time users
    if (!localStorage.getItem('reader_onboarding_seen')) {
      const timer = setTimeout(() => setShowOnboarding(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [dispatch]);

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
    color: TYPE_COLORS[key] || '#C855F0',
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
    <div className="space-y-6">
      {showOnboarding && <ReaderOnboardingModal onClose={() => setShowOnboarding(false)} />}
      {showTutorialAchievement && <TutorialAchievement show onClose={() => setShowTutorialAchievement(false)} />}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: '-0.5px' }}>{greeting}</h1>
        </div>
        <div className="flex items-center gap-3">
          <AvailabilityToggle />
          <NotificationBell />
        </div>
      </div>

      {/* ── Pending Matches Banner ── */}
      <PendingLikesBanner />

      {/* ── Smart Next Step — ONE primary CTA ── */}
      <div
        onClick={() => navigate(nextStep.path)}
        className={`bg-gradient-to-r ${nextStep.gradient} rounded-2xl p-6 border border-[#2a2a4a] cursor-pointer hover:shadow-xl hover:shadow-[#C855F0]/10 transition-all duration-300 group relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,_rgba(200,85,240,0.1),_transparent_60%)]" />
        <div className="relative flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-[#C855F0]/10 flex items-center justify-center shrink-0">
            <nextStep.icon className="w-7 h-7 text-[#C855F0]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white text-xl font-bold">{nextStep.title}</h2>
            <p className="text-gray-400 text-sm mt-1">{nextStep.description}</p>
          </div>
          <button className="bg-[#C855F0] hover:bg-[#A040C8] text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 group-hover:shadow-lg group-hover:shadow-[#C855F0]/30 whitespace-nowrap cursor-pointer text-sm shrink-0">
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
            className="bg-[#13151d] border border-[#2a2a4a] rounded-2xl p-4 text-center hover:border-[#C855F0]/30 hover:bg-[#1a1c26] transition-all cursor-pointer group"
          >
            <span className="text-2xl block mb-2">{item.icon}</span>
            <p className="text-white text-sm font-semibold">{item.label}</p>
            <p className="text-[#666] text-xs mt-0.5">{item.desc}</p>
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
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest cursor-pointer hover:text-[#C855F0] transition-colors"
            style={{ color: 'var(--text-secondary, #8a9a96)' }}
          >
            Analytics
            {showAnalytics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAnalytics && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                          <Legend verticalAlign="bottom" iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-[#999999]">{value}</span>} />
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
                          {funnelData.map((_, i) => <Cell key={i} fill={`rgba(200, 85, 240, ${1 - i * 0.2})`} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      ) : (
        /* ── Empty State for New Users ── */
        <div className="bg-[#13151d] border border-[#2a2a4a] rounded-2xl p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#C855F0]/10 flex items-center justify-center mb-4">
            <Target className="w-6 h-6 text-[#C855F0]" />
          </div>
          <h3 className="text-white font-semibold text-lg">Your stats will appear here</h3>
          <p className="text-[#888] text-sm mt-2 max-w-md mx-auto">
            Once you start tracking auditions and submitting self-tapes, you'll see your callbacks, booking rate, and pipeline analytics right here.
          </p>
          <button
            onClick={() => navigate('/dashboard/auditions')}
            className="mt-4 text-[#C855F0] text-sm font-semibold hover:underline cursor-pointer"
          >
            Log your first audition &rarr;
          </button>
        </div>
      )}

      {/* Recent Submissions — only when data exists */}
      {recentSubs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Submissions</CardTitle>
              <button onClick={() => navigate('/dashboard/submissions')} className="text-xs text-[#C855F0] hover:underline font-medium">View all &rarr;</button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-[#1E1E1E]">
              {recentSubs.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{sub.project_name}</p>
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
