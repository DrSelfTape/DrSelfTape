import { TrendingUp, TrendingDown } from 'lucide-react';

export default function AdminStatCard({ icon: Icon, label, value, trend, trendLabel }) {
  const isPositive = trend >= 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-start gap-4">
      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#FF8280]/10 flex items-center justify-center">
        {Icon && <Icon className="w-6 h-6 text-[#FF8280]" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
        {trend !== undefined && trend !== null && (
          <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{isPositive ? '+' : ''}{trend}%</span>
            {trendLabel && <span className="text-gray-400 font-normal ml-1">{trendLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
