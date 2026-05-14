import { useEffect, useState } from 'react';
import { Star, Clock, X, ChevronDown } from 'lucide-react';
import axios from '../../../redux/http';
import { baseURL } from '../../../redux/constant';

const DURATIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '60 min' },
];

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? 'text-[#FCE072] fill-[#FCE072]' : ''}`}
          style={s > Math.round(rating) ? { color: 'var(--text-muted)' } : {}}
        />
      ))}
      <span className="text-xs ml-1" style={{ color: 'var(--text-secondary)' }}>
        {rating?.toFixed(1)}
      </span>
    </div>
  );
}

function ReaderCard({ reader, onBook }) {
  const [duration, setDuration] = useState(30);

  const rates = reader.rates || {};
  const price = rates[duration] ?? '—';

  return (
    <div
      className="rounded-2xl border overflow-hidden flex flex-col"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
    >
      {/* Headshot */}
      <div className="relative h-44 bg-gradient-to-br from-[#FF8280]/20 to-[#A7ECDA]/10">
        {reader.headshot ? (
          <img
            src={reader.headshot}
            alt={reader.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl font-bold text-[#7A5A18]/40">
              {(reader.name || 'R')[0].toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          {reader.name}
        </h3>

        <StarRating rating={reader.rating || 0} />

        <div className="flex items-center gap-2 mt-2">
          <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {reader.session_count || 0} sessions
          </span>
        </div>

        {/* Specialties */}
        {reader.specialties?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {reader.specialties.slice(0, 3).map((s, i) => (
              <span
                key={i}
                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                }}
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Duration Picker + Price */}
        <div className="mt-auto pt-4">
          <div className="flex items-center gap-2 mb-2">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setDuration(d.value)}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-colors ${
                  duration === d.value
                    ? 'bg-[#D4A85F] text-[#0A0A0A]'
                    : ''
                }`}
                style={
                  duration !== d.value
                    ? {
                        background: 'var(--bg-surface)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-default)',
                      }
                    : {}
                }
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-[#A7ECDA]">
              {typeof price === 'number' ? `$${price}` : price}
            </span>
            <button
              onClick={() => onBook(reader, duration)}
              className="bg-[#D4A85F] hover:bg-[#C09850] text-[#0A0A0A] text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              Book Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ reader, duration, onConfirm, onClose, booking }) {
  const price = reader?.rates?.[duration] ?? '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div
        className="rounded-2xl p-6 w-full max-w-md border"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Confirm Booking
          </h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary)' }}>Reader</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {reader?.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary)' }}>Duration</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {duration} min
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary)' }}>Price</span>
            <span className="font-bold text-[#A7ECDA]">
              {typeof price === 'number' ? `$${price}` : price}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-colors"
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={booking}
            className="flex-1 bg-[#D4A85F] hover:bg-[#C09850] text-[#0A0A0A] py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {booking ? 'Booking...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const [readers, setReaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmData, setConfirmData] = useState(null); // { reader, duration }
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    axios
      .get(`${baseURL}/v1/growth/marketplace/readers/`)
      .then((res) => setReaders(Array.isArray(res.data) ? res.data : res.data?.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleBook = (reader, duration) => {
    setConfirmData({ reader, duration });
  };

  const handleConfirm = async () => {
    if (!confirmData) return;
    setBooking(true);
    try {
      const { data } = await axios.post(`${baseURL}/v1/growth/marketplace/book/`, {
        reader_id: confirmData.reader.user_id,
        duration: confirmData.duration,
      });
      const checkoutUrl = data?.data?.checkout_url;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        setConfirmData(null);
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        Reader Marketplace
      </h1>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl h-80"
              style={{ background: 'var(--bg-card)' }}
            />
          ))}
        </div>
      ) : readers.length === 0 ? (
        <div
          className="rounded-2xl p-12 border text-center"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No readers available at the moment. Check back soon!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
          {readers.map((reader) => (
            <ReaderCard key={reader.id} reader={reader} onBook={handleBook} />
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmData && (
        <ConfirmModal
          reader={confirmData.reader}
          duration={confirmData.duration}
          onConfirm={handleConfirm}
          onClose={() => setConfirmData(null)}
          booking={booking}
        />
      )}
    </div>
  );
}
