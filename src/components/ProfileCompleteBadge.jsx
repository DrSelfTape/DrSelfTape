import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle, X } from 'lucide-react';

export default function ProfileCompleteBadge({ show, onClose }) {
  const hasRun = useRef(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show && !hasRun.current) {
      hasRun.current = true;
      setVisible(true);

      // Confetti burst
      const end = Date.now() + 2000;
      const colors = ['#FF8280', '#A7ECDA', '#FF8280', '#FCE072', '#ffffff'];
      const frame = () => {
        confetti({
          particleCount: 6,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 6,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();

      // Auto-close after 5s
      setTimeout(() => {
        setVisible(false);
        hasRun.current = false;
        onClose?.();
      }, 5000);
    }
  }, [show, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        className="pointer-events-auto relative bg-white border border-[#D4A85F]/40 rounded-2xl px-10 py-8 flex flex-col items-center gap-4 shadow-2xl animate-bounce-in"
        style={{ animation: 'badgePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
      >
        {/* Close */}
        <button
          onClick={() => { setVisible(false); onClose?.(); }}
          className="absolute top-3 right-3 text-[rgba(10,10,10,0.4)] hover:text-[#0A0A0A] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Badge icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FF8280] to-[#7B2FBE] flex items-center justify-center shadow-lg shadow-[#FF8280]/30">
            <CheckCircle className="w-12 h-12 text-[#0A0A0A]" strokeWidth={1.5} />
          </div>
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-full bg-[#D4A85F]/20 animate-ping" />
        </div>

        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#7A5A18] mb-1">Achievement Unlocked</p>
          <h2 className="text-2xl font-bold text-[#0A0A0A]">Profile Complete!</h2>
          <p className="text-sm text-[rgba(10,10,10,0.62)] mt-1">Your actor profile is live and ready for casting</p>
        </div>

        {/* Stars */}
        <div className="flex gap-1 text-[#FCE072] text-lg">
          {'★★★'.split('').map((s, i) => (
            <span key={i} style={{ animationDelay: `${i * 0.15}s`, animation: 'starPop 0.4s ease forwards', opacity: 0 }}>{s}</span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes badgePop {
          from { opacity: 0; transform: scale(0.5) translateY(40px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes starPop {
          from { opacity: 0; transform: scale(0); }
          to   { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
