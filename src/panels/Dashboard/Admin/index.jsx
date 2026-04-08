import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Users, Send, Bell, Activity, Search, Ban, Shield, MessageSquare, TrendingUp } from 'lucide-react';
import axios from '../../../redux/http';
import { baseURL } from '../../../redux/constant';

export default function AdminDashboard() {
  const user = useSelector((s) => s.auth?.user);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    axios.get(`${baseURL}/v1/analytics/dashboard/`)
      .then(({ data }) => setMetrics(data?.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    setSending(true);
    try {
      const { data } = await axios.post(`${baseURL}/v1/notifications/broadcast/`, {
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
      });
      setSent(true);
      setBroadcastTitle('');
      setBroadcastMessage('');
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to send broadcast');
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#C855F0] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const u = metrics?.users || {};
  const m = metrics?.matching || {};
  const msg = metrics?.messages || {};
  const a = metrics?.auditions || {};

  const statCards = [
    { label: 'Total Users', value: u.total || 0, icon: Users, color: '#C855F0' },
    { label: 'Online Now', value: u.online_now || 0, icon: Activity, color: '#22c55e' },
    { label: 'Available', value: u.available_now || 0, icon: Shield, color: '#A7ECDA' },
    { label: 'With Headshot', value: u.with_headshot || 0, icon: Users, color: '#60A5FA' },
    { label: 'Total Swipes', value: m.total_swipes || 0, icon: TrendingUp, color: '#FCE072' },
    { label: 'Matches', value: m.total_matches || 0, icon: MessageSquare, color: '#C855F0' },
    { label: 'Messages', value: msg.total || 0, icon: Send, color: '#A7ECDA' },
    { label: 'Auditions', value: a.total || 0, icon: Activity, color: '#FFB49A' },
  ];

  const recentUsers = metrics?.recent_users || [];
  const recentSwipes = metrics?.recent_swipes || [];
  const filteredUsers = searchQuery
    ? recentUsers.filter((u) =>
        `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : recentUsers;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Admin Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Manage users and send notifications</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#C855F0]/10 border border-[#C855F0]/30">
          <Shield className="w-4 h-4 text-[#C855F0]" />
          <span className="text-xs font-semibold text-[#C855F0]">Admin</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{stat.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Broadcast Notification */}
        <div className="rounded-2xl p-6" style={{
          background: 'linear-gradient(135deg, rgba(200,85,240,0.05), var(--bg-card))',
          border: '1px solid rgba(200,85,240,0.2)',
        }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,85,240,0.15)' }}>
              <Bell className="w-5 h-5 text-[#C855F0]" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Send Broadcast</h2>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Push to all users — bell, toast, and web push</p>
            </div>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Title</label>
              <input
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="e.g. New Feature Alert!"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-active)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Message</label>
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="e.g. We just launched the Reader Marketplace! Set your rates and start earning."
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-active)', color: 'var(--text-primary)' }}
              />
            </div>
            <button
              type="submit"
              disabled={sending || !broadcastTitle.trim() || !broadcastMessage.trim()}
              className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-40"
              style={{ background: sent ? '#22c55e' : '#C855F0' }}
            >
              {sent ? '✓ Sent to all users!' : sending ? 'Sending...' : 'Send to All Users'}
            </button>
          </form>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Recent Swipes</h2>
          {recentSwipes.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>No swipe activity yet</p>
          ) : (
            <div className="space-y-3">
              {recentSwipes.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                    s.direction === 'right' ? 'bg-[#C855F0]' : s.direction === 'star' ? 'bg-[#FCE072] text-black' : 'bg-gray-500'
                  }`}>
                    {s.direction === 'right' ? '🎬' : s.direction === 'star' ? '⭐' : '✕'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {s.from_user__first_name} → {s.to_user__first_name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {s.created_at ? new Date(s.created_at).toLocaleString() : ''}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{
                    background: s.direction === 'right' ? 'rgba(200,85,240,0.15)' : 'var(--bg-input)',
                    color: s.direction === 'right' ? '#C855F0' : 'var(--text-secondary)',
                  }}>
                    {s.direction === 'right' ? 'Slate' : s.direction === 'star' ? 'Star' : 'Pass'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Management */}
      <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Users ({u.total || 0})</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-active)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                {['Name', 'Email', 'Role', 'Joined'].map((h) => (
                  <th key={h} className="text-left py-3 px-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <td className="py-3 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                    {u.first_name} {u.last_name}
                  </td>
                  <td className="py-3 px-3" style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td className="py-3 px-3">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[#C855F0]/10 text-[#C855F0] capitalize">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-3" style={{ color: 'var(--text-muted)' }}>
                    {u.date_joined ? new Date(u.date_joined).toLocaleDateString() : ''}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center" style={{ color: 'var(--text-muted)' }}>No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Signup Chart */}
      {metrics?.signups_by_day?.length > 0 && (
        <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Signups This Week</h2>
          <div className="flex items-end gap-2 h-32">
            {metrics.signups_by_day.map((d) => {
              const max = Math.max(...metrics.signups_by_day.map((x) => x.count), 1);
              const pct = (d.count / max) * 100;
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{d.count}</span>
                  <div className="w-full rounded-t-lg" style={{ height: `${Math.max(pct, 8)}%`, background: '#C855F0' }} />
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {new Date(d.day).toLocaleDateString([], { weekday: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
