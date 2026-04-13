import { useState } from 'react';
import { Star, X } from 'lucide-react';

/**
 * Post-session modal for rating a reader partner.
 * Shows after a Green Room live rehearsal or paid session ends.
 *
 * Props:
 *   partnerName  — reader's display name
 *   matchId      — match ID for the session
 *   onSubmit     — (rating, review) => Promise<void>
 *   onClose      — dismiss without rating
 */
export default function ReaderRatingModal({ partnerName, matchId, onSubmit, onClose }) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0 || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(rating, review.trim());
      setSubmitted(true);
      setTimeout(onClose, 1200);
    } catch {
      setSubmitting(false);
    }
  };

  const firstName = partnerName?.split(' ')[0] || 'your reader';

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
        <div className="rounded-2xl p-8 text-center w-full max-w-sm mx-4" style={{ background: 'var(--bg-surface, #1E1E1E)' }}>
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-emerald-400 fill-emerald-400" />
          </div>
          <p className="text-white font-bold text-lg">Thanks for your feedback!</p>
          <p className="text-[#999] text-sm mt-1">This helps the community find great readers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 mx-0 sm:mx-4" style={{ background: 'var(--bg-surface, #1E1E1E)', border: '1px solid var(--border-active, #3A3A3A)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">How was {firstName}?</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[#2A2A2A] transition-colors" style={{ color: 'var(--text-muted, #666)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Star rating */}
        <div className="flex justify-center gap-2 mb-5">
          {[1, 2, 3, 4, 5].map((star) => {
            const active = star <= (hoveredStar || rating);
            return (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${active ? 'text-amber-400 fill-amber-400' : 'text-[#3A3A3A]'}`}
                />
              </button>
            );
          })}
        </div>

        {/* Rating label */}
        <p className="text-center text-sm mb-4" style={{ color: 'var(--text-secondary, #999)' }}>
          {rating === 0 && 'Tap a star to rate'}
          {rating === 1 && 'Needs improvement'}
          {rating === 2 && 'Below average'}
          {rating === 3 && 'Good'}
          {rating === 4 && 'Great reader!'}
          {rating === 5 && 'Outstanding!'}
        </p>

        {/* Optional review */}
        {rating > 0 && (
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder={`Any notes about working with ${firstName}? (optional)`}
            maxLength={300}
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none mb-4 transition-colors focus:border-[#C855F0]"
            style={{
              background: 'var(--bg-input, #2A2A2A)',
              border: '1px solid var(--border-active, #3A3A3A)',
              color: 'var(--text-primary, #fff)',
            }}
          />
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
            style={{ border: '1px solid var(--border-active, #3A3A3A)', color: 'var(--text-secondary, #999)' }}
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-bold text-white transition-all disabled:opacity-40"
            style={{ background: rating > 0 ? '#C855F0' : '#3A3A3A' }}
          >
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  );
}
