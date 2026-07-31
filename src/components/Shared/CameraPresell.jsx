import useHideMobileHeader from './useHideMobileHeader';

/**
 * Camera/mic permission pre-sell — shown ONCE, right before the first-ever
 * record attempt fires the iOS permission prompts. A denied camera or mic is
 * an unrecoverable session-1 kill (Settings round-trip), so we sell the value
 * before the OS asks (same benefit-first pattern the push soft-ask uses).
 * Gate helpers live in cameraPresellGate.js (react-refresh: component-only
 * exports here). The proceed callback runs synchronously in the button's tap
 * handler so the downstream input .click() stays inside the user gesture
 * (WKWebView drops synthetic clicks outside one).
 */
export default function CameraPresell({ onReady, onDismiss }) {
  useHideMobileHeader(true);
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10,10,10,0.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 340, borderRadius: 24, padding: '26px 22px',
        background: 'var(--bg-elevated, #F4F4EE)', textAlign: 'center',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        {/* Framing-guide mock — what the record screen looks like, so the OS
            prompt lands as "of course" instead of "why". */}
        <div style={{
          width: 118, height: 176, margin: '0 auto', borderRadius: 16,
          background: 'linear-gradient(160deg, #2A2118, #1A1408)',
          border: '1px solid rgba(212,168,95,0.45)', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', left: '50%', top: 34, transform: 'translateX(-50%)',
            width: 52, height: 66, borderRadius: '50%',
            border: '2px dashed rgba(212,168,95,0.8)',
          }} />
          <div style={{ position: 'absolute', left: 10, right: 10, top: 118, height: 1, background: 'rgba(212,168,95,0.35)' }} />
          <span style={{ position: 'absolute', left: 0, right: 0, bottom: 8, fontSize: 9, color: 'rgba(244,244,238,0.55)', letterSpacing: '0.08em' }}>
            EYES HERE · CHIN ON THE LINE
          </span>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary, #0A0A0A)', margin: '18px 0 0', letterSpacing: '-0.3px' }}>
          Set up your taping studio
        </h2>
        {/* Studio-setup checklist ((Not Boring) Camera pattern): the two OS
            asks framed as assembling YOUR gear, not surrendering access. */}
        <div style={{ margin: '12px auto 0', maxWidth: 240, textAlign: 'left' }}>
          {[['📷', 'Camera', 'your frame'], ['🎙️', 'Microphone', 'your read']].map(([e, k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
              <span style={{ fontSize: 15 }}>{e}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary, #0A0A0A)' }}>{k}</span>
              <span style={{ fontSize: 12.5, color: 'var(--text-secondary, rgba(10,10,10,0.5))' }}>— {v}</span>
              <span style={{ marginLeft: 'auto', color: '#D4A85F', fontWeight: 700 }}>✓</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary, rgba(10,10,10,0.55))', margin: '10px 0 0', lineHeight: 1.5 }}>
          Next screen, tap <strong>Allow</strong> twice and you're rolling.
        </p>
        <p style={{ fontSize: 11.5, color: 'var(--text-secondary, rgba(10,10,10,0.42))', margin: '8px 0 0', lineHeight: 1.45 }}>
          Your tapes are yours. AI only sees a tape when you submit it for review.
        </p>
        <button
          type="button"
          onClick={onReady}
          onTouchEnd={(e) => { e.preventDefault(); onReady(); }}
          style={{
            width: '100%', marginTop: 18, padding: '14px', borderRadius: 14,
            border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#fff',
            background: 'linear-gradient(135deg, #D4A85F, #7A5A18)',
            boxShadow: '0 6px 18px rgba(212,168,95,0.35)',
            touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
          }}
        >
          I'm ready →
        </button>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            display: 'block', margin: '12px auto 0', padding: 6, background: 'none',
            border: 'none', cursor: 'pointer', fontSize: 12.5,
            color: 'var(--text-secondary, rgba(10,10,10,0.45))',
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
