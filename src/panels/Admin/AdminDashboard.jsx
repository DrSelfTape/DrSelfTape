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

const fallbackChartData = [
  { month: 'Jan', signups: 45 },
  { month: 'Feb', signups: 62 },
  { month: 'Mar', signups: 58 },
  { month: 'Apr', signups: 71 },
  { month: 'May', signups: 89 },
  { month: 'Jun', signups: 95 },
  { month: 'Jul', signups: 110 },
  { month: 'Aug', signups: 102 },
  { month: 'Sep', signups: 125 },
  { month: 'Oct', signups: 138 },
  { month: 'Nov', signups: 152 },
  { month: 'Dec', signups: 167 },
];

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const { stats, statsLoading } = useSelector((state) => state.admin);

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
      value: stats?.total_users?.toLocaleString() ?? '1,247',
      trend: stats?.total_users_trend ?? 12.5,
      trendLabel: 'vs last month',
    },
    {
      icon: UserPlus,
      label: 'Organic Users',
      value: stats?.organic_users?.toLocaleString() ?? '—',
      trendLabel: 'signed up in the app',
    },
    {
      icon: Building2,
      label: 'Studio Clients (Imported)',
      value: stats?.studio_imported_users?.toLocaleString() ?? '—',
      trendLabel: 'bulk-imported, not app signups',
    },
    {
      icon: UserCheck,
      label: 'Active (30d)',
      value: stats?.active_users?.toLocaleString() ?? '1,083',
      trend: stats?.active_users_trend ?? 8.2,
      trendLabel: 'vs prior 30d',
    },
    {
      icon: Activity,
      label: 'Active (7d)',
      value: stats?.active_users_7d?.toLocaleString() ?? '—',
      trendLabel: 'logged in this week',
    },
    {
      icon: Clock,
      label: 'Active (1d)',
      value: stats?.active_users_1d?.toLocaleString() ?? '—',
      trendLabel: 'logged in today',
    },
    {
      icon: UserX,
      label: 'Never Opened The App',
      value: stats?.never_logged_in?.toLocaleString() ?? '—',
      trendLabel: 'created, never logged in',
    },
    {
      icon: DollarSign,
      label: 'Total Revenue',
      value: `$${stats?.total_revenue?.toLocaleString() ?? '48,920'}`,
      trend: stats?.revenue_trend ?? 15.3,
      trendLabel: 'vs last month',
    },
    {
      icon: UserPlus,
      label: 'New Signups (Organic)',
      value: stats?.new_signups?.toLocaleString() ?? '167',
      trend: stats?.signups_trend ?? 9.8,
      trendLabel: 'this month, excludes studio imports',
    },
    {
      icon: MessageSquare,
      label: 'Pending Messages',
      value: stats?.pending_messages?.toLocaleString() ?? '23',
      trend: stats?.messages_trend ?? -5.1,
      trendLabel: 'vs last week',
    },
    {
      icon: ShieldBan,
      label: 'Banned Users',
      value: stats?.banned_users?.toLocaleString() ?? '14',
      trend: stats?.banned_trend ?? -2.3,
      trendLabel: 'vs last month',
    },
  ];

  const chartData = stats?.signups_over_time || fallbackChartData;

  return (
    <div className="space-y-8">
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
          <ResponsiveContainer width="100%" height="100%">
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
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
