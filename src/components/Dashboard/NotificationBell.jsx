import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Bell, HeartHandshake, Clapperboard, MessageSquare, X, Megaphone, CheckCheck } from 'lucide-react';
import { getNotifications, markNotificationRead } from '../../redux/features/notifications/notificationsSlice';
import useNotificationActions from '../../hooks/useNotificationActions';

const NOTIF_ICONS = {
  scene_partner_like: HeartHandshake,
  scene_partner_match: Clapperboard,
  rehearsal_started: Clapperboard,
  new_message: MessageSquare,
  admin_broadcast: Megaphone,
};

const NOTIF_COLORS = {
  scene_partner_like: '#FF8280',
  scene_partner_match: '#A7ECDA',
  rehearsal_started: '#eab308',
  new_message: '#60A5FA',
  admin_broadcast: '#FCE072',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell({ onNavigate }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { notifications = [], loading } = useSelector((s) => s.notifications);
  const [open, setOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const panelRef = useRef(null);
  const isMobile = window.innerWidth < 768;
  const { markAllAsRead } = useNotificationActions();

  useEffect(() => { dispatch(getNotifications()); }, [dispatch]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [open]);

  const sorted = [...(notifications || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const unread = sorted.filter((n) => !n.is_read);

  const handleClick = (notif) => {
    if (!notif.is_read) dispatch(markNotificationRead(notif.id));
    setTimeout(() => {
      setOpen(false);
      const route =
        notif.type === 'scene_partner_like' ? '/dashboard/who-wants-to-read' :
        notif.type === 'scene_partner_match' ? `/dashboard/green-room/${notif.data?.match_id || ''}` :
        notif.type === 'rehearsal_started' ? `/dashboard/green-room/${notif.data?.match_id || ''}` :
        notif.type === 'new_message' ? `/dashboard/green-room/${notif.data?.match_id || ''}` : null;
      if (route) {
        if (isMobile && onNavigate) {
          onNavigate({ panel: notif.type === 'scene_partner_like' ? 'who-wants-to-read' : 'green-room' });
        } else { navigate(route); }
      }
    }, 150);
  };

  const panelContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#FF8280]" />
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Notifications</h3>
          {unread.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FF8280]/15 text-[#FF8280]">{unread.length} new</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unread.length > 0 && (
            <button
              onClick={async () => {
                setMarkingAll(true);
                try {
                  await markAllAsRead(sorted, { onComplete: () => {} });
                  dispatch(getNotifications());
                } finally { setMarkingAll(false); }
              }}
              disabled={markingAll}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
              style={{ color: '#FF8280', background: 'rgba(255, 130, 128,0.08)' }}
            >
              <CheckCheck className="w-3 h-3" />
              {markingAll ? 'Marking...' : unread.length === 1 ? 'Mark read' : 'Mark all read'}
            </button>
          )}
          <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#FF8280]/30 border-t-[#FF8280] rounded-full animate-spin" />
          </div>
        )}
        {!loading && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--bg-surface)' }}>
              <Bell className="w-6 h-6" style={{ color: 'var(--text-dim)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No notifications yet</p>
            <p className="text-xs mt-1 text-center" style={{ color: 'var(--text-muted)' }}>You'll see activity here when actors interact with you</p>
          </div>
        )}
        {!loading && sorted.map((notif) => {
          const Icon = NOTIF_ICONS[notif.type] || Bell;
          const color = NOTIF_COLORS[notif.type] || 'var(--text-secondary)';
          const isUnread = !notif.is_read;
          return (
            <div key={notif.id} onClick={() => handleClick(notif)}
              className="flex items-start gap-3 px-5 py-4 cursor-pointer transition-colors"
              style={{ background: isUnread ? 'rgba(255, 130, 128,0.04)' : 'transparent', borderBottom: '1px solid var(--border-default)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm leading-snug ${isUnread ? 'font-semibold' : 'font-medium'}`} style={{ color: isUnread ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {notif.title}
                  </p>
                  {isUnread && <span className="w-2.5 h-2.5 rounded-full bg-[#FF8280] shrink-0 mt-1.5" />}
                </div>
                {notif.message && <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{notif.message}</p>}
                <p className="text-[11px] mt-1.5 font-medium" style={{ color: 'var(--text-dim)' }}>{timeAgo(notif.created_at)}</p>
              </div>
            </div>
          );
        })}
        {isMobile && <div style={{ height: 'calc(80px + env(safe-area-inset-bottom, 0px))' }} />}
      </div>

      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </>
  );

  return (
    <div className="relative" ref={!isMobile ? panelRef : undefined}>
      {/* Bell button */}
      <button
        onClick={() => { const next = !open; setOpen(next); if (next) dispatch(getNotifications()); }}
        className="relative w-9 h-9 rounded-full flex items-center justify-center transition-colors"
        style={{
          background: 'var(--aurora-glass)',
          border: '1px solid var(--aurora-glass-border)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <Bell className="w-[16px] h-[16px]" style={{ color: 'var(--aurora-text)' }} />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1"
            style={{
              background: 'var(--aurora-accent)',
              boxShadow: '0 4px 12px rgba(255,130,128,0.45)',
            }}
          >
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {/* Desktop dropdown */}
      {open && !isMobile && (
        <div className="absolute right-0 top-12 w-[380px] z-[9999] flex flex-col rounded-2xl"
          style={{
            background: 'var(--aurora-glass-strong)',
            border: '1px solid var(--aurora-glass-border)',
            backdropFilter: 'blur(28px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
            boxShadow: 'var(--aurora-shadow-modal)',
            maxHeight: '80vh', animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {panelContent}
        </div>
      )}

      {/* Mobile — portal to document.body so it escapes parent z-index */}
      {open && isMobile && createPortal(
        <div ref={panelRef}>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} style={{
            background: 'rgba(10,10,10,0.5)',
            backdropFilter: 'blur(8px)',
          }} />
          <div className="fixed left-0 right-0 bottom-0 z-[9999] flex flex-col"
            style={{
              background: 'var(--aurora-glass-strong)',
              border: '1px solid var(--aurora-glass-border)',
              backdropFilter: 'blur(28px) saturate(1.5)',
              WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
              top: 'calc(50px + env(safe-area-inset-top, 0px))',
              borderRadius: '28px 28px 0 0',
              animation: 'fadeIn 0.15s ease-out',
              boxShadow: 'var(--aurora-shadow-modal)',
            }}
          >
            {panelContent}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
