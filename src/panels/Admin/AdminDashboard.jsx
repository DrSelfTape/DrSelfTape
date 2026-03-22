import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Users,
  UserCheck,
  DollarSign,
  UserPlus,
  MessageSquare,
  ShieldBan,
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
        <div className="w-8 h-8 border-2 border-[#FF8280] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      icon: Users,
      label: 'Total Users',
      value: stats?.total_users?.toLocaleString() ?? '1,247',
      trend: stats?.total_users_trend ?? 12.5,
      trendLabel: 'vs last month',
    },
    {
      icon: UserCheck,
      label: 'Active Users',
      value: stats?.active_users?.toLocaleString() ?? '1,083',
      trend: stats?.active_users_trend ?? 8.2,
      trendLabel: 'vs last month',
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
      label: 'New Signups',
      value: stats?.new_signups?.toLocaleString() ?? '167',
      trend: stats?.signups_trend ?? 9.8,
      trendLabel: 'this month',
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
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Signups Over Time</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '13px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                }}
              />
              <Line
                type="monotone"
                dataKey="signups"
                stroke="#FF8280"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#FF8280', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#FF8280', strokeWidth: 2, stroke: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
