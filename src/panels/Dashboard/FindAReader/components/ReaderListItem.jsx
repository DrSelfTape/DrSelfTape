const ReaderListItem = ({ match, onClick }) => {
  const otherActor = match?.other_actor || {};
  const initials = (otherActor.name || 'A')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const time = match?.last_message_at
    ? new Date(match.last_message_at).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-[#1E1E1E]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-[#999999]">
        {initials}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-semibold text-[#0f0f1a]">
            {otherActor.name || 'Actor'}
          </p>
          {time && (
            <span className="ml-2 shrink-0 text-[10px] text-[#666666]">{time}</span>
          )}
        </div>
        {match?.last_message && (
          <p className="truncate text-xs text-[#999999]">{match.last_message}</p>
        )}
      </div>
    </button>
  );
};

export default ReaderListItem;
