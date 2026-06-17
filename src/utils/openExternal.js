// External-URL opener. On iOS (Capacitor), routes through @capacitor/browser
// → SFSafariViewController, which Apple expects for any URL that leaves
// the app's own content (App Store guideline 4.2). On web/desktop falls
// back to a plain new-tab window.open.
//
// App Store links are the exception: SFSafariViewController CANNOT open the
// `itms-apps://` custom scheme — it silently fails, which is why the update
// banner's "Update" button did nothing. Normalize store links to their
// `https://apps.apple.com` form, which the in-app browser CAN load and which
// iOS hands off to the App Store.
//
// Use this anywhere you'd previously call `window.open(url, '_blank')`.

import { Capacitor } from '@capacitor/core';

// itms-apps://itunes.apple.com/app/idNNN  →  https://apps.apple.com/app/idNNN
function normalizeStoreUrl(url) {
  if (typeof url === 'string' && url.startsWith('itms-apps://')) {
    const m = url.match(/id(\d+)/);
    if (m) return `https://apps.apple.com/app/id${m[1]}`;
  }
  return url;
}

export async function openExternal(url) {
  if (!url) return;
  const safeUrl = normalizeStoreUrl(url);
  if (Capacitor.isNativePlatform()) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: safeUrl, presentationStyle: 'popover' });
      return;
    } catch (e) {
      // Fall through to window.open if the plugin module fails to load.
    }
  }
  window.open(safeUrl, '_blank', 'noopener,noreferrer');
}
