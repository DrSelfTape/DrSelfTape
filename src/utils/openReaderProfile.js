import { Capacitor } from '@capacitor/core';

/**
 * Open a reader/actor profile from anywhere, on web AND the Capacitor shell.
 *
 * react-router's navigate() NO-OPS inside the native app — MobileApp renders
 * panels from PANEL_COMPONENTS via the `drst-navigate` event, not routes. So a
 * raw navigate('/dashboard/reader-profile/<id>') is a dead tap on iOS/Android.
 * This dispatches the event on native and falls back to navigate() on web.
 *
 * `reader-profile` is a registered PANEL_COMPONENT, so the event resolves. Pass
 * the component's own `navigate` (from useNavigate) for the web path.
 */
export function openReaderProfile(id, navigate) {
  if (id == null) return;
  const readerId = String(id);
  if (Capacitor.isNativePlatform()) {
    window.dispatchEvent(
      new CustomEvent('drst-navigate', {
        detail: { panel: 'reader-profile', readerId },
      })
    );
  } else if (navigate) {
    navigate(`/dashboard/reader-profile/${readerId}`);
  }
}
