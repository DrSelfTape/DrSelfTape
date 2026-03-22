import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Plus } from 'lucide-react';
import {
  fetchBookingsThunk,
  fetchMembershipThunk,
} from '../../../redux/features/bookings/bookingsSlice';

const SESSION_TYPE_LABELS = {
  self_tape: 'Self Tape',
  callback: 'Callback',
  coaching: 'Coaching',
  zoom: 'Zoom Session',
};

const STATUS_COLORS = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};

function formatTime(datetime) {
  return new Date(datetime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(datetime) {
  const d = new Date(datetime);
  return {
    day: d.getDate(),
    month: d.toLocaleString('en-US', { month: 'short' }),
    weekday: d.toLocaleString('en-US', { weekday: 'short' }),
    full: d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
  };
}

// ── Skeleton Card ──────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex gap-4 animate-pulse">
      <div className="w-16 h-16 rounded-lg bg-gray-200" />
      <div className="flex-1 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/4" />
      </div>
    </div>
  );
}

// ── Booking Card ───────────────────────────────────────────────
function BookingCard({ booking, muted }) {
  const date = formatDate(booking.start_datetime);
  const studio = booking.studio_detail;
  const locationName = studio?.location
    ? `${studio.location.name} — ${studio.location.city}, ${studio.location.state}`
    : studio?.name || '—';

  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-5 flex gap-4 transition ${
        muted ? 'opacity-60' : ''
      }`}
    >
      {/* Date badge */}
      <div
        className="flex-shrink-0 w-16 h-16 rounded-lg flex flex-col items-center justify-center text-white"
        style={{ backgroundColor: muted ? '#b0b0b0' : '#ff6b35' }}
      >
        <span className="text-2xl font-bold leading-none">{date.day}</span>
        <span className="text-xs uppercase tracking-wide">{date.month}</span>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-semibold text-gray-900 truncate">
            {SESSION_TYPE_LABELS[booking.session_type] || booking.session_type}
          </h3>
          <span
            className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${
              STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-600'
            }`}
          >
            {booking.status}
          </span>
        </div>

        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <MapPin size={14} />
            {locationName}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {formatTime(booking.start_datetime)} – {formatTime(booking.end_datetime)}
          </span>
        </div>

        {booking.price && (
          <p className="mt-1.5 text-sm font-medium text-gray-700">
            ${Number(booking.price).toFixed(2)}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────
function EmptyState({ isUpcoming }) {
  const navigate = useNavigate();

  return (
    <div className="text-center py-16">
      <Calendar className="mx-auto mb-4 text-gray-300" size={48} />
      <p className="text-gray-500 mb-1">
        {isUpcoming
          ? 'No upcoming sessions scheduled.'
          : 'No past sessions yet.'}
      </p>
      {isUpcoming && (
        <button
          onClick={() => navigate('/dashboard/book-session')}
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium text-sm"
          style={{ backgroundColor: '#ff6b35' }}
        >
          <Plus size={16} />
          Book New Session
        </button>
      )}
    </div>
  );
}

// ── Stats Bar ──────────────────────────────────────────────────
function StatsBar({ bookings, membership }) {
  const now = new Date();
  const thisMonth = bookings.filter((b) => {
    const d = new Date(b.start_datetime);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const stats = [
    { label: 'Total Sessions', value: bookings.length },
    { label: 'This Month', value: thisMonth.length },
    {
      label: 'Membership',
      value: membership?.plan
        ? membership.plan.charAt(0).toUpperCase() + membership.plan.slice(1)
        : 'None',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-white rounded-xl shadow-sm p-4 text-center"
        >
          <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          <p className="text-xs text-gray-500 mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function Bookings() {
  const dispatch = useDispatch();
  const { bookings, membership, loading, membershipLoading } = useSelector(
    (state) => state.bookings
  );
  const [tab, setTab] = useState('upcoming');

  useEffect(() => {
    dispatch(fetchBookingsThunk());
    dispatch(fetchMembershipThunk());
  }, [dispatch]);

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const up = [];
    const pa = [];
    const list = Array.isArray(bookings) ? bookings : [];
    list.forEach((b) => {
      if (new Date(b.start_datetime) >= now) up.push(b);
      else pa.push(b);
    });
    up.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    pa.sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime));
    return { upcoming: up, past: pa };
  }, [bookings]);

  const activeList = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Bookings</h2>
        <p className="text-gray-500 text-sm mt-1">
          View your upcoming and past studio sessions.
        </p>
      </div>

      {/* Stats */}
      {!loading && (
        <StatsBar
          bookings={Array.isArray(bookings) ? bookings : []}
          membership={membership}
        />
      )}

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200">
        {['upcoming', 'past'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2.5 text-sm font-medium capitalize transition ${
              tab === t
                ? 'border-b-2 text-gray-900'
                : 'text-gray-400 hover:text-gray-600'
            }`}
            style={tab === t ? { borderColor: '#ff6b35' } : undefined}
          >
            {t} ({t === 'upcoming' ? upcoming.length : past.length})
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : activeList.length === 0 ? (
        <EmptyState isUpcoming={tab === 'upcoming'} />
      ) : (
        <div className="space-y-4">
          {activeList.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              muted={tab === 'past'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
