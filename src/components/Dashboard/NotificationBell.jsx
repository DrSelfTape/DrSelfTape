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

// Map the app's real notification types → Aurora filter "kinds".
const KIND_OF = {
  scene_partner_like: 'match',
  scene_partner_match: 'match',
  rehearsal_started: 'match',
  new_message: 'message',
  admin_broadcast: 'update',
};
const KIND_FILTERS = [
  { k: 'all', label: 'ALL' },
  { k: 'match', label: 'READERS' },
  { k: 'message', label: 'MESSAGES' },
  { k: 'update', label: 'UPDATES' },
];

// TODAY / YESTERDAY / EARLIER bucket from a timestamp.
function dayGroup(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYest = new Date(startToday);
  startYest.setDate(startYest.getDate() - 1);
  if (d >= startToday) return 'TODAY';
  if (d >= startYest) return 'YESTERDAY';
  return 'EARLIER';
}
const GROUP_LABEL = { TODAY: 'Today', YESTERDAY: 'Yesterday', EARLIER: 'Earlier' };

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
  const [filter, setFilter] = useState('all'); // mobile sheet filter chip
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
        if (roomId) {
          // react-router navigate() no-ops in the Capacitor shell — on mobile
          // route the meeting open through the same onNavigate the rest of this
          // component uses (carry the room info so MeetingRoom can join).
          if (isMobile && onNavigate) {
            onNavigate({ panel: 'meeting', roomId, roomUrl: liveRoomUrl });
          } else {
            navigate(`/meeting/${roomId}`, { state: { roomUrl: liveRoomUrl } });
          }
          return;
        }
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

  const doMarkAll = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await markAllAsRead(sorted, { onComplete: () => {} });
      dispatch(getNotifications());
    } finally {
      setMarkingAll(false);
    }
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
              onClick={doMarkAll}
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

      {/* Mobile — full-screen Aurora notifications sheet (portaled) */}
      {open && isMobile && createPortal((() => {
        const visible = sorted.filter((n) => filter === 'all' || KIND_OF[n.type] === filter);
        const groups = ['TODAY', 'YESTERDAY', 'EARLIER']
          .map((g) => ({ g, rows: visible.filter((n) => dayGroup(n.created_at) === g) }))
          .filter((x) => x.rows.length > 0);
        const chips = KIND_FILTERS.filter((f) => f.k === 'all' || sorted.some((n) => KIND_OF[n.type] === f.k));
        let stagger = 0;
        return (
          <div ref={panelRef} className="fixed inset-0 z-[9999] flex flex-col"
            style={{ background: 'var(--aurora-bg, #FAFAF7)', color: 'var(--text-primary)', animation: 'notifSheetIn 0.42s cubic-bezier(.2,.75,.25,1)' }}>
            {/* aurora orbs */}
            <div style={{ position: 'absolute', inset: '-12%', pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(65% 45% at 90% 4%, rgba(212,168,95,0.30) 0%, transparent 55%), radial-gradient(55% 40% at -5% 28%, rgba(167,214,255,0.45) 0%, transparent 55%), radial-gradient(50% 38% at 55% 96%, rgba(159,230,180,0.40) 0%, transparent 55%)' }} />

            {/* Header */}
            <div style={{ position: 'relative', zIndex: 2, padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 22px 0' }}>
              <div className="flex items-center justify-between">
                <button onClick={() => setOpen(false)} className="flex items-center justify-center"
                  style={{ width: 34, height: 34, borderRadius: 100, background: 'var(--aurora-glass)', border: '1px solid var(--aurora-glass-border)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', color: 'var(--aurora-text)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
                </button>
                <button onClick={doMarkAll} disabled={unread.length === 0 || markingAll} className="aurora-mono"
                  style={{ background: 'transparent', border: 'none', color: unread.length ? '#7A5A18' : 'var(--text-dim)', fontSize: 10, letterSpacing: '0.12px', fontWeight: 600, cursor: unread.length ? 'pointer' : 'default', padding: '8px 0' }}>
                  {markingAll ? 'MARKING…' : unread.length ? 'READ ALL' : 'INBOX ZERO'}
                </button>
              </div>
              <div className="flex items-baseline" style={{ gap: 10, marginTop: 10, marginBottom: 4 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, letterSpacing: '-0.4px', lineHeight: 1, color: 'var(--text-primary)' }}>Notifications</div>
                {unread.length > 0 ? (
                  <div className="aurora-mono" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1px', padding: '4px 8px', borderRadius: 100, background: 'linear-gradient(135deg, #C99A4E, #D4A85F 60%, #F0D097)', color: '#1A1408', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 4px 12px rgba(212,168,95,0.4)', animation: 'notifPillIn 0.35s cubic-bezier(.3,1.6,.4,1)' }}>{unread.length} NEW</div>
                ) : (
                  <div className="aurora-mono" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1px', padding: '4px 8px', borderRadius: 100, background: '#9FE6B4', color: '#0E1A14', border: '1px solid rgba(255,255,255,0.6)', animation: 'notifPillIn 0.35s cubic-bezier(.3,1.6,.4,1)' }}>ALL CLEAR ✦</div>
                )}
              </div>
              <div className="aurora-mono" style={{ fontSize: 10, letterSpacing: '0.16px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 12 }}>What moved while you rehearsed</div>
              {chips.length > 1 && (
                <div className="flex overflow-x-auto" style={{ gap: 6, paddingBottom: 14, WebkitOverflowScrolling: 'touch' }}>
                  {chips.map((f) => {
                    const count = f.k === 'all' ? sorted.length : sorted.filter((n) => KIND_OF[n.type] === f.k).length;
                    const on = filter === f.k;
                    return (
                      <button key={f.k} onClick={() => setFilter(f.k)} className="aurora-mono shrink-0"
                        style={{ padding: '7px 12px', borderRadius: 100, cursor: 'pointer', background: on ? 'var(--aurora-text, #0E0D0A)' : 'var(--aurora-glass)', color: on ? '#fff' : 'var(--aurora-sub)', border: `1px solid ${on ? 'var(--aurora-text, #0E0D0A)' : 'var(--aurora-glass-border)'}`, fontSize: 10, letterSpacing: '0.05px', backdropFilter: on ? 'none' : 'blur(20px)' }}>
                        {f.label} <span style={{ opacity: 0.5, marginLeft: 4 }}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Feed */}
            <div className="flex-1 overflow-y-auto overscroll-contain" style={{ position: 'relative', zIndex: 1, padding: '2px 22px calc(40px + env(safe-area-inset-bottom, 0px))', WebkitOverflowScrolling: 'touch' }}>
              {loading && <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-[#D4A85F]/30 border-t-[#FF8280] rounded-full animate-spin" /></div>}
              {!loading && groups.length === 0 && (
                <div style={{ textAlign: 'center', paddingTop: 90 }}>
                  <div className="mx-auto mb-4 flex items-center justify-center" style={{ width: 64, height: 64, borderRadius: 22, background: 'var(--aurora-glass)', border: '1px solid var(--aurora-glass-border)', color: '#7A5A18' }}><Bell className="w-6 h-6" /></div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>All quiet on this front.</div>
                  <div className="aurora-mono" style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.18px', marginTop: 8 }}>NOTHING NEEDS YOU HERE</div>
                </div>
              )}
              {!loading && groups.map(({ g, rows }) => (
                <div key={g + filter} style={{ marginBottom: 10 }}>
                  <div className="flex items-center" style={{ gap: 10, margin: '10px 2px' }}>
                    <div className="aurora-mono" style={{ fontSize: 10, letterSpacing: '0.18px', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{GROUP_LABEL[g]}</div>
                    <div style={{ flex: 1, height: 1, background: 'var(--aurora-line, rgba(10,10,10,0.06))' }} />
                  </div>
                  <div className="flex flex-col" style={{ gap: 10 }}>
                    {rows.map((notif) => {
                      const Icon = NOTIF_ICONS[notif.type] || Bell;
                      const color = NOTIF_COLORS[notif.type] || '#D4A85F';
                      const isUnread = !notif.is_read;
                      const featured = notif.type === 'scene_partner_match';
                      const delay = (stagger++) * 0.05;
                      if (featured) {
                        return (
                          <div key={notif.id} onClick={() => handleClick(notif)} className="notif-row"
                            style={{ animationDelay: `${delay}s`, background: 'linear-gradient(135deg, #C99A4E 0%, #D4A85F 42%, #F0D097 100%)', borderRadius: 22, padding: '15px 18px', color: '#1A1408', border: '1px solid rgba(255,255,255,0.45)', position: 'relative', overflow: 'hidden', boxShadow: '0 12px 30px rgba(212,168,95,0.4), inset 0 1px 0 rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                            <div style={{ position: 'absolute', inset: 7, borderRadius: 16, border: '1px solid rgba(255,255,255,0.22)', pointerEvents: 'none' }} />
                            <div style={{ position: 'absolute', right: -40, top: -40, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.45)', filter: 'blur(28px)' }} />
                            <div className="flex justify-between items-center" style={{ position: 'relative' }}>
                              <div className="aurora-mono" style={{ fontSize: 9, letterSpacing: '0.18px', opacity: 0.7, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon className="w-3 h-3" /> NEW MATCH</div>
                              <div className="flex items-center" style={{ gap: 8 }}>
                                <div className="aurora-mono" style={{ fontSize: 9, opacity: 0.7 }}>{timeAgo(notif.created_at)}</div>
                                {isUnread && <span className="notif-dot" style={{ borderColor: 'rgba(255,255,255,0.8)' }} />}
                              </div>
                            </div>
                            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.4px', marginTop: 9, lineHeight: 1.15, position: 'relative' }}>{notif.title}</div>
                            {notif.message && <div style={{ fontSize: 11, marginTop: 7, opacity: 0.85, position: 'relative' }}>{notif.message}</div>}
                          </div>
                        );
                      }
                      return (
                        <div key={notif.id} onClick={() => handleClick(notif)} className="notif-row"
                          style={{ animationDelay: `${delay}s`, padding: '13px 14px', borderRadius: 20, position: 'relative', overflow: 'hidden', background: 'var(--aurora-glass)', border: '1px solid var(--aurora-glass-border)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', cursor: 'pointer', ...(isUnread ? { boxShadow: `inset 0 0 0 1px ${color}40, 0 8px 24px ${color}22` } : null) }}>
                          {isUnread && <div style={{ position: 'absolute', left: -22, top: -22, width: 90, height: 90, borderRadius: '50%', background: `radial-gradient(circle, ${color}55, transparent 65%)`, filter: 'blur(6px)', pointerEvents: 'none' }} />}
                          <div className="flex" style={{ gap: 12, position: 'relative' }}>
                            <div className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: 13, background: `linear-gradient(135deg, ${color}, ${shade(color, -22)})`, color: '#0E0D0A', border: '1px solid rgba(255,255,255,0.55)', boxShadow: `0 5px 12px ${color}55` }}>
                              <Icon className="w-[17px] h-[17px]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start" style={{ gap: 8 }}>
                                <div style={{ fontSize: 13.5, fontWeight: isUnread ? 700 : 600, letterSpacing: '-0.15px', lineHeight: 1.3, color: 'var(--text-primary)' }}>{notif.title}</div>
                                <div className="flex items-center shrink-0" style={{ gap: 7, paddingTop: 2 }}>
                                  <div className="aurora-mono" style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1px' }}>{timeAgo(notif.created_at)}</div>
                                  {isUnread && <span className="notif-dot" />}
                                </div>
                              </div>
                              {notif.message && <div className="line-clamp-2" style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.45 }}>{notif.message}</div>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <style>{`
              @keyframes notifSheetIn { from { transform: translateY(8%); opacity: 0; } to { transform: none; opacity: 1; } }
              @keyframes notifRowIn { from { transform: translateY(14px); opacity: 0; } to { transform: none; opacity: 1; } }
              @keyframes notifPillIn { from { transform: scale(0.7); opacity: 0; } to { transform: none; opacity: 1; } }
              @keyframes notifDotGlow { 0%, 100% { box-shadow: 0 0 4px rgba(212,168,95,0.7); } 50% { box-shadow: 0 0 12px #D4A85F; } }
              .notif-row { animation: notifRowIn 0.4s cubic-bezier(.2,.7,.3,1) both; }
              .notif-dot { width: 8px; height: 8px; border-radius: 100px; flex-shrink: 0; background: #D4A85F; border: 1.5px solid #fff; animation: notifDotGlow 2.4s ease-in-out infinite; }
              @media (prefers-reduced-motion: reduce) { .notif-row, .notif-dot { animation: none !important; } }
            `}</style>
          </div>
        );
      })(), document.body)}
    </div>
  );
}
