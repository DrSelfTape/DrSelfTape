import { useState } from 'react';
import { Users2, HeartHandshake, Clapperboard } from 'lucide-react';

export default function ReaderOnboardingModal({ onClose }) {
  const [visible, setVisible] = useState(true);

  const handleDismiss = () => {
    localStorage.setItem('reader_onboarding_seen', 'true');
    setVisible(false);
    if (onClose) onClose();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div
        className="bg-[#1A1A2E] border border-[#C855F0]/30 rounded-2xl px-6 py-8 flex flex-col items-center gap-5 shadow-2xl max-w-sm w-full"
        style={{ animation: 'badgePop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
      >
        {/* Icons cluster */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#C855F0]/15 flex items-center justify-center">
            <Users2 className="w-6 h-6 text-[#C855F0]" />
          </div>
          <div className="w-14 h-14 rounded-full bg-[#A7ECDA]/15 flex items-center justify-center -ml-2">
            <Clapperboard className="w-7 h-7 text-[#A7ECDA]" />
          </div>
          <div className="w-12 h-12 rounded-full bg-[#C855F0]/15 flex items-center justify-center -ml-2">
            <HeartHandshake className="w-6 h-6 text-[#C855F0]" />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Welcome to the Green Room</h2>
          <p className="text-[#999999] text-sm leading-relaxed">
            You're now part of the reader community! Swipe to find scene partners, match with other actors, and run lines together live.
          </p>
        </div>

        <div className="w-full space-y-2.5">
          <div className="flex items-center gap-3 bg-[#0D0D0D] rounded-xl p-3">
            <span className="text-lg">🎬</span>
            <p className="text-white text-xs font-medium">Swipe right to match with readers</p>
          </div>
          <div className="flex items-center gap-3 bg-[#0D0D0D] rounded-xl p-3">
            <span className="text-lg">💬</span>
            <p className="text-white text-xs font-medium">Chat and share sides in the Green Room</p>
          </div>
          <div className="flex items-center gap-3 bg-[#0D0D0D] rounded-xl p-3">
            <span className="text-lg">📹</span>
            <p className="text-white text-xs font-medium">Go live for video rehearsals</p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="w-full py-3 rounded-xl bg-[#C855F0] hover:bg-[#A040C8] text-white font-semibold text-sm transition-colors"
        >
          Let's Go!
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
