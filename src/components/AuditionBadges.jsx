/**
 * AuditionBadges — milestone achievement badges for actors
 * Computed from real audition stats. Shows earned + locked badges.
 */

const BADGES = [
  {
    id: 'first_audition',
    name: 'First Take',
    desc: 'Logged your first audition',
    emoji: '🎬',
    color: 'from-orange-400 to-orange-600',
    check: (s) => (s.total || 0) >= 1,
  },
  {
    id: 'five_auditions',
    name: 'Getting Warm',
    desc: '5 auditions logged',
    emoji: '🔥',
    color: 'from-yellow-400 to-orange-500',
    check: (s) => (s.total || 0) >= 5,
  },
  {
    id: 'ten_auditions',
    name: 'In The Room',
    desc: '10 auditions logged',
    emoji: '🎭',
    color: 'from-purple-400 to-purple-600',
    check: (s) => (s.total || 0) >= 10,
  },
  {
    id: 'twentyfive_auditions',
    name: 'Working Actor',
    desc: '25 auditions logged',
    emoji: '⭐',
    color: 'from-blue-400 to-blue-600',
    check: (s) => (s.total || 0) >= 25,
  },
  {
    id: 'fifty_auditions',
    name: 'Grinder',
    desc: '50 auditions logged',
    emoji: '💎',
    color: 'from-cyan-400 to-blue-500',
    check: (s) => (s.total || 0) >= 50,
  },
  {
    id: 'first_callback',
    name: 'They Called Back',
    desc: 'Got your first callback',
    emoji: '📞',
    color: 'from-green-400 to-green-600',
    check: (s) => (s.callbacks || s.total_callbacks || 0) >= 1,
  },
  {
    id: 'five_callbacks',
    name: 'Fan Favorite',
    desc: '5 callbacks earned',
    emoji: '🏆',
    color: 'from-yellow-400 to-yellow-600',
    check: (s) => (s.callbacks || s.total_callbacks || 0) >= 5,
  },
  {
    id: 'first_booking',
    name: 'Booked!',
    desc: 'Landed your first role',
    emoji: '🎉',
    color: 'from-pink-400 to-rose-600',
    check: (s) => (s.booked || s.total_booked || 0) >= 1,
  },
  {
    id: 'five_bookings',
    name: 'Series Regular',
    desc: '5 roles booked',
    emoji: '👑',
    color: 'from-amber-400 to-yellow-500',
    check: (s) => (s.booked || s.total_booked || 0) >= 5,
  },
  {
    id: 'hot_streak',
    name: 'Hot Streak',
    desc: 'Callback rate above 20%',
    emoji: '🚀',
    color: 'from-red-400 to-orange-500',
    check: (s) => (s.callback_rate || 0) >= 20,
  },
  {
    id: 'film_specialist',
    name: 'Film Actor',
    desc: '5+ film/TV auditions',
    emoji: '🎥',
    color: 'from-slate-400 to-slate-600',
    check: (s) => (s.by_type?.film || 0) >= 5,
  },
  {
    id: 'voice_actor',
    name: 'Voice Actor',
    desc: '3+ voice over auditions',
    emoji: '🎙️',
    color: 'from-indigo-400 to-indigo-600',
    check: (s) => (s.by_type?.voiceover || 0) >= 3,
  },
];

function Badge({ badge, earned }) {
  return (
    <div
      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
        earned
          ? 'border-transparent bg-gradient-to-br ' + badge.color + ' shadow-md'
          : 'border-gray-200 bg-gray-50 opacity-50 grayscale'
      }`}
      title={badge.desc}
    >
      <span className="text-2xl">{badge.emoji}</span>
      <span className={`text-[10px] font-bold text-center leading-tight ${earned ? 'text-white' : 'text-gray-500'}`}>
        {badge.name}
      </span>
      {earned && (
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow">
          <svg className="w-2.5 h-2.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </span>
      )}
    </div>
  );
}

export default function AuditionBadges({ stats, compact = false }) {
  if (!stats) return null;

  const earned = BADGES.filter((b) => b.check(stats));
  const locked = BADGES.filter((b) => !b.check(stats));

  if (compact) {
    // Compact mode — just show earned badges in a row (for dashboard)
    if (earned.length === 0) return null;
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {earned.map((b) => (
          <div
            key={b.id}
            title={`${b.name}: ${b.desc}`}
            className={`w-9 h-9 rounded-full bg-gradient-to-br ${b.color} flex items-center justify-center shadow-sm cursor-default`}
          >
            <span className="text-base">{b.emoji}</span>
          </div>
        ))}
        {locked.length > 0 && (
          <span className="text-xs text-gray-400">{locked.length} more to unlock</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {earned.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Earned — {earned.length}/{BADGES.length}
          </h4>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {earned.map((b) => <Badge key={b.id} badge={b} earned={true} />)}
          </div>
        </div>
      )}
      {locked.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Locked
          </h4>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {locked.map((b) => <Badge key={b.id} badge={b} earned={false} />)}
          </div>
        </div>
      )}
    </div>
  );
}

export { BADGES };
