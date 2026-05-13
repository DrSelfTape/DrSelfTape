import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ShieldOff, ExternalLink, History } from 'lucide-react';
import { fetchBannedUsers, unbanUser } from '../../redux/features/admin/adminSlice';
import AdminUserTable from './components/AdminUserTable';

export default function AdminBannedUsers() {
  const dispatch = useDispatch();
  const { bannedUsers, bannedUsersLoading } = useSelector((state) => state.admin);

  useEffect(() => {
    dispatch(fetchBannedUsers());
  }, [dispatch]);

  const handleUnban = useCallback(
    async (userId) => {
      try {
        await dispatch(unbanUser(userId)).unwrap();
        dispatch(fetchBannedUsers());
      } catch {
        // error handled by slice
      }
    },
    [dispatch]
  );

  const bannedList = Array.isArray(bannedUsers) ? bannedUsers : [];

  const columns = [
    { key: 'name', label: 'User', type: 'avatar', nameKey: 'name' },
    { key: 'email', label: 'Email' },
    { key: 'reason', label: 'Reason' },
    { key: 'banned_date', label: 'Banned Date', type: 'date' },
    { key: 'banned_by', label: 'Banned By' },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUnban(row.id);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/20 transition-colors"
          >
            <ShieldOff className="w-3.5 h-3.5" />
            Unban
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/admin/users?userId=${row.id}`, '_blank');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2A2A2A] text-[#999999] rounded-lg text-xs font-medium hover:bg-[#3A3A3A] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Profile
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // In a full implementation this would open a ban history modal
              alert(`Ban history for ${row.name || 'user'}:\n\nBanned on: ${row.banned_date ? new Date(row.banned_date).toLocaleDateString() : 'N/A'}\nReason: ${row.reason || 'N/A'}\nBanned by: ${row.banned_by || 'N/A'}`);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            History
          </button>
        </div>
      ),
    },
  ];

  if (bannedUsersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#FF8280] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminUserTable
        columns={columns}
        data={bannedList}
        emptyMessage="No banned users."
      />
    </div>
  );
}
