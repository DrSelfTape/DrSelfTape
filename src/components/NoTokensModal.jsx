export default function NoTokensModal({ onClose, onUpgrade }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-sm rounded-3xl p-6 text-center"
        style={{
          background: 'linear-gradient(145deg, #1a0d24, #0f0f1a)',
          border: '1px solid rgba(255, 130, 128,0.4)',
          boxShadow: '0 0 60px rgba(255, 130, 128,0.2)',
          animation: 'slideUp 0.3s ease',
        }}
      >
        <div className="text-5xl mb-4">🎟️</div>
        <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          Out of Tokens
        </h2>
        <p className="text-sm text-[#8a9a96] mb-6 leading-relaxed">
          You've used all your AI tokens for this period. Upgrade your plan to get more.
        </p>
        <button
          onClick={onUpgrade}
          className="w-full py-3.5 rounded-xl font-bold text-white text-sm mb-3"
          style={{ background: 'linear-gradient(135deg, #D4A85F, #7A5A18)' }}
        >
          Upgrade Plan 👑
        </button>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-semibold text-sm text-[#666666]"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}
