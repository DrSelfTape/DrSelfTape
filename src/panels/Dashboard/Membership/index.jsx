import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axiosInstance from '../../../redux/http';
import { showSnackbar } from '../../../redux/features/snackbarSlice/snackbarSlice';
import { Capacitor } from '@capacitor/core';
import { isNativeIOS, isNativeStore, storePlatform, purchase as iapPurchase, restorePurchases, manageSubscriptions, getIntroOfferFor, getStorePriceFor } from '../../../utils/purchases';
import useHideMobileHeader from '../../../components/Shared/useHideMobileHeader';
import { consumeUpgradeIntent } from '../../../utils/goUpgrade';
import '../../../styles/studio-panels.css';

// Human-readable line for the surface an upgrade intent came from — shown as a
// focused header so the actor sees exactly what they're unlocking.
const UPGRADE_SOURCE_COPY = {
  tape_full_read: 'Unlock your full casting read',
  history_full_read: 'Unlock the full read on this tape',
  compare_full_notes: 'Unlock the full notes on every take',
  first_review: 'Unlock your full casting read',
};

// WEEKLY pricing (added 2026-06-14): the `weekly` amounts below are display
// only — the real charge comes from the Stripe/ASC/Play products. Keep these
// in sync with the prices you create there. The weekly billing option is
// hidden behind WEEKLY_ENABLED (import.meta.env.VITE_WEEKLY_ENABLED), so these
// stay invisible until you flip the flag at build time.
const WEEKLY_ENABLED = import.meta.env.VITE_WEEKLY_ENABLED === 'true';

/* Yearly prices are 99.99 / 149.99 / 249.99 and MATCH the live App Store
 * products — verified against appStoreConnect /subscriptions/<id>/prices
 * filtered to territory USA on 2026-10-01. They were briefly "corrected" to
 * 39.99 / 59.99 / 99.99 during that same pass; that was my error, reading a
 * non-USD territory's price point out of an unfiltered list and taking the
 * lower number for USD. If you ever re-check these, filter by territory.
 *
 * A year costs ten months of the monthly price (9.99 x 12 = 119.88 vs 99.99),
 * so "2 months free" is the accurate line, not a percentage.
 *
 * `summary` is what the tier actually gets you, in one line, and it leads with
 * the read — the thing nobody else will give an actor honestly. The allowance
 * is secondary (`meta`), because nobody buys a token count. */
const YEARLY_SAVING = '2 months free';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    tokens: 10,
    weekly: 4.99,
    monthly: 9.99,
    yearly: 99.99,
    yearlySaving: YEARLY_SAVING,
    summary: 'The full casting read on every tape you submit, plus per-take notes in Compare Takes.',
    meta: '10 AI tokens a month · no rollover',
    features: [
      'The full casting read on every tape',
      'Compare Takes · full per-take notes',
      '10 AI tokens / month',
      'Acting Coach + Live Study + Scene Gen',
      'Audition Tracker',
    ],
    rollover: false,
  },
  {
    id: 'plus',
    name: 'Plus',
    tokens: 20,
    weekly: 6.99,
    monthly: 14.99,
    yearly: 149.99,
    yearlySaving: YEARLY_SAVING,
    popular: true,
    summary: 'Everything in Basic, at twice the volume — and what you don’t use rolls over.',
    meta: '20 AI tokens a month · rollover',
    features: [
      'Twice the monthly reads of Basic',
      'Unused tokens roll over',
      'Green Room access',
      'Priority support',
      'Everything in Basic',
    ],
    rollover: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    tokens: 50,
    unlimited: true,
    weekly: 9.99,
    monthly: 24.99,
    yearly: 249.99,
    yearlySaving: YEARLY_SAVING,
    summary: 'Read every take you shoot, and Performance DNA reads the pattern across all of them.',
    meta: 'Unlimited AI · fair-use cap of 150 actions a day',
    features: [
      'Unlimited AI · fair-use cap of 150 actions a day',
      'The full casting read + Performance DNA',
      'Compare Takes · full per-take notes',
      'Everything in Plus',
      'Early access to new features',
    ],
    rollover: true,
  },
];

function introOfferLabel(intro) {
  if (!intro?.unit || !intro?.value) return null;
  const unitWord = { DAY: 'day', WEEK: 'week', MONTH: 'month', YEAR: 'year' }[intro.unit];
  if (!unitWord) return null;
  const plural = intro.value === 1 ? unitWord : `${unitWord}s`;
  if (intro.isFreeTrial) return `${intro.value}-${unitWord} free trial`;
  return `${intro.priceString} for first ${intro.value} ${plural}`;
}

/* What a subscription actually buys, in three plain rows.
 *
 * This replaces the old before/after ring-and-bar graphic, which charted
 * numbers we never measured and then carried a footnote admitting it. Three
 * specific sentences do the same job honestly and leave room for the tiers. */
const PROMISE = [
  {
    title: 'A casting-grade read on your own tape',
    body: 'What landed, what read as indicated, and the one fix worth making before you send it.',
  },
  {
    title: 'Compare takes before you submit',
    body: 'Put two to four takes side by side and get the ranked winner with the reason.',
  },
  {
    title: 'An AI reader that waits for your beat',
    body: 'Run the scene at your pace — it listens for your line, not a stopwatch.',
  },
];

function PromiseList() {
  return (
    <div className="studio-promise">
      {PROMISE.map((row) => (
        <div key={row.title} className="studio-promise-row">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12l5 5 9-11" />
          </svg>
          <div>
            <strong>{row.title}</strong>
            <span>{row.body}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Membership({ onClose }) {
  // Membership is full-screen with its own X close button; the persistent
  // MobileApp top bar (Aurora wordmark + bell + avatar) overlaps the
  // billing toggle row + RESTORE link otherwise. Hide it for the
  // lifetime of this panel.
  useHideMobileHeader(true);

  const dispatch = useDispatch();
  // The Django user id — MUST be threaded into the native IAP so RevenueCat
  // attributes the purchase to this backend identity (not an anonymous
  // $RCAnonymousID the webhook can never match). Mirrors App.jsx.
  const userId = useSelector((s) => s.auth?.user?.id);
  const [billing, setBilling] = useState('yearly'); // default yearly so free trial is featured
  const [selectedPlan, setSelectedPlan] = useState('plus'); // default to Plus (popular)
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  // Keeps the CTA disabled while we poll the BE for entitlement after a resolved
  // purchase/restore — otherwise the ~45s poll leaves the button live and a user
  // can fire a second purchase. Value is the planId (or 'restore').
  const [finalizing, setFinalizing] = useState(null);
  const [introOffers, setIntroOffers] = useState({});
  // Real localized store prices keyed `${plan}_${billing}` (e.g. "$9.99",
  // "£8.99"). Populated on native stores from pkg.product.priceString — the
  // hardcoded PLANS numbers are web/Stripe display only and can diverge from
  // the actual store charge by region/currency.
  const [storePrices, setStorePrices] = useState({});

  // Contextual checkout: a lock CTA elsewhere (Tape Review / Compare / history)
  // stashed an upgrade intent. Preselect the cheapest unlock (Basic/monthly) so
  // the actor lands on a $9.99 decision, not the default Plus+yearly ($149.99),
  // and remember the source for a focused header. Read-and-clear, once, on mount.
  const [upgradeIntent, setUpgradeIntent] = useState(null);
  useEffect(() => {
    const intent = consumeUpgradeIntent();
    if (!intent) return;
    setUpgradeIntent(intent);
    if (intent.plan && PLANS.some((p) => p.id === intent.plan)) setSelectedPlan(intent.plan);
    if (['weekly', 'monthly', 'yearly'].includes(intent.cycle)) setBilling(intent.cycle);
  }, []);

  // After a purchase/restore the BE entitlement is updated by the
  // RevenueCat/Stripe webhook, which can lag the client. A single fixed-delay
  // GET races that webhook → a paying user sees their OLD plan with no retry.
  // Poll the status endpoint a bounded number of times until it reports active.
  // ~45s window: RevenueCat webhook delivery + processing routinely exceeds the
  // old 12s, after which a genuinely-charged user was wrongly told to "contact
  // support". 'trialing' counts as entitled (matches the BE ENTITLED_STATUSES).
  // expectedPlan: after a PURCHASE/switch, require the status to report THAT plan
  // so a stale poll of the old plan can't declare a false success; restore passes
  // no expectedPlan (any entitled plan is a valid restore result).
  const refreshStatusUntilActive = async ({ attempts = 15, delayMs = 3000, expectedPlan = null } = {}) => {
    const entitled = (s) => s === 'active' || s === 'trialing';
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await axiosInstance.get('/v1/subscriptions/status/', { timeout: 8000 });
        const data = res.data?.data;
        if (data) setStatus(data);
        if (entitled(data?.status) && data?.plan && (!expectedPlan || data.plan === expectedPlan)) return true;
      } catch { /* transient / timeout — keep polling */ }
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
    return false;
  };

  useEffect(() => {
    axiosInstance.get('/v1/subscriptions/status/')
      .then((res) => setStatus(res.data.data))
      .catch(() => setStatus({ balance: 0, plan: null, status: 'unknown' }))
      .finally(() => setLoading(false));

    if (isNativeStore()) {
      // 'weekly' included for the dormant weekly tier (VITE_WEEKLY_ENABLED):
      // getIntroOfferFor/getStorePriceFor .catch(null) on combos the store
      // doesn't sell yet, so prefetching it is flip-ready and free today.
      const combos = ['basic', 'plus', 'premium'].flatMap((p) => ['weekly', 'monthly', 'yearly'].map((b) => [p, b]));
      Promise.all(combos.map(async ([p, b]) => {
        const offer = await getIntroOfferFor(p, b).catch(() => null);
        return [`${p}_${b}`, offer];
      })).then((entries) => setIntroOffers(Object.fromEntries(entries)));

      // Real localized store prices — prefer these over the hardcoded PLANS
      // numbers on native stores (Apple/Google charge the region's price).
      Promise.all(combos.map(async ([p, b]) => {
        const priceString = await getStorePriceFor(p, b).catch(() => null);
        return [`${p}_${b}`, priceString];
      })).then((entries) => setStorePrices(Object.fromEntries(entries)));
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('subscribed') === 'true') {
      dispatch(showSnackbar({ message: 'Subscription activated. Welcome aboard!', variant: 'success' }));
      import('../../../utils/analytics').then(({ trackEvent, Events }) => {
        trackEvent(Events.PURCHASE, {
          status: 'success',
          platform: 'stripe_web',
          plan: params.get('plan') || undefined,
        });
      }).catch(() => { /* swallow */ });
      setTimeout(() => {
        axiosInstance.get('/v1/subscriptions/status/').then((res) => setStatus(res.data.data));
      }, 1500);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('canceled') === 'true') {
      dispatch(showSnackbar({ message: 'Checkout canceled. Your subscription is unchanged.', variant: 'info' }));
      import('../../../utils/analytics').then(({ trackEvent, Events }) => {
        trackEvent(Events.PURCHASE, {
          status: 'cancelled',
          platform: 'stripe_web',
        });
      }).catch(() => { /* swallow */ });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [dispatch]);

  const handleSubscribe = async (planId) => {
    // Apple 2.1(b) rejection: the trial button appeared unresponsive
    // because checkoutLoading could get stuck forever if the IAP plugin
    // hung. Belt-and-suspenders watchdog clears the disabled state
    // after 12s so the user can always retry.
    setCheckoutLoading(planId);
    const watchdog = setTimeout(() => {
      setCheckoutLoading((cur) => (cur === planId ? null : cur));
      dispatch(showSnackbar({
        message: 'Checkout is taking longer than expected. Please try again.',
        variant: 'error',
      }));
    }, 12000);
    const clearWatchdog = () => clearTimeout(watchdog);

    // Fire the revenue funnel event — Joseph's "Paywall → purchase"
    // funnel relies on this. Dynamic import keeps the analytics bundle
    // out of the critical path; failure swallowed so a missing PostHog
    // key never blocks a real subscription attempt.
    const platform = isNativeStore() ? `${storePlatform()}_iap` : 'stripe_web';
    const trackPurchase = (props) =>
      import('../../../utils/analytics').then(({ trackEvent, Events }) => {
        trackEvent(Events.PURCHASE, { plan: planId, billing, platform, ...props });
      }).catch(() => { /* swallow */ });
    trackPurchase({ status: 'initiated' });

    if (isNativeStore()) {
      try {
        const result = await iapPurchase(planId, billing, userId);
        clearWatchdog();
        setCheckoutLoading(null);

        if (result.userCancelled) {
          trackPurchase({ status: 'cancelled' });
          return;
        }

        if (!result.ok) {
          let msg;
          if (result.reason === 'no_package') {
            msg = `This plan isn't available in the App Store yet. ${result.detail || ''}`.trim();
          } else if (result.reason === 'no_offerings') {
            msg = 'Subscriptions are temporarily unavailable. We have been notified.';
          } else if (result.reason === 'unavailable') {
            msg = `In-App Purchase isn't ready yet. (${result.detail || 'unknown'})`;
          } else if (result.reason === 'purchase_failed') {
            msg = `Apple declined the purchase: ${result.error || 'please try again'}`;
          } else {
            msg = 'Purchase failed. Please try again.';
          }
          // Only ping Sentry when the failure suggests a server-side or
          // dashboard config issue we should investigate. Skip when it's
          // a user-side decline (Apple sandbox, expired card, etc.) — those
          // create noise without an action item.
          const SERVER_SIDE_REASONS = new Set([
            'no_offerings',
            'no_package',
            'configure_failed',
            'sdk_load_failed',
            'login_failed',
          ]);
          // purchases.js returns reason:'unavailable' with the real code in
          // result.detail (sdk_load_failed / configure_failed / login_failed),
          // so gate on detail too or the instrumentation never fires.
          const investigable = SERVER_SIDE_REASONS.has(result.reason) || SERVER_SIDE_REASONS.has(result.detail);
          if (investigable) {
            try {
              const { Sentry } = await import('../../../utils/sentry');
              Sentry.captureMessage(`IAP setup issue: ${result.reason}`, {
                level: 'info',
                extra: { ...result, planId, billing },
              });
            } catch { /* swallow */ }
          }
          dispatch(showSnackbar({ message: msg, variant: 'error' }));
          trackPurchase({ status: 'failed', reason: result.reason });
          return;
        }

        // The purchase promise resolved, but that alone doesn't mean an
        // entitlement was granted. Deferred/pending (ask-to-buy, Family
        // Sharing, billing retry) → "pending"; resolved-but-no-active-
        // entitlement yet → "finalizing"; only a confirmed active entitlement
        // earns "activated".
        trackPurchase({ status: 'success' });

        // Pending purchases (ask-to-buy, Family Sharing, billing retry) never
        // grant immediately — tell the user and stop; polling/alerting would be
        // a false alarm.
        if (result.pending) {
          dispatch(showSnackbar({ message: 'Your purchase is pending approval. We’ll unlock your plan once it’s approved.', variant: 'info' }));
          return;
        }

        // Don't claim "activated" off a resolved promise alone — the BE
        // entitlement is granted by the (laggy) webhook. Poll for it, and only
        // show success once the BE actually reports active. If it never lands,
        // the user was charged but never granted — alert (don't hide it behind a
        // success toast) and show a single honest, actionable message.
        setFinalizing(planId);
        let granted = false;
        try {
          granted = await refreshStatusUntilActive({ expectedPlan: planId });
        } finally {
          setFinalizing(null);
        }
        if (granted) {
          dispatch(showSnackbar({ message: 'Subscription activated. Welcome aboard!', variant: 'success' }));
        } else {
          try {
            const { Sentry } = await import('../../../utils/sentry');
            // Timing timeout, not a confirmed failure — the webhook usually lands
            // shortly after. Warning (not error) so it doesn't page as a lost sale.
            Sentry.captureMessage('IAP entitlement not confirmed within poll window', {
              level: 'warning',
              extra: { userId, planId, billing },
            });
          } catch { /* swallow */ }
          dispatch(showSnackbar({
            message: 'Payment received. Your plan is activating and can take a minute. It’ll appear automatically; tap Restore Purchases if it doesn’t.',
            variant: 'info',
          }));
        }
      } catch {
        // iapPurchase shouldn't throw, but if the plugin itself is
        // missing or rejects, surface a real error instead of silently
        // hanging on a spinner.
        clearWatchdog();
        setCheckoutLoading(null);
        dispatch(showSnackbar({
          message: 'In-App Purchase is unavailable. Please try again or restart the app.',
          variant: 'error',
        }));
        trackPurchase({ status: 'failed', reason: 'iap_threw' });
      }
      return;
    }

    if (Capacitor.isNativePlatform()) {
      clearWatchdog();
      setCheckoutLoading(null);
      // A native build that reaches here has NO working store (most likely a
      // keyless/misconfigured build) — the single most important IAP failure
      // to alert on, since no one can purchase. The web Stripe path never
      // reaches this branch, so this fires only on a real native outage.
      try {
        const { Sentry } = await import('../../../utils/sentry');
        Sentry.captureMessage('IAP unavailable: native_no_store', {
          level: 'error',
          extra: { platform: Capacitor.getPlatform() },
        });
      } catch { /* swallow */ }
      dispatch(showSnackbar({
        message: "Subscriptions aren't available on this device yet. Please try again soon.",
        variant: 'error',
      }));
      trackPurchase({ status: 'failed', reason: 'native_no_store' });
      return;
    }

    try {
      const res = await axiosInstance.post('/v1/subscriptions/checkout/', { plan: planId, billing });
      clearWatchdog();
      const data = res.data?.data || {};
      const checkoutUrl = data.checkout_url;
      // No checkout_url → the user already had an active subscription and the
      // BE changed the plan IN PLACE with Stripe proration (charged only the
      // prorated difference). Surface the result + refresh status instead of
      // redirecting to a checkout page.
      if (!checkoutUrl) {
        setCheckoutLoading(null);
        dispatch(showSnackbar({
          message: data.message || (data.changed ? 'Plan updated.' : "You're already on this plan."),
          variant: 'success',
        }));
        trackPurchase({ status: data.changed ? 'completed' : 'noop' });
        axiosInstance.get('/v1/subscriptions/status/').then((r) => setStatus(r.data.data)).catch(() => {});
        return;
      }
      window.location.href = checkoutUrl;
    } catch (err) {
      clearWatchdog();
      const message = err?.response?.data?.error || 'Something went wrong starting checkout. Please try again.';
      dispatch(showSnackbar({ message, variant: 'error' }));
      trackPurchase({ status: 'failed', reason: 'checkout_session_failed' });
      setCheckoutLoading(null);
    }
  };

  const handleManage = async () => {
    if (isNativeStore()) {
      await manageSubscriptions();
      return;
    }
    // Native without a working store (e.g. a web-subscribed user on the Android
    // app before Play Billing is live): never navigate the WebView to the Stripe
    // portal — it destroys the SPA and strands the user with no route back.
    // Same invariant as the subscribe path above.
    if (Capacitor.isNativePlatform()) {
      dispatch(showSnackbar({
        message: 'Manage your subscription at drselftape.app.',
        variant: 'info',
      }));
      return;
    }
    try {
      const res = await axiosInstance.post('/v1/subscriptions/portal/');
      window.location.href = res.data.data.portal_url;
    } catch (err) {
      const message = err?.response?.data?.error || "Couldn't open the billing portal. Please try again.";
      dispatch(showSnackbar({ message, variant: 'error' }));
    }
  };

  const handleRestore = async () => {
    if (!isNativeStore()) return;
    // Identify the current Redux user before restoring so receipts attribute
    // to THIS backend identity, not whoever RC was last bound to.
    const result = await restorePurchases(userId);
    if (result.ok && result.hasActive) {
      // RC found active receipts, but the BE entitlement still comes from the
      // webhook. Poll for it; only claim "restored" once the BE reports active.
      // If it never lands, the receipt exists but the grant didn't — alert and
      // show a single honest message instead of a false "restored".
      setFinalizing('restore');
      let granted = false;
      try {
        granted = await refreshStatusUntilActive();
      } finally {
        setFinalizing(null);
      }
      if (granted) {
        dispatch(showSnackbar({ message: 'Purchases restored.', variant: 'success' }));
      } else {
        try {
          const { Sentry } = await import('../../../utils/sentry');
          Sentry.captureMessage('IAP restore entitlement not confirmed within poll window', {
            level: 'warning',
            extra: { userId },
          });
        } catch { /* swallow */ }
        dispatch(showSnackbar({
          message: 'Payment received. Your plan is activating and can take a minute. It’ll appear automatically.',
          variant: 'info',
        }));
      }
    } else if (result.ok) {
      dispatch(showSnackbar({ message: 'No purchases found on this Apple ID.', variant: 'info' }));
    } else if (result.reason === 'unavailable') {
      dispatch(showSnackbar({ message: 'In-App Purchase is unavailable right now.', variant: 'error' }));
    } else {
      dispatch(showSnackbar({
        message: 'Could not reach the App Store to restore. Please try again.',
        variant: 'error',
      }));
    }
  };

  // A trialing subscriber is entitled (matches the BE ENTITLED_STATUSES) — the
  // paywall must treat them as a current subscriber, not offer them the plan.
  const isEntitledStatus = (s) => s === 'active' || s === 'trialing';
  const currentPlan = status?.plan;
  // Once a user has an active plan the free trial / intro offer is gone for
  // every plan — the stores already block a re-used trial, so hide the badge
  // to match (showing "1 week free" to an existing subscriber is misleading).
  const hasActivePlan = isEntitledStatus(status?.status);
  const tokenBalance = status?.balance ?? 0;
  // Premium is the "Unlimited" tier — the BE flags it so we show "Unlimited"
  // rather than the frozen balance number (which never deducts for them).
  const isUnlimited = !!status?.unlimited;
  const sel = PLANS.find((p) => p.id === selectedPlan);
  const selIntro = introOffers[`${selectedPlan}_${billing}`];
  const selIntroLabel = introOfferLabel(selIntro);
  const isCurrent = currentPlan === selectedPlan && isEntitledStatus(status?.status);
  // Key the CTA price on the selected billing cadence (weekly/monthly/yearly).
  // A binary monthly-vs-yearly check mispriced the weekly option as the YEARLY
  // amount once WEEKLY_ENABLED is flipped. Match the plan-card logic (plan[billing]).
  const ctaPrice = sel ? (sel[billing] ?? sel.monthly) : 0;
  const ctaPeriod = { weekly: 'wk', monthly: 'mo', yearly: 'yr' }[billing] || 'mo';
  // Prefer the real localized store price for the selected plan (already
  // currency-symboled); fall back to the hardcoded web/Stripe number with '$'.
  const ctaStorePrice = storePrices[`${selectedPlan}_${billing}`];
  const ctaPriceDisplay = ctaStorePrice || `$${ctaPrice}`;


  return (
    <div className="dst-studio-panel dst-membership">
      {/* X close button only — small floating affordance at top-left. The
          RESTORE link lives at the bottom next to Terms · Privacy Policy
          (per Joseph's 2026-06-06 ask — top bar felt floaty, RESTORE
          belongs in the legal footer where iOS apps usually park it). */}
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Close" className="studio-close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}

      <div className="dst-membership-inner">
        {/* Serif headline — focused on the unlock when arriving from a lock CTA */}
        <header style={{ marginTop: 8, marginBottom: 18 }}>
          <span className="studio-eyebrow" style={{ marginBottom: 8 }}>
            {upgradeIntent ? "YOU'RE ONE STEP AWAY" : 'UNLOCK YOUR STUDIO'}
          </span>
          <h1 className="studio-title" style={{ fontSize: 32, letterSpacing: '-1px' }}>
            {upgradeIntent
              ? (UPGRADE_SOURCE_COPY[upgradeIntent.source] || 'Unlock your full read')
              : <>An honest read<br />on your own tape.</>}
          </h1>
          <p className="studio-sub">
            {upgradeIntent
              ? <>Any plan unlocks it. <strong style={{ color: 'var(--dst-ink)' }}>Basic is $9.99/mo.</strong> Everything below is included too.</>
              : <>Nobody else will tell an actor the truth about their own take. That is the
                 whole product — and every plan includes it.</>}
          </p>
        </header>

        {/* What the money buys — three plain rows, no invented metrics. */}
        <PromiseList />

        {/* Token balance pill */}
        {!loading && (
          <div className="studio-balance">
            {isUnlimited ? (
              <b>Unlimited AI</b>
            ) : (
              <>
                <b>{tokenBalance}</b>
                <span>tokens remaining</span>
              </>
            )}
          </div>
        )}

        {/* Billing toggle — Weekly (flagged) / Monthly / Yearly */}
        <div className="studio-billing">
          {[...(WEEKLY_ENABLED ? ['weekly'] : []), 'monthly', 'yearly'].map((b) => {
            const on = billing === b;
            const label = { weekly: 'Weekly', monthly: 'Monthly', yearly: `Yearly · ${YEARLY_SAVING}` }[b];
            return (
              <button key={b} type="button" onClick={() => setBilling(b)}
                onTouchEnd={(e) => { e.preventDefault(); setBilling(b); }}
                aria-pressed={on}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Plan cards — a ladder. Each tier states what it gets you before
            you select it, so Basic vs Plus vs Premium reads in one screen. */}
        <div className="studio-plans">
          {PLANS.map((plan) => {
            // Prefer the real localized store price (already currency-symboled,
            // do NOT prepend '$'); fall back to the hardcoded web/Stripe number.
            const storePrice = storePrices[`${plan.id}_${billing}`];
            const price = plan[billing] ?? plan.monthly;
            const priceDisplay = storePrice || `$${price}`;
            const isActive = currentPlan === plan.id;
            const planIsCurrent = isActive && isEntitledStatus(status?.status);
            const selected = selectedPlan === plan.id;
            const planIntro = introOffers[`${plan.id}_${billing}`];
            const planIntroLabel = introOfferLabel(planIntro);

            return (
              <button
                key={plan.id}
                type="button"
                className="studio-plan"
                aria-pressed={selected}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.popular && <span className="studio-plan-flag">POPULAR</span>}
                {planIsCurrent && <span className="studio-plan-flag" data-kind="current">CURRENT</span>}

                <span className="studio-plan-top">
                  <span className="studio-plan-name">{plan.name}</span>
                  {/* Apple 3.1.2(c): the bill amount must dominate. */}
                  <span className="studio-plan-price">
                    {priceDisplay}
                    <span className="studio-plan-period">/{{ weekly: 'wk', monthly: 'mo', yearly: 'yr' }[billing]}</span>
                  </span>
                </span>

                {/* Spans, not <p>/<ul>: this card is a <button>, whose content
                    model is phrasing content. The classes carry the layout. */}
                <span className="studio-plan-sum">{plan.summary}</span>
                <span className="studio-plan-meta">{plan.meta}</span>

                {planIntroLabel && !hasActivePlan && (
                  <span className="studio-plan-trial">{planIntroLabel.toUpperCase()}</span>
                )}

                {/* The full list opens on the tier you're actually deciding
                    about, so the page never shows fifteen bullets at once. */}
                {selected && (
                  <span className="studio-plan-detail">
                    {plan.features.map((feat) => (
                      <span key={feat} className="studio-plan-detail-item">{feat}</span>
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Inline CTA — sits in the document flow, no position:fixed.
            The earlier floating button hit iOS WKWebView stacking-context
            bugs where the top bar / tab bar rendered above its tap area. */}
        <div className="studio-cta-block">
          {isCurrent ? (
            <button
              type="button"
              className="studio-cta-ghost"
              onClick={handleManage}
              onTouchEnd={(e) => { e.preventDefault(); handleManage(); }}
            >
              Manage Plan
              {isNativeStore() && (
                <span className="studio-cta-note">
                  {isNativeIOS() ? 'Opens Apple Settings · Subscriptions' : 'Opens Google Play · Subscriptions'}
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              className="studio-cta"
              onClick={() => !checkoutLoading && !finalizing && handleSubscribe(selectedPlan)}
              onTouchEnd={(e) => {
                e.preventDefault();
                if (!checkoutLoading && !finalizing) handleSubscribe(selectedPlan);
              }}
              disabled={!!checkoutLoading || !!finalizing || !selectedPlan}
            >
              {(checkoutLoading === selectedPlan || finalizing === selectedPlan) ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span className="studio-spinner" />
                  Opening checkout…
                </span>
              ) : (
                <>
                  {selIntro?.isFreeTrial && !hasActivePlan && (
                    <span className="studio-cta-note">{selIntroLabel} then</span>
                  )}
                  <span>{hasActivePlan ? 'Switch' : 'Subscribe'} · {ctaPriceDisplay}/{ctaPeriod} &rarr;</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Feature ticks — what you get regardless of tier */}
        <div className="studio-includes">
          <span className="studio-eyebrow">EVERY PLAN INCLUDES</span>
          <ul>
            {[
              'Unlimited audition tracking',
              'AI scene coaching feedback',
              'Find a Reader matching + Green Room chat',
              'Jericho weekly craft readout',
            ].map((feat) => (
              <li key={feat}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l5 5 9-11" />
                </svg>
                {feat}
              </li>
            ))}
          </ul>
        </div>

        {/* "No payment now" microcopy — gated on !hasActivePlan to match the
            trial badge and CTA prefix. An existing/upgrading subscriber has
            already used the intro offer (the stores block a re-used trial), so
            promising "no payment now / your trial ends" to them is wrong. */}
        {selIntro?.isFreeTrial && !hasActivePlan && (
          <p className="studio-trialnote">
            <strong>No payment now.</strong> You&apos;ll be reminded before your trial ends.
          </p>
        )}

        {/* Legal — full Apple-mandated disclosure block.
            Auto-renewal language + cancellation location + refund pointer
            are all required for App Store review under guideline 3.1.2. */}
        <p className="studio-legal">
          Subscriptions auto-renew at the price shown until cancelled in your
          Apple ID Subscription settings. You can cancel anytime; cancellation
          takes effect at the end of the current billing period. Payment is
          charged to your Apple ID at confirmation. Refunds are handled by
          Apple at{' '}
          <a
            href="https://reportaproblem.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            className="aurora-link"
            style={{ fontSize: 11 }}
          >
            reportaproblem.apple.com
          </a>
          .
        </p>
        <p className="studio-legal">
          <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
             target="_blank" rel="noopener noreferrer"
             className="aurora-link" style={{ fontSize: 11 }}>
            Terms (EULA)
          </a>
          {' · '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="aurora-link" style={{ fontSize: 11 }}>
            Privacy Policy
          </a>
          {isNativeStore() && (
            <>
              {' · '}
              <button
                type="button"
                onClick={handleRestore}
                onTouchEnd={(e) => { e.preventDefault(); handleRestore(); }}
                className="aurora-link"
                style={{
                  background: 'transparent', border: 'none', padding: 0,
                  font: 'inherit', cursor: 'pointer', fontSize: 11,
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >Restore Purchases</button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
