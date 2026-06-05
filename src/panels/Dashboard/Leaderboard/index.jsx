import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { X, Loader2 } from 'lucide-react';
import { fetchLeaderboard } from '../../../redux/features/leaderboard/leaderboardSlice';

/* ──────────────────────────────────────────────────────────────────
   Community Leaderboard — handoff §14.11 (screens/v1-leaderboard.jsx).
   v1 ships with mock community seed data + the real signed-in user
   pinned in the sticky bar. Production target: GET /api/v1/leaderboard/
   with ?metric=xp|callbacks|streak&scope=all|friends — to be added on
   the backend. Craft XP ties to the Jericho skill_progress model
   (also pending backend).
   ────────────────────────────────────────────────────────────────── */

const META = {
  xp:        { tab: 'Craft XP',  unit: 'XP',  sub: 'Total craft points earned this season', fmt: (v) => v.toLocaleString() },
  callbacks: { tab: 'Callbacks', unit: 'CB',  sub: 'Callbacks logged this season',           fmt: (v) => String(v) },
  streak:    { tab: 'Streak',    unit: 'DAY', sub: 'Longest active practice streak',          fmt: (v) => `${v}d` },
};

function shade(hex, amt) {
  const h = (hex || '#000000').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  const adj = (c) => Math.max(0, Math.min(255, c + amt));
  return `#${adj(r).toString(16).padStart(2, '0')}${adj(g).toString(16).padStart(2, '0')}${adj(b).toString(16).padStart(2, '0')}`;
}

function Avatar({ leader }) {
  const initials = leader.name.split(' ').map((w) => w[0]).slice(0, 2).join('');
  const gradId = `lb-av-${leader.id}`;
  return (
    <svg viewBox="0 0 48 48" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={leader.color} />
          <stop offset="1" stopColor={shade(leader.color, -22)} />
        </linearGradient>
      </defs>
      <rect width="48" height="48" fill={`url(#${gradId})`} />
      <circle cx="24" cy="19" r="10" fill="rgba(14,13,10,0.22)" />
      <ellipse cx="24" cy="48" rx="20" ry="13" fill="rgba(14,13,10,0.22)" />
      <text x="24" y="24" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="600" fontSize="14" fill="rgba(255,255,255,0.95)">
        {initials}
      </text>
    </svg>
  );
}

function PhotoOrAvatar({ leader }) {
  if (leader.photo) {
    return (
      <img
        src={leader.photo}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    );
  }
  return <Avatar leader={leader} />;
}

function Podium({ top3, metric, onTapLeader }) {
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights = { 0: 96, 1: 124, 2: 80 };
  const medal = ['#C0C6CE', '#D4A85F', '#E0A872']; // silver, gold, bronze
  const M = META[metric];

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10, padding: '22px 24px 8px' }}>
      {order.map((l, pos) => {
        if (!l) return null;
        const rank = top3.indexOf(l) + 1;
        const h = heights[pos];
        const ring = medal[rank - 1];
        const isFirst = rank === 1;
        return (
          <div key={l.id} style={{ flex: 1, maxWidth: 110, textAlign: 'center' }}>
            <div style={{ position: 'relative', width: isFirst ? 74 : 60, height: isFirst ? 74 : 60, margin: '0 auto 8px' }}>
              {isFirst && (
                <div
                  style={{
                    position: 'absolute',
                    top: -22,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 22,
                    filter: 'drop-shadow(0 2px 3px rgba(212,168,95,0.5))',
                  }}
                  aria-hidden="true"
                >
                  👑
                </div>
              )}
              <button
                type="button"
                onClick={() => onTapLeader && onTapLeader(l)}
                aria-label={l.you ? 'Your profile' : `View ${l.name}'s profile`}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: `3px solid ${ring}`,
                  boxShadow: `0 8px 22px ${ring}66`,
                  background: l.color,
                  padding: 0,
                  cursor: onTapLeader ? 'pointer' : 'default',
                  transition: 'transform 150ms cubic-bezier(.2,.7,.3,1)',
                }}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.94)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = ''; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
              >
                <PhotoOrAvatar leader={l} />
              </button>
              <div
                style={{
                  position: 'absolute',
                  bottom: -6,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: ring,
                  color: '#1A1408',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11,
                  fontWeight: 700,
                  border: '2px solid #FBFAF7',
                }}
              >
                {rank}
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.2px', marginTop: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--aurora-text)' }}>
              {l.you ? 'You' : l.name.split(' ')[0]}
            </div>
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--aurora-heritage-gold-deep)',
                marginTop: 2,
              }}
            >
              {M.fmt(l[metric])}
            </div>
            <div
              style={{
                height: h,
                marginTop: 8,
                borderRadius: '14px 14px 0 0',
                background: isFirst
                  ? 'linear-gradient(180deg, #D4A85F, #F0D097)'
                  : `linear-gradient(180deg, ${ring}AA, ${ring}55)`,
                border: '1px solid rgba(255,255,255,0.5)',
                borderBottom: 'none',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                paddingTop: 10,
                boxShadow: `0 8px 20px ${ring}44`,
              }}
            >
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: '#1A1408', opacity: 0.5 }}>
                {rank}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Row({ rank, leader, value, onTapLeader }) {
  const you = leader.you;
  return (
    <button
      type="button"
      onClick={() => onTapLeader && onTapLeader(leader)}
      aria-label={you ? 'Your profile' : `View ${leader.name}'s profile`}
      style={{
        width: '100%',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 14px',
        marginBottom: 6,
        borderRadius: 16,
        background: you ? 'rgba(212,168,95,0.10)' : 'rgba(255,255,255,0.55)',
        border: `1px solid ${you ? 'rgba(212,168,95,0.35)' : 'var(--aurora-line-soft)'}`,
        cursor: onTapLeader ? 'pointer' : 'default',
        transition: 'background 0.15s, transform 0.12s',
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.99)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = ''; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
    >
      <div style={{ width: 22, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600, color: 'var(--aurora-dim)' }}>
        {rank}
      </div>
      <div style={{ width: 42, height: 42, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: leader.color, border: '2px solid #FFFFFF' }}>
        <PhotoOrAvatar leader={leader} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--aurora-text)' }}>
          {you ? 'You' : leader.name}
        </div>
        <div
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9,
            color: 'var(--aurora-dim)',
            letterSpacing: '0.06em',
            marginTop: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>{leader.handle}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{leader.city.toUpperCase()}</span>
        </div>
      </div>
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          color: leader.trend > 0 ? '#3D9A5B' : leader.trend < 0 ? '#C04848' : 'var(--aurora-dim)',
          fontWeight: 600,
          width: 26,
          textAlign: 'right',
        }}
      >
        {leader.trend > 0 ? `▲${leader.trend}` : leader.trend < 0 ? `▼${-leader.trend}` : '—'}
      </div>
      <div style={{ textAlign: 'right', width: 56 }}>
        <div
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: '-0.5px',
            color: 'var(--aurora-text)',
          }}
        >
          {value}
        </div>
      </div>
    </button>
  );
}

export default function Leaderboard({ embedded = false } = {}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [metric, setMetric] = useState('xp');
  // Backend expects scope=all|friends; UI label is "Everyone"|"My circle"
  const [scope, setScope] = useState('all');

  const profile = useSelector((s) => s.profile?.profile);
  const {
    leaders: liveLeaders,
    community_size: liveSize,
    your_rank: liveYourRank,
    loading,
    unavailable,
  } = useSelector((s) => s.leaderboard || {});

  // Fetch the leaderboard each time metric/scope change. The slice caches
  // the last successful response in Redux so the panel paints instantly
  // and refreshes in the background.
  useEffect(() => {
    dispatch(fetchLeaderboard({ metric, scope }));
  }, [dispatch, metric, scope]);

  // Tap a leader → open their profile. The current user taps to their
  // own ReaderProfile path too — same lookup hook (`useReader`) returns
  // their data so the screen renders without an extra fetch.
  const handleTapLeader = (leader) => {
    if (!leader?.user_id) return;
    navigate(`/dashboard/reader-profile/${leader.user_id}`);
  };

  // Normalize the wire format (snake_case + is_me flag) into the row
  // shape the existing Podium/Row components consume (you flag, color,
  // photo, etc).
  const ranked = useMemo(() => {
    const rows = Array.isArray(liveLeaders) ? liveLeaders : [];
    return rows.map((r) => ({
      id: r.id || `user_${r.user_id}`,
      user_id: r.user_id,
      name: r.name,
      handle: r.handle,
      photo: r.photo || null,
      city: r.city || '',
      xp: r.xp || 0,
      callbacks: r.callbacks || 0,
      streak: r.streak || 0,
      color: r.color || '#D4A85F',
      trend: r.trend || 0,
      rank: r.rank,
      you: r.is_me === true,
    }));
  }, [liveLeaders]);

  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const you = ranked.find((l) => l.you);
  const youRank = liveYourRank || (you ? you.rank : 0);
  const firstName = profile?.first_name || 'You';
  const M = META[metric];
  const isEmpty = !loading && ranked.length === 0;
  // Render the sticky "your rank" bar even when the user isn't in the
  // visible top-N (you === undefined). We still know their rank from the
  // separate live-rank API call; fall back to neutral display values for
  // the trend / score columns so the bar doesn't crash on missing fields.
  const showYouBar = !!you || youRank > 0;
  const youTrend = you?.trend ?? 0;
  const youMetricValue = you ? you[metric] : (you?.[metric] ?? 0);

  return (
    <div
      className="aurora-orbs aurora-orbs-live aurora-page-in"
      style={{
        position: 'relative',
        minHeight: '100%',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 130px)',
      }}
    >
      {/* close + community eyebrow — close-X hidden in embedded (tab) mode */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px 4px', position: 'relative', zIndex: 2 }}>
        {embedded ? (
          <div style={{ width: 34 }} />
        ) : (
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Close leaderboard"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid var(--aurora-line)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--aurora-text)',
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        )}
        <span className="aurora-eyebrow" style={{ color: 'var(--aurora-dim)' }}>COMMUNITY</span>
        <div style={{ width: 34 }} />
      </div>

      <div style={{ padding: '4px 24px 0' }}>
        <div className="aurora-display" style={{ fontSize: 34, color: 'var(--aurora-text)', letterSpacing: '-0.6px', lineHeight: 1 }}>
          Leaderboard
        </div>
        <div style={{ fontSize: 13, color: 'var(--aurora-sub)', marginTop: 6 }}>{M.sub}</div>
      </div>

      {/* community banner */}
      <div style={{ padding: '14px 24px 0' }}>
        <div
          style={{
            width: '100%',
            height: 116,
            borderRadius: 20,
            overflow: 'hidden',
            position: 'relative',
            background: '#0E0D0A url(/photos/crucible-circle.png) center 30%/cover',
            boxShadow: '0 10px 28px rgba(20,18,14,0.20)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(110deg, rgba(14,13,10,0.55), transparent 60%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 16,
              top: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                letterSpacing: '0.18em',
                color: 'rgba(255,255,255,0.75)',
              }}
            >
              THIS SEASON
            </div>
            <div
              className="aurora-display"
              style={{
                fontSize: 22,
                color: '#FFF',
                letterSpacing: '-0.4px',
                lineHeight: 1.05,
                marginTop: 4,
                maxWidth: 180,
              }}
            >
              {liveSize || ranked.length} actors grinding with you.
            </div>
          </div>
        </div>
      </div>

      {/* metric tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '16px 24px 0' }}>
        {Object.entries(META).map(([k, m]) => {
          const on = metric === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setMetric(k)}
              style={{
                flex: 1,
                padding: '9px 4px',
                borderRadius: 100,
                cursor: 'pointer',
                background: on ? 'var(--aurora-text)' : 'rgba(255,255,255,0.6)',
                color: on ? '#FFF' : 'var(--aurora-sub)',
                border: `1px solid ${on ? 'var(--aurora-text)' : 'var(--aurora-line)'}`,
                fontFamily: 'Space Grotesk, system-ui, sans-serif',
                fontSize: 13,
                fontWeight: on ? 600 : 500,
              }}
            >
              {m.tab}
            </button>
          );
        })}
      </div>

      {/* scope toggle */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 24px 4px' }}>
        {[['all', 'Everyone'], ['friends', 'My circle']].map(([k, label]) => {
          const on = scope === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setScope(k)}
              style={{
                padding: '6px 14px',
                borderRadius: 100,
                cursor: 'pointer',
                background: on ? 'rgba(212,168,95,0.16)' : 'transparent',
                color: on ? 'var(--aurora-heritage-gold-deep)' : 'var(--aurora-dim)',
                border: `1px solid ${on ? 'rgba(212,168,95,0.40)' : 'var(--aurora-line)'}`,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                letterSpacing: '0.04em',
                fontWeight: on ? 600 : 500,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* loading / empty / unavailable states */}
      {loading && ranked.length === 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 24px' }}>
          <Loader2 size={26} className="animate-spin" style={{ color: 'var(--aurora-heritage-gold)' }} />
        </div>
      )}

      {unavailable && (
        <div style={{ textAlign: 'center', padding: '40px 32px' }}>
          <div className="aurora-display" style={{ fontSize: 20, color: 'var(--aurora-text)' }}>
            Leaderboard coming soon
          </div>
          <p style={{ fontSize: 13, color: 'var(--aurora-sub)', marginTop: 8 }}>
            We&apos;re still finishing the community rankings. Check back in a few minutes.
          </p>
        </div>
      )}

      {!loading && !unavailable && isEmpty && (
        <div style={{ textAlign: 'center', padding: '40px 32px' }}>
          <div className="aurora-display" style={{ fontSize: 20, color: 'var(--aurora-text)' }}>
            No one ranked yet
          </div>
          <p style={{ fontSize: 13, color: 'var(--aurora-sub)', marginTop: 8 }}>
            Log an audition or complete a practice session to put yourself on the board.
          </p>
        </div>
      )}

      {/* podium */}
      {/* First-week hint: while no prior-week snapshot exists, every row's
          trend is 0. Tell users so they don't think trends are broken. */}
      {ranked.length > 0 && ranked.every((l) => l.trend === 0) && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 24px 0' }}>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9,
              letterSpacing: '0.15em',
              color: 'var(--aurora-dim)',
              padding: '6px 12px',
              borderRadius: 100,
              background: 'rgba(10,10,10,0.04)',
              border: '1px solid var(--aurora-line)',
              textAlign: 'center',
            }}
          >
            ↑ TRENDS LIGHT UP NEXT MONDAY
          </div>
        </div>
      )}

      {ranked.length > 0 && <Podium top3={top3} metric={metric} onTapLeader={handleTapLeader} />}

      {/* rest of list */}
      {ranked.length > 0 && (
        <div style={{ padding: '4px 18px 0' }}>
          {rest.map((l, i) => (
            <Row key={l.id} rank={i + 4} leader={l} value={M.fmt(l[metric])} onTapLeader={handleTapLeader} />
          ))}
        </div>
      )}

      {/* sticky your-rank — in embedded mode, sits higher to stay above the
          floating tab bar (which is already at ~96px from the bottom). Also
          renders when the user is outside the visible top-N but we still
          know their server-side rank via liveYourRank. */}
      {showYouBar && (
        <div
          style={{
            position: 'fixed',
            bottom: embedded
              ? 'calc(110px + env(safe-area-inset-bottom, 0px))'
              : 'calc(96px + env(safe-area-inset-bottom, 0px))',
            left: 0,
            right: 0,
            zIndex: embedded ? 51 : 4,
            padding: '12px 16px 16px',
            background: embedded ? 'transparent' : 'linear-gradient(180deg, transparent, var(--aurora-bg) 40%)',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderRadius: 18,
              background: 'linear-gradient(135deg, #D4A85F, #F0D097)',
              color: '#1A1408',
              boxShadow: '0 10px 28px rgba(212,168,95,0.45)',
              border: '1px solid rgba(255,255,255,0.5)',
              pointerEvents: 'auto',
            }}
          >
            <div
              style={{
                width: 30,
                textAlign: 'center',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 17,
                fontWeight: 700,
              }}
            >
              #{youRank}
            </div>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.7)',
                flexShrink: 0,
              }}
            >
              <PhotoOrAvatar leader={you || { photo: profile?.user_image, name: firstName }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.2px' }}>You · {firstName}</div>
              <div
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  letterSpacing: '0.06em',
                  opacity: 0.75,
                }}
              >
                {youTrend > 0 ? `▲ UP ${youTrend} THIS WEEK` : youTrend < 0 ? `▼ DOWN ${-youTrend}` : 'HOLDING STEADY'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: '-0.5px',
                }}
              >
                {M.fmt(youMetricValue)}
              </div>
              <div
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 8,
                  letterSpacing: '0.15em',
                  opacity: 0.7,
                }}
              >
                {M.unit}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
