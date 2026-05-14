import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { X, Ban, ShieldCheck, KeyRound, UserCog } from 'lucide-react';
import { updateAdminUser, banUser } from '../../../redux/features/admin/adminSlice';

function getInitials(name = '') {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const roles = ['user', 'actor', 'coach', 'casting_director', 'admin'];

export default function UserDetailDrawer({ user, onClose }) {
  const dispatch = useDispatch();
  const [banReason, setBanReason] = useState('');
  const [showBanInput, setShowBanInput] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user?.role || 'user');
  const [actionLoading, setActionLoading] = useState(false);

  if (!user) return null;

  const isSuspended = user.status?.toLowerCase() === 'suspended';
  const isBanned = user.status?.toLowerCase() === 'banned';

  const handleSuspendToggle = async () => {
    setActionLoading(true);
    try {
      await dispatch(
        updateAdminUser({
          id: user.id,
          data: { status: isSuspended ? 'active' : 'suspended' },
        })
      ).unwrap();
      onClose();
    } catch {
      // error handled by slice
    } finally {
      setActionLoading(false);
    }
  };

  const handleBan = async () => {
    if (!banReason.trim()) return;
    setActionLoading(true);
    try {
      await dispatch(banUser({ id: user.id, reason: banReason })).unwrap();
      onClose();
    } catch {
      // error handled by slice
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setActionLoading(true);
    try {
      await dispatch(
        updateAdminUser({ id: user.id, data: { reset_password: true } })
      ).unwrap();
      onClose();
    } catch {
      // error handled by slice
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async (role) => {
    setSelectedRole(role);
    setActionLoading(true);
    try {
      await dispatch(updateAdminUser({ id: user.id, data: { role } })).unwrap();
    } catch {
      setSelectedRole(user.role);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[#0D0D0D] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
          <h2 className="text-lg font-bold text-white">User Details</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#1E1E1E] transition-colors"
          >
            <X className="w-5 h-5 text-[#999999]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Avatar + Name */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-[#D4A85F]/10 text-[#7A5A18] flex items-center justify-center text-xl font-bold">
              {getInitials(user.name)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{user.name || '—'}</h3>
              <p className="text-sm text-[#999999]">{user.email || '—'}</p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div>
              <p className="text-xs text-[#666666] uppercase tracking-wider mb-1">Role</p>
              <p className="text-sm font-medium text-white capitalize">{user.role || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-[#666666] uppercase tracking-wider mb-1">Plan</p>
              <p className="text-sm font-medium text-white capitalize">{user.plan || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-[#666666] uppercase tracking-wider mb-1">Status</p>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                  user.status?.toLowerCase() === 'active'
                    ? 'bg-green-500/10 text-green-400'
                    : user.status?.toLowerCase() === 'suspended'
                    ? 'bg-yellow-500/10 text-yellow-400'
                    : user.status?.toLowerCase() === 'banned'
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-[#2A2A2A] text-[#666666]'
                }`}
              >
                {user.status || '—'}
              </span>
            </div>
            <div>
              <p className="text-xs text-[#666666] uppercase tracking-wider mb-1">Joined</p>
              <p className="text-sm font-medium text-white">
                {user.joined_date
                  ? new Date(user.joined_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[#999999] mb-2">Actions</h4>

            {/* Suspend / Unsuspend */}
            {!isBanned && (
              <button
                onClick={handleSuspendToggle}
                disabled={actionLoading}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-[#3A3A3A] hover:bg-yellow-500/10 transition-colors text-left disabled:opacity-50"
              >
                <ShieldCheck className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-[#999999]">
                  {isSuspended ? 'Unsuspend User' : 'Suspend User'}
                </span>
              </button>
            )}

            {/* Ban */}
            {!isBanned && (
              <div>
                <button
                  onClick={() => setShowBanInput((s) => !s)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-[#3A3A3A] hover:bg-red-500/10 transition-colors text-left"
                >
                  <Ban className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-medium text-[#999999]">Ban User</span>
                </button>
                {showBanInput && (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Reason for ban..."
                      className="w-full px-3 py-2 border border-[#3A3A3A] rounded-lg text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-[#D4A85F]/30 focus:border-[#D4A85F]"
                    />
                    <button
                      onClick={handleBan}
                      disabled={actionLoading || !banReason.trim()}
                      className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                    >
                      Confirm Ban
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Reset Password */}
            <button
              onClick={handleResetPassword}
              disabled={actionLoading}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-[#3A3A3A] hover:bg-blue-500/10 transition-colors text-left disabled:opacity-50"
            >
              <KeyRound className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-[#999999]">Reset Password</span>
            </button>

            {/* Change Role */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[#3A3A3A]">
              <UserCog className="w-5 h-5 text-purple-500" />
              <div className="flex-1">
                <label className="text-sm font-medium text-[#999999] block mb-1">Change Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  disabled={actionLoading}
                  className="w-full px-2 py-1.5 border border-[#3A3A3A] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A85F]/30 focus:border-[#D4A85F] disabled:opacity-50"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
