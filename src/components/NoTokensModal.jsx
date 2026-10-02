import { useEffect, useState } from 'react';
import useHideMobileHeader from './Shared/useHideMobileHeader';
import { trackEvent } from '../utils/analytics';
import axiosInstance from '../redux/http';

// The same 402 reaches a free user, a paying Basic/Plus user who spent their
// monthly allowance, and a Premium user who hit the daily fair-use ceiling.
// Telling all three "Premium removes the ceiling" tells two of them to buy
// something they already own, so the plan decides the copy.
export default function NoTokensModal({ onClose, onUpgrade }) {
  useHideMobileHeader(true);
  const [plan, setPlan] = useState(undefined); // undefined = still loading

  useEffect(() => {
    trackEvent('no_tokens_modal_shown', {});
    let alive = true;
    axiosInstance
      .get('/v1/subscriptions/status/', { timeout: 8000 })
      .then((res) => { if (alive) setPlan(res.data?.data || null); })
      .catch(() => { if (alive) setPlan(null); }); // fall back to the upgrade pitch
    return () => { alive = false; };
  }, []);

  const isUnlimited = !!plan?.unlimited;
  const isPaid = !!plan?.plan && !isUnlimited;
  // Premium at the fair-use ceiling has nothing to buy — don't offer them one.
  const showUpgrade = !isUnlimited;

  const handleUpgrade = () => {
    trackEvent('no_tokens_upgrade_tapped', {});
    onUpgrade?.();
  };
  const handleClose = () => {
    trackEvent('no_tokens_modal_dismissed', {});
    onClose?.();
  };
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4" style={{
      background: 'rgba(10,10,10,0.45)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    }}>
      <div
        className="w-full max-w-sm rounded-3xl p-6 text-center"
        style={{
          background: 'var(--aurora-surface-solid)',
          border: '1px solid var(--aurora-line)',
          boxShadow: '0 24px 60px rgba(212,168,95,0.30), var(--aurora-shadow-modal)',
          animation: 'slideUp 0.3s ease',
        }}
      >
        <div className="text-5xl mb-4">🎬</div>
        <h2 className="aurora-display text-xl mb-2" style={{ color: 'var(--aurora-text)', letterSpacing: '-0.3px' }}>
          {isUnlimited ? "That's today's fair-use limit" : "You've used your included AI actions"}
        </h2>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--aurora-sub)' }}>
          {isUnlimited
            ? 'Premium includes 150 AI actions a day. Yours reset tomorrow — nothing to buy.'
            : isPaid
              ? 'Your plan\'s included actions are spent for this cycle. A bigger plan raises the monthly allowance.'
              : "You're out of included AI actions for now. A plan gets you the full casting read on every tape."}
        </p>
        {/* Concrete, honest comparison — no "tokens" jargon, no fake trial */}
        {showUpgrade && (
        <div className="text-left mb-5 rounded-2xl p-4" style={{ background: 'color-mix(in oklch, var(--aurora-heritage-gold, #D4A85F) 8%, transparent)', border: '1px solid var(--aurora-line)' }}>
          {[
            ['Tape Reviews', 'Unlimited, with the full deep read'],
            ['AI scene partner', 'Unlimited reads, any scene'],
            ['Compare Takes', 'Rank up to 4 takes, pick the send'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-start gap-2 py-1">
              <span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span>
              <span className="text-xs" style={{ color: 'var(--aurora-text)' }}>
                <strong>{k}</strong> — <span style={{ color: 'var(--aurora-sub)' }}>{v}</span>
              </span>
            </div>
          ))}
        </div>
        )}
        {showUpgrade && (<>
        <button
          onClick={handleUpgrade}
          className="aurora-mono w-full py-3.5 rounded-full text-white text-sm mb-1"
          style={{
            background: 'linear-gradient(135deg, #D4A85F, #7A5A18)',
            fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700,
            boxShadow: '0 8px 22px rgba(212,168,95,0.30)',
            border: 'none',
          }}
        >
          See plans — from $9.99/mo
        </button>
        <p className="text-[11px] mb-2" style={{ color: 'var(--aurora-dim, var(--aurora-sub))' }}>
          Cancel anytime in the App Store.
        </p>
        </>)}
        <button
          onClick={handleClose}
          className="w-full py-3 rounded-full text-sm font-semibold"
          style={{ color: 'var(--aurora-sub)' }}
        >
          {isUnlimited ? 'Got it' : 'Maybe Later'}
        </button>
      </div>
    </div>
  );
}
