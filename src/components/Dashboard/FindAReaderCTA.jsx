import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Users2, HeartHandshake } from 'lucide-react';

export default function FindAReaderCTA() {
  const navigate = useNavigate();
  const stats = useSelector((s) => s.readersMatch.matchingStats);
  const available = stats?.available_count || 0;
  const pendingLikes = stats?.pending_likes_count || 0;

  return (
    <div
      onClick={() => navigate('/dashboard/find-a-reader')}
      className="rounded-2xl p-6 border cursor-pointer hover:shadow-xl hover:shadow-[#A7ECDA]/5 transition-all duration-300 group relative overflow-hidden"
      style={{
        background: 'linear-gradient(to right, var(--bg-deepest), var(--bg-card), var(--bg-elevated))',
        borderColor: 'rgba(167,236,218,0.15)',
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(167,236,218,0.3)'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(167,236,218,0.15)'}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_rgba(167,236,218,0.08),_transparent_60%)]" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Users2 className="w-5 h-5 text-[#A7ECDA]" />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Find a Reader</h2>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <p className="text-[#A7ECDA] text-sm font-semibold">
              {available} {available === 1 ? 'actor' : 'actors'} looking for readers right now
            </p>
          </div>
          {pendingLikes > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <HeartHandshake className="w-4 h-4 text-[#7A5A18]" />
              <p className="text-[#7A5A18] text-sm font-medium">
                {pendingLikes} {pendingLikes === 1 ? 'actor wants' : 'actors want'} to read with you!
              </p>
            </div>
          )}
        </div>
        <button className="bg-[#A7ECDA] hover:bg-[#8ed4c2] font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 whitespace-nowrap cursor-pointer text-sm group-hover:shadow-lg group-hover:shadow-[#A7ECDA]/20 dst-press" style={{ color: 'var(--bg-deep)' }}>
          Find Readers &rarr;
        </button>
      </div>
    </div>
  );
}
