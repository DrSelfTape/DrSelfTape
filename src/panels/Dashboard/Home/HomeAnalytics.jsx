import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';

/**
 * Home's audition analytics charts — split out and React.lazy'd from Home so
 * recharts (~325KB) only loads when the actor expands the (default-collapsed)
 * Analytics section, instead of riding every authenticated Home render.
 */
export default function HomeAnalytics({ typeData = [], funnelData = [] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* Audition Breakdown by Type — Donut */}
      <div className="lg:col-span-1">
        <Card className="aurora-card" style={{ background: 'var(--aurora-surface-solid)', borderColor: 'var(--aurora-line)' }}>
          <CardHeader>
            <CardTitle className="aurora-display text-base" style={{ color: 'var(--aurora-text)' }}>By Type</CardTitle>
          </CardHeader>
          <CardContent>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {typeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                  <Legend verticalAlign="bottom" iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs" style={{ color: 'var(--aurora-sub)' }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-center py-12" style={{ color: 'var(--aurora-dim)' }}>No audition data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Funnel */}
      <div className="lg:col-span-2">
        <Card className="aurora-card" style={{ background: 'var(--aurora-surface-solid)', borderColor: 'var(--aurora-line)' }}>
          <CardHeader>
            <CardTitle className="aurora-display text-base" style={{ color: 'var(--aurora-text)' }}>Audition Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={funnelData} layout="vertical" barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--aurora-line)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--aurora-dim)', fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: 'var(--aurora-sub)', fontWeight: 500 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip formatter={(value) => [value, 'Auditions']} contentStyle={{ borderRadius: '14px', border: '1px solid var(--aurora-line)', backgroundColor: 'var(--aurora-surface-solid)', color: 'var(--aurora-text)', boxShadow: 'var(--aurora-shadow-card)' }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {funnelData.map((_, i) => <Cell key={i} fill={`color-mix(in oklch, var(--aurora-heritage-gold) ${100 - i * 18}%, var(--aurora-bg))`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
