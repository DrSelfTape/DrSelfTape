import { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search } from 'lucide-react';
import { fetchAdminUsers } from '../../redux/features/admin/adminSlice';
import AdminUserTable from './components/AdminUserTable';
import UserDetailDrawer from './components/UserDetailDrawer';

const roleOptions = ['All', 'user', 'actor', 'coach', 'casting_director', 'admin'];
const planOptions = ['All', 'free', 'basic', 'pro', 'enterprise'];
const statusOptions = ['All', 'active', 'suspended', 'banned', 'inactive'];

const columns = [
  { key: 'name', label: 'Name', type: 'avatar', nameKey: 'name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'plan', label: 'Plan' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'joined_date', label: 'Joined', type: 'date' },
];

export default function AdminUsers() {
  const dispatch = useDispatch();
  const { users, usersLoading } = useSelector((state) => state.admin);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [planFilter, setPlanFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    dispatch(fetchAdminUsers());
  }, [dispatch]);

  const filteredUsers = useMemo(() => {
    let result = Array.isArray(users) ? users : [];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
      );
    }
    if (roleFilter !== 'All') {
      result = result.filter((u) => u.role === roleFilter);
    }
    if (planFilter !== 'All') {
      result = result.filter((u) => u.plan === planFilter);
    }
    if (statusFilter !== 'All') {
      result = result.filter((u) => u.status === statusFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((u) => new Date(u.joined_date) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      result = result.filter((u) => new Date(u.joined_date) <= to);
    }

    return result;
  }, [users, search, roleFilter, planFilter, statusFilter, dateFrom, dateTo]);

  const handleRowClick = useCallback((user) => {
    setSelectedUser(user);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedUser(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#1E1E1E] border border-[#3A3A3A] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C855F0]/30 focus:border-[#C855F0]"
          />
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 bg-[#1E1E1E] border border-[#3A3A3A] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C855F0]/30 focus:border-[#C855F0]"
        >
          {roleOptions.map((r) => (
            <option key={r} value={r}>
              {r === 'All' ? 'All Roles' : r.replace('_', ' ')}
            </option>
          ))}
        </select>

        {/* Plan Filter */}
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="px-3 py-2.5 bg-[#1E1E1E] border border-[#3A3A3A] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C855F0]/30 focus:border-[#C855F0]"
        >
          {planOptions.map((p) => (
            <option key={p} value={p}>
              {p === 'All' ? 'All Plans' : p}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-[#1E1E1E] border border-[#3A3A3A] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C855F0]/30 focus:border-[#C855F0]"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s === 'All' ? 'All Statuses' : s}
            </option>
          ))}
        </select>

        {/* Date Range */}
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2.5 bg-[#1E1E1E] border border-[#3A3A3A] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C855F0]/30 focus:border-[#C855F0]"
          placeholder="From"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2.5 bg-[#1E1E1E] border border-[#3A3A3A] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C855F0]/30 focus:border-[#C855F0]"
          placeholder="To"
        />
      </div>

      {/* Loading */}
      {usersLoading && (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-2 border-[#C855F0] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Table */}
      {!usersLoading && (
        <AdminUserTable
          columns={columns}
          data={filteredUsers}
          onRowClick={handleRowClick}
          emptyMessage="No users found."
        />
      )}

      {/* User Detail Drawer */}
      {selectedUser && (
        <UserDetailDrawer user={selectedUser} onClose={handleCloseDrawer} />
      )}
    </div>
  );
}
