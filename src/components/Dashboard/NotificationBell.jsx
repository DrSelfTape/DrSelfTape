import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Bell, HeartHandshake, Clapperboard, MessageSquare, X, Megaphone } from 'lucide-react';
import { getNotifications, markNotificationRead } from '../../redux/features/notifications/notificationsSlice';
import useNotificationActions from '../../hooks/useNotificationActions';
import { useIsMobile } from '../../hooks/useIsMobile';

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

// Darken/lighten a #RRGGBB hex by `pct`% — powers the Aurora glyph-badge gradient.
function shade(hex, pct) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  if (Number.isNaN(n)) return hex;
  const amt = Math.round(2.55 * pct);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + amt);
  const g = clamp(((n >> 8) & 0xff) + amt);
  const b = clamp((n & 0xff) + amt);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function NotificationBell({ onNavigate }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { notifications = [], loading } = useSelector((s) => s.notifications);
  const [open, setOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const panelRef = useRef(null);
  const isMobile = useIsMobile();
  const { markAllAsRead } = useNotificationActions();

  useEffect(() => { dispatch(getNotifications()); }, [dispatch]);

  // Build 23 APNs window events — re-fetch on incoming push so the bell
  // badge updates in real time while the app is foregrounded; pop the
  // panel open on tap so the user sees the notification immediately.
  useEffect(() => {
    const onReceived = () => dispatch(getNotifications());
    const onTapped = () => { dispatch(getNotifications()); setOpen(true); };
    window.addEventListener('drst-push-received', onReceived);
    window.addEventListener('drst-push-tap', onTapped);
    return () => {
      window.removeEventListener('drst-push-received', onReceived);
      window.removeEventListener('drst-push-tap', onTapped);
    };
  }, [dispatch]);

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
      const matchId = notif.data?.match_id;

      // Live scene request → jump straight into the partner's EXISTING
      // Daily room (room_url is in the payload), mirroring socket.jsx.
      // Otherwise we'd route to the green-room chat whose only CTA
      // re-mints a new room and strands the two users (session-loop bug).
      const liveRoomUrl = notif.data?.room_url;
      if (notif.type === 'rehearsal_started' && liveRoomUrl) {
        let roomId = '';
        try { roomId = new URL(liveRoomUrl).pathname.split('/').filter(Boolean).pop() || ''; } catch { roomId = ''; }
        if (roomId) { navigate(`/meeting/${roomId}`, { state: { roomUrl: liveRoomUrl } }); return; }
      }

      const route =
        notif.type === 'scene_partner_like' ? '/dashboard/who-wants-to-read' :
        notif.type === 'scene_partner_match' && matchId ? `/dashboard/green-room/${matchId}` :
        notif.type === 'rehearsal_started' && matchId ? `/dashboard/green-room/${matchId}` :
        notif.type === 'new_message' && matchId ? `/dashboard/green-room/${matchId}` : null;
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
      <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--aurora-line)' }}>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#7A5A18]" />
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Notifications</h3>
          {unread.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#D4A85F]/15 text-[#7A5A18]">{unread.length} new</span>
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
              className="aurora-mono transition-opacity"
              style={{ color: '#7A5A18', background: 'transparent', border: 'none', fontSize: 10, fontWeight: 600, letterSpacing: '0.1px', cursor: 'pointer', opacity: markingAll ? 0.5 : 1 }}
            >
              {markingAll ? 'MARKING…' : unread.length === 1 ? 'MARK READ' : 'MARK ALL READ'}
            </button>
          )}
          <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(10,10,10,0.04)', color: 'var(--aurora-sub)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#D4A85F]/30 border-t-[#FF8280] rounded-full animate-spin" />
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
          const color = NOTIF_COLORS[notif.type] || '#D4A85F';
          const isUnread = !notif.is_read;
          return (
            <div key={notif.id} onClick={() => handleClick(notif)}
              className="flex gap-3 cursor-pointer transition-colors"
              style={{ padding: '13px 18px', background: isUnread ? 'rgba(212,168,95,0.09)' : 'transparent', borderBottom: '1px solid var(--aurora-line-soft, rgba(10,10,10,0.045))' }}
            >
              {/* Aurora glyph badge — dark icon on a color gradient */}
              <div className="flex items-center justify-center shrink-0" style={{
                width: 36, height: 36, borderRadius: 12,
                background: `linear-gradient(135deg, ${color}, ${shade(color, -20)})`,
                color: '#0E0D0A',
                border: '1px solid rgba(255,255,255,0.5)',
                boxShadow: `0 4px 10px ${color}55`,
              }}>
                <Icon className="w-[17px] h-[17px]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="leading-snug" style={{ fontSize: 13.5, fontWeight: isUnread ? 700 : 600, color: isUnread ? 'var(--text-primary)' : 'var(--text-secondary)', letterSpacing: '-0.15px' }}>
                    {notif.title}
                  </p>
                  <span className="aurora-mono shrink-0" style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1px' }}>{timeAgo(notif.created_at)}</span>
                </div>
                {notif.message && <p className="line-clamp-2 leading-relaxed" style={{ fontSize: 11.5, marginTop: 3, color: 'var(--text-muted)' }}>{notif.message}</p>}
              </div>
              {isUnread && <span className="shrink-0" style={{ width: 7, height: 7, marginTop: 6, borderRadius: 100, background: '#D4A85F', boxShadow: '0 0 6px #D4A85F' }} />}
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
