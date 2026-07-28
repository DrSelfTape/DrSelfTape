import { useNavigate } from 'react-router-dom';
import { openReaderProfile } from '../../../../utils/openReaderProfile';

/**
 * "Session Complete" recap — the back bookend to the swipe deck (front bookend
 * is SwipeTutorial). Replaces the bare "You're caught up" empty state once the
 * user has actually swiped this session: shows a Slated/Passed tally, the
 * readers they slated (one-way likes — matches already routed to the Green
 * Room), and a load-more CTA. Inspired by VertiCast's session summary, in the
 * Aurora gold/cream palette.
 */
function cleanName(name) {
  return ((name || 'Actor').replace(/\bNone\b/g, '').replace(/\s+/g, ' ').trim()) || 'Actor';
}
function initials(name) {
  return cleanName(name).split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function Tally({ n, label, gold }) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        minWidth: 92, padding: '12px 6px', borderRadius: 16,
        background: gold ? 'color-mix(in oklch, var(--aurora-heritage-gold) 16%, transparent)' : 'var(--aurora-glass)',
        border: `1px solid ${gold ? 'rgba(212,168,95,0.35)' : 'var(--aurora-glass-border)'}`,
      }}
    >
      <div className="aurora-display" style={{ fontSize: 28, lineHeight: 1, color: gold ? 'var(--aurora-accent-deep)' : 'var(--aurora-text)' }}>{n}</div>
      <div className="aurora-mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--aurora-sub)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function SessionRecap({ swipes, pendingLikes = 0, onSeeLikes, onRefresh }) {
  const navigate = useNavigate();
  const liked = swipes.filter((s) => s.action === 'right' || s.action === 'star');
  const passed = swipes.filter((s) => s.action === 'left');

  const goToReader = (actor) => {
    openReaderProfile(actor?.id, navigate);
  };

  return (
    <div className="absolute inset-0 flex flex-col px-5 py-6 overflow-y-auto">
      <div className="text-center mb-5">
        <div className="aurora-mono" style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--aurora-accent-deep)' }}>SESSION COMPLETE</div>
        <h2 className="aurora-display text-2xl mt-1" style={{ color: 'var(--aurora-text)' }}>That's a wrap 🎬</h2>
      </div>

      <div className="flex items-center justify-center gap-3 mb-5">
        <Tally n={liked.length} label="Slated" gold />
        <Tally n={passed.length} label="Passed" />
      </div>

      {/* "Readers want to read with you" payoff — real incoming interest */}
      {pendingLikes > 0 && (
        <button
          type="button"
          onClick={onSeeLikes}
          onTouchEnd={(e) => { e.preventDefault(); onSeeLikes?.(); }}
          className="flex items-center justify-center gap-2 mx-auto mb-6 px-5 py-3 rounded-full"
          style={{
            background: 'linear-gradient(120deg, #D4A85F, #7A5A18)', color: '#0E0D0A',
            fontWeight: 800, fontSize: 13, letterSpacing: '-0.01em', border: 'none',
            boxShadow: '0 8px 22px rgba(122,90,24,0.4)',
            touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
          }}
        >
          🎬 {pendingLikes} reader{pendingLikes !== 1 ? 's' : ''} want to read with you →
        </button>
      )}

      {liked.length > 0 ? (
        <>
          <div className="aurora-mono mb-2" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--aurora-dim)' }}>You slated</div>
          <div className="flex flex-col gap-2 mb-6">
            {liked.map((s) => (
              <button
                key={s.actor.id}
                type="button"
                onClick={() => goToReader(s.actor)}
                onTouchEnd={(e) => { e.preventDefault(); goToReader(s.actor); }}
                className="flex items-center gap-3 p-3 rounded-xl text-left"
                style={{ background: 'var(--aurora-glass)', border: '1px solid var(--aurora-glass-border)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                <div className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--aurora-heritage-gold)', color: '#0E0D0A', fontWeight: 700, fontSize: 13 }}>
                  {initials(s.actor.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="truncate" style={{ fontWeight: 600, color: 'var(--aurora-text)', fontSize: 14 }}>{cleanName(s.actor.name)}</div>
                  <div style={{ fontSize: 12, color: 'var(--aurora-sub)' }}>{s.matched ? 'Matched. Chat in the Green Room' : "Liked. They'll see it"}</div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--aurora-accent-deep)', fontWeight: 600, whiteSpace: 'nowrap' }}>View →</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-center mb-6" style={{ color: 'var(--aurora-sub)' }}>
          You passed on everyone this round. Adjust your filters to see different readers.
        </p>
      )}

      <button
        type="button"
        onClick={onRefresh}
        onTouchEnd={(e) => { e.preventDefault(); onRefresh(); }}
        className="aurora-mono mx-auto px-7 py-3 rounded-full text-white transition-transform active:scale-95"
        style={{
          background: 'linear-gradient(135deg, var(--aurora-accent), var(--aurora-accent-deep))',
          fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
          boxShadow: 'var(--aurora-shadow-coral)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
        }}
      >
        Load more readers
      </button>
    </div>
  );
}
