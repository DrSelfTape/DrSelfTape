import { X, Star, Clapperboard } from 'lucide-react';

const SwipeActions = ({ onPass, onStar, onMatch, disabled }) => (
  <div className="flex justify-center items-center gap-6 mt-6">
    {/* Pass */}
    <button
      onClick={onPass}
      disabled={disabled}
      className="w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
      style={{
        background: 'var(--aurora-glass)',
        border: '1px solid var(--aurora-glass-border)',
        backdropFilter: 'blur(20px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
        boxShadow: 'var(--aurora-shadow-card)',
      }}
      title="Pass"
    >
      <X size={22} style={{ color: 'var(--aurora-sub)' }} />
    </button>

    {/* Priority / Star */}
    <button
      onClick={onStar}
      disabled={disabled}
      className="w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
      style={{
        background: 'color-mix(in oklch, var(--aurora-gold) 18%, var(--aurora-glass))',
        border: '1px solid color-mix(in oklch, var(--aurora-gold) 40%, transparent)',
        backdropFilter: 'blur(20px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
      }}
      title="Priority Read"
    >
      <Star size={18} color="var(--aurora-gold)" fill="var(--aurora-gold)" />
    </button>

    {/* Match / Clapperboard */}
    <button
      onClick={onMatch}
      disabled={disabled}
      className="w-16 h-16 rounded-full flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
      style={{
        background: 'var(--dst-fill-ink)',
        boxShadow: '0 8px 22px #0003',
      }}
      title="Want to Read"
    >
      <Clapperboard size={28} color="var(--dst-on-fill-ink)" />
    </button>
  </div>
);

export default SwipeActions;
