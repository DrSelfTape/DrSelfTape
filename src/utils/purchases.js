// RevenueCat IAP wrapper for the native apps (iOS Apple IAP + Android
// Google Play Billing). On web we keep using Stripe Checkout. The same
// UserSubscription row on the backend is the source of truth for all
// platforms; RevenueCat's (store-agnostic) webhook updates it the same
// way Stripe's webhook does, so the rest of the app sees one model.
//
// Required env (public RevenueCat SDK keys from the dashboard):
//   VITE_REVENUECAT_IOS_KEY      — appl_… key, iOS
//   VITE_REVENUECAT_ANDROID_KEY  — goog_… key, Android
// Without the key for the current platform this module no-ops and the
// app falls back to "manage on web" behaviour.

import { Capacitor } from '@capacitor/core';

const IOS_KEY = import.meta.env.VITE_REVENUECAT_IOS_KEY || '';
const ANDROID_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_KEY || '';

let configured = false;
let purchasesPromise = null;

// True ONLY on native iOS — kept for genuinely iOS-specific behaviour
// (e.g. webkitSpeechRecognition gating) that must NOT apply to Android.
export function isNativeIOS() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

// The RevenueCat public key for the current native platform, or '' on
// web / unsupported platforms.
function platformKey() {
  if (!Capacitor.isNativePlatform()) return '';
  const p = Capacitor.getPlatform();
  if (p === 'ios') return IOS_KEY;
  if (p === 'android') return ANDROID_KEY;
  return '';
}

// True on any native store (iOS or Android) where we have an API key —
// i.e. native in-app purchasing is available. Use this for the
// IAP-vs-Stripe decision; use isNativeIOS() only for Apple-specific quirks.
export function isNativeStore() {
  return Capacitor.isNativePlatform() && !!platformKey();
}

// 'ios' | 'android' on a native store with a key, else null. Handy for
// analytics labels and store-specific copy ("Apple" vs "Google Play").
export function storePlatform() {
  return isNativeStore() ? Capacitor.getPlatform() : null;
}

// We need to dynamic-import the SDK so the bundle stays slim on web,
// where RevenueCat is never used.
function loadSDK() {
  if (!isNativeStore()) return null;
  if (!purchasesPromise) {
    purchasesPromise = import('@revenuecat/purchases-capacitor').then((m) => m);
  }
  return purchasesPromise;
}

/**
 * Initialise RevenueCat with the user's stable backend ID so purchases
 * and entitlements are tied to the same identity across devices.
 * Safe to call on any platform — no-ops off a native store or without an API key.
 */
export async function initPurchases(userId) {
  if (!isNativeStore() || configured) return;
  const sdk = await loadSDK();
  if (!sdk) return;
  try {
    await sdk.Purchases.configure({
      apiKey: platformKey(),
      appUserID: userId ? String(userId) : null,
    });
    configured = true;
  } catch (e) {
    console.warn('RevenueCat init failed:', e);
  }
}

/** Returns the current Offering's available packages, or [] if none. */
export async function getAvailablePackages() {
  const sdk = await loadSDK();
  if (!sdk) return [];
  try {
    const offerings = await sdk.Purchases.getOfferings();
    return offerings?.current?.availablePackages || [];
  } catch (e) {
    console.warn('RevenueCat getOfferings failed:', e);
    return [];
  }
}

/**
 * Find the package matching our (plan, billing) pair using product IDs
 * configured in App Store Connect (e.g. "basic_monthly", "plus_yearly").
 */
export async function getPackageFor(plan, billing) {
  const productId = `${plan}_${billing}`; // e.g. "premium_monthly"
  const packages = await getAvailablePackages();
  return packages.find((p) => p?.product?.identifier === productId) || null;
}

/**
 * Open the native Apple purchase sheet for a (plan, billing) pair.
 * Resolves with { ok, customerInfo, userCancelled } so callers can
 * branch on the outcome without relying on rejected promises.
 *
 * `userId` is the Django user id and MUST be passed: the purchase has to
 * be attributed to that backend identity or RevenueCat transacts under an
 * anonymous $RCAnonymousID and the BE webhook (User.objects.get(id=app_user_id))
 * can't match the receipt — Apple charges but Premium never grants and
 * Restore can't fix it.
 */
export async function purchase(plan, billing, userId) {
  if (!isNativeStore()) {
    return { ok: false, reason: 'unavailable', detail: 'not_native_store' };
  }
  const sdk = await loadSDK();
  if (!sdk) return { ok: false, reason: 'unavailable', detail: 'sdk_load_failed' };
  if (!userId) {
    // Refuse to transact anonymously — better to fail loudly than to bind
    // the purchase to an id the BE webhook can never match.
    return { ok: false, reason: 'unavailable', detail: 'no_user_id' };
  }
  // Force configure() in case initPurchases was never called (e.g., the
  // user reached this screen before App.jsx's effect ran on a cold boot).
  // Mirror initPurchases() and pass appUserID so we never configure under
  // an anonymous id.
  if (!configured) {
    try {
      await sdk.Purchases.configure({ apiKey: platformKey(), appUserID: String(userId) });
      configured = true;
    } catch (e) {
      return { ok: false, reason: 'unavailable', detail: 'configure_failed', error: String(e?.message || e) };
    }
  }
  // Always identify the purchasing user before transacting, even if
  // initPurchases already configured (it may have configured anonymously
  // if it ran before the user id was available, or threw). logIn is
  // idempotent and re-aliases an anonymous id onto the real one.
  try {
    await sdk.Purchases.logIn({ appUserID: String(userId) });
  } catch (e) {
    return { ok: false, reason: 'unavailable', detail: 'login_failed', error: String(e?.message || e) };
  }
  // Fetch offerings + diagnose which step failed so we can surface a
  // useful message instead of a generic "Purchase failed".
  let offerings;
  try {
    offerings = await sdk.Purchases.getOfferings();
  } catch (e) {
    return { ok: false, reason: 'no_offerings', error: String(e?.message || e) };
  }
  if (!offerings?.current) {
    return { ok: false, reason: 'no_offerings', detail: 'rc_dashboard_has_no_current_offering' };
  }
  const packages = offerings.current.availablePackages || [];
  if (packages.length === 0) {
    return { ok: false, reason: 'no_package', detail: 'current_offering_has_zero_packages' };
  }
  const productId = `${plan}_${billing}`;
  const pkg = packages.find((p) => p?.product?.identifier === productId);
  if (!pkg) {
    return {
      ok: false,
      reason: 'no_package',
      detail: `no_package_for_${productId}`,
      available: packages.map((p) => p?.product?.identifier).filter(Boolean),
    };
  }
  try {
    const { customerInfo } = await sdk.Purchases.purchasePackage({ aPackage: pkg });
    return { ok: true, customerInfo };
  } catch (e) {
    if (e?.userCancelled) return { ok: false, userCancelled: true };
    return { ok: false, reason: 'purchase_failed', error: String(e?.message || e) };
  }
}

// Returns the introductory offer for a (plan, billing) pair, or null.
// Normalizes RC's PurchasesIntroPrice into the shape the paywall renders.
// RC's real shape: { price, priceString, cycles, period (ISO 8601 string),
// periodUnit ('DAY'|'WEEK'|'MONTH'|'YEAR'), periodNumberOfUnits }.
export async function getIntroOfferFor(plan, billing) {
  const pkg = await getPackageFor(plan, billing);
  const intro = pkg?.product?.introPrice;
  if (!intro || !intro.periodUnit || !intro.periodNumberOfUnits) return null;
  return {
    unit: intro.periodUnit,
    value: intro.periodNumberOfUnits,
    price: intro.price,
    priceString: intro.priceString,
    isFreeTrial: intro.price === 0,
  };
}

/** Restore previous purchases (App Store guideline 3.1.1 requires this UI).
 *
 * Distinguishes:
 *   - {ok: false, reason: 'unavailable'} — RC SDK not loaded
 *   - {ok: false, reason: 'restore_failed', error} — network / RC error
 *   - {ok: true, hasActive: false} — restore succeeded, user has no purchases
 *   - {ok: true, hasActive: true, customerInfo} — restore succeeded, has active subs
 */
export async function restorePurchases() {
  const sdk = await loadSDK();
  if (!sdk) return { ok: false, reason: 'unavailable' };
  try {
    const customerInfo = await sdk.Purchases.restorePurchases();
    const active = customerInfo?.activeSubscriptions || customerInfo?.entitlements?.active || {};
    const hasActive = Array.isArray(active) ? active.length > 0 : Object.keys(active).length > 0;
    return { ok: true, hasActive, customerInfo };
  } catch (e) {
    return { ok: false, reason: 'restore_failed', error: e };
  }
}

/** Open Apple's subscription management UI (Settings → Subscriptions). */
export async function manageSubscriptions() {
  const sdk = await loadSDK();
  if (!sdk) return;
  try {
    await sdk.Purchases.showManageSubscriptions();
  } catch (e) {
    console.warn('showManageSubscriptions failed:', e);
  }
}
