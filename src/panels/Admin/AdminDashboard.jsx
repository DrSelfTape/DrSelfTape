import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Users,
  UserCheck,
  DollarSign,
  UserPlus,
  MessageSquare,
  ShieldBan,
  Activity,
  Clock,
  Building2,
  UserX,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchAdminStats } from '../../redux/features/admin/adminSlice';
import AdminStatCard from './components/AdminStatCard';

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const { stats, statsLoading, statsError } = useSelector((state) => state.admin);

  useEffect(() => {
    dispatch(fetchAdminStats());
  }, [dispatch]);

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#D4A85F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Labels below are deliberately literal about what each number counts —
  // "Total Users" mixes organic app signups with bulk-imported studio
  // clients, so the split and the never-logged-in count sit right next to
  // it instead of implying every row is an organic, engaged user.
  const statCards = [
    {
      icon: Users,
      label: 'Total Users',
      value: stats?.total_users?.toLocaleString() ?? 'Unavailable',
      trend: stats?.total_users_trend,
      trendLabel: 'vs last month',
    },
    {
      icon: UserPlus,
      label: 'Organic Users',
      value: stats?.organic_users?.toLocaleString() ?? 'Unavailable',
      trendLabel: 'signed up in the app',
    },
    {
      icon: Building2,
      label: 'Studio Clients (Imported)',
      value: stats?.studio_imported_users?.toLocaleString() ?? 'Unavailable',
      trendLabel: 'bulk-imported, not app signups',
    },
    {
      icon: UserCheck,
      label: 'Active (30d)',
      value: stats?.active_users?.toLocaleString() ?? 'Unavailable',
      trend: stats?.active_users_trend,
      trendLabel: 'vs prior 30d',
    },
    {
      icon: Activity,
      label: 'Active (7d)',
      value: stats?.active_users_7d?.toLocaleString() ?? 'Unavailable',
      trendLabel: 'logged in this week',
    },
    {
      icon: Clock,
      label: 'Active (1d)',
      value: stats?.active_users_1d?.toLocaleString() ?? 'Unavailable',
      trendLabel: 'logged in today',
    },
    {
      icon: UserX,
      label: 'Never Opened The App',
      value: stats?.never_logged_in?.toLocaleString() ?? 'Unavailable',
      trendLabel: 'created, never logged in',
    },
    {
      icon: DollarSign,
      label: 'Total Revenue',
      value: stats?.total_revenue == null ? 'Unavailable' : `$${stats.total_revenue.toLocaleString()}`,
      trend: stats?.revenue_trend,
      trendLabel: 'vs last month',
    },
    {
      icon: UserPlus,
      label: 'New Signups (Organic)',
      value: stats?.new_signups?.toLocaleString() ?? 'Unavailable',
      trend: stats?.signups_trend,
      trendLabel: 'this month, excludes studio imports',
    },
    {
      icon: MessageSquare,
      label: 'Pending Messages',
      value: stats?.pending_messages?.toLocaleString() ?? 'Unavailable',
      trend: stats?.messages_trend,
      trendLabel: 'vs last week',
    },
    {
      icon: ShieldBan,
      label: 'Banned Users',
      value: stats?.banned_users?.toLocaleString() ?? 'Unavailable',
      trend: stats?.banned_trend,
      trendLabel: 'vs last month',
    },
  ];

  const chartData = Array.isArray(stats?.signups_over_time) ? stats.signups_over_time : null;

  return (
    <div className="space-y-8">
      {statsError && (
        <p role="alert" className="text-amber-200">
          Dashboard data is unavailable. Please reload to try again.
        </p>
      )}
      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((card) => (
          <AdminStatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Signups Chart */}
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
        <h3 className="text-lg font-bold text-white mb-6">Signups Over Time</h3>
        <div className="h-80">
          {!chartData || chartData.length === 0 ? (
            <p className="text-gray-400">
              {chartData ? 'No signup data for this period.' : 'Signup data unavailable.'}
            </p>
          ) : <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#666666' }}
                axisLine={{ stroke: '#3A3A3A' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#666666' }}
                axisLine={{ stroke: '#3A3A3A' }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E1E1E',
                  border: '1px solid #3A3A3A',
                  borderRadius: '12px',
                  fontSize: '13px',
                  color: '#fff',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                }}
              />
              <Line
                type="monotone"
                dataKey="signups"
                stroke="#FF8280"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#FF8280', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#FF8280', strokeWidth: 2, stroke: '#1A1A1A' }}
              />
            </LineChart>
          </ResponsiveContainer>}
        </div>
      </div>
    </div>
  );
}
