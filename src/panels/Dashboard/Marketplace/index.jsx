import { useEffect, useState } from 'react';
import { ReaderPortrait } from '../../../components/Aurora';
import { hasAvatar } from '../../../components/Aurora/avatarStyle';
import { useNavigate } from 'react-router-dom';
import { Star, Clock, X, ChevronDown } from 'lucide-react';
import axios from '../../../redux/http';
import { baseURL } from '../../../redux/constant';
import useHideMobileHeader from '../../../components/Shared/useHideMobileHeader';
import { openExternal } from '../../../utils/openExternal';
import { openReaderProfile } from '../../../utils/openReaderProfile';

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
          className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? 'fill-[var(--aurora-heritage-gold)]' : ''}`}
          style={{ color: s <= Math.round(rating) ? 'var(--aurora-heritage-gold)' : 'var(--aurora-dim)' }}
        />
      ))}
      <span className="aurora-mono text-xs ml-1" style={{ color: 'var(--aurora-sub)' }}>
        {rating?.toFixed(1)}
      </span>
    </div>
  );
}

function ReaderCard({ reader, onBook }) {
  const navigate = useNavigate();
  const [duration, setDuration] = useState(30);
  // Headshot + name both navigate to the reader's full profile. The
  // BE Marketplace serializer returns `user_id` (the reader's User row)
  // OR `id` (the ReaderProfile row) — we prefer user_id since the
  // reader-profile route is keyed on User.id everywhere else.
  const targetId = reader?.user_id || reader?.userId || reader?.id;
  const openProfile = () => { openReaderProfile(targetId, navigate); };

  const rates = reader.rates || {};
  const price = rates[duration] ?? '—';

  return (
    <div
      className="aurora-card overflow-hidden flex flex-col"
    >
      {/* Headshot — tappable to profile */}
      <button
        type="button"
        onClick={openProfile}
        aria-label={`View ${reader.name || 'reader'}'s profile`}
        className="relative h-44 w-full p-0 border-0 block"
        style={{
          cursor: targetId ? 'pointer' : 'default',
          background:
            'linear-gradient(135deg, color-mix(in oklch, var(--aurora-rose) 26%, var(--aurora-glass)), color-mix(in oklch, var(--aurora-sky) 18%, var(--aurora-glass)))',
        }}
      >
        {/* A chosen avatar wins over a stored photo, same as the swipe card —
            an actor must not appear as a drawing in one place and a photo in
            another. */}
        {hasAvatar(reader.avatar_style) ? (
          <ReaderPortrait reader={{ id: reader.id, name: reader.name, avatar_style: reader.avatar_style }} />
        ) : reader.headshot ? (
          <img
            src={reader.headshot}
            alt={reader.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="aurora-display text-5xl" style={{ color: 'color-mix(in oklch, var(--aurora-accent-deep) 40%, transparent)' }}>
              {(reader.name || 'R')[0].toUpperCase()}
            </span>
          </div>
        )}
      </button>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <button
          type="button"
          onClick={openProfile}
          aria-label={`View ${reader.name || 'reader'}'s profile`}
          className="aurora-display text-base mb-1 bg-transparent border-0 p-0 text-left"
          style={{ color: 'var(--aurora-text)', cursor: targetId ? 'pointer' : 'default' }}
        >
          {reader.name}
        </button>

        <StarRating rating={reader.rating || 0} />

        <div className="flex items-center gap-2 mt-2">
          <Clock className="w-3.5 h-3.5" style={{ color: 'var(--aurora-dim)' }} />
          <span className="aurora-mono text-xs" style={{ color: 'var(--aurora-sub)' }}>
            {reader.session_count || 0} sessions
          </span>
        </div>

        {/* Specialties */}
        {reader.specialties?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {reader.specialties.slice(0, 3).map((s, i) => (
              <span
                key={i}
                className="aurora-eyebrow px-2 py-0.5 rounded-full"
                style={{
                  background: 'var(--aurora-glass)',
                  color: 'var(--aurora-sub)',
                  border: '1px solid var(--aurora-line)',
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
                    ? 'bg-[var(--aurora-heritage-gold)] text-[var(--aurora-accent-deep)]'
                    : ''
                }`}
                style={
                  duration !== d.value
                    ? {
                        background: 'var(--aurora-glass)',
                        color: 'var(--aurora-sub)',
                        border: '1px solid var(--aurora-line)',
                      }
                    : {}
                }
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="aurora-mono text-lg" style={{ color: 'var(--aurora-mint)' }}>
              {typeof price === 'number' ? `$${price}` : price}
            </span>
            <button
              onClick={() => onBook(reader, duration)}
              className="text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              style={{
                background: 'var(--aurora-heritage-gold)',
                color: 'var(--aurora-accent-deep)',
              }}
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
  useHideMobileHeader(true);

  return (
    // z-[110] beats the persistent MobileApp top bar (z-50). The previous
    // z-50 caused the bell + avatar to bleed onto the modal's title row.
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ background: 'color-mix(in oklch, var(--aurora-text) 45%, transparent)' }}
    >
      <div
        className="aurora-card p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="aurora-display text-lg" style={{ color: 'var(--aurora-text)' }}>
            Confirm Booking
          </h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" style={{ color: 'var(--aurora-dim)' }} />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span style={{ color: 'var(--aurora-sub)' }}>Reader</span>
            <span className="font-semibold" style={{ color: 'var(--aurora-text)' }}>
              {reader?.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--aurora-sub)' }}>Duration</span>
            <span className="aurora-mono" style={{ color: 'var(--aurora-text)' }}>
              {duration} min
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--aurora-sub)' }}>Price</span>
            <span className="aurora-mono" style={{ color: 'var(--aurora-mint)' }}>
              {typeof price === 'number' ? `$${price}` : price}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-colors"
            style={{
              background: 'var(--aurora-glass)',
              color: 'var(--aurora-sub)',
              border: '1px solid var(--aurora-line)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={booking}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            style={{
              background: 'var(--aurora-heritage-gold)',
              color: 'var(--aurora-accent-deep)',
            }}
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
      .then((res) => {
        // Backend wraps responses as { data, message, success } via api_response_parser.
        const body = res.data?.data ?? res.data;
        setReaders(Array.isArray(body) ? body : body?.results || []);
      })
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
        // Open Stripe Checkout in an in-app Safari sheet (Capacitor
        // Browser plugin → SFSafariViewController). That sheet is a
        // real Safari context, so Apple Pay can appear if the domain
        // is verified in Stripe → Apple Pay settings. Replacing the
        // whole WKWebView via window.location.href makes the return
        // trip rough and never shows Apple Pay anyway.
        await openExternal(checkoutUrl);
        setConfirmData(null);
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
    <div className="space-y-4 sm:space-y-6" style={{ color: 'var(--aurora-text)' }}>
      <h1 className="aurora-display text-2xl" style={{ color: 'var(--aurora-text)' }}>
        Reader Marketplace
      </h1>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="aurora-card animate-pulse h-80"
            />
          ))}
        </div>
      ) : readers.length === 0 ? (
        <div
          className="aurora-card p-12 text-center"
        >
          <p className="text-sm" style={{ color: 'var(--aurora-dim)' }}>
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
