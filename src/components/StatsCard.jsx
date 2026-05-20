import { Card, CardContent } from './ui/card.jsx'

const LOADING = '...';

export default function StatsCard({ title, value, change, positive = true }) {
  const isLoading = value === LOADING;
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{title}</p>
        <div className="flex items-baseline gap-2 mt-2">
          {isLoading ? (
            <span
              className="aurora-skeleton inline-block"
              style={{ width: 56, height: 28, fontSize: 24 }}
              aria-label="Loading"
            >
              {/* width preserves layout; aurora-skeleton hides the text */}
              000
            </span>
          ) : (
            <p className="text-2xl font-bold text-[#7A5A18]">{value}</p>
          )}
          <span className={`text-sm font-medium ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
            {change}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
