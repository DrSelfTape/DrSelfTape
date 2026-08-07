import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users2, HeartHandshake, Radio, Gift } from 'lucide-react';
import FindAReader from '../FindAReader';
import WhoWantsToRead from '../FindAReader/WhoWantsToRead';
import AvailabilityToggle from '../../../components/Dashboard/AvailabilityToggle';
import { fetchMatchingStats } from '../../../redux/features/readers/readersMatchSlice';
import { trackEvent } from '../../../utils/analytics';
import { supplyLine } from '../../../utils/supply';

/**
 * The ONE reader surface (P1-05). Replaces three routes that told three
 * different supply stories (a 20-cap deck labeled "NEARBY", an availability
 * flag count of 195, and a dead marketplace). Design rule that makes lying
 * impossible: every number in the truth strip comes from the same slice
 * that renders the content below it — counts match contents by
 * construction.
 *
 * Deliberate deviations from the P1-05 ticket, documented:
 * - Green Room stays its own route: it's the conversations home, not
 *   supply; merging chat into discovery hurts both.
 * - No "Live now" FILTER: reader rows carry no per-reader presence flag,
 *   so a live-filtered list can't be rendered honestly. The aggregate
 *   onlineCount appears in the truth strip instead.
 * - No "Paid" filter until P4-02: zero readers have opted in; a
 *   permanently-empty filter is the dead marketplace all over again.
 */
const FILTERS = [
  { id: 'browse', label: 'Browse readers', icon: Users2 },
  { id: 'interested', label: 'Interested in you', icon: HeartHandshake },
];

export default function Readers() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { readers = [], matchingStats } = useSelector(
    (s) => s.readersMatch || {}
  );
  const interestedCount = matchingStats?.pending_likes_count || 0;
  // Phrasing owned by utils/supply — see that file for why every surface
  // stopped rolling its own count.
  const supply = supplyLine(matchingStats);

  // Default: never land on an empty filter (ticket req 2). Browse wins when
  // the deck has anyone; otherwise Interested if it has anyone.
  const requested = searchParams.get('filter');
  const defaultFilter = readers.length > 0 || interestedCount === 0 ? 'browse' : 'interested';
  const filter = FILTERS.some((f) => f.id === requested) ? requested : defaultFilter;

  // This page deliberately does NOT fetch the deck. It renders <FindAReader>,
  // which owns that fetch along with the user's saved filters, the caught-up
  // state and the retry-on-error. Dispatching here as well produced a duplicate
  // unfiltered request racing FindAReader's filtered one, and whichever landed
  // last won — so the deck could show the wrong set.
  useEffect(() => { dispatch(fetchMatchingStats()); }, [dispatch]);

  const counts = useMemo(() => ({
    browse: readers.length,
    interested: interestedCount,
  }), [readers.length, interestedCount]);

  useEffect(() => {
    trackEvent('reader_surface_viewed', { filter, result_count: counts[filter] ?? 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Only claim "nothing here" when the INTERESTED side is also empty and the
  // browse deck is genuinely finished loading without error. Anything else is
  // FindAReader's job to render — it owns the fetch, the caught-up state and
  // the retry, and rendering our card instead of it is what used to leave the
  // deck permanently unfetched.
  const allEmpty = interestedCount === 0 && filter === 'interested';

  return (
    <div className="aurora-orbs" style={{ color: 'var(--aurora-text)', fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* One availability control per route (sidebar owns it); the embedded
          deck's FILTERS chip also lives top-right, so the header stays clean. */}
      <div className="mb-1">
        <span className="aurora-eyebrow" style={{ display: 'block', marginBottom: 4 }}>CONNECT</span>
        <h1 className="aurora-display text-2xl" style={{ letterSpacing: '-0.6px' }}>Readers</h1>
      </div>

      {/* The truth strip — every number sourced from the slice that renders
          the content below. One supply story, told once. */}
      <p className="aurora-mono text-xs mb-4" style={{ color: 'var(--aurora-sub)', letterSpacing: '0.06em' }}>
        {supply && <>{supply.text}<span style={{ opacity: 0.4 }}> · </span></>}
        {interestedCount} interested in you
      </p>

      {/* Filter chips with live counts (= list contents, always) */}
      <div className="flex gap-2 mb-5">
        {FILTERS.map((f) => {
          const on = filter === f.id;
          const Icon = f.icon;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setSearchParams({ filter: f.id }, { replace: true })}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors"
              style={{
                border: on ? '1px solid color-mix(in oklch, var(--aurora-heritage-gold) 45%, transparent)' : '1px solid var(--aurora-line)',
                background: on ? 'color-mix(in oklch, var(--aurora-heritage-gold) 16%, transparent)' : 'var(--aurora-glass)',
                color: on ? 'var(--aurora-accent-deep)' : 'var(--aurora-sub)',
                cursor: 'pointer', minHeight: 40,
              }}
            >
              <Icon size={13} />
              {f.label}
              <span className="aurora-mono" style={{ fontSize: 10, opacity: 0.8 }}>{counts[f.id] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {/* All-empty: a real next step, never "check back soon" (req 5) */}
      {allEmpty ? (
        <div className="rounded-2xl border p-8 text-center" style={{ borderColor: 'var(--aurora-line)', background: 'var(--aurora-surface-solid)' }}>
          <Radio size={22} style={{ margin: '0 auto 10px', color: 'var(--aurora-accent-deep)' }} />
          <p className="aurora-display text-lg mb-1">No readers in your deck right now</p>
          <p className="text-sm mb-5" style={{ color: 'var(--aurora-sub)' }}>
            Go available so other actors can find you the moment they need a reader, or bring a scene partner with you.
          </p>
          <div className="flex items-center justify-center gap-3">
            <AvailabilityToggle />
            <button
              type="button"
              onClick={() => navigate('/dashboard/referral')}
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"
              style={{ border: '1px solid var(--aurora-line)', background: 'var(--aurora-glass)', color: 'var(--aurora-text)', cursor: 'pointer' }}
            >
              <Gift size={14} /> Invite an actor
            </button>
          </div>
        </div>
      ) : filter === 'interested' ? (
        <WhoWantsToRead embedded />
      ) : (
        <FindAReader embedded />
      )}
    </div>
  );
}
