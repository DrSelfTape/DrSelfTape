import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import axiosInstance from '../redux/http';

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
  // Native push is iOS-only (APNs). Android push is intentionally NOT wired
  // for v1 — no google-services.json / FCM config — so don't attempt the
  // native register() flow there (it would just fail and log noise).
  if (isCapacitorNative()) return Capacitor.getPlatform() === 'ios';
  if (typeof Notification === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  if (!('PushManager' in window)) return false;
  // iOS Safari only supports Web Push when installed as PWA
  if (isIOS() && !isStandalone()) return false;
  return true;
}

/* ─── Native (Capacitor APNs / FCM) registration ────────────────────── */
let _nativeListenersWired = false;

async function subscribeNative() {
  // Dynamic import so non-native bundles don't pull in the plugin.
  const { PushNotifications } = await import('@capacitor/push-notifications');

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') {
    return { granted: false };
  }

  // Wire listeners ONCE per app lifecycle.
  if (!_nativeListenersWired) {
    _nativeListenersWired = true;

    PushNotifications.addListener('registration', async (token) => {
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
      // User tapped the notification — emit a deeplink event so the app
      // can navigate. notif.data.type tells us which screen to open.
      try {
        window.dispatchEvent(new CustomEvent('drst-push-tap', { detail: action.notification }));
      } catch { /* swallow */ }
    });
  }

  await PushNotifications.register();
  return { granted: true };
}

/* ─── Web Push (VAPID) registration ─────────────────────────────────── */
async function subscribeWeb() {
  const { data } = await axiosInstance.get('/v1/notifications/push/vapid-key/');
  const vapidKey = data.vapid_public_key;

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

  // Auto-subscribe on mount when running natively (Capacitor handles its
  // own permission prompt; we don't surface an in-app prompt for it).
  // Web Push only auto-runs if already granted to avoid prompting on
  // every load.
  useEffect(() => {
    if (native) {
      subscribe();
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
