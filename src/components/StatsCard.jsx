import { Card, CardContent } from './ui/card.jsx'

export default function StatsCard({ title, value, change, positive = true }) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{title}</p>
        <div className="flex items-baseline gap-2 mt-2">
          <p className="text-2xl font-bold text-[#7A5A18]">{value}</p>
          <span className={`text-sm font-medium ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
            {change}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
