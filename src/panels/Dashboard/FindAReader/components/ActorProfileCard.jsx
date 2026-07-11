import { MapPin, Clock, Star, Clapperboard, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProfilePhoto from '../../../../components/Shared/ProfilePhoto';
import { openReaderProfile } from '../../../../utils/openReaderProfile';

const ActorProfileCard = ({ actor, onSlate, onStar, onPass }) => {
  const navigate = useNavigate();
  const initials = (actor?.name || 'A')
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
  }[actor?.union] || actor?.union;

  const openProfile = () => {
    openReaderProfile(actor?.id, navigate);
  };

  return (
    <div className="rounded-xl p-5 shadow-sm" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-start gap-4">
        {/* Avatar — tappable to open this actor's full profile. */}
        <button
          type="button"
          onClick={openProfile}
          aria-label={`View ${actor?.name || 'actor'}'s profile`}
          className="relative shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-[#D4A85F]/60"
          style={{ background: 'none', border: 'none', padding: 0, cursor: actor?.id ? 'pointer' : 'default' }}
        >
          <ProfilePhoto
            src={actor?.headshot || actor?.user_image}
            alt={actor?.name}
            initials={initials}
            className="h-16 w-16"
          />
          <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-green-500" style={{ borderWidth: 2, borderStyle: 'solid', borderColor: 'var(--bg-surface)' }} />
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          {/* Name + Union */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={openProfile}
              className="text-sm font-bold truncate text-left bg-transparent border-0 p-0"
              style={{ color: 'var(--text-primary)', cursor: actor?.id ? 'pointer' : 'default' }}
              aria-label={`View ${actor?.name || 'actor'}'s profile`}
            >
              {actor?.name || 'Actor'}
            </button>
            {unionLabel && (
              <span className="shrink-0 rounded-full bg-[#D4A85F]/15 px-2 py-0.5 text-[10px] font-semibold text-[#7A5A18] border border-[#D4A85F]/30">
                {unionLabel}
              </span>
            )}
          </div>

          {/* Location + Experience */}
          <div className="flex items-center gap-3 flex-wrap">
            {actor?.based_in && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <MapPin size={10} />{actor.based_in}
              </span>
            )}
            {actor?.years_experience && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <Clock size={10} />{actor.years_experience}yr{actor.years_experience !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Bio */}
          {actor?.bio && (
            <p className="line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {actor.bio}
            </p>
          )}

          {/* Genres */}
          {actor?.genres?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {actor.genres.map((g) => (
                <span key={g} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 3 Actions ───────────────────────────────────────────────── */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {/* Pass */}
        <button
          type="button"
          onClick={onPass}
          className="flex flex-col items-center gap-1 rounded-lg py-2.5 transition-all group"
          style={{ border: '1px solid var(--border-active)', color: 'var(--text-muted)' }}
        >
          <X size={16} className="group-hover:text-red-400 transition-colors" />
          <span className="text-[10px] font-medium">Pass</span>
        </button>

        {/* Star — Favorite */}
        <button
          type="button"
          onClick={onStar}
          className="flex flex-col items-center gap-1 rounded-lg py-2.5 hover:bg-[#2A1A00] hover:border-[#FCE072]/50 transition-all group"
          style={{ border: '1px solid var(--border-active)', color: 'var(--text-muted)' }}
        >
          <Star size={16} className="group-hover:text-[#FCE072] group-hover:fill-[#FCE072] transition-colors" />
          <span className="text-[10px] font-medium group-hover:text-[#FCE072] transition-colors">Favorite</span>
        </button>

        {/* Slate — Green Room */}
        <button
          type="button"
          onClick={onSlate}
          className="flex flex-col items-center gap-1 rounded-lg bg-[#D4A85F] py-2.5 text-white hover:bg-[#C09850] transition-all group"
        >
          <Clapperboard size={16} />
          <span className="text-[10px] font-medium">Slate</span>
        </button>
      </div>

      {/* Action labels */}
      <div className="mt-1.5 grid grid-cols-3 gap-2 px-1">
        <p className="text-[9px] text-center" style={{ color: 'var(--text-dim)' }}>not interested</p>
        <p className="text-[9px] text-center" style={{ color: 'var(--text-dim)' }}>save for later</p>
        <p className="text-[9px] text-center" style={{ color: 'var(--text-dim)' }}>move to green room</p>
      </div>
    </div>
  );
};

export default ActorProfileCard;
