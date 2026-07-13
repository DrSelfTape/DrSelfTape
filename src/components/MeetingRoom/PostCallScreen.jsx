import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Send, DollarSign, RotateCcw, Star, Check } from 'lucide-react';
import axios from '../../redux/http';
import { baseURL } from '../../redux/constant';
import { submitReaderRating } from '../../redux/features/readers/readersMatchSlice';
import useHideMobileHeader from '../Shared/useHideMobileHeader';
import { openExternal } from '../../utils/openExternal';

const TIP_AMOUNTS = [5, 10, 15, 25];

export default function PostCallScreen({ partnerName, matchId, onClose }) {
  useHideMobileHeader(true);
  const dispatch = useDispatch();
  const first = (partnerName || 'them').split(' ')[0];
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [rated, setRated] = useState(false);
  const [savingRating, setSavingRating] = useState(false);
  const [tipAmount, setTipAmount] = useState(null);
  const [customTip, setCustomTip] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showTip, setShowTip] = useState(false);

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

  const handleSendTip = async () => {
    const amount = tipAmount || parseFloat(customTip);
    if (!amount || amount < 1) return;
    setSending(true);
    try {
      // Create a checkout session for the tip
      const { data } = await axios.post(`${baseURL}/v1/growth/marketplace/book/`, {
        reader_id: 0, // Will be handled as a tip
        duration: 0,
        tip_amount: amount,
      });
      if (data?.data?.checkout_url) {
        // In-app Safari sheet — Apple Pay can render here (subject to
        // Stripe domain verification). Replacing the WKWebView wholesale
        // never showed Apple Pay and was disorienting on return.
        await openExternal(data.data.checkout_url);
        setSent(true);
        return;
      }
      setSent(true);
    } catch {
      alert('Could not process tip. Please try again.');
    }
    setSending(false);
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
            {rated ? 'Thanks — your rating is saved.' : `How was your read with ${first}?`}
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

        {/* Tip Section */}
        {!showTip ? (
          <button
            onClick={() => setShowTip(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-colors mb-4"
            style={{ background: 'rgba(167,236,218,0.1)', border: '1px solid rgba(167,236,218,0.3)', color: '#A7ECDA' }}
          >
            <DollarSign className="w-4 h-4" />
            Send a Tip to {first}
          </button>
        ) : !sent ? (
          <div className="rounded-2xl p-5 mb-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Send a tip</p>

            {/* Preset amounts */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {TIP_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => { setTipAmount(a); setCustomTip(''); }}
                  className="py-2.5 rounded-lg text-sm font-bold transition-all"
                  style={{
                    background: tipAmount === a ? '#FF8280' : 'var(--bg-input)',
                    color: tipAmount === a ? '#fff' : 'var(--text-primary)',
                    border: tipAmount === a ? '2px solid #FF8280' : '1px solid var(--border-active)',
                  }}
                >
                  ${a}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'var(--text-muted)' }}>$</span>
              <input
                type="number"
                min="1"
                placeholder="Custom amount"
                value={customTip}
                onChange={(e) => { setCustomTip(e.target.value); setTipAmount(null); }}
                className="w-full pl-7 pr-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-active)', color: 'var(--text-primary)' }}
              />
            </div>

            <button
              onClick={handleSendTip}
              disabled={sending || (!tipAmount && !customTip)}
              className="w-full py-3 rounded-xl text-[#0A0A0A] font-bold text-sm transition-all disabled:opacity-40"
              style={{ background: '#FF8280' }}
            >
              {sending ? 'Processing...' : `Send $${tipAmount || customTip || '0'} Tip`}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 justify-center py-3 mb-4 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }}>
            <Send className="w-4 h-4" />
            <span className="text-sm font-semibold">Tip sent! Thank you.</span>
          </div>
        )}

        {/* Loop back — the emotional peak after a good read is the strongest
            moment to line up the next one. Rating is already captured above, so
            this drops straight back into the chat with no gate. */}
        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-[#0A0A0A] transition-all"
          style={{ background: 'linear-gradient(135deg, #D4A85F, #7A5A18)' }}
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
