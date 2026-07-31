import { useEffect, useState } from 'react';
import { Copy, Share2, Gift, Users, Coins, CheckCircle } from 'lucide-react';
import axios from '../../../redux/http';
import { baseURL } from '../../../redux/constant';
import { trackEvent, Events } from '../../../utils/analytics';

export default function Referral() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null); // 'code' | 'url' | null

  useEffect(() => {
    axios
      .get(`${baseURL}/v1/growth/referral/code/`)
      .then((res) => setData(res.data?.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* fallback */
    }
  };

  const handleShare = async () => {
    if (!data?.share_url) return;
    trackEvent(Events.REFERRAL_SHARE_TAP, { method: navigator.share ? 'native' : 'copy' });
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Read with me on Dr Self Tape',
          text: "I'm sending you a free AI tape review — and a scene partner (me). Actors read for each other on Dr Self Tape. Join free:",
          url: data.share_url,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      copyToClipboard(data.share_url, 'url');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" style={{ color: 'var(--aurora-text)' }}>
        <h1 className="aurora-display text-2xl" style={{ color: 'var(--aurora-text)' }}>
          Invite Friends
        </h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="aurora-card h-28"
            />
          ))}
        </div>
      </div>
    );
  }

  const referralCode = data?.code || '------';
  const shareUrl = data?.share_url || '';
  const totalReferrals = data?.uses || 0;
  const referrals = data?.referrals || [];
  const tokensEarned = totalReferrals * 50;

  return (
    <div className="space-y-6" style={{ color: 'var(--aurora-text)' }}>
      {/* Header */}
      <h1 className="aurora-display text-2xl" style={{ color: 'var(--aurora-text)' }}>
        Invite Friends
      </h1>

      {/* Info Card */}
      <div
        className="aurora-card p-6 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in oklch, var(--aurora-heritage-gold) 16%, var(--aurora-glass-strong)), color-mix(in oklch, var(--aurora-mint) 12%, var(--aurora-glass)))',
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'color-mix(in oklch, var(--aurora-heritage-gold) 22%, transparent)' }}
          >
            <Gift className="w-6 h-6" style={{ color: 'var(--aurora-accent-deep)' }} />
          </div>
          <div>
            <h2 className="aurora-display text-lg" style={{ color: 'var(--aurora-text)' }}>
              Self-taping is a two-person job
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--aurora-sub)' }}>
              <strong>You get:</strong> a scene partner who owes you one, plus 50 AI tokens.{' '}
              <strong>They get:</strong> free casting notes on their first tape, 50 tokens, and
              someone to read with on day one — you.
            </p>
            <div className="aurora-mono flex items-center gap-2 mt-3" style={{ fontSize: 10, color: 'var(--aurora-dim)', letterSpacing: '0.04em' }}>
              <span>① Invite an actor</span>
              <span style={{ opacity: 0.4 }}>→</span>
              <span>② They join free</span>
              <span style={{ opacity: 0.4 }}>→</span>
              <span style={{ color: 'var(--aurora-accent-deep)', fontWeight: 700 }}>③ You read for each other</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reader bench — visible, completable goal (Airbuds slot pattern,
          WITHOUT their hard gate). Slots fill with real invitees. */}
      <div className="aurora-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5" style={{ color: 'var(--aurora-mint)' }} />
            <span className="aurora-eyebrow">Your reader bench</span>
          </div>
          <span className="aurora-mono text-xs" style={{ color: 'var(--aurora-dim)' }}>
            {Math.min(totalReferrals, 3)} of 3{totalReferrals > 3 ? ` (+${totalReferrals - 3})` : ''} · {tokensEarned} tokens earned
          </span>
        </div>
        <div className="flex items-center gap-3">
          {[0, 1, 2].map((i) => {
            const ref = referrals[i];
            return ref ? (
              <div key={i} className="flex flex-col items-center gap-1" style={{ width: 64 }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'color-mix(in oklch, var(--aurora-heritage-gold) 24%, transparent)', border: '2px solid var(--aurora-heritage-gold)' }}>
                  <span className="aurora-mono text-sm font-bold" style={{ color: 'var(--aurora-accent-deep)' }}>
                    {(ref.name || 'A')[0].toUpperCase()}
                  </span>
                </div>
                <span className="text-[10px] truncate w-full text-center" style={{ color: 'var(--aurora-sub)' }}>
                  {(ref.name || 'Actor').split(' ')[0]}
                </span>
              </div>
            ) : (
              <div key={i} className="flex flex-col items-center gap-1" style={{ width: 64 }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ border: '2px dashed var(--aurora-line)', color: 'var(--aurora-dim)' }}>
                  <span className="text-lg">+</span>
                </div>
                <span className="text-[10px]" style={{ color: 'var(--aurora-dim)' }}>Open</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Referral Code Box */}
      <div
        className="aurora-card p-6"
      >
        <label className="aurora-eyebrow mb-3 block">
          Your Referral Code
        </label>
        <div className="flex items-center gap-3">
          <div
            className="aurora-mono flex-1 rounded-2xl px-5 py-4 text-center text-2xl font-bold tracking-[0.3em] select-all"
            style={{
              background: 'var(--aurora-glass)',
              color: 'var(--aurora-text)',
              border: '1px solid var(--aurora-line)',
            }}
          >
            {referralCode}
          </div>
          <button
            onClick={() => copyToClipboard(referralCode, 'code')}
            className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
            style={{
              background: copied === 'code' ? 'var(--aurora-mint)' : 'var(--aurora-heritage-gold)',
            }}
          >
            {copied === 'code' ? (
              <CheckCircle className="w-5 h-5" style={{ color: 'var(--aurora-accent-deep)' }} />
            ) : (
              <Copy className="w-5 h-5" style={{ color: 'var(--aurora-accent-deep)' }} />
            )}
          </button>
        </div>
      </div>

      {/* Share URL */}
      <div
        className="aurora-card p-6"
      >
        <label className="aurora-eyebrow mb-3 block">
          Share Link
        </label>
        <div className="flex items-center gap-3">
          <div
            className="flex-1 rounded-2xl px-4 py-3 text-sm truncate"
            style={{
              background: 'var(--aurora-glass)',
              color: 'var(--aurora-dim)',
              border: '1px solid var(--aurora-line)',
            }}
          >
            {shareUrl || 'Loading...'}
          </div>
          <button
            onClick={() => copyToClipboard(shareUrl, 'url')}
            className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
            style={{
              background: copied === 'url' ? 'var(--aurora-mint)' : 'var(--aurora-glass-strong)',
              border: '1px solid var(--aurora-line)',
            }}
          >
            {copied === 'url' ? (
              <CheckCircle className="w-5 h-5" style={{ color: 'var(--aurora-accent-deep)' }} />
            ) : (
              <Copy className="w-5 h-5" style={{ color: 'var(--aurora-text)' }} />
            )}
          </button>
        </div>

        <button
          onClick={handleShare}
          className="mt-4 w-full font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          style={{
            background: 'var(--aurora-heritage-gold)',
            color: 'var(--aurora-accent-deep)',
          }}
        >
          <Share2 className="w-5 h-5" />
          Share with Friends
        </button>
      </div>

      {/* Referred Users */}
      <div
        className="aurora-card p-6"
      >
        <h3 className="aurora-display text-base mb-4" style={{ color: 'var(--aurora-text)' }}>
          Referred Friends
        </h3>
        {referrals.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--aurora-dim)' }}>
            No referrals yet. Share your link to get started!
          </p>
        ) : (
          <div className="space-y-3">
            {referrals.map((ref, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 px-4 rounded-xl"
                style={{ background: 'var(--aurora-glass)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: 'color-mix(in oklch, var(--aurora-heritage-gold) 20%, transparent)' }}
                  >
                    <span className="aurora-mono text-sm" style={{ color: 'var(--aurora-accent-deep)' }}>
                      {(ref.name || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--aurora-text)' }}>
                    {ref.name || 'Unknown'}
                  </span>
                </div>
                <span className="aurora-mono text-xs" style={{ color: 'var(--aurora-dim)' }}>
                  {ref.joined
                    ? new Date(ref.joined).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
