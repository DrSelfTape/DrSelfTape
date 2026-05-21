// External-URL opener. On iOS (Capacitor), routes through @capacitor/browser
// → SFSafariViewController, which Apple expects for any URL that leaves
// the app's own content (App Store guideline 4.2). On web/desktop falls
// back to a plain new-tab window.open.
//
// Use this anywhere you'd previously call `window.open(url, '_blank')`.

import { Capacitor } from '@capacitor/core';

export async function openExternal(url) {
  if (!url) return;
  if (Capacitor.isNativePlatform()) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url, presentationStyle: 'popover' });
      return;
    } catch (e) {
      // Fall through to window.open if the plugin module fails to load.
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
