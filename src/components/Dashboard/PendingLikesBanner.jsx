import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { HeartHandshake, X } from 'lucide-react';

export default function PendingLikesBanner({ onNavigate }) {
  const navigate = useNavigate();
  const stats = useSelector((s) => s.readersMatch.matchingStats);
  const count = stats?.pending_likes_count || 0;
  const [dismissed, setDismissed] = useState(false);

  if (count === 0 || dismissed) return null;

  const handleClick = () => {
    if (onNavigate) {
      onNavigate();
    } else {
      navigate('/dashboard/who-wants-to-read');
    }
  };

  return (
    <div
      className="relative rounded-2xl p-4 border border-[#C855F0]/20 cursor-pointer hover:border-[#C855F0]/40 transition-all duration-300 overflow-hidden"
      style={{
        background: 'linear-gradient(to right, var(--bg-elevated), var(--bg-card), var(--bg-elevated))',
        animation: 'slideDown 0.4s ease-out forwards',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(200,85,240,0.1),_transparent_60%)]" />
      <button
        onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
        className="absolute top-3 right-3 z-10 hover:text-white transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        <X className="w-4 h-4" />
      </button>
      <div className="relative flex items-center gap-4" onClick={handleClick}>
        <div className="w-10 h-10 rounded-full bg-[#C855F0]/20 flex items-center justify-center shrink-0">
          <HeartHandshake className="w-5 h-5 text-[#C855F0]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {count} {count === 1 ? 'actor wants' : 'actors want'} to read with you!
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Tap to see who</p>
        </div>
        <button className="bg-[#C855F0] hover:bg-[#A040C8] text-white font-semibold px-4 py-2 rounded-xl transition-all text-xs whitespace-nowrap">
          See Who
        </button>
      </div>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
