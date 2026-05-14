import { TrendingUp, TrendingDown } from 'lucide-react';

export default function AdminStatCard({ icon: Icon, label, value, trend, trendLabel }) {
  const isPositive = trend >= 0;

  return (
    <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 flex items-start gap-4">
      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#D4A85F]/10 flex items-center justify-center">
        {Icon && <Icon className="w-6 h-6 text-[#7A5A18]" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#666666] font-medium truncate">{label}</p>
        <p className="text-3xl font-bold text-[#7A5A18] mt-1">{value ?? '—'}</p>
        {trend !== undefined && trend !== null && (
          <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{isPositive ? '+' : ''}{trend}%</span>
            {trendLabel && <span className="text-[#666666] font-normal ml-1">{trendLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
