import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Home, RotateCcw, Star, Check } from 'lucide-react';
import { submitReaderRating } from '../../redux/features/readers/readersMatchSlice';
import useHideMobileHeader from '../Shared/useHideMobileHeader';

export default function PostCallScreen({ partnerName, matchId, onClose, onHome }) {
  useHideMobileHeader(true);
  const dispatch = useDispatch();
  const first = (partnerName || 'them').split(' ')[0];
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [rated, setRated] = useState(false);
  const [savingRating, setSavingRating] = useState(false);

  // Capture the rating the moment a star is tapped — so it's saved even if the
  // actor leaves without pressing a button. This is the ONE rating for the
  // session (the green-room modal is no longer opened post-call). Stars fill
  // optimistically; "saved" only shows after the request actually succeeds, and
  // a concurrent submit is guarded (sequential re-rates are fine — the BE upserts).
  const rate = async (s) => {
    // Ignore taps while a submit is in flight (prevents a phantom star change
    // with no matching submit); re-rating after it settles works normally.
    if (!matchId || savingRating) return;
    setRating(s);
    setRated(false);          // hide "saved" until THIS rating actually succeeds
    setSavingRating(true);
    try {
      await dispatch(submitReaderRating({ match_id: matchId, rating: s })).unwrap();
      setRated(true);
    } catch { /* leave the stars set — they can tap again to retry */ } finally {
      setSavingRating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'var(--bg-deep)' }}>
      <div className="max-w-md w-full px-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-[#D4A85F]/15 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎬</span>
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: "'Playfair Display', serif" }}>
            Great session with {first}!
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {rated ? 'Thanks. Your rating is saved.' : `How was your read with ${first}?`}
          </p>
        </div>

        {/* Star Rating — submits on tap */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => rate(s)}
              disabled={savingRating}
              onMouseEnter={() => setHoverRating(s)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-110 disabled:opacity-60"
              aria-label={`Rate ${s} star${s > 1 ? 's' : ''}`}
            >
              <Star
                className={`w-10 h-10 transition-colors ${
                  s <= (hoverRating || rating) ? 'text-[#FCE072] fill-[#FCE072]' : ''
                }`}
                style={s > (hoverRating || rating) ? { color: 'var(--border-active)' } : {}}
              />
            </button>
          ))}
        </div>

        {/* Home is the exit; the read-again loop keeps the chat one tap away.
            (Tips removed per Joseph 2026-07-30 — reader payments return with
            the P4 marketplace, on real rails.) */}
        <button
          onClick={onHome || onClose}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-[#0A0A0A] transition-all"
          style={{ background: 'linear-gradient(135deg, #D4A85F, #7A5A18)' }}
        >
          <Home className="w-4 h-4" /> Back to Home
        </button>
        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 py-3.5 mt-3 rounded-xl font-semibold text-sm transition-all"
          style={{ border: '1px solid var(--border-active)', color: 'var(--text-primary)', background: 'transparent' }}
        >
          <RotateCcw className="w-4 h-4" /> Read with {first} again
        </button>
        {rated && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Check className="w-3.5 h-3.5" /> Rating saved
          </p>
        )}
      </div>
    </div>
  );
}
