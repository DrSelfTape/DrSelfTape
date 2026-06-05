// RevenueCat / Apple IAP wrapper. iOS-only — on web we keep using Stripe
// Checkout. The same UserSubscription row on the backend is the source
// of truth for both platforms; RevenueCat's webhook updates it the same
// way Stripe's webhook does, so the rest of the app sees one model.
//
// Required env: VITE_REVENUECAT_IOS_KEY (the public iOS API key from
// the RevenueCat dashboard). Without it, this module no-ops and the
// iOS app falls back to "manage on web" behaviour.

import { Capacitor } from '@capacitor/core';

const IOS_KEY = import.meta.env.VITE_REVENUECAT_IOS_KEY || '';

let configured = false;
let purchasesPromise = null;

export function isNativeIOS() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

// We need to dynamic-import the SDK so the bundle stays slim on web,
// where RevenueCat is never used.
function loadSDK() {
  if (!isNativeIOS() || !IOS_KEY) return null;
  if (!purchasesPromise) {
    purchasesPromise = import('@revenuecat/purchases-capacitor').then((m) => m);
  }
  return purchasesPromise;
}

/**
 * Initialise RevenueCat with the user's stable backend ID so purchases
 * and entitlements are tied to the same identity across devices.
 * Safe to call on any platform — no-ops off iOS or without an API key.
 */
export async function initPurchases(userId) {
  if (!isNativeIOS() || !IOS_KEY || configured) return;
  const sdk = await loadSDK();
  if (!sdk) return;
  try {
    await sdk.Purchases.configure({
      apiKey: IOS_KEY,
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
 */
export async function purchase(plan, billing) {
  if (!isNativeIOS()) {
    return { ok: false, reason: 'unavailable', detail: 'not_native_ios' };
  }
  if (!IOS_KEY) {
    return { ok: false, reason: 'unavailable', detail: 'no_api_key' };
  }
  const sdk = await loadSDK();
  if (!sdk) return { ok: false, reason: 'unavailable', detail: 'sdk_load_failed' };
  // Force configure() in case initPurchases was never called (e.g., the
  // user reached this screen before App.jsx's effect ran on a cold boot).
  if (!configured) {
    try {
      await sdk.Purchases.configure({ apiKey: IOS_KEY });
      configured = true;
    } catch (e) {
      return { ok: false, reason: 'unavailable', detail: 'configure_failed', error: String(e?.message || e) };
    }
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
