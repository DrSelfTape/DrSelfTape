import GenreTags from './GenreTags';
import UnionBadge from './UnionBadge';

const ActorProfileCard = ({ actor, onAccept, onPass }) => {
  const initials = (actor?.name || 'A')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1E1E1E] p-5 shadow-sm">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-200 text-lg font-bold text-[#999999]">
          {initials}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="truncate text-sm font-bold text-[#0f0f1a]">
              {actor?.name || 'Actor'}
            </h4>
            {actor?.union && <UnionBadge union={actor.union} />}
          </div>

          {actor?.experience_level && (
            <p className="text-xs text-[#999999]">{actor.experience_level}</p>
          )}

          {actor?.bio && (
            <p className="line-clamp-2 text-xs leading-relaxed text-[#999999]">
              {actor.bio}
            </p>
          )}

          {actor?.genres?.length > 0 && <GenreTags genres={actor.genres} />}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onPass}
          className="flex-1 rounded-lg border border-[#3A3A3A] px-4 py-2 text-xs font-medium text-[#999999] transition-colors hover:bg-[#1E1E1E]"
        >
          Pass
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="flex-1 rounded-lg bg-[#C855F0] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#ff6e6c]"
        >
          Accept
        </button>
      </div>
    </div>
  );
};

export default ActorProfileCard;
