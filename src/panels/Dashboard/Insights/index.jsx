import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { fetchReportsThunk, fetchAIInsightThunk } from '../../../redux/features/reports/reportsSlice';

const TYPE_LABELS = {
  film: 'Film/TV',
  commercial: 'Commercial',
  theatrical: 'Theatrical',
  industrial: 'Industrial',
  theater: 'Theater',
  voiceover: 'Voice Over',
};

const LoadingSkeleton = ({ className = 'h-28' }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

function ProgressRing({ value, max = 100, size = 120, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / max) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#ff6b35"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
    </svg>
  );
}

export default function Insights() {
  const dispatch = useDispatch();
  const { data, loading, aiInsight, aiInsightLoading } = useSelector((state) => state.reports);

  useEffect(() => {
    dispatch(fetchReportsThunk());
  }, [dispatch]);

  // Fetch AI insight once report data is available
  useEffect(() => {
    if (!data || !data.total_auditions) return;
    const typeEntries = Object.entries(data.type_breakdown || {});
    const top = typeEntries.length > 0 ? typeEntries.sort((a, b) => b[1] - a[1])[0][0] : 'general';
    const prompt = `Actor career stats: ${data.total_auditions} auditions, ${data.callback_rate || 0}% callback rate, ${data.booking_rate || 0}% booking rate, strongest category: ${top}. Give 2-3 sentences of honest, specific career coaching advice.`;
    dispatch(fetchAIInsightThunk(prompt));
  }, [dispatch, data]);

  const r = data || {};
  const hasData = r.total_auditions > 0;

  // Determine strongest type by highest count
  const typeEntries = Object.entries(r.type_breakdown || {});
  const strongestType = typeEntries.length > 0
    ? typeEntries.sort((a, b) => b[1] - a[1])[0]
    : null;

  // Mock momentum score (based on recent activity)
  const momentumScore = hasData ? Math.min(Math.round((r.booking_rate || 0) * 3 + (r.callback_rate || 0) * 1.5 + Math.min(r.total_auditions || 0, 20) * 1.5), 100) : 0;

  // Mock timeline milestones
  const milestones = [
    { label: 'First Audition Logged', done: hasData },
    { label: 'First Callback', done: (r.callback_rate || 0) > 0 },
    { label: 'First Booking', done: (r.total_booked || 0) > 0 },
    { label: '10 Auditions Tracked', done: (r.total_auditions || 0) >= 10 },
    { label: '25 Auditions Tracked', done: (r.total_auditions || 0) >= 25 },
  ];

  if (!loading && !hasData) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Career Insights</h1>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-5xl mb-4">💡</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No insights yet</h2>
          <p className="text-gray-500 max-w-md">
            Start tracking auditions to see your career insights here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Career Insights</h1>
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
          Powered by AI
        </span>
      </div>

      {/* AI Career Summary */}
      {loading ? (
        <LoadingSkeleton className="h-40" />
      ) : (
        <Card className="border-l-4 border-l-[#ff6b35]">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Based on your activity, here's what we see...</h3>
            {aiInsightLoading ? (
              <div className="flex items-center gap-3 text-gray-400">
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
                <span className="text-sm">Generating AI insight...</span>
              </div>
            ) : aiInsight ? (
              <p className="text-gray-600 leading-relaxed">{aiInsight}</p>
            ) : (
              <p className="text-gray-600 leading-relaxed">
                You've submitted <span className="font-semibold text-gray-900">{r.total_submissions || 0}</span> tapes —{' '}
                {(r.total_submissions || 0) >= 15 ? "that's above average for working actors" : 'keep building that momentum'}.
                Your callback rate is <span className="font-semibold text-gray-900">{r.callback_rate || 0}%</span>,
                which is {(r.callback_rate || 0) >= 20 ? 'strong' : 'building'}.
                {strongestType && (
                  <> Consider focusing more on <span className="font-semibold text-gray-900">{TYPE_LABELS[strongestType[0]] || strongestType[0]}</span> auditions where your activity is highest.</>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Insight Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LoadingSkeleton className="h-48" />
          <LoadingSkeleton className="h-48" />
          <LoadingSkeleton className="h-48" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Strongest Type */}
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm font-medium text-gray-500 mb-3">Your Strongest Type</p>
              {strongestType ? (
                <>
                  <div className="text-3xl font-bold text-[#ff6b35] mb-1">
                    {TYPE_LABELS[strongestType[0]] || strongestType[0]}
                  </div>
                  <p className="text-sm text-gray-500">{strongestType[1]} auditions logged</p>
                </>
              ) : (
                <p className="text-sm text-gray-400">Not enough data</p>
              )}
            </CardContent>
          </Card>

          {/* Momentum Score */}
          <Card>
            <CardContent className="p-6 flex flex-col items-center">
              <p className="text-sm font-medium text-gray-500 mb-3">Momentum Score</p>
              <div className="relative">
                <ProgressRing value={momentumScore} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{momentumScore}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">out of 100</p>
            </CardContent>
          </Card>

          {/* Consistency Streak */}
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm font-medium text-gray-500 mb-3">Consistency Streak</p>
              <div className="text-3xl font-bold text-emerald-500 mb-1">
                {hasData ? '4 weeks' : '—'}
              </div>
              <p className="text-sm text-gray-500">
                {hasData ? "You've logged auditions 4 weeks in a row" : 'Start logging to build a streak'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommendations */}
      {loading ? (
        <LoadingSkeleton className="h-48" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  icon: '🎯',
                  text: strongestType
                    ? `Your ${TYPE_LABELS[strongestType[0]] || strongestType[0]} submissions have the highest activity — book a CD Sim session to sharpen those.`
                    : 'Start logging auditions by type to discover where you perform best.',
                },
                {
                  icon: '🔥',
                  text: "You haven't logged a self-tape session in 7 days — keep the momentum going.",
                },
                {
                  icon: '📋',
                  text: '3 of your submissions are past their follow-up date.',
                },
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <span className="text-lg">{tip.icon}</span>
                  <p className="text-sm text-gray-700">{tip.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Career Timeline */}
      {loading ? (
        <LoadingSkeleton className="h-64" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Career Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative pl-8">
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />
              {milestones.map((m, i) => (
                <div key={i} className="relative flex items-center gap-4 pb-6 last:pb-0">
                  <div
                    className={`absolute left-[-20px] w-4 h-4 rounded-full border-2 ${
                      m.done
                        ? 'bg-[#ff6b35] border-[#ff6b35]'
                        : 'bg-white border-gray-300'
                    }`}
                  />
                  <span className={`text-sm ${m.done ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                    {m.label}
                  </span>
                  {m.done && (
                    <span className="text-xs text-emerald-600 font-medium">✓ Achieved</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
