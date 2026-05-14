export default function NoTokensModal({ onClose, onUpgrade }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4" style={{
      background: 'rgba(10,10,10,0.45)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    }}>
      <div
        className="w-full max-w-sm rounded-3xl p-6 text-center"
        style={{
          background: 'var(--aurora-surface-solid)',
          border: '1px solid var(--aurora-line)',
          boxShadow: '0 24px 60px rgba(212,168,95,0.30), var(--aurora-shadow-modal)',
          animation: 'slideUp 0.3s ease',
        }}
      >
        <div className="text-5xl mb-4">🎟️</div>
        <h2 className="aurora-display text-xl mb-2" style={{ color: 'var(--aurora-text)', letterSpacing: '-0.3px' }}>
          Out of Tokens
        </h2>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--aurora-sub)' }}>
          You've used all your AI tokens for this period. Upgrade your plan to get more.
        </p>
        <button
          onClick={onUpgrade}
          className="aurora-mono w-full py-3.5 rounded-full text-white text-sm mb-3"
          style={{
            background: 'linear-gradient(135deg, #D4A85F, #7A5A18)',
            fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700,
            boxShadow: '0 8px 22px rgba(212,168,95,0.30)',
            border: 'none',
          }}
        >
          Upgrade Plan 👑
        </button>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-full text-sm font-semibold"
          style={{ color: 'var(--aurora-sub)' }}
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}
