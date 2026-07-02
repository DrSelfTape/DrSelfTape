import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { appleLoginUser } from '../../redux/features/auth/authSlice';
import { getFirstRouteByRole } from '../../routes/routeHelpers';
import { setAuthToken } from '../../redux/http';

const APPLE_JS_SDK = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

// Services ID configured in Apple Developer Portal for web SiwA.
// Native iOS uses the bundle ID directly via the Capacitor plugin.
const APPLE_WEB_CLIENT_ID = 'com.drselftape.app.signin';
const APPLE_WEB_REDIRECT_URI = 'https://drselftape.app/auth/apple-callback';

function loadAppleJSOnce() {
  return new Promise((resolve, reject) => {
    if (window.AppleID?.auth) return resolve();
    if (document.querySelector(`script[src="${APPLE_JS_SDK}"]`)) {
      const t = setInterval(() => {
        if (window.AppleID?.auth) { clearInterval(t); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(t); reject(new Error('Apple JS load timed out')); }, 6000);
      return;
    }
    const s = document.createElement('script');
    s.src = APPLE_JS_SDK;
    s.async = true;
    s.onload = () => {
      try {
        window.AppleID.auth.init({
          clientId: APPLE_WEB_CLIENT_ID,
          scope: 'name email',
          redirectURI: APPLE_WEB_REDIRECT_URI,
          usePopup: true,
        });
        resolve();
      } catch (e) { reject(e); }
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function AppleSignInButton({ disabled, onError, onSuccess, label = 'Continue with Apple' }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const native = Capacitor.isNativePlatform();

  // Pre-load the JS SDK on web so the first tap doesn't wait on a script
  // download (the user expects an instant popup).
  useEffect(() => {
    if (!native) loadAppleJSOnce().catch(() => { /* swallow */ });
  }, [native]);

  const finishLogin = useCallback(async ({ identityToken, firstName, lastName }) => {
    const result = await dispatch(appleLoginUser({ identityToken, firstName, lastName }));
    if (appleLoginUser.fulfilled.match(result)) {
      const token = result.payload?.token?.access || result.payload?.token;
      if (token) setAuthToken(token);
      // Post-auth hook (e.g. the signup page applies a stored ?ref= referral).
      // Awaited so its toast fires before we navigate away; the callback is
      // responsible for its own error handling and must never throw.
      if (onSuccess) await onSuccess();
      const role = result.payload?.active_role || result.payload?.role || 'actor';
      navigate(getFirstRouteByRole(role));
    } else {
      onError?.(result.payload || 'Apple sign-in failed. Please try again.');
    }
  }, [dispatch, navigate, onError, onSuccess]);

  const handleNative = useCallback(async () => {
    try {
      const { AppleSignIn, SignInScope } = await import('@capawesome/capacitor-apple-sign-in');
      const res = await AppleSignIn.signIn({
        scopes: [SignInScope.Email, SignInScope.FullName],
      });
      const identityToken = res?.idToken;
      if (!identityToken) {
        onError?.('Apple did not return a sign-in token.');
        return;
      }
      await finishLogin({
        identityToken,
        firstName: res?.givenName,
        lastName: res?.familyName,
      });
    } catch (e) {
      // User-cancel comes back as a thrown error from the plugin.
      if (String(e?.message || e).toLowerCase().includes('cancel')) return;
      onError?.(e?.message || 'Apple sign-in failed.');
    }
  }, [finishLogin, onError]);

  const handleWeb = useCallback(async () => {
    try {
      await loadAppleJSOnce();
      const data = await window.AppleID.auth.signIn();
      const identityToken = data?.authorization?.id_token;
      if (!identityToken) {
        onError?.('Apple did not return a sign-in token.');
        return;
      }
      await finishLogin({
        identityToken,
        firstName: data?.user?.name?.firstName,
        lastName: data?.user?.name?.lastName,
      });
    } catch (e) {
      // Apple's popup rejection has error: "popup_closed_by_user" etc.
      const msg = String(e?.error || e?.message || e).toLowerCase();
      if (msg.includes('popup_closed') || msg.includes('cancel')) return;
      onError?.('Apple sign-in failed.');
    }
  }, [finishLogin, onError]);

  const onClick = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (native) await handleNative();
      else await handleWeb();
    } finally {
      setBusy(false);
    }
  }, [busy, native, handleNative, handleWeb]);

  // Sign in with Apple is iOS + web only. On Android the @capawesome plugin
  // throws and the button looks broken — render nothing. Placed AFTER all
  // hooks so hook order stays stable (rules of hooks). The parent (LoginPage)
  // also hides the surrounding OR divider via Capacitor.getPlatform().
  if (Capacitor.getPlatform() === 'android') return null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      style={{
        width: '100%', padding: '13px 14px', borderRadius: 14,
        background: '#000000', color: '#FFFFFF', border: 'none',
        cursor: disabled || busy ? 'default' : 'pointer',
        opacity: disabled || busy ? 0.7 : 1,
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        fontSize: 15, fontWeight: 600, letterSpacing: '-0.1px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        boxShadow: '0 6px 16px rgba(10,10,10,0.18)',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.05 12.04c-.03-2.46 2.01-3.65 2.1-3.7-1.15-1.68-2.94-1.91-3.58-1.93-1.51-.15-2.97.9-3.74.9-.78 0-1.96-.88-3.23-.85-1.65.03-3.18.96-4.03 2.44-1.72 2.98-.44 7.39 1.23 9.81.82 1.18 1.79 2.5 3.06 2.45 1.24-.05 1.7-.79 3.19-.79 1.49 0 1.91.79 3.21.77 1.33-.02 2.17-1.19 2.97-2.39.94-1.36 1.32-2.7 1.34-2.77-.03-.01-2.56-.99-2.59-3.94zM14.6 4.66c.68-.83 1.14-1.97.99-3.1-.96.04-2.12.64-2.82 1.45-.63.73-1.18 1.89-1.03 3 .07.84 1.18.84 2.86-.35z"/>
      </svg>
      <span>{busy ? 'Signing in…' : label}</span>
    </button>
  );
}
