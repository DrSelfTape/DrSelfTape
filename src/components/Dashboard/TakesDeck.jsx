import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRecentSessions } from '../../redux/features/jericho/jerichoSlice';
import { listLocalTapes } from '../../utils/selfTapeStore';
import { trackEvent } from '../../utils/analytics';

// Mirrors TapeReview/jerichoSlice — a pending analysis older than the TTL is
// treated as gone (the reaper refunded it server-side).
const PENDING_JOB_KEY = 'dst_pending_analysis';
const PENDING_JOB_TTL_MS = 30 * 60 * 1000;

function readPendingJob() {
  try {
    const raw = window.localStorage.getItem(PENDING_JOB_KEY);
    if (!raw) return null;
    const job = JSON.parse(raw);
    if (!job?.jobId || Date.now() - (job.startedAt || 0) > PENDING_JOB_TTL_MS) return null;
    return job;
  } catch { return null; }
}

function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '';
  const h = Math.floor(ms / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

/* Small stacked-cards glyph — the Lapse "developing deck" read without a
 * thumbnail pipeline: two offset cards behind a front card with an emoji. */
function DeckGlyph({ emoji, pulse }) {
  return (
    <div style={{ position: 'relative', width: 46, height: 46, flexShrink: 0 }}>
      {[10, 5].map((off, i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0, transform: `translateX(${off}px) rotate(${off / 2}deg)`,
          borderRadius: 12, background: 'color-mix(in oklch, var(--aurora-heritage-gold) 22%, transparent)',
          border: '1px solid rgba(212,168,95,0.35)',
        }} />
      ))}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 12,
        background: 'color-mix(in oklch, var(--aurora-heritage-gold) 40%, transparent)',
        border: '1px solid rgba(212,168,95,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
      }}>{emoji}</div>
      {pulse && (
        <span style={{
          position: 'absolute', top: -3, right: -9, width: 12, height: 12, borderRadius: 999,
          background: 'var(--aurora-mint)', boxShadow: '0 0 0 0 rgba(167,236,218,0.7)',
          animation: 'drst-deck-pulse 1.6s ease-out infinite',
        }} />
      )}
    </div>
  );
}

/**
 * The takes deck — the record→pending→reveal loop, pinned where takes are
 * born (under the Practice tab's record button). One card, highest-value
 * state wins: notes ready → review in progress → compare door (2+ reviewed
 * takes) → last take. Renders nothing when there's no loop to show, so a
 * brand-new user just sees the record button.
 */
export default function TakesDeck({ onOpenReview, onCompare, onOpenLibrary }) {
  const dispatch = useDispatch();
  const notesReady = useSelector((s) => !!s.jericho?.notesReady);
  const sessions = useSelector((s) => s.jericho?.recentSessions || []);
  const sessionsLoading = useSelector((s) => !!s.jericho?.sessionsLoading);
  const [pending, setPending] = useState(readPendingJob);
  const [lastTape, setLastTape] = useState(null);

  useEffect(() => {
    if (!sessions.length && !sessionsLoading) dispatch(fetchRecentSessions(10));
    // Pending state lives in localStorage (written by jerichoSlice) — re-read
    // when the tab regains attention so a finished job drops the badge.
    const refresh = () => setPending(readPendingJob());
    window.addEventListener('focus', refresh);
    window.addEventListener('drst-push-received', refresh);
    listLocalTapes().then((tapes) => {
      if (tapes.length) {
        const sorted = [...tapes].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setLastTape(sorted[0]);
      }
    }).catch(() => { /* web / FS unavailable */ });
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('drst-push-received', refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reviewedCount = sessions.filter((x) => x?.session_type === 'self_tape_review').length;

  let card;
  if (notesReady) {
    card = {
      state: 'notes_ready', emoji: '🎬', pulse: true, cta: 'OPEN →', onTap: onOpenReview,
      title: 'Your notes are ready', sub: 'The verdict on your last take is in',
    };
  } else if (pending) {
    card = {
      state: 'pending', emoji: '⏳', pulse: true, cta: 'WATCH →', onTap: onOpenReview,
      title: pending.kind === 'compare' ? 'Comparing your takes' : 'Review in progress',
      sub: 'Jericho is watching your tape',
    };
  } else if (reviewedCount >= 2) {
    card = {
      state: 'compare', emoji: '🏆', pulse: false, cta: 'COMPARE →', onTap: onCompare,
      title: 'Compare your takes', sub: `${reviewedCount} reviewed takes. Find the one to submit`,
    };
  } else if (lastTape) {
    card = {
      state: 'last_take', emoji: '📼', pulse: false, cta: 'LIBRARY →', onTap: onOpenLibrary,
      title: lastTape.title || 'Your last take',
      sub: `Taped ${timeAgo(lastTape.createdAt)}`,
    };
  } else {
    return null;
  }

  const tap = () => {
    trackEvent('takes_deck_tap', { state: card.state });
    card.onTap?.();
  };

  return (
    <button
      type="button"
      onClick={tap}
      onTouchEnd={(e) => { e.preventDefault(); tap(); }}
      className="aurora-card"
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
        padding: '13px 16px', marginBottom: 20, cursor: 'pointer',
        textAlign: 'left', border: 'none', color: 'var(--aurora-text)',
        touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
      }}
    >
      <DeckGlyph emoji={card.emoji} pulse={card.pulse} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {card.title}
        </p>
        <p style={{ fontSize: 11, color: 'var(--aurora-sub)', margin: '2px 0 0' }}>{card.sub}</p>
      </div>
      <span className="aurora-mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--aurora-heritage-gold-deep)', letterSpacing: '0.12em', flexShrink: 0 }}>
        {card.cta}
      </span>
      <style>{'@keyframes drst-deck-pulse {0%{box-shadow:0 0 0 0 rgba(167,236,218,0.7);}70%{box-shadow:0 0 0 8px rgba(167,236,218,0);}100%{box-shadow:0 0 0 0 rgba(167,236,218,0);}}'}</style>
    </button>
  );
}
