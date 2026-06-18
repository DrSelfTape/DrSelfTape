// External-URL opener.
//
// Two kinds of links need two different native behaviours:
//
//  1. STORE links (App Store / Play Store) must open the NATIVE store app so
//     the user lands on the product page with a working Update / Get button.
//     SFSafariViewController (@capacitor/browser) silently fails on the
//     `itms-apps://` scheme and merely renders the apps.apple.com WEB PAGE for
//     the https form — which is why "Update" never reached the App Store.
//     AppLauncher.openUrl hands the URL to the OS (UIApplication.open), which
//     launches the store app directly.
//
//  2. Ordinary external content (privacy policy, blog, Stripe, etc.) opens in
//     SFSafariViewController / Custom Tabs, which Apple expects for any URL
//     that leaves the app's own content (App Store guideline 4.2).
//
// On web/desktop everything falls back to a plain new-tab window.open.
//
// Use this anywhere you'd previously call `window.open(url, '_blank')`.

import { Capacitor } from '@capacitor/core';

function isStoreUrl(url) {
  return typeof url === 'string' && (
    url.startsWith('itms-apps://') ||
    url.startsWith('market://') ||
    url.includes('apps.apple.com') ||
    url.includes('play.google.com')
  );
}

// itms-apps://itunes.apple.com/app/idNNN  →  https://apps.apple.com/app/idNNN
// Used only for the web/last-resort path; the native launcher prefers the
// itms-apps:// scheme, which iOS maps straight to the App Store app.
function normalizeStoreUrl(url) {
  if (typeof url === 'string' && url.startsWith('itms-apps://')) {
    const m = url.match(/id(\d+)/);
    if (m) return `https://apps.apple.com/app/id${m[1]}`;
  }
  return url;
}

export async function openExternal(url) {
  if (!url) return;

  if (Capacitor.isNativePlatform()) {
    // Store links → native App Store / Play Store via the system launcher.
    if (isStoreUrl(url)) {
      try {
        const { AppLauncher } = await import('@capacitor/app-launcher');
        const { completed } = await AppLauncher.openUrl({ url });
        if (completed) return;
      } catch { /* launcher unavailable — fall through */ }
      // Last resort: render the https store page in the in-app browser so the
      // tap still does something even if the OS refused the store scheme.
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: normalizeStoreUrl(url), presentationStyle: 'popover' });
        return;
      } catch { /* fall through to window.open */ }
    } else {
      // Ordinary external content → SFSafariViewController (Apple 4.2).
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url, presentationStyle: 'popover' });
        return;
      } catch { /* plugin failed to load — fall through */ }
    }
  }

  window.open(normalizeStoreUrl(url), '_blank', 'noopener,noreferrer');
}
