import { useEffect, useState } from 'react';
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

// True if push is supported in this context
export function isPushSupported() {
  if (typeof Notification === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  if (!('PushManager' in window)) return false;
  // iOS only supports push when installed as PWA
  if (isIOS() && !isStandalone()) return false;
  return true;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [subscribed, setSubscribed] = useState(false);
  const [supported] = useState(isPushSupported());
  const [showIOSPrompt, setShowIOSPrompt] = useState(
    isIOS() && !isStandalone()
  );

  const subscribe = async () => {
    if (!supported) {
      if (isIOS() && !isStandalone()) {
        setShowIOSPrompt(true);
      }
      return;
    }

    try {
      const { data } = await axiosInstance.get('/v1/notifications/push/vapid-key/');
      const vapidKey = data.vapid_public_key;

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') return;

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

      setSubscribed(true);
      setPermission('granted');
    } catch (err) {
      console.error('Push subscription failed:', err);
    }
  };

  // Auto-subscribe if already granted and supported
  useEffect(() => {
    if (supported && permission === 'granted') {
      subscribe();
    }
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
