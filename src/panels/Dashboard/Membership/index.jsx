import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axiosInstance from '../../../redux/http';
import { showSnackbar } from '../../../redux/features/snackbarSlice/snackbarSlice';
import { Capacitor } from '@capacitor/core';
import { isNativeIOS, isNativeStore, storePlatform, purchase as iapPurchase, restorePurchases, manageSubscriptions, getIntroOfferFor, getStorePriceFor } from '../../../utils/purchases';
import useHideMobileHeader from '../../../components/Shared/useHideMobileHeader';

// WEEKLY pricing (added 2026-06-14): the `weekly` amounts below are display
// only — the real charge comes from the Stripe/ASC/Play products. Keep these
// in sync with the prices you create there. The weekly billing option is
// hidden behind WEEKLY_ENABLED (import.meta.env.VITE_WEEKLY_ENABLED), so these
// stay invisible until you flip the flag at build time.
const WEEKLY_ENABLED = import.meta.env.VITE_WEEKLY_ENABLED === 'true';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    tokens: 10,
    weekly: 4.99,
    monthly: 9.99,
    yearly: 99.99,
    yearlySaving: '2 months free',
    features: [
      '10 AI tokens / month',
      'Acting Coach sessions',
      'Live Study Mode',
      'Scene Generator',
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
    yearlySaving: '2 months free',
    popular: true,
    features: [
      '20 AI tokens / month',
      'Rollover unused tokens',
      'Everything in Basic',
      'Priority support',
      'Green Room access',
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
    yearlySaving: '2 months free',
    features: [
      'Unlimited AI — no token limits',
      'Tape Review + Compare Takes',
      'Bring your own audition sides',
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

/* Mini callback-rate ring used inside each comparison card. */
function MiniRing({ pct, color, track, label }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <svg width="74" height="74" viewBox="0 0 74 74" style={{ display: 'block', margin: '0 auto' }}>
      <circle cx="37" cy="37" r={r} stroke={track} strokeWidth="7" fill="none" />
      <circle cx="37" cy="37" r={r} stroke={color} strokeWidth="7" fill="none"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 37 37)" />
      <text x="37" y="42" textAnchor="middle" style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 17, fontWeight: 500, fill: color,
      }}>{label}</text>
    </svg>
  );
}

/* One side of the before/after comparison — Aurora-native (no stock art):
   eyebrow → mini callback ring → 7-day "week bars" → a one-line verdict. */
function CompareCard({ kind }) {
  const before = kind === 'before';
  const bars = before ? [4, 2, 5, 1, 3, 0, 2] : [12, 18, 14, 22, 17, 20, 24];
  const max = before ? 5 : 24;
  return (
    <div style={{
      borderRadius: 20, padding: '16px 16px 18px', position: 'relative', overflow: 'hidden', minHeight: 230,
      background: before ? 'rgba(255,255,255,0.5)' : 'linear-gradient(160deg, var(--aurora-heritage-gold), #F0D097)',
      border: `1px solid ${before ? 'var(--aurora-line)' : 'rgba(255,255,255,0.5)'}`,
      boxShadow: before ? 'none' : '0 14px 34px rgba(212,168,95,0.27)',
      filter: before ? 'grayscale(0.5)' : 'none',
    }}>
      <div className="aurora-mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: before ? 'var(--aurora-dim)' : 'rgba(26,20,8,0.7)' }}>
        {before ? 'WITHOUT PRO' : 'WITH PRO'}
      </div>
      <div style={{ margin: '14px 0' }}>
        <MiniRing
          pct={before ? 0.03 : 0.17}
          color={before ? 'rgba(10,10,10,0.35)' : '#1A1408'}
          track={before ? 'rgba(10,10,10,0.08)' : 'rgba(255,255,255,0.4)'}
          label={before ? '3%' : '17%'}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, height: 38 }}>
        {bars.map((v, i) => (
          <div key={i} style={{
            width: 7, height: `${Math.max(8, (v / max) * 38)}px`, borderRadius: 3,
            background: before ? 'rgba(10,10,10,0.2)' : '#1A1408', opacity: before ? 0.6 : 0.9,
          }} />
        ))}
      </div>
      <div style={{
        fontSize: 12, fontWeight: 600, letterSpacing: '-0.2px', marginTop: 14, lineHeight: 1.35,
        color: before ? 'var(--aurora-sub)' : '#1A1408',
      }}>
        {before ? 'Guessing in the dark. Tapes pile up, callbacks stall.' : 'Sharper reads, more callbacks, a habit that compounds.'}
      </div>
    </div>
  );
}

/* Before/After comparison — "Without Pro" 3% vs "With Pro" 17% callback rate. */
function ComparisonRings() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
      <CompareCard kind="before" />
      <CompareCard kind="after" />
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
  const [introOffers, setIntroOffers] = useState({});
  // Real localized store prices keyed `${plan}_${billing}` (e.g. "$9.99",
  // "£8.99"). Populated on native stores from pkg.product.priceString — the
  // hardcoded PLANS numbers are web/Stripe display only and can diverge from
  // the actual store charge by region/currency.
  const [storePrices, setStorePrices] = useState({});

  // After a purchase/restore the BE entitlement is updated by the
  // RevenueCat/Stripe webhook, which can lag the client. A single fixed-delay
  // GET races that webhook → a paying user sees their OLD plan with no retry.
  // Poll the status endpoint a bounded number of times until it reports active.
  const refreshStatusUntilActive = async ({ attempts = 6, delayMs = 2000 } = {}) => {
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await axiosInstance.get('/v1/subscriptions/status/');
        const data = res.data?.data;
        if (data) setStatus(data);
        if (data?.status === 'active' && data?.plan) return true;
      } catch { /* transient — keep polling */ }
      await new Promise((r) => setTimeout(r, delayMs));
    }
    return false;
  };

  useEffect(() => {
    axiosInstance.get('/v1/subscriptions/status/')
      .then((res) => setStatus(res.data.data))
      .catch(() => setStatus({ balance: 0, plan: null, status: 'unknown' }))
      .finally(() => setLoading(false));

    if (isNativeStore()) {
      const combos = ['basic', 'plus', 'premium'].flatMap((p) => ['monthly', 'yearly'].map((b) => [p, b]));
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
      dispatch(showSnackbar({ message: 'Checkout canceled — no changes to your subscription.', variant: 'info' }));
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
        const granted = await refreshStatusUntilActive();
        if (granted) {
          dispatch(showSnackbar({ message: 'Subscription activated. Welcome aboard!', variant: 'success' }));
        } else {
          try {
            const { Sentry } = await import('../../../utils/sentry');
            Sentry.captureMessage('IAP purchase succeeded but entitlement never granted', {
              level: 'error',
              extra: { userId, planId, billing },
            });
          } catch { /* swallow */ }
          dispatch(showSnackbar({
            message: 'Payment received — your plan is still finalizing. Tap Restore Purchases or contact support if it doesn’t appear shortly.',
            variant: 'info',
          }));
        }
      } catch (err) {
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
        message: 'Manage your subscription at drselftapes.com.',
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
      const granted = await refreshStatusUntilActive();
      if (granted) {
        dispatch(showSnackbar({ message: 'Purchases restored.', variant: 'success' }));
      } else {
        try {
          const { Sentry } = await import('../../../utils/sentry');
          Sentry.captureMessage('IAP restore succeeded but entitlement never granted', {
            level: 'error',
            extra: { userId },
          });
        } catch { /* swallow */ }
        dispatch(showSnackbar({
          message: 'Payment received — your plan is still finalizing. Tap Restore Purchases or contact support if it doesn’t appear shortly.',
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

  const currentPlan = status?.plan;
  // Once a user has an active plan the free trial / intro offer is gone for
  // every plan — the stores already block a re-used trial, so hide the badge
  // to match (showing "1 week free" to an existing subscriber is misleading).
  const hasActivePlan = status?.status === 'active';
  const tokenBalance = status?.balance ?? 0;
  const sel = PLANS.find((p) => p.id === selectedPlan);
  const selIntro = introOffers[`${selectedPlan}_${billing}`];
  const selIntroLabel = introOfferLabel(selIntro);
  const isCurrent = currentPlan === selectedPlan && status?.status === 'active';
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
    <div className="aurora-orbs aurora-orbs-live" style={{
      position: 'relative', minHeight: '100%',
      padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 0 calc(env(safe-area-inset-bottom, 0px) + 24px)',
    }}>
      {/* X close button only — small floating affordance at top-left. The
          RESTORE link lives at the bottom next to Terms · Privacy Policy
          (per Joseph's 2026-06-06 ask — top bar felt floaty, RESTORE
          belongs in the legal footer where iOS apps usually park it). */}
      {onClose && (
        <button onClick={onClose} aria-label="Close" style={{
          position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 12px)', left: 16,
          zIndex: 10,
          // Apple HIG accessibility: minimum 44×44 tap target.
          width: 44, height: 44, borderRadius: 100, border: 'none',
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 4px 12px rgba(10,10,10,0.06)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}

      <div style={{ padding: '0 22px' }}>
        {/* Serif headline */}
        <div style={{ marginTop: 8, marginBottom: 18 }}>
          <span className="aurora-eyebrow" style={{ display: 'block', marginBottom: 8, color: 'var(--aurora-accent-deep)' }}>
            UNLOCK YOUR STUDIO
          </span>
          <h1 className="aurora-display" style={{
            fontSize: 32, color: 'var(--aurora-text)', margin: 0,
            letterSpacing: '-0.7px', lineHeight: 1.05,
          }}>
            Book more roles.<br />Go Pro.
          </h1>
          <p style={{
            fontSize: 14, color: 'var(--aurora-sub)', marginTop: 10, lineHeight: 1.5,
          }}>
            AI coaching, unlimited rehearsals, and verified scene partners.
            <strong style={{ color: 'var(--aurora-text)' }}> Pro members convert callbacks 5× more often.</strong>
          </p>
        </div>

        {/* Before / After comparison */}
        <ComparisonRings />

        {/* Token balance pill */}
        {!loading && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14,
            padding: '6px 14px', borderRadius: 100,
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(159,230,180,0.4)',
            backdropFilter: 'blur(20px)',
          }}>
            <span style={{ fontSize: 14 }}>🎟️</span>
            <span className="aurora-mono" style={{ fontSize: 13, color: 'var(--aurora-mint)' }}>{tokenBalance}</span>
            <span style={{ fontSize: 12, color: 'var(--aurora-sub)' }}>tokens remaining</span>
          </div>
        )}

        {/* Billing toggle — Weekly (flagged) / Monthly / Yearly */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, padding: 4, marginBottom: 16,
          background: 'rgba(10,10,10,0.05)', borderRadius: 100,
        }}>
          {[...(WEEKLY_ENABLED ? ['weekly'] : []), 'monthly', 'yearly'].map((b) => {
            const on = billing === b;
            const label = { weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly · Save 2mo' }[b];
            return (
              <button key={b} onClick={() => setBilling(b)} style={{
                flex: 1, padding: '10px 14px', borderRadius: 100, border: 'none',
                cursor: 'pointer',
                fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600,
                background: on ? '#fff' : 'transparent',
                color: on ? 'var(--aurora-text)' : 'var(--aurora-sub)',
                boxShadow: on ? '0 2px 6px rgba(10,10,10,0.08)' : 'none',
                transition: 'all 0.2s',
              }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Plan cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          {PLANS.map((plan) => {
            // Prefer the real localized store price (already currency-symboled,
            // do NOT prepend '$'); fall back to the hardcoded web/Stripe number.
            const storePrice = storePrices[`${plan.id}_${billing}`];
            const price = plan[billing] ?? plan.monthly;
            const priceDisplay = storePrice || `$${price}`;
            const isActive = currentPlan === plan.id;
            const planIsCurrent = isActive && status?.status === 'active';
            const selected = selectedPlan === plan.id;
            const planIntro = introOffers[`${plan.id}_${billing}`];
            const planIntroLabel = introOfferLabel(planIntro);

            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  padding: '16px 18px', borderRadius: 22, position: 'relative',
                  background: selected
                    ? 'linear-gradient(160deg, #FFFFFF, #FBF6E9)'
                    : 'rgba(255,255,255,0.7)',
                  border: selected
                    ? '2px solid var(--aurora-heritage-gold)'
                    : '1.5px solid var(--aurora-line)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: selected
                    ? '0 12px 30px rgba(212,168,95,0.20), inset 0 1px 0 rgba(255,255,255,0.7)'
                    : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {plan.popular && (
                  <div style={{
                    position: 'absolute', top: -10, right: 14,
                    padding: '3px 10px', borderRadius: 100,
                    background: 'linear-gradient(135deg, var(--aurora-heritage-gold), var(--aurora-accent-deep))',
                    color: '#fff', fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                  }}>POPULAR</div>
                )}
                {planIsCurrent && (
                  <div style={{
                    position: 'absolute', top: -10, left: 14,
                    padding: '3px 10px', borderRadius: 100,
                    background: 'var(--aurora-mint)', color: '#0E0D0A',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                  }}>CURRENT</div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Radio dot */}
                  <div style={{
                    width: 22, height: 22, borderRadius: 100, flexShrink: 0,
                    border: `2px solid ${selected ? 'var(--aurora-heritage-gold)' : 'var(--aurora-line)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: 2,
                  }}>
                    {selected && <div style={{
                      width: 10, height: 10, borderRadius: 100, background: 'var(--aurora-heritage-gold)',
                    }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                      <div className="aurora-display" style={{
                        fontSize: 18, color: 'var(--aurora-text)',
                      }}>{plan.name}</div>
                      {/* Apple 3.1.2(c): bill amount must dominate. Bumped to
                          22px / 700 so it visually outweighs the trial pill below. */}
                      <div style={{ textAlign: 'right' }}>
                        <span className="aurora-mono" style={{ fontSize: 22, color: 'var(--aurora-text)', fontWeight: 700, letterSpacing: '-0.4px' }}>{priceDisplay}</span>
                        <span style={{ fontSize: 12, color: 'var(--aurora-sub)' }}>/{{ weekly: 'wk', monthly: 'mo', yearly: 'yr' }[billing]}</span>
                      </div>
                    </div>
                    <div style={{
                      fontSize: 12, color: 'var(--aurora-sub)', marginTop: 4, lineHeight: 1.4,
                    }}>
                      {plan.unlimited ? (
                        <><span style={{ fontWeight: 600, color: 'var(--aurora-mint)' }}>Unlimited</span> AI · every feature included</>
                      ) : (
                        <><span style={{ fontWeight: 600, color: 'var(--aurora-mint)' }}>{plan.tokens}</span> AI tokens · {plan.rollover ? 'rollover' : 'no rollover'}</>
                      )}
                    </div>
                    {planIntroLabel && !hasActivePlan && (
                      <div style={{
                        display: 'inline-block', marginTop: 8,
                        padding: '4px 10px', borderRadius: 100,
                        background: 'color-mix(in oklch, var(--aurora-heritage-gold) 22%, transparent)',
                        color: 'var(--aurora-accent-deep)',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
                      }}>
                        {planIntroLabel.toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Inline CTA — sits in the document flow, no position:fixed.
            The earlier floating button hit iOS WKWebView stacking-context
            bugs where the top bar / tab bar rendered above its tap area. */}
        <div style={{ marginBottom: 22 }}>
          {isCurrent ? (
            <button
              type="button"
              onClick={handleManage}
              onTouchEnd={(e) => { e.preventDefault(); handleManage(); }}
              style={{
                width: '100%', padding: '18px', borderRadius: 100, cursor: 'pointer',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                border: '2px solid var(--aurora-heritage-gold)',
                background: 'transparent',
                fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600,
                color: 'var(--aurora-accent-deep)',
              }}
            >
              Manage Plan
              {isNativeStore() && (
                <span style={{ display: 'block', fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                  {isNativeIOS() ? 'Opens Apple Settings · Subscriptions' : 'Opens Google Play · Subscriptions'}
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => !checkoutLoading && handleSubscribe(selectedPlan)}
              onTouchEnd={(e) => {
                e.preventDefault();
                if (!checkoutLoading) handleSubscribe(selectedPlan);
              }}
              disabled={!!checkoutLoading || !selectedPlan}
              style={{
                width: '100%', padding: '18px 16px', borderRadius: 100, border: 'none',
                cursor: checkoutLoading ? 'wait' : 'pointer',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                position: 'relative', overflow: 'hidden',
                background: 'linear-gradient(135deg, #0E0D0A 0%, #1F1B12 100%)',
                color: '#FFFFFF',
                fontFamily: "'Space Grotesk', sans-serif",
                boxShadow: '0 12px 30px rgba(10,10,10,0.30), inset 0 1px 0 rgba(255,255,255,0.08)',
                opacity: checkoutLoading ? 0.7 : 1,
              }}
            >
              {checkoutLoading === selectedPlan ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: '2px solid currentColor', borderTopColor: 'transparent',
                    animation: 'drst-spin 0.7s linear infinite',
                  }} />
                  Opening checkout…
                </span>
              ) : (
                <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3, lineHeight: 1.15 }}>
                  {selIntro?.isFreeTrial && !hasActivePlan && (
                    <span style={{
                      fontSize: 10, fontWeight: 500, letterSpacing: '0.14em',
                      textTransform: 'uppercase', opacity: 0.78,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}>
                      {selIntroLabel} then
                    </span>
                  )}
                  <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.2px' }}>
                    {hasActivePlan ? 'Switch' : 'Subscribe'} · {ctaPriceDisplay}/{ctaPeriod} →
                  </span>
                </span>
              )}
            </button>
          )}
        </div>

        {/* Feature ticks (Plus highlights) */}
        <div style={{ marginBottom: 16 }}>
          <span className="aurora-eyebrow" style={{ display: 'block', marginBottom: 10 }}>
            EVERY PLAN INCLUDES
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              'Unlimited audition tracking',
              'AI scene coaching feedback',
              'Find a Reader matching + Green Room chat',
              'Jericho weekly craft readout',
            ].map((feat) => (
              <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 100, flexShrink: 0,
                  background: 'color-mix(in oklch, var(--aurora-mint) 22%, transparent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'color-mix(in oklch, var(--aurora-mint) 80%, var(--aurora-text))',
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5 9-11" />
                  </svg>
                </span>
                <span style={{ fontSize: 14, color: 'var(--aurora-text)' }}>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* "No payment now" microcopy */}
        {selIntro?.isFreeTrial && (
          <div style={{
            textAlign: 'center', fontSize: 12, color: 'var(--aurora-sub)',
            marginBottom: 14, lineHeight: 1.5,
          }}>
            <strong style={{ color: 'var(--aurora-accent-deep)' }}>No payment now.</strong>
            {' '}You'll be reminded before your trial ends.
          </div>
        )}

        {/* Legal — full Apple-mandated disclosure block.
            Auto-renewal language + cancellation location + refund pointer
            are all required for App Store review under guideline 3.1.2. */}
        <p style={{
          textAlign: 'center', fontSize: 11, lineHeight: 1.55,
          color: 'var(--aurora-sub)', marginBottom: 8, maxWidth: 460,
          marginLeft: 'auto', marginRight: 'auto',
        }}>
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
        <p style={{
          textAlign: 'center', fontSize: 11, color: 'var(--aurora-sub)',
          marginBottom: 14,
        }}>
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
