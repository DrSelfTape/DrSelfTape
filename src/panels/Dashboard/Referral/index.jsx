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
          title: 'Join Dr Self Tape',
          text: 'Sign up with my referral link and we both earn tokens!',
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
              Invite 3 actors, earn 150 tokens
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--aurora-sub)' }}>
              Share your referral link with fellow actors. When they sign up and complete their
              profile, you both earn 50 tokens.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className="aurora-card p-5"
        >
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5" style={{ color: 'var(--aurora-mint)' }} />
            <span className="aurora-eyebrow">
              Total Referrals
            </span>
          </div>
          <p className="aurora-mono text-3xl" style={{ color: 'var(--aurora-text)' }}>
            {totalReferrals}
          </p>
        </div>
        <div
          className="aurora-card p-5"
        >
          <div className="flex items-center gap-3 mb-2">
            <Coins className="w-5 h-5" style={{ color: 'var(--aurora-heritage-gold)' }} />
            <span className="aurora-eyebrow">
              Tokens Earned
            </span>
          </div>
          <p className="aurora-mono text-3xl" style={{ color: 'var(--aurora-text)' }}>
            {tokensEarned}
          </p>
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
