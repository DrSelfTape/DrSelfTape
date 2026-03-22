import { X, Star, Clapperboard } from 'lucide-react';

const SwipeActions = ({ onPass, onStar, onMatch, disabled }) => (
  <div className="flex justify-center items-center gap-6 mt-6">
    {/* Pass */}
    <button
      onClick={onPass}
      disabled={disabled}
      className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 disabled:opacity-40"
      style={{ background: '#2A2A3C', border: '1px solid #374151' }}
      title="Pass"
    >
      <X size={24} color="#9CA3AF" />
    </button>

    {/* Priority / Star */}
    <button
      onClick={onStar}
      disabled={disabled}
      className="w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
      style={{ background: '#2A2A3C', border: '1px solid rgba(252,224,114,0.3)' }}
      title="Priority Read"
    >
      <Star size={20} color="#FCE072" fill="#FCE072" />
    </button>

    {/* Match / Clapperboard */}
    <button
      onClick={onMatch}
      disabled={disabled}
      className="w-16 h-16 rounded-full flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
      style={{
        background: '#FF8280',
        boxShadow: '0 8px 20px rgba(255,130,128,0.35)',
      }}
      title="Want to Read"
    >
      <Clapperboard size={28} color="white" />
    </button>
  </div>
);

export default SwipeActions;
