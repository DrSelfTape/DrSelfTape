import { MapPin, Clock, Star, Clapperboard, X } from 'lucide-react';
import ProfilePhoto from '../../../../components/Shared/ProfilePhoto';

const ActorProfileCard = ({ actor, onSlate, onStar, onPass }) => {
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

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1E1E1E] p-5 shadow-sm">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          <ProfilePhoto
            src={actor?.headshot || actor?.user_image}
            alt={actor?.name}
            initials={initials}
            className="h-16 w-16"
          />
          <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-[#1E1E1E]" />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {/* Name + Union */}
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-white truncate">
              {actor?.name || 'Actor'}
            </h4>
            {unionLabel && (
              <span className="shrink-0 rounded-full bg-[#C855F0]/15 px-2 py-0.5 text-[10px] font-semibold text-[#C855F0] border border-[#C855F0]/30">
                {unionLabel}
              </span>
            )}
          </div>

          {/* Location + Experience */}
          <div className="flex items-center gap-3 flex-wrap">
            {actor?.based_in && (
              <span className="flex items-center gap-1 text-xs text-[#888]">
                <MapPin size={10} />{actor.based_in}
              </span>
            )}
            {actor?.years_experience && (
              <span className="flex items-center gap-1 text-xs text-[#888]">
                <Clock size={10} />{actor.years_experience}yr{actor.years_experience !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Bio */}
          {actor?.bio && (
            <p className="line-clamp-2 text-xs leading-relaxed text-[#999999]">
              {actor.bio}
            </p>
          )}

          {/* Genres */}
          {actor?.genres?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {actor.genres.map((g) => (
                <span key={g} className="rounded-full bg-[#2A2A2A] px-2 py-0.5 text-[10px] text-[#AAAAAA]">
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
          className="flex flex-col items-center gap-1 rounded-lg border border-[#3A3A3A] py-2.5 text-[#666] hover:bg-[#2A2A2A] hover:border-[#555] transition-all group"
        >
          <X size={16} className="group-hover:text-red-400 transition-colors" />
          <span className="text-[10px] font-medium">Pass</span>
        </button>

        {/* Star — Favorite */}
        <button
          type="button"
          onClick={onStar}
          className="flex flex-col items-center gap-1 rounded-lg border border-[#3A3A3A] py-2.5 text-[#666] hover:bg-[#2A1A00] hover:border-[#FCE072]/50 transition-all group"
        >
          <Star size={16} className="group-hover:text-[#FCE072] group-hover:fill-[#FCE072] transition-colors" />
          <span className="text-[10px] font-medium group-hover:text-[#FCE072] transition-colors">Favorite</span>
        </button>

        {/* Slate — Green Room */}
        <button
          type="button"
          onClick={onSlate}
          className="flex flex-col items-center gap-1 rounded-lg bg-[#C855F0] py-2.5 text-white hover:bg-[#A040C8] transition-all group"
        >
          <Clapperboard size={16} />
          <span className="text-[10px] font-medium">Slate</span>
        </button>
      </div>

      {/* Action labels */}
      <div className="mt-1.5 grid grid-cols-3 gap-2 px-1">
        <p className="text-[9px] text-center text-[#444]">not interested</p>
        <p className="text-[9px] text-center text-[#444]">save for later</p>
        <p className="text-[9px] text-center text-[#444]">move to green room</p>
      </div>
    </div>
  );
};

export default ActorProfileCard;
