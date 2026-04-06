import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Bell, HeartHandshake, Clapperboard, MessageSquare, X } from 'lucide-react';
import { getNotifications, markNotificationRead } from '../../redux/features/notifications/notificationsSlice';

const NOTIF_ICONS = {
  scene_partner_like: HeartHandshake,
  scene_partner_match: Clapperboard,
  rehearsal_started: Clapperboard,
  new_message: MessageSquare,
};

const NOTIF_COLORS = {
  scene_partner_like: '#C855F0',
  scene_partner_match: '#A7ECDA',
  rehearsal_started: '#eab308',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function NotificationBell({ onNavigate }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { notifications = [], loading } = useSelector((s) => s.notifications);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    dispatch(getNotifications());
  }, [dispatch]);

  // Close on outside click (delayed to avoid catching notification item clicks)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    // Use setTimeout to register after current event cycle
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [open]);

  const sorted = [...(notifications || [])].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  const unread = sorted.filter((n) => !n.is_read);

  const handleClick = (notif) => {
    // Mark as read but don't remove from list — just updates the dot
    if (!notif.is_read) {
      dispatch(markNotificationRead(notif.id));
    }

    // Navigate after a brief delay so user sees the read state change
    setTimeout(() => {
      setOpen(false);

      const route =
        notif.type === 'scene_partner_like' ? '/dashboard/who-wants-to-read' :
        notif.type === 'scene_partner_match' ? `/dashboard/green-room/${notif.data?.match_id || ''}` :
        notif.type === 'rehearsal_started' ? `/dashboard/green-room/${notif.data?.match_id || ''}` :
        null;

      if (route) {
        if (isMobile && onNavigate) {
          if (notif.type === 'scene_partner_like') {
            onNavigate({ panel: 'who-wants-to-read' });
          } else {
            onNavigate({ panel: 'green-room' });
          }
        } else {
          navigate(route);
        }
      }
    }, 150);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) dispatch(getNotifications());
        }}
        className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        <Bell className="w-[18px] h-[18px]" style={{ color: 'var(--text-secondary)' }} />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#C855F0] text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-12 w-[340px] max-h-[420px] rounded-2xl shadow-2xl z-[100] overflow-hidden"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
          style={{ animation: 'fadeIn 0.15s ease-out' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Notifications</h3>
            <button onClick={() => setOpen(false)} className="hover:text-white" style={{ color: 'var(--text-muted)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[340px]">
            {loading && (
              <p className="text-center text-xs py-8" style={{ color: 'var(--text-muted)' }}>Loading...</p>
            )}

            {!loading && sorted.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <Bell className="w-8 h-8 mb-3" style={{ color: 'var(--text-dim)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No notifications yet</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>You'll see activity here when actors interact with you</p>
              </div>
            )}

            {!loading && sorted.map((notif) => {
              const Icon = NOTIF_ICONS[notif.type] || Bell;
              const color = NOTIF_COLORS[notif.type] || '#999';
              const isUnread = !notif.is_read;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-[#ffffff08] ${
                    isUnread ? 'bg-[#C855F0]/5' : ''
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm truncate ${isUnread ? 'font-semibold' : 'font-medium'}`} style={{ color: isUnread ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {notif.title}
                      </p>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-[#C855F0] shrink-0" />
                      )}
                    </div>
                    {notif.message && (
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{notif.message}</p>
                    )}
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-dim)' }}>{timeAgo(notif.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(-4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
