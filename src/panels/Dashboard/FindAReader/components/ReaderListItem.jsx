import { MapPin, Clock, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProfilePhoto from '../../../../components/Shared/ProfilePhoto';

const ReaderListItem = ({ match, onClick }) => {
  const navigate = useNavigate();
  const other = match?.other_actor || {};
  const openProfile = (e) => {
    e.stopPropagation();
    if (other?.id) navigate(`/dashboard/reader-profile/${other.id}`);
  };

  const initials = (other.name || 'A')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const unionLabel = {
    'sag-aftra': 'SAG-AFTRA',
    'aea': 'AEA',
    'non-union': 'Non-Union',
    'fi-core': 'Fi-Core',
  }[other?.union] || other?.union;

  const time = match?.last_message_at
    ? new Date(match.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
    : '';

  return (
    <div className="rounded-xl p-5 shadow-sm" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-start gap-4">
        {/* Avatar — tap to open this actor's profile (chat + favorite live there) */}
        <button
          type="button"
          onClick={openProfile}
          aria-label={`View ${other?.name || 'actor'}'s profile`}
          className="relative shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-[#D4A85F]/60"
        >
          <ProfilePhoto
            src={other?.headshot || other?.user_image}
            alt={other?.name}
            initials={initials}
            className="h-16 w-16 cursor-pointer"
          />
          <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-green-500" style={{ borderWidth: 2, borderStyle: 'solid', borderColor: 'var(--bg-surface)' }} />
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          {/* Name + Union — name is also a tap target into the profile */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={openProfile}
              className="text-sm font-bold truncate cursor-pointer hover:underline"
              style={{ color: 'var(--text-primary)', background: 'none', border: 'none', padding: 0 }}
            >
              {other?.name || 'Actor'}
            </button>
            {unionLabel && (
              <span className="shrink-0 rounded-full bg-[#D4A85F]/15 px-2 py-0.5 text-[10px] font-semibold text-[#7A5A18] border border-[#D4A85F]/30">
                {unionLabel}
              </span>
            )}
            {time && (
              <span className="ml-auto text-[10px]" style={{ color: 'var(--text-dim)' }}>{time}</span>
            )}
          </div>

          {/* Location + Experience */}
          <div className="flex items-center gap-3 flex-wrap">
            {other?.based_in && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <MapPin size={10} />{other.based_in}
              </span>
            )}
            {other?.years_experience && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <Clock size={10} />{other.years_experience}yr{other.years_experience !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Reader metrics */}
          {(other?.rating > 0 || other?.total_sessions > 0 || other?.response_rate > 0) && (
            <div className="flex items-center gap-2 flex-wrap">
              {other.rating > 0 && (
                <span className="text-[11px] font-semibold" style={{ color: '#FCE072' }}>
                  ⭐ {other.rating.toFixed(1)}{other.review_count > 0 ? ` (${other.review_count})` : ''}
                </span>
              )}
              {other.response_rate > 0 && (
                <span className="text-[11px] font-semibold" style={{ color: '#A7ECDA' }}>
                  ⚡ {other.response_rate}%
                </span>
              )}
              {other.total_sessions > 0 && (
                <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {other.total_sessions} session{other.total_sessions !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          {/* Last message or bio */}
          {match?.last_message ? (
            <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{match.last_message}</p>
          ) : other?.bio ? (
            <p className="line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{other.bio}</p>
          ) : null}

          {/* Genres */}
          {other?.genres?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {other.genres.map((g) => (
                <span key={g} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action */}
      <button
        type="button"
        onClick={onClick}
        className="mt-4 w-full rounded-lg bg-[#D4A85F] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#C09850] flex items-center justify-center gap-2"
      >
        <MessageCircle size={13} />
        Open Green Room
      </button>
    </div>
  );
};

export default ReaderListItem;
