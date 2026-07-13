import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Flame, Trophy, Check, ChevronRight, Zap, RotateCcw } from 'lucide-react';
import axios from '../../redux/http';
import { baseURL } from '../../redux/constant';
import { showSnackbar } from '../../redux/features/snackbarSlice/snackbarSlice';

export default function DailyChallengeCard({ onNavigate }) {
  const dispatch = useDispatch();
  const [challenge, setChallenge] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [streak, setStreak] = useState({ current: 0, longest: 0, total_xp: 0 });
  const [completing, setCompleting] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    setLoadError(false);
    axios.get(`${baseURL}/v1/growth/challenge/today/`)
      .then(({ data }) => {
        const d = data?.data || {};
        setChallenge(d.challenge);
        setCompleted(d.completed);
        setStreak(d.streak || {});
      })
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleComplete = async () => {
    if (completing || completed) return;
    setCompleting(true);
    try {
      const { data } = await axios.post(`${baseURL}/v1/growth/challenge/complete/`);
      setCompleted(true);
      setJustCompleted(true);
      setStreak({
        current: data?.data?.streak || streak.current + 1,
        longest: Math.max(streak.longest, (data?.data?.streak || streak.current + 1)),
        total_xp: data?.data?.total_xp || streak.total_xp,
      });
      setTimeout(() => setJustCompleted(false), 3000);
    } catch (err) {
      dispatch(showSnackbar({
        message: err?.response?.data?.message || "Couldn't mark challenge complete. Please try again.",
        variant: 'error',
      }));
    }
    setCompleting(false);
  };

  if (!challenge) {
    // A failed fetch shouldn't make a key retention surface silently disappear —
    // offer a small retry. A successful-but-empty response still returns null.
    if (!loadError) return null;
    return (
      <div className="relative rounded-2xl overflow-hidden px-5 py-4 flex items-center justify-between gap-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <Flame size={16} className="text-[#7A5A18] flex-shrink-0" />
          <span className="text-sm font-medium text-[var(--text-secondary,#666)] truncate">Couldn&apos;t load today&apos;s challenge.</span>
        </div>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#7A5A18] flex-shrink-0"
        >
          <RotateCcw size={13} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{
      background: completed
        ? 'linear-gradient(135deg, rgba(34,197,94,0.08), var(--bg-card))'
        : 'linear-gradient(135deg, rgba(255, 130, 128,0.08), var(--bg-card))',
      border: completed ? '1px solid rgba(34,197,94,0.2)' : '1px solid var(--border-default)',
    }}>
      <div className="px-5 py-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{challenge.emoji}</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#7A5A18]">Daily Challenge</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Streak */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
              <Flame className="w-3.5 h-3.5 text-[#FCE072]" />
              <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{streak.current}</span>
            </div>
            {/* XP */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
              <Zap className="w-3.5 h-3.5 text-[#A7ECDA]" />
              <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{streak.total_xp}</span>
            </div>
          </div>
        </div>

        {/* Challenge content */}
        <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          {challenge.title}
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          {challenge.description}
        </p>

        {/* Action */}
        {completed ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check className="w-4 h-4 text-[#0A0A0A]" strokeWidth={3} />
            </div>
            <span className="text-sm font-semibold text-emerald-400">
              {justCompleted ? `+${challenge.xp_reward} XP earned!` : 'Completed today!'}
            </span>
          </div>
        ) : (
          <button
            onClick={handleComplete}
            disabled={completing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4A85F] hover:bg-[#C09850] text-[#0A0A0A] text-sm font-bold transition-all disabled:opacity-50"
          >
            {completing ? 'Completing...' : `Complete (+${challenge.xp_reward} XP)`}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* XP animation on complete */}
      {justCompleted && (
        <div className="absolute top-2 right-4 text-emerald-400 text-sm font-bold animate-bounce">
          +{challenge.xp_reward} XP
        </div>
      )}
    </div>
  );
}
