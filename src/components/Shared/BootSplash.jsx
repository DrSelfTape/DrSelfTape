/**
 * Branded cold-start screen. The route guards previously returned `null` while
 * redux-persist rehydrated, which on iOS reads as a frozen white screen right
 * after launch. This gives that beat a logo + spinner so the boot feels
 * intentional instead of broken.
 */
export default function BootSplash() {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 20, background: 'var(--aurora-bg, #F4F4EE)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <img
        src={`${import.meta.env.BASE_URL}logo-black.png`}
        alt="Dr Self Tape"
        style={{ width: 128, height: 'auto', opacity: 0.92 }}
      />
      <div
        aria-label="Loading"
        role="status"
        style={{
          width: 26, height: 26, borderRadius: '50%',
          border: '2.5px solid rgba(122,90,24,0.18)', borderTopColor: '#7A5A18',
          animation: 'drst-boot-spin 0.8s linear infinite',
        }}
      />
      <style>{`
        @keyframes drst-boot-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          [role="status"] { animation-duration: 2s; }
        }
      `}</style>
    </div>
  );
}
