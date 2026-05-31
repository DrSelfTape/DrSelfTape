/**
 * /auth/apple-callback — the redirect URL registered with the Apple
 * Services ID `com.drselftape.app.signin`.
 *
 * Apple's web SiwA popup loads this URL after the user authorizes. The
 * Apple JS SDK reads the result from the popup's URL via postMessage and
 * resolves AppleID.auth.signIn() in the opener; this page only needs to
 * render long enough for that handshake to finish. The opener (LoginPage
 * / SignUp via AppleSignInButton) handles the actual login.
 *
 * If a user lands here directly (no opener) we fall back to /login so the
 * page isn't blank.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AppleCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // If we have no opener, this isn't the SiwA popup — direct visit.
    // Wait a tick (in case Apple is mid-postMessage), then bounce home.
    const t = setTimeout(() => {
      if (!window.opener || window.opener === window) {
        navigate('/login', { replace: true });
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="aurora-orbs" style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--aurora-bg)', color: 'var(--aurora-text)',
      fontFamily: "'Space Grotesk', system-ui, sans-serif",
    }}>
      <div style={{ textAlign: 'center', padding: 32 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', margin: '0 auto 16px',
          border: '3px solid color-mix(in oklch, var(--aurora-heritage-gold) 30%, transparent)',
          borderTopColor: 'var(--aurora-heritage-gold)',
          animation: 'drst-spin 0.7s linear infinite',
        }} />
        <p style={{ fontSize: 14, color: 'var(--aurora-sub)', margin: 0 }}>
          Signing you in with Apple…
        </p>
      </div>
    </div>
  );
}
