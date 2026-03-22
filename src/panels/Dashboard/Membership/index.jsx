import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMembershipThunk } from '../../../redux/features/bookings/bookingsSlice';
import { useSnackbar } from '../../../hooks/useSnackbar';

const plans = [
  {
    id: 'beginner',
    name: 'Beginner',
    price: 250,
    features: [
      '2 studio sessions per month',
      'Basic lighting setup',
      'Email support',
      'Script review (1 per month)',
      'Standard turnaround',
    ],
    popular: false,
  },
  {
    id: 'podcaster',
    name: 'Podcaster',
    price: 450,
    features: [
      '5 studio sessions per month',
      'Premium lighting & sound',
      'Priority support',
      'Script review (3 per month)',
      'Same-day turnaround',
      'Zoom callback room access',
      'Professional reader included',
    ],
    popular: true,
  },
  {
    id: 'influencer',
    name: 'Influencer Creator',
    price: 600,
    features: [
      'Unlimited studio sessions',
      'Premium lighting, sound & teleprompter',
      '24/7 VIP support',
      'Unlimited script reviews',
      'Rush turnaround',
      'Zoom callback room access',
      'Professional reader included',
      'Dedicated coaching sessions',
      'Priority booking',
    ],
    popular: false,
  },
];

export default function Membership() {
  const dispatch = useDispatch();
  const { toast } = useSnackbar();
  const { membership, membershipLoading } = useSelector((state) => state.bookings);

  useEffect(() => {
    dispatch(fetchMembershipThunk());
  }, [dispatch]);

  const currentPlan = membership?.plan || membership?.plan_name?.toLowerCase() || 'podcaster';
  const sessionsUsed = membership?.sessions_used ?? membership?.used ?? 3;
  const sessionsTotal = membership?.sessions_total ?? membership?.total ?? 5;
  const planDisplayName = membership?.plan_name || plans.find((p) => p.id === currentPlan)?.name || 'Podcaster';
  const monthlyPrice = membership?.price || plans.find((p) => p.id === currentPlan)?.price || 450;
  const renewalDate = membership?.renewal_date || 'Apr 1, 2026';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Membership</h2>
        <p className="text-gray-500 text-sm mt-1">Manage your plan and track usage</p>
      </div>

      {/* Current Plan Card */}
      <div className="bg-gradient-to-r from-[#0a0a0f] to-[#1a1a2e] rounded-2xl p-6 sm:p-8 text-white mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#ff6b35]/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          {membershipLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-white/20 rounded w-24" />
              <div className="h-8 bg-white/20 rounded w-48" />
              <div className="h-4 bg-white/20 rounded w-36" />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Current Plan</p>
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold">{planDisplayName}</h3>
                  <span className="bg-[#ffd700]/20 text-[#ffd700] text-xs font-semibold px-3 py-1 rounded-full">
                    Active
                  </span>
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  ${monthlyPrice}/month &middot; Renews {renewalDate}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 min-w-[200px]">
                <p className="text-sm text-gray-300 mb-2">Sessions this month</p>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-3xl font-bold">{sessionsUsed}</span>
                  <span className="text-gray-400 text-sm mb-1">/ {sessionsTotal}</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-[#ff6b35] to-[#ffd700] h-2 rounded-full transition-all"
                    style={{ width: `${sessionsTotal > 0 ? (sessionsUsed / sessionsTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Plan Comparison */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Compare Plans</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl border-2 p-6 transition-all ${
                plan.popular
                  ? 'border-[#ff6b35] shadow-lg shadow-[#ff6b35]/10'
                  : 'border-gray-100 shadow-sm'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#ff6b35] text-white text-xs font-semibold px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6 pt-2">
                <h4 className="text-lg font-bold text-gray-900">{plan.name}</h4>
                <div className="mt-3">
                  <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-500 text-sm">/month</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-[#ff6b35] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => !isCurrent && toast.info('Stripe payments coming soon! Contact us at studio@drselftape.com to sign up.')}
                className={`w-full py-3 rounded-lg font-semibold text-sm transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-gray-100 text-gray-500 cursor-default'
                    : plan.popular
                    ? 'bg-[#ff6b35] hover:bg-[#e55a2b] text-white'
                    : 'bg-gray-900 hover:bg-gray-800 text-white'
                }`}
                disabled={isCurrent}
              >
                {isCurrent ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
