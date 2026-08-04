import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import axiosInstance from '../redux/http';
import { openExternal } from '../utils/openExternal';

// App-update broadcasts ("Tap to update") send the user to the store listing.
const APP_STORE_URL = 'itms-apps://itunes.apple.com/app/id6770320460';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.drselftape.app';
const storeUrl = () => (Capacitor.getPlatform() === 'android' ? PLAY_STORE_URL : APP_STORE_URL);

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// Detect iOS
export function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

// Detect if running as installed PWA
export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

// Capacitor native iOS / Android wrapper — uses APNs / FCM, not Web Push
export function isCapacitorNative() {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

// True if push is supported in this context
export function isPushSupported() {
  // Native push: iOS via APNs, Android via FCM (google-services.json ships in
  // the Android build + the BE send_fcm_push path). Both native platforms run
  // the register() flow; the device-token POST already tags platform correctly.
  if (isCapacitorNative()) return true;
  if (typeof Notification === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  if (!('PushManager' in window)) return false;
  // iOS Safari only supports Web Push when installed as PWA
  if (isIOS() && !isStandalone()) return false;
  return true;
}

/* ─── Native (Capacitor APNs / FCM) registration ────────────────────── */
let _nativeListenersWired = false;
// Last APNs/FCM device token we registered with the BE. Stashed at module
// scope so the logout flow can DELETE it (de-register this device from the
// logged-out user) even though it's minted asynchronously in the listener.
let _lastDeviceToken = null;

// Translate a tapped push payload into a drst-navigate detail so the app
// deep-links to the right screen. Returns null for payloads we don't route.
function navDetailForPush(notif) {
  const data = notif?.data || notif?.notification?.data || {};
  const type = data.type;
  const matchId = data.match_id;

  // A FRESH match opens the "It's a Scene!" reveal, not the chat — the
  // green-room sub-panel deep-link path (PanelScreen → ItsASceneWrapper)
  // already accepts subPanel:'its-a-scene'. A new message goes to the chat.
  if (matchId && type === 'scene_partner_match') {
    return { panel: 'green-room', subPanel: 'its-a-scene', matchId: String(matchId) };
  }
  if (matchId && type === 'new_message') {
    return { panel: 'green-room', subPanel: 'green-room-chat', matchId: String(matchId) };
  }
  // An incoming live-read invite ("Incoming Scene Request") drops the actor into
  // that match's chat, where the live-read / call controls live — so tapping the
  // banner from a fully-closed app lands them in the right place to join the read.
  if (matchId && type === 'rehearsal_started') {
    return { panel: 'green-room', subPanel: 'green-room-chat', matchId: String(matchId) };
  }

  // Best-effort deep-links for push types with an unambiguous destination.
  // Only map to tabs/panels that definitely exist and are mobile-reachable
  // (MobileApp TABS / PANEL_COMPONENTS); the drst-navigate handler routes a
  // `tab` straight to setTab. Truly ambiguous types (e.g. CallKit scene-read,
  // which surfaces as a native ring rather than a panel) stay null.
  switch (type) {
    case 'tape_review_complete':
    case 'tape-review-complete':
    case 'review_complete':
    case 'tape_review_nudge':
      // Tape Review is a primary tab in the mobile shell. tape_review_nudge is
      // the M/W/F re-engagement push (send_audition_nudge) that drives users to
      // the free first-review aha.
      return { tab: 'tape-review' };
    case 'callback_reminder':
    case 'callback-reminder':
    case 'audition_reminder':
    case 'audition-reminder':
    case 'audition_update':
      // Callback / audition reminders + tracker updates land in Auditions.
      return { tab: 'auditions' };
    case 'scene_partner_like':
      // "Someone wants to read with you" → the Who Wants to Read panel.
      return { panel: 'who-wants-to-read' };
    case 'room_invite':
      // A rehearsal-room invite drops into the Green Room, where rooms live.
      return { tab: 'green-room' };
    case 'booking_confirmed':
    case 'booking_cancelled':
      // Reader-market booking changes open the marketplace.
      return { panel: 'marketplace' };
    // community_activity / admin_broadcast have no dedicated mobile screen —
    // they fall through to null, which still opens the in-app notification
    // center (drst-push-tap pops the bell) so the tap is never a dead end.
    default:
      return null;
  }
}

// Route a tapped push: deep-link via drst-navigate when we recognise it, and
// always emit drst-push-tap so other listeners can react.
function handlePushTap(notif) {
  // H-07: the server now records every dispatch; this is the other half of
  // the loop. Without a tap event we can see that a push left the building but
  // not whether it brought anyone back — which is the only question that makes
  // the re-engagement channel worth having. Fired first and independently of
  // the routing below, so a deep-link failure still records the tap.
  try {
    const d = notif?.data || notif?.notification?.data || {};
    import('../utils/analytics').then(({ trackEvent }) => {
      trackEvent('push_opened', {
        notification_type: d.type || 'unknown',
        kind: d.kind || undefined,
        path: d.path || undefined,
      });
    }).catch(() => {});
  } catch { /* analytics must never block the deep link */ }
  try {
    const data = notif?.data || notif?.notification?.data || {};
    // App-update broadcast tapped from a closed app → open the store listing.
    if (data.type === 'admin_broadcast' || data.type === 'app_update') {
      openExternal(storeUrl());
      return;
    }
    const detail = navDetailForPush(notif);
    if (detail) {
      window.dispatchEvent(new CustomEvent('drst-navigate', { detail }));
    }
  } catch { /* swallow */ }
  try {
    window.dispatchEvent(new CustomEvent('drst-push-tap', { detail: notif }));
  } catch { /* swallow */ }
}

// Wire native push listeners ONCE per app lifecycle, INDEPENDENTLY of the
// permission request. A push that cold-starts the app fires the tap event
// before subscribeNative() runs, so the listeners must already exist.
async function wireNativeListeners() {
  if (_nativeListenersWired) return;
  _nativeListenersWired = true;

  const { PushNotifications } = await import('@capacitor/push-notifications');

  PushNotifications.addListener('registration', async (token) => {
    _lastDeviceToken = token.value;
    try {
      await axiosInstance.post('/v1/notifications/push/device-token/', {
        token: token.value,
        platform: Capacitor.getPlatform() === 'android' ? 'android' : 'ios',
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('device-token POST failed:', err);
    }
  });

  PushNotifications.addListener('registrationError', (err) => {
    // eslint-disable-next-line no-console
    console.warn('APNs registration error:', err);
  });

  PushNotifications.addListener('pushNotificationReceived', (notif) => {
    // Foreground notification: emit a window event so the in-app
    // NotificationBell / toast layer can react. The OS won't display a
    // system banner while the app is in the foreground.
    try {
      window.dispatchEvent(new CustomEvent('drst-push-received', { detail: notif }));
    } catch { /* swallow */ }
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    // User tapped the notification — deep-link to the conversation when the
    // payload carries a match, and emit drst-push-tap for other listeners.
    handlePushTap(action.notification);
  });
}

// De-register this device's push token from the BE so a logged-out user's
// device stops mapping to them (privacy + mis-routed pushes for the next
// user on this device). Best-effort: never block logout.
export async function unregisterPushToken() {
  const token = _lastDeviceToken;
  if (!token) return;
  _lastDeviceToken = null;
  try {
    await axiosInstance.delete('/v1/notifications/push/device-token/', {
      data: { token },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('device-token DELETE failed:', err);
  }
}

// Deep-link to this app's page in the OS Settings (iOS renders the
// notification toggles there). Once a user has DENIED the permission the OS
// never re-prompts, so Settings is the only recovery path — used by the
// post-review "turn on notifications" nudge. Same AppLauncher route
// openExternal uses for store links.
export async function openNotificationSettings() {
  try {
    if (!isCapacitorNative()) return;
    const { AppLauncher } = await import('@capacitor/app-launcher');
    await AppLauncher.openUrl({ url: 'app-settings:' });
  } catch { /* best-effort — never block the caller */ }
}

async function subscribeNative() {
  // Dynamic import so non-native bundles don't pull in the plugin.
  const { PushNotifications } = await import('@capacitor/push-notifications');

  // Listeners must be live before permissions are requested so a cold-start
  // tap (which fires before this call) isn't dropped.
  await wireNativeListeners();

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') {
    return { granted: false };
  }

  await PushNotifications.register();
  return { granted: true };
}

/* ─── Web Push (VAPID) registration ─────────────────────────────────── */
async function subscribeWeb() {
  const { data } = await axiosInstance.get('/v1/notifications/push/vapid-key/');
  const vapidKey = data.vapid_public_key;

  // No VAPID public key configured on the BE → web push can't be set up.
  // Skip gracefully instead of letting atob(undefined) throw downstream.
  if (!vapidKey) {
    // eslint-disable-next-line no-console
    console.warn('Web push skipped: VAPID public key is not configured.');
    return { granted: false };
  }

  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const result = await Notification.requestPermission();
  if (result !== 'granted') return { granted: false };

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });
  const subJson = sub.toJSON();
  await axiosInstance.post('/v1/notifications/push/subscribe/', {
    endpoint: subJson.endpoint,
    p256dh: subJson.keys.p256dh,
    auth: subJson.keys.auth,
  });
  return { granted: true };
}

export function usePushNotifications() {
  const native = isCapacitorNative();
  const [permission, setPermission] = useState(
    native ? 'default'
      : typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [subscribed, setSubscribed] = useState(false);
  const [supported] = useState(isPushSupported());
  const [showIOSPrompt, setShowIOSPrompt] = useState(
    !native && isIOS() && !isStandalone()
  );

  const subscribe = async () => {
    if (!supported) {
      if (!native && isIOS() && !isStandalone()) setShowIOSPrompt(true);
      return;
    }

    try {
      const result = native ? await subscribeNative() : await subscribeWeb();
      if (result.granted) {
        setSubscribed(true);
        setPermission('granted');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Push subscription failed:', err);
    }
  };

  // On mount: wire listeners and re-register ONLY when permission is already
  // granted (mirrors the web branch). The old unconditional subscribe() fired
  // the iOS system permission dialog at cold open — front-running the
  // deliberately post-value onboarding notification step, which is now the
  // FIRST ask. We also surface the real OS permission state so consumers can
  // render a denied-state recovery path (Settings deep-link).
  useEffect(() => {
    if (native) {
      // Wire tap/registration listeners immediately — independent of the
      // permission prompt — so a notification that cold-starts the app
      // deep-links instead of being lost before subscribe() runs.
      wireNativeListeners();
      (async () => {
        try {
          const { PushNotifications } = await import('@capacitor/push-notifications');
          const perm = await PushNotifications.checkPermissions();
          const state = perm.receive === 'granted' ? 'granted'
            : perm.receive === 'denied' ? 'denied' : 'default';
          setPermission(state);
          if (state === 'granted') subscribe();
        } catch { /* plugin unavailable — leave permission at 'default' */ }
      })();
    } else if (supported && permission === 'granted') {
      subscribe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    permission,
    subscribed,
    supported,
    showIOSPrompt,
    setShowIOSPrompt,
    subscribe,
  };
}
