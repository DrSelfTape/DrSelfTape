import { Capacitor } from '@capacitor/core';

// Gate state for the CameraPresell interstitial. Lives outside the component
// file so CameraPresell.jsx only exports a component (react-refresh rule).
const SEEN_KEY = 'dst_cam_presell_seen';

export function needsCameraPresell() {
  if (!Capacitor.isNativePlatform()) return false; // web pickers don't hard-prompt
  try { return window.localStorage.getItem(SEEN_KEY) !== '1'; } catch { return false; }
}

export function markCameraPresellSeen() {
  try { window.localStorage.setItem(SEEN_KEY, '1'); } catch { /* noop */ }
}

// Best-effort short-circuit for users who granted camera before this build
// shipped: the pre-sell promises OS prompts that would never appear for them.
// Runs once at module load; by the time anyone taps record, the async query
// has resolved and seeded the flag. Permissions API coverage for 'camera' is
// spotty in WKWebView, so every path fails silent into the normal gate.
if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
  try {
    navigator.permissions?.query({ name: 'camera' })
      .then((st) => { if (st?.state === 'granted') markCameraPresellSeen(); })
      .catch(() => { /* unsupported — keep the localStorage gate */ });
  } catch { /* unsupported — keep the localStorage gate */ }
}
