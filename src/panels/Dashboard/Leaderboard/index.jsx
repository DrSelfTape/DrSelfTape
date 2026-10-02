import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { X, Loader2 } from 'lucide-react';
import { fetchLeaderboard } from '../../../redux/features/leaderboard/leaderboardSlice';
import { openReaderProfile } from '../../../utils/openReaderProfile';
import '../studioScreens.css';

/* ──────────────────────────────────────────────────────────────────
   Community Leaderboard — live off GET /api/v1/leaderboard/
   (?metric=xp|callbacks|streak&scope=all|friends). The mock community
   seed data this screen shipped with in v1 is gone; every row is real.

   The xp metric is UserStreak.total_xp, awarded by the Daily Challenge
   button — including non-craft tasks like "Update your profile". It is
   NOT craft practice, so it is labelled "Challenge XP". Re-point it at
   PracticeDay (_current_practice_streak_days) before calling it craft.

   Studio reskin: warm paper, ink, restrained brass. Wording unchanged.
   ────────────────────────────────────────────────────────────────── */

const META = {
  xp:        { tab: 'Challenge XP', unit: 'XP', sub: 'Points from daily challenges this season', fmt: (v) => v.toLocaleString() },
  callbacks: { tab: 'Callbacks', unit: 'CB',  sub: 'Callbacks logged this season',           fmt: (v) => String(v) },
  streak:    { tab: 'Streak',    unit: 'DAY', sub: 'Longest active practice streak',          fmt: (v) => `${v}d` },
};

function initialsOf(name) {
  return String(name || '')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');
}

/* Monogram, not a coloured gradient — the Studio palette has one accent and
   a per-user hue would spend it on decoration. */
function Monogram({ leader }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'grid',
        placeItems: 'center',
        width: '100%',
        height: '100%',
        background: 'var(--sx-well)',
        color: 'var(--sx-muted)',
        font: '400 15px/1 var(--sx-serif)',
        letterSpacing: '0.04em',
      }}
    >
      {initialsOf(leader.name)}
    </span>
  );
}

function PhotoOrAvatar({ leader }) {
  const [broken, setBroken] = useState(false);
  if (leader.photo && !broken) {
    return (
      <img
        src={leader.photo}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
        onError={() => setBroken(true)}
      />
    );
  }
  return <Monogram leader={leader} />;
}

function Podium({ top3, metric, onTapLeader }) {
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights = { 0: 84, 1: 110, 2: 68 };
  const M = META[metric];

  return (
    <div className="sx-podium" style={{ padding: '20px 24px 0' }}>
      {order.map((l, pos) => {
        if (!l) return null;
        const rank = top3.indexOf(l) + 1;
        const isFirst = rank === 1;
        const size = isFirst ? 70 : 58;
        return (
          <div key={l.id} style={{ flex: 1, maxWidth: 110, textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => onTapLeader && onTapLeader(l)}
              aria-label={l.you ? 'Your profile' : `View ${l.name}'s profile`}
              className="sx-avatar"
              style={{
                width: size,
                height: size,
                margin: '0 auto',
                padding: 0,
                display: 'block',
                borderColor: isFirst ? 'var(--sx-gold)' : 'var(--sx-line)',
                borderWidth: isFirst ? 2 : 1,
                borderStyle: 'solid',
                background: 'var(--sx-surface)',
                cursor: onTapLeader ? 'pointer' : 'default',
              }}
            >
              <PhotoOrAvatar leader={l} />
            </button>
            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '-0.2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: 'var(--sx-ink)',
              }}
            >
              {l.you ? 'You' : l.name.split(' ')[0]}
            </div>
            <div className="sx-score" style={{ marginTop: 3, fontSize: 16 }}>
              {M.fmt(l[metric])}
            </div>
            <div className="sx-plinth" data-rank={rank} style={{ height: heights[pos] }}>
              {rank}
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
      className="sx-row"
      data-you={you ? 'true' : 'false'}
    >
      <span className="sx-rank">{rank}</span>
      <span className="sx-avatar" style={{ width: 40, height: 40, display: 'block' }}>
        <PhotoOrAvatar leader={leader} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '-0.2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: 'var(--sx-ink)',
          }}
        >
          {you ? 'You' : leader.name}
        </span>
        <span className="sx-meta sx-meta--faint" style={{ display: 'block', marginTop: 2 }}>
          {leader.handle}
          {leader.city ? ` · ${leader.city}` : ''}
        </span>
      </span>
      <span
        className="sx-meta"
        style={{
          width: 28,
          textAlign: 'right',
          color: leader.trend > 0 ? 'var(--sx-ok)' : leader.trend < 0 ? 'var(--sx-alert)' : 'var(--sx-faint)',
        }}
      >
        {leader.trend > 0 ? `▲${leader.trend}` : leader.trend < 0 ? `▼${-leader.trend}` : '—'}
      </span>
      <span className="sx-score" style={{ width: 58, textAlign: 'right' }}>{value}</span>
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
    openReaderProfile(leader.user_id, navigate);
  };

  // Normalize the wire format (snake_case + is_me flag) into the row
  // shape the existing Podium/Row components consume (you flag, photo, etc).
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
      className="sx sx-page"
      style={{
        position: 'relative',
        minHeight: '100%',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 130px)',
      }}
    >
      {/* close + community eyebrow — close-X hidden in embedded (tab) mode */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px 0',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {embedded ? (
          <div style={{ width: 44 }} />
        ) : (
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Close leaderboard"
            className="sx-icon-btn"
            style={{ margin: 0 }}
          >
            <X size={16} />
          </button>
        )}
        <span className="sx-eyebrow">COMMUNITY</span>
        <div style={{ width: 44 }} />
      </div>

      <div style={{ padding: '6px 24px 0' }}>
        <h1 className="sx-title">Leaderboard</h1>
        {/* Honest label: this ranks daily-challenge points, not craft. */}
        <p className="sx-lede">{M.sub}</p>
      </div>

      {/* community line */}
      <div style={{ padding: '16px 24px 0' }}>
        <div
          className="sx-card"
          style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}
        >
          <span className="sx-eyebrow">THIS SEASON</span>
          <span style={{ font: '400 19px/1.2 var(--sx-serif)', color: 'var(--sx-ink)' }}>
            {liveSize || ranked.length} actors grinding with you.
          </span>
        </div>
      </div>

      {/* metric tabs */}
      <div
        className="sx-tabs sx-scroll-x"
        role="tablist"
        aria-label="Leaderboard metric"
        style={{ gap: 22, margin: '18px 24px 0' }}
      >
        {Object.entries(META).map(([k, m]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={metric === k}
            onClick={() => setMetric(k)}
            className="sx-tab"
            style={{ textTransform: 'none' }}
          >
            {m.tab}
          </button>
        ))}
      </div>

      {/* scope toggle */}
      <div style={{ display: 'flex', gap: 8, padding: '14px 24px 4px' }}>
        {[['all', 'Everyone'], ['friends', 'My circle']].map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={scope === k}
            onClick={() => setScope(k)}
            className="sx-chip"
          >
            {label}
          </button>
        ))}
      </div>

      {/* loading / empty / unavailable states */}
      {loading && ranked.length === 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '56px 24px' }} aria-busy="true">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--sx-gold)' }} aria-hidden="true" />
        </div>
      )}

      {unavailable && (
        <div className="sx-empty">
          <h2>Leaderboard coming soon</h2>
          <p>We&apos;re still finishing the community rankings. Check back in a few minutes.</p>
        </div>
      )}

      {!loading && !unavailable && isEmpty && (
        <div className="sx-empty">
          <h2>No one ranked yet</h2>
          <p>Log an audition or complete a practice session to put yourself on the board.</p>
        </div>
      )}

      {/* First-week hint: while no prior-week snapshot exists, every row's
          trend is 0. Tell users so they don't think trends are broken. */}
      {ranked.length > 0 && ranked.every((l) => l.trend === 0) && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 24px 0' }}>
          <span className="sx-badge" data-tone="quiet">Trends light up next Monday</span>
        </div>
      )}

      {ranked.length > 0 && <Podium top3={top3} metric={metric} onTapLeader={handleTapLeader} />}

      {/* rest of list */}
      {ranked.length > 0 && (
        <div style={{ padding: '14px 18px 0' }}>
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
          className="sx-youbar"
          style={{
            bottom: embedded
              ? 'calc(110px + env(safe-area-inset-bottom, 0px))'
              : 'calc(96px + env(safe-area-inset-bottom, 0px))',
            zIndex: embedded ? 51 : 4,
          }}
        >
          <div>
            <span className="sx-rank" style={{ width: 30, fontSize: 17 }}>#{youRank}</span>
            <span className="sx-avatar" style={{ width: 38, height: 38, display: 'block' }}>
              <PhotoOrAvatar leader={you || { photo: profile?.user_image, name: firstName }} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 600, letterSpacing: '-0.2px' }}>
                You · {firstName}
              </span>
              <span className="sx-meta sx-meta--faint" style={{ display: 'block', marginTop: 2 }}>
                {youTrend > 0 ? `Up ${youTrend} this week` : youTrend < 0 ? `Down ${-youTrend} this week` : 'Holding steady'}
              </span>
            </span>
            <span style={{ textAlign: 'right' }}>
              <span className="sx-score" style={{ display: 'block' }}>{M.fmt(youMetricValue)}</span>
              <span className="sx-eyebrow" style={{ marginTop: 2 }}>{M.unit}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
