import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import StatsCard from '../../../components/StatsCard.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { fetchReportsThunk } from '../../../redux/features/reports/reportsSlice';

const TYPE_COLORS = {
  film: '#ff6b35',
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

const RANGE_OPTIONS = [
  { label: 'Last 30 days', value: '30d' },
  { label: '3 months', value: '3m' },
  { label: '6 months', value: '6m' },
  { label: 'All time', value: 'all' },
];

const LoadingSkeleton = ({ className = 'h-28' }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

export default function Reports() {
  const dispatch = useDispatch();
  const { data, loading, error } = useSelector((state) => state.reports);
  const [range, setRange] = useState('6m');

  useEffect(() => {
    dispatch(fetchReportsThunk());
  }, [dispatch]);

  const r = data || {};
  const hasData = r.total_auditions > 0;

  // Funnel data
  const funnelData = [
    { name: 'Auditioned', value: r.total_auditions || 0 },
    { name: 'Callback', value: Math.round(((r.callback_rate || 0) / 100) * (r.total_auditions || 0)) },
    { name: 'Booked', value: r.total_booked || 0 },
  ];

  // Type donut data
  const typeData = Object.entries(r.type_breakdown || {}).map(([key, count]) => ({
    name: TYPE_LABELS[key] || key,
    value: count,
    color: TYPE_COLORS[key] || '#ff6b35',
  }));

  if (!loading && error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Career Reports</h1>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Could not load reports</h2>
          <p className="text-gray-500 max-w-md mb-6">Please try again.</p>
          <button
            onClick={() => dispatch(fetchReportsThunk())}
            className="px-5 py-2.5 bg-[#ff6b35] hover:bg-[#e55a2b] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!loading && !hasData) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Career Reports</h1>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No data yet</h2>
          <p className="text-gray-500 max-w-md">
            Start tracking auditions to see your career insights here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Career Reports</h1>
        <div className="flex gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                range === opt.value
                  ? 'bg-[#ff6b35] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <LoadingSkeleton key={i} />)
        ) : (
          <>
            <StatsCard title="Total Auditions" value={String(r.total_auditions || 0)} change="" positive />
            <StatsCard title="Total Submissions" value={String(r.total_submissions || 0)} change="" positive />
            <StatsCard title="Booked" value={String(r.total_booked || 0)} change="" positive />
            <StatsCard title="Booking Rate" value={`${r.booking_rate || 0}%`} change="" positive />
          </>
        )}
      </div>

      {/* Row 1: Line Charts */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadingSkeleton className="h-72" />
          <LoadingSkeleton className="h-72" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Auditions Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Auditions Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={r.auditions_by_month || []}>
                  <defs>
                    <linearGradient id="colorAuditions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff6b35" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ff6b35" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  <Area type="monotone" dataKey="count" stroke="#ff6b35" strokeWidth={2} fill="url(#colorAuditions)" name="Auditions" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Submissions Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Submissions Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={r.submissions_by_month || []}>
                  <defs>
                    <linearGradient id="colorSubs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#colorSubs)" name="Submissions" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Row 2: Donut + Funnel */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadingSkeleton className="h-72" />
          <LoadingSkeleton className="h-72" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Audition Types — Donut */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Audition Types</CardTitle>
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
                      formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-12">No type data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Booking Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Booking Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={funnelData} layout="vertical" barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: '#374151', fontWeight: 500 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip formatter={(value) => [value, 'Auditions']} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {funnelData.map((_, i) => (
                      <Cell key={i} fill={`rgba(255, 107, 53, ${1 - i * 0.25})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bottom: Top Casting Offices + Busiest Month */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadingSkeleton className="h-64" />
          <LoadingSkeleton className="h-64" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Casting Offices */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Top Casting Offices</CardTitle>
            </CardHeader>
            <CardContent>
              {(r.top_casting_offices || []).length > 0 ? (
                <div className="space-y-3">
                  {r.top_casting_offices.map((office, i) => {
                    const maxCount = r.top_casting_offices[0]?.count || 1;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 w-40 truncate">{office.name}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-[#ff6b35] h-full rounded-full transition-all"
                            style={{ width: `${(office.count / maxCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-600 w-8 text-right">{office.count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">No casting office data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Busiest Month */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Busiest Month</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-8">
              {r.busiest_month ? (
                <>
                  <div className="text-4xl font-bold text-[#ff6b35] mb-2">{r.busiest_month}</div>
                  <p className="text-sm text-gray-500">Your most active month for auditions</p>
                </>
              ) : (
                <p className="text-sm text-gray-400">Not enough data yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
