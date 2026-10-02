import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { appleLoginUser, setDateOfBirth } from '../../redux/features/auth/authSlice';
import { getFirstRouteByRole } from '../../routes/routeHelpers';
import axiosInstance, { setAuthToken } from '../../redux/http';
import { MIN_SIGNUP_AGE, meetsMinAge } from '../../utils/age';
import { holdAgeGate } from '../AgeGate/ageGateHold';

const APPLE_JS_SDK = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

// Services ID configured in Apple Developer Portal for web SiwA.
// Native iOS uses the bundle ID directly via the Capacitor plugin.
const APPLE_WEB_CLIENT_ID = 'com.drselftape.app.signin';
const APPLE_WEB_REDIRECT_URI = 'https://drselftape.app/auth/apple-callback';

// Same red AgeGateModal uses for its validation copy — these two surfaces
// show the same messages and must not read as different errors.
const AGE_GATE_ERROR = '#B23A48';

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

/**
 * `dateOfBirth` (optional, ISO "YYYY-MM-DD"): a birthdate the surrounding
 * form already collected — the signup form's own DOB field. When it clears
 * MIN_SIGNUP_AGE we save it straight after the Apple handoff and the user
 * is never asked twice.
 */
export default function AppleSignInButton({ disabled, onError, onSuccess, dateOfBirth, label = 'Continue with Apple' }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const native = Capacitor.isNativePlatform();

  // Apple never supplies a birthdate, and Terms §1 / the Privacy Policy's
  // COPPA line require 13+. We ask for it HERE, as the last beat of the
  // sign-in step, rather than letting the root AgeGateModal be the first
  // screen of the product. `askDob` holds the login open on this card until
  // the birthdate saves; the root gate stays the backstop if it never does.
  const [askDob, setAskDob] = useState(false);
  const [dob, setDob] = useState('');
  const [dobError, setDobError] = useState('');
  const [savingDob, setSavingDob] = useState(false);
  const askDobRef = useRef(false);
  const pendingRole = useRef('actor');
  const releaseAgeGate = useRef(null);

  const releaseHold = useCallback(() => {
    releaseAgeGate.current?.();
    releaseAgeGate.current = null;
  }, []);

  // A hold left behind by an unmount (route change, modal close) would
  // disable the compliance gate for the rest of the session.
  useEffect(() => releaseHold, [releaseHold]);

  // Pre-load the JS SDK on web so the first tap doesn't wait on a script
  // download (the user expects an instant popup).
  useEffect(() => {
    if (!native) loadAppleJSOnce().catch(() => { /* swallow */ });
  }, [native]);

  // POST the birthdate and mirror it into auth state so the root gate, which
  // keys off `user.date_of_birth`, stays shut. The BE re-validates the age
  // and refuses to overwrite a stored value (apps/users/age.py).
  const saveDob = useCallback(async (value) => {
    const { data } = await axiosInstance.post('/v1/users/date-of-birth/', {
      date_of_birth: value,
    });
    dispatch(setDateOfBirth(data?.data?.date_of_birth || data?.date_of_birth || value));
  }, [dispatch]);

  const enterApp = useCallback(async (role) => {
    // Post-auth hook (e.g. the signup page applies a stored ?ref= referral).
    // Awaited so its toast fires before we navigate away; the callback is
    // responsible for its own error handling and must never throw.
    if (onSuccess) await onSuccess();
    navigate(getFirstRouteByRole(role));
  }, [navigate, onSuccess]);

  const finishLogin = useCallback(async ({ identityToken, firstName, lastName }) => {
    const result = await dispatch(appleLoginUser({ identityToken, firstName, lastName }));
    if (!appleLoginUser.fulfilled.match(result)) {
      onError?.(result.payload || 'Apple sign-in failed. Please try again.');
      return;
    }
    const token = result.payload?.token?.access || result.payload?.token;
    if (token) setAuthToken(token);
    const role = result.payload?.active_role || result.payload?.role || 'actor';
    pendingRole.current = role;

    if (!result.payload?.date_of_birth) {
      if (meetsMinAge(dateOfBirth)) {
        // The signup form already asked. Save it silently — no second ask.
        try {
          await saveDob(dateOfBirth);
        } catch { /* the root age gate still catches a null birthdate */ }
      } else {
        // Stay on this card and ask. The hold (taken in onClick, before the
        // token verified) is what keeps the root gate off the screen.
        askDobRef.current = true;
        setDob('');
        setDobError('');
        setAskDob(true);
        return; // submitDob() resumes the navigation
      }
    }
    await enterApp(role);
  }, [dateOfBirth, dispatch, enterApp, onError, saveDob]);

  const submitDob = useCallback(async () => {
    setDobError('');
    if (!dob) {
      setDobError('Please enter your date of birth.');
      return;
    }
    if (new Date(dob).getTime() > Date.now()) {
      setDobError('Date of birth cannot be in the future.');
      return;
    }
    if (!meetsMinAge(dob)) {
      setDobError(`You must be at least ${MIN_SIGNUP_AGE} years old to use Dr Self Tape.`);
      return;
    }
    setSavingDob(true);
    try {
      await saveDob(dob);
    } catch (e) {
      setDobError(
        e?.response?.data?.message ||
          'Could not save your date of birth. Please try again.'
      );
      setSavingDob(false);
      return;
    }
    setSavingDob(false);
    askDobRef.current = false;
    setAskDob(false);
    releaseHold();
    await enterApp(pendingRole.current);
  }, [dob, enterApp, releaseHold, saveDob]);

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
    // Taken BEFORE the token verifies: `appleLoginUser.fulfilled` flips the
    // user to authenticated-with-no-birthdate, which is exactly the state
    // the root gate opens on. Released below unless we're now asking.
    if (!releaseAgeGate.current) releaseAgeGate.current = holdAgeGate();
    try {
      if (native) await handleNative();
      else await handleWeb();
    } finally {
      setBusy(false);
      if (!askDobRef.current) releaseHold();
    }
  }, [busy, native, handleNative, handleWeb, releaseHold]);

  // Sign in with Apple is iOS + web only. On Android the @capawesome plugin
  // throws and the button looks broken — render nothing. Placed AFTER all
  // hooks so hook order stays stable (rules of hooks). The parent (LoginPage)
  // also hides the surrounding OR divider via Capacitor.getPlatform().
  if (Capacitor.getPlatform() === 'android') return null;

  // The last beat of the sign-in step. The user is authenticated by now, so
  // the Apple button has nothing left to do — it's replaced in place rather
  // than stacked under a full-screen modal.
  if (askDob) {
    return (
      <div>
        <label
          htmlFor="apple-dob"
          style={{
            display: 'block', marginBottom: 6,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--aurora-accent-deep)',
          }}
        >Date of birth</label>
        <input
          id="apple-dob"
          type="date"
          autoFocus
          value={dob}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => { setDob(e.target.value); setDobError(''); }}
          style={{
            width: '100%', height: 48, padding: '0 14px', borderRadius: 14,
            border: '1.5px solid var(--aurora-line)',
            background: 'rgba(255,255,255,0.7)',
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontSize: 16, color: 'var(--aurora-text)', outline: 'none',
          }}
        />
        <p style={{
          margin: '8px 0 0', fontSize: 13, lineHeight: 1.45,
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          color: 'var(--aurora-sub)',
        }}>
          Apple doesn&apos;t share your birthday. We need it once to confirm
          you&apos;re {MIN_SIGNUP_AGE} or older, and we only use it for that.
        </p>
        {dobError && (
          <p role="alert" style={{
            margin: '8px 0 0', fontSize: 13,
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            color: AGE_GATE_ERROR,
          }}>{dobError}</p>
        )}
        <button
          type="button"
          onClick={submitDob}
          disabled={savingDob || !dob}
          style={{
            width: '100%', marginTop: 14, padding: '13px 14px', borderRadius: 14,
            background: '#000000', color: '#FFFFFF', border: 'none',
            cursor: savingDob || !dob ? 'default' : 'pointer',
            opacity: savingDob || !dob ? 0.7 : 1,
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontSize: 15, fontWeight: 600, letterSpacing: '-0.1px',
          }}
        >{savingDob ? 'Saving…' : 'Continue'}</button>
      </div>
    );
  }

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
