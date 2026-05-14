import { useState, useEffect, useRef } from 'react';
import { Trophy, Star, X } from 'lucide-react';

export default function TutorialAchievement({ show, onClose }) {
  const [visible, setVisible] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    if (show && !hasRun.current) {
      hasRun.current = true;
      setVisible(true);
      // Auto-close after 8 seconds
      const timer = setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!visible) return null;

  const handleClose = () => {
    setVisible(false);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      {/* Confetti */}
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${(i * 3.3) % 100}%`,
            top: '-12px',
            width: i % 3 === 0 ? 10 : 8,
            height: i % 3 === 0 ? 10 : 14,
            borderRadius: i % 2 === 0 ? '50%' : '2px',
            background: ['#FF8280', '#A7ECDA', '#FCE072', '#FFB49A', '#22c55e', '#ffffff'][i % 6],
            animation: `confettiFall ${1.5 + (i % 5) * 0.3}s ease-in ${(i % 10) * 0.12}s forwards`,
            transform: `rotate(${i * 12}deg)`,
          }}
        />
      ))}

      {/* Badge */}
      <div
        className="relative bg-gradient-to-br from-[#1a0d24] to-[#0f0f1a] border border-[#D4A85F]/40 rounded-3xl px-8 py-10 flex flex-col items-center gap-5 shadow-2xl max-w-sm w-full mx-4"
        style={{
          animation: 'badgePop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
          boxShadow: '0 0 80px rgba(255, 130, 128,0.3), 0 0 160px rgba(167,236,218,0.1)',
        }}
      >
        <button onClick={handleClose} className="absolute top-4 right-4 text-[#666] hover:text-white">
          <X className="w-5 h-5" />
        </button>

        {/* Trophy with glow */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FF8280] to-[#7B2FBE] flex items-center justify-center shadow-lg">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <div className="absolute inset-0 rounded-full bg-[#D4A85F]/30 animate-ping" />
          {/* Floating stars */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute text-[#FCE072]"
              style={{
                top: [-8, -4, 8][i],
                right: [-12, 20, -8][i],
                animation: `starPop 0.4s cubic-bezier(0.34,1.56,0.64,1) ${0.6 + i * 0.15}s both`,
              }}
            >
              <Star className="w-5 h-5 fill-current" />
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[4px] text-[#A7ECDA] mb-2">
            Achievement Unlocked
          </p>
          <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Tutorial Complete!
          </h2>
          <p className="text-sm text-[#999] leading-relaxed">
            You've explored every feature. You're ready to start booking.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="w-full bg-[#2A2A2A] rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: '100%',
              background: 'linear-gradient(90deg, #D4A85F, #F0D097, #9FE6B4)',
              animation: 'progressFill 1s ease-out 0.5s both',
            }}
          />
        </div>
        <p className="text-xs text-[#888] font-medium">7 of 7 — 100% Complete</p>

        <button
          onClick={handleClose}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF8280] to-[#A7ECDA] text-white font-bold text-sm transition-all hover:shadow-lg"
        >
          Let's Go!
        </button>
      </div>

      <style>{`
        @keyframes badgePop {
          from { opacity: 0; transform: scale(0.6) translateY(30px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes starPop {
          from { opacity: 0; transform: scale(0) rotate(-30deg); }
          to { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes confettiFall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(100vh) rotate(720deg); }
        }
        @keyframes progressFill {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
