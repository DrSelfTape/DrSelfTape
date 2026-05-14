import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Users2, HeartHandshake, Clapperboard } from 'lucide-react';
import { patchUserSettings } from '../../redux/features/userSettings/userSettingsSlice';

export default function ReaderOnboardingModal({ onClose }) {
  const dispatch = useDispatch();
  const [visible, setVisible] = useState(true);

  const handleDismiss = () => {
    // Persist server-side so the user doesn't see the intro again on
    // another device or after a cache clear.
    dispatch(patchUserSettings({ reader_onboarding_seen: true }));
    setVisible(false);
    if (onClose) onClose();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[998] flex items-center justify-center px-4" style={{
      background: 'rgba(10,10,10,0.55)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    }}>
      <div
        className="flex flex-col items-center gap-5 max-w-sm w-full px-6 py-8"
        style={{
          animation: 'badgePop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
          background: 'var(--aurora-glass-strong)',
          border: '1px solid var(--aurora-glass-border)',
          borderRadius: 28,
          backdropFilter: 'blur(28px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
          boxShadow: 'var(--aurora-shadow-modal)',
        }}
      >
        <span className="aurora-eyebrow">WELCOME</span>
        {/* Icons cluster */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{
            background: 'color-mix(in oklch, var(--aurora-accent) 22%, transparent)',
          }}>
            <Users2 className="w-6 h-6" style={{ color: 'var(--aurora-accent)' }} />
          </div>
          <div className="w-14 h-14 rounded-full flex items-center justify-center -ml-2" style={{
            background: 'color-mix(in oklch, var(--aurora-mint) 22%, transparent)',
          }}>
            <Clapperboard className="w-7 h-7" style={{ color: 'color-mix(in oklch, var(--aurora-mint) 80%, var(--aurora-text))' }} />
          </div>
          <div className="w-12 h-12 rounded-full flex items-center justify-center -ml-2" style={{
            background: 'color-mix(in oklch, var(--aurora-peach) 30%, transparent)',
          }}>
            <HeartHandshake className="w-6 h-6" style={{ color: 'color-mix(in oklch, var(--aurora-peach) 80%, var(--aurora-text))' }} />
          </div>
        </div>

        <div className="text-center">
          <h2 className="aurora-display" style={{ fontSize: 22, color: 'var(--aurora-text)', margin: '0 0 8px', letterSpacing: '-0.4px' }}>
            Welcome to the Green Room
          </h2>
          <p style={{ color: 'var(--aurora-sub)', fontSize: 14, lineHeight: 1.55, margin: 0 }}>
            You're part of the reader community. Swipe to find scene partners, match with actors, and run lines together live.
          </p>
        </div>

        <div className="w-full space-y-2">
          {[
            { e: '🎬', label: 'Swipe right to match with readers' },
            { e: '💬', label: 'Chat and share sides in the Green Room' },
            { e: '📹', label: 'Go live for video rehearsals' },
          ].map((row) => (
            <div key={row.e} className="flex items-center gap-3 rounded-xl p-3" style={{
              background: 'var(--aurora-glass)',
              border: '1px solid var(--aurora-glass-border)',
              backdropFilter: 'blur(12px)',
            }}>
              <span className="text-lg">{row.e}</span>
              <p style={{ color: 'var(--aurora-text)', fontSize: 13, fontWeight: 500, margin: 0 }}>{row.label}</p>
            </div>
          ))}
        </div>

        <button
          onClick={handleDismiss}
          className="aurora-mono w-full py-3 rounded-full transition-colors"
          style={{
            background: 'linear-gradient(135deg, var(--aurora-accent), var(--aurora-accent-deep))',
            color: '#fff',
            fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
            boxShadow: 'var(--aurora-shadow-coral)',
            border: 'none',
          }}
        >
          Let's Go
        </button>
      </div>
      <style>{`
        @keyframes badgePop {
          from { opacity: 0; transform: scale(0.7) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
