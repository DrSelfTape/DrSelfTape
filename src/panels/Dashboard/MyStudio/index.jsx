/**
 * My Studio — the client's own sessions at the studio.
 *
 * WHY THIS EXISTS
 * ---------------
 * ~1,800 accounts were provisioned from studio bookings, and the LA studio's
 * regulars book about nine times a year each. Until now none of that was
 * visible in the app: the booking list filtered on a column the sync never
 * writes, so every one of those clients opened the app and saw nothing.
 *
 * This is the surface that makes the app worth opening for someone who already
 * pays the studio — their sessions, the footage from each one, and the notes
 * that came with it. Rebooking currently hands off to Wix, which still owns the
 * booking calendar.
 */
import { useEffect, useState } from 'react';
import { Calendar, Clock, Film, MapPin, ChevronRight, Loader2 } from 'lucide-react';
import axios from '../../../redux/http';
import endPoints, { baseURL } from '../../../redux/constant';
import { openExternal } from '../../../utils/openExternal';

const GOLD = '#D4A85F';

// Fallback only. The real destination comes from the server, routed by the
// client's most recent studio — each location is a separate Wix site on its own
// domain, so a New York regular must not be sent to the Hollywood page. Wix
// remains the booking system of record; we only hand off to the right one.
const BOOK_URL_FALLBACK = 'https://www.drselftapes.com/hollywood';

// How many past sessions to load. Regulars have years of history behind them.
const PAST_LIMIT = 30;

// The delivery page lives on the API origin, not the app origin. baseURL ends
// in /api, and the tape link sits at the root — so trim it rather than
// hard-coding a host that can go stale.
const apiOrigin = String(baseURL || '').replace(/\/api\/?$/, '');

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
};

const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

const occursAt = (b) => b?.session_date || b?.start_datetime || null;

function SessionCard({ booking, upcoming }) {
  const when = occursAt(booking);
  const tapes = booking.tapes || [];
  const deliveryUrl = booking.delivery_path ? `${apiOrigin}${booking.delivery_path}` : null;

  return (
    <div className="rounded-2xl border border-[rgba(10,10,10,0.08)] bg-white p-4 mb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-[15px] text-[#0A0A0A] truncate">
            {booking.service_name || 'Studio Session'}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[rgba(10,10,10,0.62)]">
            <span className="inline-flex items-center gap-1">
              <Calendar size={13} /> {fmtDate(when)}
            </span>
            {when && (
              <span className="inline-flex items-center gap-1">
                <Clock size={13} /> {fmtTime(when)}
              </span>
            )}
            {booking.location_name && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin size={13} /> {booking.location_name}
              </span>
            )}
          </div>
        </div>
        {upcoming && (
          <span
            className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
            style={{ color: '#0A0A0A', background: 'rgba(212,168,95,0.22)' }}
          >
            Upcoming
          </span>
        )}
      </div>

      {/* The tape is the reason a past session is worth looking at. */}
      {!upcoming && tapes.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[rgba(10,10,10,0.07)]">
          <div className="flex items-center gap-2 text-[13px] text-[rgba(10,10,10,0.62)] mb-2">
            <Film size={14} />
            {tapes.length} {tapes.length === 1 ? 'tape' : 'tapes'} from this session
          </div>
          {deliveryUrl && (
            <button
              type="button"
              onClick={() => openExternal(deliveryUrl)}
              className="w-full inline-flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-sm cursor-pointer"
              style={{ background: GOLD, color: '#0A0A0A' }}
            >
              Watch your tape &amp; notes
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      )}

      {/* A past session with nothing attached is the normal state for anything
          shot before the studio started delivering into the app — say so
          plainly rather than rendering an empty shelf. */}
      {!upcoming && tapes.length === 0 && (
        <div className="mt-3 pt-3 border-t border-[rgba(10,10,10,0.07)] text-[13px] text-[rgba(10,10,10,0.45)]">
          No tape attached to this session.
        </div>
      )}
    </div>
  );
}

export default function MyStudio() {
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookUrl, setBookUrl] = useState(BOOK_URL_FALLBACK);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Bounded on purpose. History is far longer than it looks — 1,883
        // accounts have bookings and one has 822 — so an unbounded fetch would
        // pull megabytes and try to render hundreds of cards.
        const [u, p, sum] = await Promise.all([
          axios.get(endPoints.myBookings, { params: { status: 'upcoming', limit: 10 } }),
          axios.get(endPoints.myBookings, { params: { status: 'past', limit: PAST_LIMIT } }),
          axios.get(endPoints.studioSummary).catch(() => null),
        ]);
        if (!alive) return;
        const rows = (res) => res?.data?.data || res?.data?.results || res?.data || [];
        setUpcoming(Array.isArray(rows(u)) ? rows(u) : []);
        setPast(Array.isArray(rows(p)) ? rows(p) : []);
        const routed = sum?.data?.data?.book_url || sum?.data?.book_url;
        if (routed) setBookUrl(routed);
      } catch {
        if (alive) setError("We couldn't load your sessions. Pull down to try again.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const hasNothing = !loading && !error && upcoming.length === 0 && past.length === 0;

  return (
    <div className="px-4 pb-24 pt-2 max-w-2xl mx-auto">
      <h1 className="text-[22px] font-semibold text-[#0A0A0A] mb-1">My Studio</h1>
      <p className="text-[14px] text-[rgba(10,10,10,0.62)] mb-5">
        Your sessions at Dr Self Tape, and the footage from each one.
      </p>

      {loading && (
        <div className="flex items-center gap-2 text-[rgba(10,10,10,0.62)] text-sm py-10 justify-center">
          <Loader2 size={16} className="animate-spin" /> Loading your sessions…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-[rgba(224,122,106,0.3)] bg-[rgba(224,122,106,0.08)] text-[#B4503F] text-sm p-3 mb-4">
          {error}
        </div>
      )}

      {!loading && upcoming.length > 0 && (
        <>
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-[rgba(10,10,10,0.45)] mb-2">
            Next up
          </h2>
          {upcoming.map((b) => <SessionCard key={b.id} booking={b} upcoming />)}
        </>
      )}

      {!loading && past.length > 0 && (
        <>
          <h2 className="mt-6 text-[13px] font-bold uppercase tracking-wide text-[rgba(10,10,10,0.45)] mb-2">
            Past sessions
          </h2>
          {past.map((b) => <SessionCard key={b.id} booking={b} upcoming={false} />)}
          {past.length >= PAST_LIMIT && (
            <p className="text-[13px] text-[rgba(10,10,10,0.45)] text-center mt-1 mb-2">
              Showing your {PAST_LIMIT} most recent sessions.
            </p>
          )}
        </>
      )}

      {hasNothing && (
        <div className="text-center py-12 px-4">
          <div className="text-[15px] font-semibold text-[#0A0A0A] mb-1">
            No sessions yet
          </div>
          <p className="text-[14px] text-[rgba(10,10,10,0.62)] mb-5">
            Book a session at the studio and your tape and casting notes will land
            here automatically.
          </p>
        </div>
      )}

      {!loading && (
        <button
          type="button"
          onClick={() => openExternal(bookUrl)}
          className="w-full mt-4 px-5 py-4 rounded-xl font-semibold text-[15px] cursor-pointer"
          style={{ background: GOLD, color: '#0A0A0A' }}
        >
          {past.length > 0 ? 'Book another session' : 'Book a session'}
        </button>
      )}
    </div>
  );
}
