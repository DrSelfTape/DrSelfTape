import { useEffect, useState } from 'react';
import { Copy, Share2, Gift, Users, Coins, CheckCircle } from 'lucide-react';
import axios from '../../../redux/http';
import { baseURL } from '../../../redux/constant';

export default function Referral() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null); // 'code' | 'url' | null

  useEffect(() => {
    axios
      .get(`${baseURL}/v1/growth/referral/code/`)
      .then((res) => setData(res.data))
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
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Invite Friends
        </h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl h-28"
              style={{ background: 'var(--bg-card)' }}
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
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        Invite Friends
      </h1>

      {/* Info Card */}
      <div
        className="rounded-2xl p-6 border relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(200,85,240,0.12), rgba(167,236,218,0.08))',
          borderColor: 'var(--border-default)',
        }}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#C855F0]/20 flex items-center justify-center shrink-0">
            <Gift className="w-6 h-6 text-[#C855F0]" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Invite 3 actors, earn 150 tokens
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Share your referral link with fellow actors. When they sign up and complete their
              profile, you both earn 50 tokens.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className="rounded-2xl p-5 border"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-[#A7ECDA]" />
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Total Referrals
            </span>
          </div>
          <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {totalReferrals}
          </p>
        </div>
        <div
          className="rounded-2xl p-5 border"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Coins className="w-5 h-5 text-[#FCE072]" />
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Tokens Earned
            </span>
          </div>
          <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {tokensEarned}
          </p>
        </div>
      </div>

      {/* Referral Code Box */}
      <div
        className="rounded-2xl p-6 border"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
      >
        <label className="text-sm font-medium mb-3 block" style={{ color: 'var(--text-secondary)' }}>
          Your Referral Code
        </label>
        <div className="flex items-center gap-3">
          <div
            className="flex-1 rounded-xl px-5 py-4 text-center text-2xl font-mono font-bold tracking-[0.3em] select-all"
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
            }}
          >
            {referralCode}
          </div>
          <button
            onClick={() => copyToClipboard(referralCode, 'code')}
            className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
            style={{
              background: copied === 'code' ? '#22c55e' : '#C855F0',
            }}
          >
            {copied === 'code' ? (
              <CheckCircle className="w-5 h-5 text-white" />
            ) : (
              <Copy className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Share URL */}
      <div
        className="rounded-2xl p-6 border"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
      >
        <label className="text-sm font-medium mb-3 block" style={{ color: 'var(--text-secondary)' }}>
          Share Link
        </label>
        <div className="flex items-center gap-3">
          <div
            className="flex-1 rounded-xl px-4 py-3 text-sm truncate"
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-default)',
            }}
          >
            {shareUrl || 'Loading...'}
          </div>
          <button
            onClick={() => copyToClipboard(shareUrl, 'url')}
            className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
            style={{
              background: copied === 'url' ? '#22c55e' : 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
            }}
          >
            {copied === 'url' ? (
              <CheckCircle className="w-5 h-5 text-white" />
            ) : (
              <Copy className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
            )}
          </button>
        </div>

        <button
          onClick={handleShare}
          className="mt-4 w-full bg-[#C855F0] hover:bg-[#A040C8] text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <Share2 className="w-5 h-5" />
          Share with Friends
        </button>
      </div>

      {/* Referred Users */}
      <div
        className="rounded-2xl p-6 border"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
      >
        <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Referred Friends
        </h3>
        {referrals.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
            No referrals yet. Share your link to get started!
          </p>
        ) : (
          <div className="space-y-3">
            {referrals.map((ref, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 px-4 rounded-xl"
                style={{ background: 'var(--bg-surface)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#C855F0]/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-[#C855F0]">
                      {(ref.name || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {ref.name || 'Unknown'}
                  </span>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
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
