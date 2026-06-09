// Library imports
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Capacitor } from '@capacitor/core';

// Local imports
import './App.css';
import { SocketProvider } from './socket/socket';
import { Router } from './routes/index';
import { initAnalytics, identifyUser } from './utils/analytics';
import { identifySentryUser, clearSentryUser } from './utils/sentry';
import { fetchUserSettings, resetSettings } from './redux/features/userSettings/userSettingsSlice';
import { initPurchases } from './utils/purchases';
import { openExternal } from './utils/openExternal';
import { resumeQueue } from './utils/uploadQueue';
import AIConsentModal from './components/AIConsent/AIConsentModal';

function App() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth?.user);
  const userId = user?.id;

  useEffect(() => {
    initAnalytics();
  }, []);

  // Android hardware/gesture back button. Without a listener, Capacitor's
  // default exits the app from ANY screen — a guaranteed Play-review flag
  // and bad UX. Navigate back through history; only exit at a root route.
  // No-op off native (web + iOS have their own back affordances).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let removeListener;
    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack || window.history.length > 1) {
          window.history.back();
        } else {
          CapApp.exitApp();
        }
      }).then((handle) => { removeListener = handle.remove; });
    });
    return () => { if (removeListener) removeListener(); };
  }, []);

  // Tapping an "app update" push should jump straight to the App Store update
  // page. iOS opens the app first (a notification can't deep-link to the store
  // itself), so we route from here when the tapped notification is an update
  // broadcast. Keyed on the broadcast's data.type, with a title fallback so it
  // still works if the payload type is generic. iOS-only — the update broadcast
  // targets iOS devices, and itms-apps:// is the App Store scheme.
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'ios') return;
    const onTap = (e) => {
      const notif = e.detail || {};
      const data = notif.data || {};
      const type = String(data.type || '').toLowerCase();
      const isUpdate = type === 'app_update' || /\bupdate\b/i.test(notif.title || data.title || '');
      if (isUpdate) openExternal('itms-apps://itunes.apple.com/app/id6770320460');
    };
    window.addEventListener('drst-push-tap', onTap);
    return () => window.removeEventListener('drst-push-tap', onTap);
  }, []);

  useEffect(() => {
    if (user) {
      identifyUser(user);
      identifySentryUser(user);
    } else {
      clearSentryUser();
    }
  }, [user]);

  // Hydrate per-user settings (theme, tutorial state, reader filters, etc.)
  // from the server whenever the user identity changes — login, signup, or
  // app boot after a redux-persist rehydrate. Reset on logout so prefs from
  // the previous user don't leak into an anonymous browsing session.
  useEffect(() => {
    if (userId) {
      dispatch(fetchUserSettings());
      // Tie native iOS purchases to the same backend user ID so
      // RevenueCat's webhook can match the receipt to our user row.
      // No-ops on web or without VITE_REVENUECAT_IOS_KEY.
      initPurchases(userId);
      // Resume any self-tape uploads that were pending when the tab
      // closed. Reads persisted queue state from localStorage and
      // restarts the pump. No-op if the queue is empty.
      resumeQueue();
    } else {
      dispatch(resetSettings());
    }
  }, [userId, dispatch]);

  // ──────────────────────────────────────────────────────────────────
  // iOS WKWebView click-drop rescue
  //
  // WKWebView occasionally fails to dispatch React's synthetic click
  // event from a touch, especially on buttons inside
  // `position: fixed` overlays or `isolation: isolate` stacking
  // contexts (Aurora panels). We hit this on the Membership Subscribe
  // pill, CD Coach Listen buttons, Add Audition modal X — each had to
  // be manually patched with an onTouchEnd belt.
  //
  // Instead of patching every button, this global delegate fires
  // target.click() on touchend for any unhandled tap on a button-like
  // element. We track real clicks via the `click` listener and skip
  // synthesizing if one fired naturally within the last 100ms.
  // Multi-touch, scroll/swipe gestures, and disabled elements are
  // ignored. Inputs (text/email/etc.) are also skipped so the
  // keyboard logic isn't interrupted.
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;
    let lastRealClickAt = 0;
    let lastSyntheticTarget = null;

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) { touchMoved = true; return; }
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchMoved = false;
    };
    const onTouchMove = (e) => {
      if (!e.touches[0]) return;
      const dx = Math.abs(e.touches[0].clientX - touchStartX);
      const dy = Math.abs(e.touches[0].clientY - touchStartY);
      if (dx > 10 || dy > 10) touchMoved = true;
    };
    const onTouchEnd = (e) => {
      if (touchMoved) return;
      if (e.defaultPrevented) return; // a button-local handler already handled it
      const tappable = e.target.closest('button, [role="button"], a[href]');
      if (!tappable) return;
      if (tappable.disabled) return;
      if (tappable.dataset?.notap === 'true') return;
      // Skip if focus is going to enter a text input — keyboard logic owns this
      if (e.target.matches('input, textarea, select')) return;
      // Schedule the synthetic click. If a real click lands first,
      // lastRealClickAt will be fresh and we skip.
      lastSyntheticTarget = tappable;
      setTimeout(() => {
        if (Date.now() - lastRealClickAt < 90) return; // native click fired, all good
        if (lastSyntheticTarget !== tappable) return;
        try { tappable.click(); } catch { /* swallow */ }
      }, 80);
    };
    const onClick = () => { lastRealClickAt = Date.now(); };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('click', onClick, { passive: true, capture: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('click', onClick, { capture: true });
    };
  }, []);

  return (
    <SocketProvider>
      <Router />
      {/* Apple Guideline 5.1.1(i): mounted once so any AI feature can
          `await requestAiConsent()` and get a single, consistent prompt
          before sending user data to Anthropic / OpenAI / ElevenLabs. */}
      <AIConsentModal />
    </SocketProvider>
  );
}

export default App;
