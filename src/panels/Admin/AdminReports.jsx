import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Users, UserPlus, Activity, DollarSign, Sparkles, MessageSquare,
  TrendingUp, TrendingDown,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { fetchAdminReports } from '../../redux/features/admin/adminSlice';

const RANGE_OPTIONS = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
  { label: 'All time', value: 'all' },
];

const PLAN_COLORS = {
  basic: '#3b82f6',
  plus: '#D4A85F',
  premium: '#FF8280',
};

const TYPE_LABELS = {
  cd_coach: 'CD Coach',
  live_scene: 'Live Scene',
  scene_generator: 'Scene Generator',
  audition_prep: 'Audition Prep',
};
const TYPE_COLORS = {
  cd_coach: '#FF8280',
  live_scene: '#D4A85F',
  scene_generator: '#3b82f6',
  audition_prep: '#22c55e',
};

function StatCard({ icon: Icon, label, value, trend, sublabel }) {
  const positive = trend > 0;
  const TrendIcon = positive ? TrendingUp : TrendingDown;
  return (
    <div className="bg-white rounded-xl border border-[rgba(10,10,10,0.08)] p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-[#D4A85F]/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#7A5A18]" />
        </div>
        {trend !== undefined && trend !== null && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-[#0A0A0A] mb-1">{value}</div>
      <div className="text-sm text-[rgba(10,10,10,0.62)]">{label}</div>
      {sublabel && <div className="text-[11px] text-[rgba(10,10,10,0.4)] mt-1">{sublabel}</div>}
    </div>
  );
}

export default function AdminReports() {
  const dispatch = useDispatch();
  const { reports, reportsLoading } = useSelector((state) => state.admin);
  const [range, setRange] = useState('30d');

  useEffect(() => {
    dispatch(fetchAdminReports(range));
  }, [dispatch, range]);

  if (reportsLoading && !reports) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#D4A85F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const k = reports?.kpi || {};
  const subBreakdown = reports?.sub_breakdown || [];
  const dailySignups = reports?.daily_signups || [];
  const dailySessions = reports?.daily_sessions || [];
  const sessionsByType = reports?.sessions_by_type || [];
  const topActors = reports?.top_actors || [];
  const tokensSpent = reports?.totals?.tokens_spent || 0;
  const dailyTokenSpend = reports?.daily_token_spend || [];

  return (
    <div className="space-y-6">
      {/* Header + range selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0A0A]">Reports</h1>
          <p className="text-sm text-[rgba(10,10,10,0.62)] mt-1">
            App-wide telemetry. Numbers update every page load.
          </p>
        </div>
        <div className="inline-flex bg-[#F4F4EE] rounded-lg p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRange(opt.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                range === opt.value
                  ? 'bg-white text-[#0A0A0A] shadow-sm'
                  : 'text-[rgba(10,10,10,0.62)] hover:text-[#0A0A0A]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total users"
          value={(k.total_users ?? 0).toLocaleString()}
        />
        <StatCard
          icon={UserPlus}
          label="New signups"
          value={(k.new_signups ?? 0).toLocaleString()}
          trend={k.signups_trend}
          sublabel={`in this ${range === 'all' ? 'period' : range}`}
        />
        <StatCard
          icon={Activity}
          label="MAU / DAU"
          value={`${(k.mau ?? 0).toLocaleString()} / ${(k.dau ?? 0).toLocaleString()}`}
          sublabel="last 30d / last 24h"
        />
        <StatCard
          icon={DollarSign}
          label="MRR"
          value={`$${(k.mrr ?? 0).toLocaleString()}`}
          sublabel={`${k.paying_subscribers ?? 0} paying`}
        />
        <StatCard
          icon={Sparkles}
          label="Sessions logged"
          value={(k.total_sessions ?? 0).toLocaleString()}
          sublabel={`in this ${range === 'all' ? 'period' : range}`}
        />
        <StatCard
          icon={MessageSquare}
          label="AI tokens spent"
          value={tokensSpent.toLocaleString()}
          sublabel={`across ${dailyTokenSpend.length} days`}
        />
        <StatCard
          icon={Users}
          label="Free users"
          value={(k.free_users ?? 0).toLocaleString()}
          sublabel={`vs ${k.paying_subscribers ?? 0} paying`}
        />
        <StatCard
          icon={UserPlus}
          label="Conversion"
          value={
            k.total_users
              ? `${((k.paying_subscribers ?? 0) / k.total_users * 100).toFixed(1)}%`
              : '0%'
          }
          sublabel="paying / total"
        />
      </div>

      {/* Signups + Sessions charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[rgba(10,10,10,0.08)] p-5">
          <h3 className="text-sm font-bold text-[#0A0A0A] mb-4">Daily signups</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailySignups}>
              <defs>
                <linearGradient id="signupsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D4A85F" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#D4A85F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,10,10,0.06)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(10,10,10,0.5)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(10,10,10,0.5)' }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#D4A85F" strokeWidth={2} fill="url(#signupsGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-[rgba(10,10,10,0.08)] p-5">
          <h3 className="text-sm font-bold text-[#0A0A0A] mb-4">Daily sessions</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailySessions}>
              <defs>
                <linearGradient id="sessionsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF8280" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#FF8280" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,10,10,0.06)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(10,10,10,0.5)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(10,10,10,0.5)' }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#FF8280" strokeWidth={2} fill="url(#sessionsGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subscription + Session type distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[rgba(10,10,10,0.08)] p-5">
          <h3 className="text-sm font-bold text-[#0A0A0A] mb-4">Subscription distribution</h3>
          {subBreakdown.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={subBreakdown}
                    dataKey="count"
                    nameKey="plan"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={(entry) => entry.plan}
                  >
                    {subBreakdown.map((entry) => (
                      <Cell key={entry.plan} fill={PLAN_COLORS[entry.plan] || '#999'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {subBreakdown.map((s) => (
                  <div key={s.plan} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ background: PLAN_COLORS[s.plan] || '#999' }}
                      />
                      <span className="capitalize">{s.plan}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{s.count}</div>
                      <div className="text-[11px] text-[rgba(10,10,10,0.4)]">
                        ${s.monthly_revenue.toLocaleString()} / mo
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[rgba(10,10,10,0.4)]">No active subscriptions yet.</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[rgba(10,10,10,0.08)] p-5">
          <h3 className="text-sm font-bold text-[#0A0A0A] mb-4">Sessions by feature</h3>
          {sessionsByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sessionsByType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,10,10,0.06)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(10,10,10,0.5)' }} />
                <YAxis
                  type="category"
                  dataKey="type"
                  tick={{ fontSize: 11, fill: 'rgba(10,10,10,0.6)' }}
                  tickFormatter={(v) => TYPE_LABELS[v] || v}
                  width={110}
                />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {sessionsByType.map((entry) => (
                    <Cell key={entry.type} fill={TYPE_COLORS[entry.type] || '#D4A85F'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[rgba(10,10,10,0.4)]">No sessions logged in this period.</p>
          )}
        </div>
      </div>

      {/* Top actors */}
      <div className="bg-white rounded-xl border border-[rgba(10,10,10,0.08)] p-5">
        <h3 className="text-sm font-bold text-[#0A0A0A] mb-4">Top engaged actors</h3>
        {topActors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-[rgba(10,10,10,0.4)] border-b border-[rgba(10,10,10,0.06)]">
                  <th className="pb-3 pl-2">Rank</th>
                  <th className="pb-3">Actor</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3 text-right pr-2">Sessions</th>
                </tr>
              </thead>
              <tbody>
                {topActors.map((a, i) => (
                  <tr key={a.user_id} className="border-b border-[rgba(10,10,10,0.04)]">
                    <td className="py-3 pl-2 font-mono text-[rgba(10,10,10,0.4)]">#{i + 1}</td>
                    <td className="py-3 font-medium">{a.name}</td>
                    <td className="py-3 text-[rgba(10,10,10,0.62)]">{a.email}</td>
                    <td className="py-3 text-right pr-2 font-bold">{a.sessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[rgba(10,10,10,0.4)]">No session activity yet.</p>
        )}
      </div>
    </div>
  );
}
