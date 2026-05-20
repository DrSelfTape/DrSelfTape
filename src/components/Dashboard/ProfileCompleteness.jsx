import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

/**
 * Profile completeness card. Lists missing fields with a tap-to-fix
 * chip for each, and a thin progress bar. Hides itself when complete.
 *
 * Pulls from `state.profile.profile` — falls back to `state.auth.user`
 * for top-level fields like first_name/last_name.
 */
const FIELDS = [
  { key: 'headshot', label: 'Headshot', section: 'photo' },
  { key: 'bio', label: 'Bio', section: 'about' },
  { key: 'union', label: 'Union status', section: 'about' },
  { key: 'based_in', label: 'Location', section: 'about' },
  { key: 'years_experience', label: 'Years of experience', section: 'about' },
  { key: 'genres', label: 'Genres', section: 'about' },
];

function isFilled(value) {
  if (value == null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

const ProfileCompleteness = ({ onTapMissing }) => {
  const profile = useSelector((s) => s.profile?.profile);
  const user = useSelector((s) => s.auth?.user);
  const navigate = useNavigate();

  const actor = profile?.actor_profile;

  const { missing, percent } = useMemo(() => {
    const missing = FIELDS.filter((f) => {
      // Headshot may live on user.user_image OR actor_profile.headshot
      if (f.key === 'headshot') {
        return !isFilled(actor?.headshot) && !isFilled(user?.user_image);
      }
      return !isFilled(actor?.[f.key]);
    });
    const done = FIELDS.length - missing.length;
    return { missing, percent: Math.round((done / FIELDS.length) * 100) };
  }, [actor, user]);

  if (missing.length === 0) return null;

  const handleChip = (field) => {
    if (onTapMissing) {
      onTapMissing(field);
      return;
    }
    // Default: route to the profile screen. Section anchor is best-effort.
    navigate(`/dashboard/profile#${field.section}`);
  };

  return (
    <div
      className="rounded-2xl p-4 mb-4"
      style={{
        background: 'var(--aurora-surface, rgba(255,255,255,0.9))',
        border: '1px solid var(--aurora-line, rgba(10,10,10,0.08))',
      }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <span
          className="aurora-eyebrow"
          style={{ color: 'var(--aurora-dim)' }}
        >
          Profile · {percent}% complete
        </span>
        <span
          className="aurora-mono text-[11px]"
          style={{ color: 'var(--aurora-sub)' }}
        >
          {missing.length} left
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-1.5 rounded-full mb-3 overflow-hidden"
        style={{ background: 'var(--aurora-line, rgba(10,10,10,0.08))' }}
      >
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${percent}%`,
            background: 'linear-gradient(90deg, #D4A85F, #7A5A18)',
          }}
        />
      </div>

      {/* Missing fields as tappable chips */}
      <div className="flex flex-wrap gap-1.5">
        {missing.map((field) => (
          <button
            key={field.key}
            onClick={() => handleChip(field)}
            className="rounded-full px-3 py-1 text-[12px] font-medium transition-all hover:shadow-sm"
            style={{
              background: 'color-mix(in oklch, var(--aurora-accent) 12%, transparent)',
              border: '1px solid color-mix(in oklch, var(--aurora-accent) 30%, transparent)',
              color: '#7A5A18',
            }}
          >
            + {field.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProfileCompleteness;
