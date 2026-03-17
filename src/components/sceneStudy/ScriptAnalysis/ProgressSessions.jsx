export const ProgressSessions = ({ title, total, completed }) => {
  const sessions = Array.from({ length: total }, (_, i) => i < completed);

  return (
    <div>
      <div className='flex items-center justify-between mb-1'>
        <div className='text-xs font-medium text-secondary-dark'>{title}</div>
        <div className='text-xs text-secondary'>
          {completed} / {total} sessions
        </div>
      </div>

      <div className='flex gap-1'>
        {sessions.map((isDone, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full ${
              isDone ? 'bg-success' : 'bg-secondary/20'
            }`}
          ></div>
        ))}
      </div>
    </div>
  );
};

