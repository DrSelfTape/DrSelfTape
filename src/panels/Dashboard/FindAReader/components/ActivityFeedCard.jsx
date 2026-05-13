import { Users2, HeartHandshake, Clapperboard } from 'lucide-react';

const ICONS = {
  available: { Icon: Users2, color: '#A7ECDA', bg: 'rgba(167,236,218,0.1)' },
  matches: { Icon: HeartHandshake, color: '#FF8280', bg: 'rgba(255, 130, 128,0.1)' },
  sessions: { Icon: Clapperboard, color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
};

export default function ActivityFeedCard({ type, count, label, pulse = false }) {
  const { Icon, color, bg } = ICONS[type] || ICONS.available;

  return (
    <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--bg-deep)', border: '1px solid var(--bg-surface)' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {pulse && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: color }} />
            </span>
          )}
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{count}</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      </div>
    </div>
  );
}
