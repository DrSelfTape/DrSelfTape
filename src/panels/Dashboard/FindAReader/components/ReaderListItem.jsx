import { MapPin, Clock, MessageCircle } from 'lucide-react';

const ReaderListItem = ({ match, onClick }) => {
  const other = match?.other_actor || {};

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
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1E1E1E] p-5 shadow-sm">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          {other?.headshot || other?.user_image ? (
            <img
              src={other.headshot || other.user_image}
              alt={other.name}
              className="h-16 w-16 rounded-full object-cover border-2 border-[#C855F0]/30"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#C855F0] to-[#7B2FBE] text-lg font-bold text-white">
              {initials}
            </div>
          )}
          <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-[#1E1E1E]" />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {/* Name + Union */}
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-white truncate">
              {other?.name || 'Actor'}
            </h4>
            {unionLabel && (
              <span className="shrink-0 rounded-full bg-[#C855F0]/15 px-2 py-0.5 text-[10px] font-semibold text-[#C855F0] border border-[#C855F0]/30">
                {unionLabel}
              </span>
            )}
            {time && (
              <span className="ml-auto text-[10px] text-[#555]">{time}</span>
            )}
          </div>

          {/* Location + Experience */}
          <div className="flex items-center gap-3 flex-wrap">
            {other?.based_in && (
              <span className="flex items-center gap-1 text-xs text-[#888]">
                <MapPin size={10} />{other.based_in}
              </span>
            )}
            {other?.years_experience && (
              <span className="flex items-center gap-1 text-xs text-[#888]">
                <Clock size={10} />{other.years_experience}yr{other.years_experience !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Last message or bio */}
          {match?.last_message ? (
            <p className="truncate text-xs text-[#666]">{match.last_message}</p>
          ) : other?.bio ? (
            <p className="line-clamp-2 text-xs leading-relaxed text-[#999]">{other.bio}</p>
          ) : null}

          {/* Genres */}
          {other?.genres?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {other.genres.map((g) => (
                <span key={g} className="rounded-full bg-[#2A2A2A] px-2 py-0.5 text-[10px] text-[#AAAAAA]">
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
        className="mt-4 w-full rounded-lg bg-[#C855F0] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#A040C8] flex items-center justify-center gap-2"
      >
        <MessageCircle size={13} />
        Open Green Room
      </button>
    </div>
  );
};

export default ReaderListItem;
