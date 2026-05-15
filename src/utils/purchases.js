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
  const sdk = await loadSDK();
  if (!sdk) return { ok: false, reason: 'unavailable' };
  const pkg = await getPackageFor(plan, billing);
  if (!pkg) return { ok: false, reason: 'no_package' };
  try {
    const { customerInfo } = await sdk.Purchases.purchasePackage({ aPackage: pkg });
    return { ok: true, customerInfo };
  } catch (e) {
    if (e?.userCancelled) return { ok: false, userCancelled: true };
    return { ok: false, reason: 'purchase_failed', error: e };
  }
}

/** Restore previous purchases (App Store guideline 3.1.1 requires this UI). */
export async function restorePurchases() {
  const sdk = await loadSDK();
  if (!sdk) return { ok: false, reason: 'unavailable' };
  try {
    const customerInfo = await sdk.Purchases.restorePurchases();
    return { ok: true, customerInfo };
  } catch (e) {
    return { ok: false, error: e };
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
