import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import StatsCard from '../../../components/StatsCard.jsx';
import { fetchSubmissionsThunk } from '../../../redux/features/submissions/submissionsSlice';
import { fetchAuditionsThunk } from '../../../redux/features/auditions/auditionsSlice';

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = ['Roster', 'Submissions', 'Auditions', 'Reports'];

const STATUS_BADGE = {
  sent:     'bg-blue-100 text-blue-700',
  viewed:   'bg-purple-100 text-purple-700',
  callback: 'bg-orange-100 text-orange-700',
  passed:   'bg-gray-100 text-gray-600',
  booked:   'bg-green-100 text-green-700',
};

const STATUS_LABELS = {
  sent: 'Sent', viewed: 'Viewed', callback: 'Callback', passed: 'Passed', booked: 'Booked',
};

const VIA_LABELS = {
  self_submitted: 'Self', agent: 'Agent', manager: 'Manager',
  casting_network: 'Casting Network', actors_access: 'Actors Access', other: 'Other',
};

const STATUS_FILTERS = ['all', 'sent', 'callback', 'booked', 'passed'];

// Demo roster — will be replaced by real API data when agent-actor relationships are built
const DEMO_ROSTER = [
  { id: 1, name: 'Maya Johnson', email: 'maya@example.com', initials: 'MJ', bookingRate: 18, lastActivity: '2026-03-18' },
  { id: 2, name: 'Carlos Rivera', email: 'carlos@example.com', initials: 'CR', bookingRate: 24, lastActivity: '2026-03-15' },
  { id: 3, name: 'Aisha Patel', email: 'aisha@example.com', initials: 'AP', bookingRate: 12, lastActivity: '2026-03-19' },
  { id: 4, name: 'Jordan Lee', email: 'jordan@example.com', initials: 'JL', bookingRate: 31, lastActivity: '2026-03-10' },
  { id: 5, name: 'Samantha Brooks', email: 'sam@example.com', initials: 'SB', bookingRate: 9, lastActivity: '2026-03-20' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function weeksAgo(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() - n * 7);
  return d;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

const SkeletonRow = () => (
  <div className="animate-pulse flex gap-4 py-4">
    <div className="h-4 bg-gray-200 rounded w-1/6" />
    <div className="h-4 bg-gray-200 rounded w-1/4" />
    <div className="h-4 bg-gray-200 rounded w-1/6" />
    <div className="h-4 bg-gray-200 rounded w-1/8" />
    <div className="h-4 bg-gray-200 rounded w-1/8" />
  </div>
);

// ─── Sub-components ──────────────────────────────────────────────────────────

function RosterTab() {
  const roster = DEMO_ROSTER;

  if (roster.length === 0) {
    return (
      <div className="text-center py-20">
        <svg className="mx-auto mb-4 text-gray-300 w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-gray-500 font-medium">No actors on your roster yet.</p>
        <p className="text-sm text-gray-400 mt-1">Actors will appear here once they link to your agency.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {roster.map((actor) => (
        <Card key={actor.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-11 h-11 rounded-full bg-[#ff6b35] flex items-center justify-center text-white font-bold text-sm shrink-0">
                {actor.initials}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 truncate">{actor.name}</h4>
                <p className="text-xs text-gray-500 truncate">{actor.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold px-2.5 py-0.5 rounded-full ${actor.bookingRate >= 20 ? 'bg-green-100 text-green-700' : actor.bookingRate >= 10 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                {actor.bookingRate}% booking rate
              </span>
              <span className="text-gray-400">Active {formatDate(actor.lastActivity)}</span>
            </div>
            <button className="mt-4 w-full text-center text-sm font-medium text-[#ff6b35] hover:bg-orange-50 py-2 rounded-lg transition-colors cursor-pointer">
              View Profile
            </button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SubmissionsTab() {
  const dispatch = useDispatch();
  const { submissions, loading } = useSelector((state) => state.submissions);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    dispatch(fetchSubmissionsThunk());
  }, [dispatch]);

  const list = Array.isArray(submissions) ? submissions : [];
  const filtered = statusFilter === 'all' ? list : list.filter((s) => s.status === statusFilter);
  const sorted = [...filtered].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-6 border-b border-gray-200">
        {STATUS_FILTERS.map((tab) => {
          const count = tab === 'all' ? list.length : list.filter((s) => s.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`pb-2.5 text-sm font-medium capitalize transition ${
                statusFilter === tab ? 'border-b-2 text-gray-900' : 'text-gray-400 hover:text-gray-600'
              }`}
              style={statusFilter === tab ? { borderColor: '#ff6b35' } : undefined}
            >
              {tab} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <SkeletonRow key={i} />)}</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500">No submissions found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Actor</th>
                <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Project</th>
                <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Role</th>
                <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Via</th>
                <th className="pb-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((sub) => (
                <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-3 text-gray-900 font-medium">{sub.actor_name || '—'}</td>
                  <td className="py-3 text-gray-700">{sub.project_name}</td>
                  <td className="py-3 text-gray-600">{sub.role || '—'}</td>
                  <td className="py-3">
                    <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${STATUS_BADGE[sub.status] || STATUS_BADGE.sent}`}>
                      {STATUS_LABELS[sub.status] || sub.status}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500 text-xs">{VIA_LABELS[sub.submitted_via] || sub.submitted_via || '—'}</td>
                  <td className="py-3 text-gray-400 text-xs">{formatDate(sub.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AuditionsTab() {
  const dispatch = useDispatch();
  const { auditions, loading } = useSelector((state) => state.auditions);

  useEffect(() => {
    dispatch(fetchAuditionsThunk());
  }, [dispatch]);

  const list = Array.isArray(auditions) ? auditions : [];
  const upcoming = list
    .filter((a) => a.status === 'callback' || a.status === 'booked')
    .sort((a, b) => new Date(a.audition_date || a.created_at) - new Date(b.audition_date || b.created_at));

  if (loading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <SkeletonRow key={i} />)}</div>;
  }

  if (upcoming.length === 0) {
    return (
      <div className="text-center py-16">
        <svg className="mx-auto mb-4 text-gray-300 w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-gray-500">No upcoming callbacks or bookings.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {upcoming.map((aud) => (
        <Card key={aud.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900 truncate">{aud.project_title || aud.project_name || 'Untitled'}</h4>
              <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[aud.status]}`}>
                {STATUS_LABELS[aud.status]}
              </span>
            </div>
            {aud.character_name && (
              <p className="text-xs text-gray-600 mb-1">Character: {aud.character_name}</p>
            )}
            {aud.actor_name && (
              <p className="text-xs text-gray-500 mb-1">Actor: {aud.actor_name}</p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              {formatDate(aud.audition_date || aud.created_at)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ReportsTab() {
  const { submissions } = useSelector((state) => state.submissions);
  const { auditions } = useSelector((state) => state.auditions);

  const list = Array.isArray(submissions) ? submissions : [];
  const audList = Array.isArray(auditions) ? auditions : [];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalActors = DEMO_ROSTER.length;
  const submissionsThisMonth = list.filter((s) => new Date(s.submitted_at) >= monthStart).length;
  const callbacks = list.filter((s) => s.status === 'callback').length;
  const bookingsThisMonth = list.filter((s) => s.status === 'booked' && new Date(s.submitted_at) >= monthStart).length;
  const callbackRate = list.length > 0 ? Math.round((callbacks / list.length) * 100) : 0;

  // Submissions by week (last 8 weeks)
  const weeklyData = useMemo(() => {
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const start = weeksAgo(now, i + 1);
      const end = weeksAgo(now, i);
      const count = list.filter((s) => {
        const d = new Date(s.submitted_at);
        return d >= start && d < end;
      }).length;
      weeks.push({
        week: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        submissions: count,
      });
    }
    return weeks;
  }, [list]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Total Actors" value={String(totalActors)} />
        <StatsCard title="Submissions This Month" value={String(submissionsThisMonth)} />
        <StatsCard title="Callback Rate" value={`${callbackRate}%`} />
        <StatsCard title="Bookings This Month" value={String(bookingsThisMonth)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Submissions by Week</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weeklyData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  formatter={(value) => [value, 'Submissions']}
                />
                <Bar dataKey="submissions" fill="#ff6b35" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">No submission data yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AgentPortal() {
  const [activeTab, setActiveTab] = useState('Roster');

  const renderTab = () => {
    switch (activeTab) {
      case 'Roster':      return <RosterTab />;
      case 'Submissions': return <SubmissionsTab />;
      case 'Auditions':   return <AuditionsTab />;
      case 'Reports':     return <ReportsTab />;
      default:            return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agent Portal</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your roster, track submissions, and monitor performance.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {renderTab()}
    </div>
  );
}
