import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import StatsCard from '../../../components/StatsCard.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { fetchAuditionStatsThunk } from '../../../redux/features/auditions/auditionsSlice';
// bookingsSlice removed — booking features deprecated
import { fetchSubmissionsThunk } from '../../../redux/features/submissions/submissionsSlice';
import { fetchMatchingStats } from '../../../redux/features/readers/readersMatchSlice';
import AuditionBadges from '../../../components/AuditionBadges';
import UpcomingCallbacks from '../../../components/UpcomingCallbacks';
import FindAReaderCTA from '../../../components/Dashboard/FindAReaderCTA';
import PendingLikesBanner from '../../../components/Dashboard/PendingLikesBanner';
import AvailabilityToggle from '../../../components/Dashboard/AvailabilityToggle';
import ReaderOnboardingModal from '../../../components/Dashboard/ReaderOnboardingModal';
import NotificationBell from '../../../components/Dashboard/NotificationBell';

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

const LoadingSkeleton = () => (
  <div className="animate-pulse bg-[#2A2A2A] rounded-xl h-28" />
);

export default function DashboardHome() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { stats } = useSelector((state) => state.auditions);
  const bookings = [];
  const bookingsLoading = false;
  const { submissions } = useSelector((state) => state.submissions);

  const [showOnboarding, setShowOnboarding] = useState(false);

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

  const recentSubs = Array.isArray(submissions) ? submissions.slice(0, 6) : [];

  const s = stats.data || {};
  const isLoading = stats.loading;

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

  return (
    <div className="space-y-6">
      {showOnboarding && <ReaderOnboardingModal onClose={() => setShowOnboarding(false)} />}

      <PendingLikesBanner />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="flex items-center gap-3">
          <AvailabilityToggle />
          <NotificationBell />
          {stats?.data && <AuditionBadges stats={stats.data} compact={true} />}
        </div>
      </div>

      {/* Find a Reader CTA */}
      <FindAReaderCTA />

      {/* Feature Banners */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* AI Scene Generator Banner */}
        <div
          onClick={() => navigate('/dashboard/generator')}
          className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f0f23] rounded-2xl p-6 border border-[#2a2a4a] cursor-pointer hover:shadow-xl hover:shadow-[#C855F0]/10 transition-all duration-300 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,_rgba(200,85,240,0.12),_transparent_60%)]" />
          <div className="relative">
            <h2 className="text-white text-xl font-bold flex items-center gap-2">
              Try AI Scene Generator
            </h2>
            <p className="text-gray-400 text-sm mt-1 mb-4">
              Pick a genre, character &amp; tone — get a custom audition scene in seconds.
            </p>
            <button className="bg-[#C855F0] hover:bg-[#A040C8] text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 group-hover:shadow-lg group-hover:shadow-[#C855F0]/30 whitespace-nowrap cursor-pointer text-sm">
              Generate a Scene &rarr;
            </button>
          </div>
        </div>

        {/* Live Scene Mode Banner */}
        <div
          onClick={() => navigate('/dashboard/scene-study')}
          className="bg-gradient-to-r from-[#0f0f23] via-[#16213e] to-[#1a1a2e] rounded-2xl p-6 border border-[#2a2a4a] cursor-pointer hover:shadow-xl hover:shadow-[#C855F0]/10 transition-all duration-300 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_rgba(200,85,240,0.15),_transparent_60%)]" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#C855F0] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">New</span>
              <h2 className="text-white text-xl font-bold">Live Scene Mode</h2>
            </div>
            <p className="text-gray-400 text-sm mt-1 mb-4">
              Hands-free AI scene partner. Say your lines — get instant voice responses in real-time.
            </p>
            <button className="bg-[#C855F0] hover:bg-[#A040C8] text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 group-hover:shadow-lg group-hover:shadow-[#C855F0]/30 whitespace-nowrap cursor-pointer text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
              Go Live &rarr;
            </button>
          </div>
        </div>
        {/* CD AI Studio Banner */}
        <div
          onClick={() => navigate('/dashboard/casting-director-ai')}
          className="bg-gradient-to-br from-[#1a1c26] to-[#13151d] rounded-2xl p-5 border border-[rgba(167,236,218,0.1)] cursor-pointer hover:border-[rgba(167,236,218,0.2)] transition-all"
        >
          <h2 className="text-white text-lg font-bold flex items-center gap-2 mb-2">
            🎬 CD AI Studio
          </h2>
          <p className="text-[#8a9a96] text-sm">Scene breakdown, CD notes, audition prep & live rehearsal in one place</p>
          <button className="mt-4 px-4 py-2 bg-[#C855F0] text-white text-sm font-semibold rounded-lg">Explore →</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <LoadingSkeleton key={i} />)
          : statCards.map((stat) => <StatsCard key={stat.title} {...stat} />)}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Audition Breakdown by Type — Donut */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">By Type</CardTitle>
            </CardHeader>
            <CardContent>
              {typeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {typeData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span className="text-xs text-[#999999]">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-[#666666] text-center py-12">No audition data yet</p>
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
              {(s.total || 0) > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={funnelData} layout="vertical" barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#666666' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: '#999999', fontWeight: 500 }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip formatter={(value) => [value, 'Auditions']} contentStyle={{ borderRadius: '8px', border: '1px solid #3A3A3A', backgroundColor: '#1E1E1E', color: '#fff' }} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {funnelData.map((_, i) => (
                        <Cell key={i} fill={`rgba(200, 85, 240, ${1 - i * 0.2})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-[#666666] text-center py-12">Submit auditions to see your pipeline</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Submissions */}
      {recentSubs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Submissions</CardTitle>
              <button onClick={() => navigate('/dashboard/submissions')} className="text-xs text-[#C855F0] hover:underline font-medium">View all →</button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-[#1E1E1E]">
              {recentSubs.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{sub.project_name}</p>
                    <p className="text-xs text-[#999999] truncate">{sub.role} {sub.casting_director ? `· ${sub.casting_director}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <span className="text-xs text-[#666666]">
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
