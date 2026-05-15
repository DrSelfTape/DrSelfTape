import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import axiosInstance from '../../../redux/http';
import { showSnackbar } from '../../../redux/features/snackbarSlice/snackbarSlice';
import { isNativeIOS, purchase as iapPurchase, restorePurchases, manageSubscriptions } from '../../../utils/purchases';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    tokens: 10,
    monthly: 9.99,
    yearly: 99.99,
    yearlySaving: '2 months free',
    color: '#A7ECDA',
    features: [
      '10 AI tokens per month',
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
    monthly: 14.99,
    yearly: 149.99,
    yearlySaving: '2 months free',
    color: '#FF8280',
    popular: true,
    features: [
      '20 AI tokens per month',
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
    monthly: 24.99,
    yearly: 249.99,
    yearlySaving: '2 months free',
    color: '#FCE072',
    features: [
      '50 AI tokens per month',
      'Rollover unused tokens',
      'Everything in Plus',
      'Early access to new features',
      'Dedicated actor profile badge',
    ],
    rollover: true,
  },
];

export default function Membership() {
  const dispatch = useDispatch();
  const [billing, setBilling] = useState('monthly');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  useEffect(() => {
    axiosInstance.get('/v1/subscriptions/status/')
      .then(res => setStatus(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Handle the redirect query params Stripe Checkout adds. Webhooks
    // are the source of truth; we just refetch status and surface a
    // toast so the user gets immediate feedback.
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscribed') === 'true') {
      dispatch(showSnackbar({
        message: 'Subscription activated. Welcome aboard!',
        variant: 'success',
      }));
      // Webhook usually lands within ~1s; refetch after a short delay.
      setTimeout(() => {
        axiosInstance.get('/v1/subscriptions/status/').then(res => setStatus(res.data.data));
      }, 1500);
      // Drop the params so a refresh doesn't re-fire the toast.
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('canceled') === 'true') {
      dispatch(showSnackbar({
        message: 'Checkout canceled — no changes to your subscription.',
        variant: 'info',
      }));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [dispatch]);

  const handleSubscribe = async (planId) => {
    setCheckoutLoading(planId);

    // iOS: route through Apple IAP via RevenueCat. App Store guideline
    // 3.1.1 forbids using Stripe for in-app digital goods on iOS.
    if (isNativeIOS()) {
      const result = await iapPurchase(planId, billing);
      setCheckoutLoading(null);

      if (result.userCancelled) return; // Silent — Apple already showed UI.

      if (!result.ok) {
        const msg = result.reason === 'no_package'
          ? 'This plan isn\'t available in the App Store right now. Please try again later.'
          : 'Purchase failed. Please try again.';
        dispatch(showSnackbar({ message: msg, variant: 'error' }));
        return;
      }

      // Success — RevenueCat's webhook will update UserSubscription on
      // the backend. Refetch status after a short delay so the UI shows
      // the new plan.
      dispatch(showSnackbar({ message: 'Subscription activated. Welcome aboard!', variant: 'success' }));
      setTimeout(() => {
        axiosInstance.get('/v1/subscriptions/status/').then((res) => setStatus(res.data.data));
      }, 2000);
      return;
    }

    // Web: existing Stripe Checkout flow.
    try {
      const res = await axiosInstance.post('/v1/subscriptions/checkout/', {
        plan: planId,
        billing,
      });
      window.location.href = res.data.data.checkout_url;
    } catch (err) {
      const message = err?.response?.data?.error || 'Something went wrong starting checkout. Please try again.';
      dispatch(showSnackbar({ message, variant: 'error' }));
      setCheckoutLoading(null);
    }
  };

  const handleManage = async () => {
    // iOS: open Apple's native Settings → Subscriptions UI. Required by
    // App Store guidelines — third-party billing portals aren't allowed.
    if (isNativeIOS()) {
      await manageSubscriptions();
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

  // Apple requires a user-visible "Restore Purchases" control. Surfaces
  // any prior IAP receipts, useful when a user reinstalls or signs in
  // on a new device. No-op on web.
  const handleRestore = async () => {
    if (!isNativeIOS()) return;
    const result = await restorePurchases();
    if (result.ok) {
      dispatch(showSnackbar({ message: 'Purchases restored.', variant: 'success' }));
      setTimeout(() => {
        axiosInstance.get('/v1/subscriptions/status/').then((res) => setStatus(res.data.data));
      }, 1500);
    } else {
      dispatch(showSnackbar({ message: 'No purchases to restore.', variant: 'info' }));
    }
  };

  const currentPlan = status?.plan;
  const tokenBalance = status?.balance ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-[#0A0A0A] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          Choose Your Plan
        </h1>
        <p className="text-[rgba(10,10,10,0.5)] text-sm">
          One token = one AI session. No surprises.
        </p>

        {/* Token balance badge */}
        {!loading && (
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-[#F4F4EE] border border-[rgba(167,236,218,0.15)] text-sm">
            <span className="text-[#A7ECDA] font-bold">{tokenBalance}</span>
            <span className="text-[rgba(10,10,10,0.5)]">tokens remaining</span>
          </div>
        )}
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <button
          onClick={() => setBilling('monthly')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
            billing === 'monthly'
              ? 'bg-[#D4A85F] text-[#0A0A0A]'
              : 'bg-[#F4F4EE] text-[rgba(10,10,10,0.5)] border border-[rgba(167,236,218,0.1)]'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling('yearly')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
            billing === 'yearly'
              ? 'bg-[#D4A85F] text-[#0A0A0A]'
              : 'bg-[#F4F4EE] text-[rgba(10,10,10,0.5)] border border-[rgba(167,236,218,0.1)]'
          }`}
        >
          Yearly
          <span className="ml-2 text-[10px] font-bold text-[#A7ECDA] uppercase tracking-wide">Save 2 months</span>
        </button>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {PLANS.map(plan => {
          const price = billing === 'monthly' ? plan.monthly : plan.yearly;
          const isActive = currentPlan === plan.id;
          const isCurrent = isActive && status?.status === 'active';

          return (
            <div
              key={plan.id}
              className="relative rounded-2xl p-6 flex flex-col"
              style={{
                background: plan.popular ? 'linear-gradient(145deg, #FFFFFF, #F4F4EE)' : '#FFFFFF',
                border: isCurrent
                  ? `2px solid ${plan.color}`
                  : plan.popular
                  ? `1px solid rgba(212,168,95,0.4)`
                  : '1px solid rgba(10,10,10,0.06)',
                boxShadow: plan.popular
                  ? '0 12px 30px rgba(212,168,95,0.18), 0 1px 2px rgba(10,10,10,0.04)'
                  : '0 1px 2px rgba(10,10,10,0.04), 0 8px 24px rgba(10,10,10,0.05)',
              }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #D4A85F, #7A5A18)', boxShadow: '0 6px 14px rgba(212,168,95,0.30)' }}>
                  Most Popular
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 right-4 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: plan.color, color: '#080a0f' }}>
                  Current Plan
                </div>
              )}

              {/* Plan name + price */}
              <div className="mb-5">
                <h2 className="text-xl font-bold text-[#0A0A0A] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>{plan.name}</h2>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-[#0A0A0A]">${price}</span>
                  <span className="text-[rgba(10,10,10,0.5)] text-sm">/{billing === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                {billing === 'yearly' && (
                  <p className="text-xs mt-1" style={{ color: plan.color }}>Save ${((plan.monthly * 12) - plan.yearly).toFixed(2)}/year</p>
                )}
              </div>

              {/* Token highlight */}
              <div className="flex items-center gap-2 mb-5 px-3 py-2.5 rounded-xl"
                style={{ background: `${plan.color}12`, border: `1px solid ${plan.color}25` }}>
                <span className="text-2xl font-bold" style={{ color: plan.color }}>{plan.tokens}</span>
                <div>
                  <p className="text-[#0A0A0A] text-xs font-semibold">tokens / month</p>
                  {plan.rollover && <p className="text-[10px]" style={{ color: plan.color }}>+ rollover up to 2 months</p>}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[rgba(10,10,10,0.5)]">
                    <span className="mt-0.5 text-xs" style={{ color: plan.color }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <button
                  onClick={handleManage}
                  className="w-full py-3 rounded-xl text-sm font-semibold border transition-all"
                  style={{ borderColor: plan.color, color: plan.color }}
                >
                  Manage Plan
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={!!checkoutLoading}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  style={{
                    background: plan.popular
                      ? 'linear-gradient(135deg, #D4A85F, #7A5A18)'
                      : `${plan.color}1A`,
                    color: plan.popular ? 'white' : plan.color,
                    border: plan.popular ? 'none' : `1px solid ${plan.color}40`,
                    boxShadow: plan.popular ? '0 8px 22px rgba(212,168,95,0.30)' : 'none',
                  }}
                >
                  {checkoutLoading === plan.id ? 'Loading...' : `Get ${plan.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Rollover disclaimer */}
      <p className="text-center text-xs text-[#4a5a56]">
        Rollover credits accumulate up to a maximum of 2 months' worth of unused tokens. Billed in USD.
      </p>

      {/* iOS-only "Restore Purchases" — required by App Store guidelines. */}
      {isNativeIOS() && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleRestore}
            className="text-xs font-medium text-[rgba(10,10,10,0.62)] underline hover:text-[#0A0A0A]"
          >
            Restore Purchases
          </button>
        </div>
      )}
    </div>
  );
}
