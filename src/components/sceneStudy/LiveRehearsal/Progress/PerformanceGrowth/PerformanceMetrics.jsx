const PerformanceMetrics = ({ metrics, showNote = false }) => {
  return (
    <div className='flex flex-col gap-[20px] mt-[20px]'>
      {metrics.map(({ label, improvement, color, progress, note }, i) => (
        <div key={i}>
          {/* Header */}
          <div className='flex items-center justify-between mb-2'>
            <div className='font-medium text-sm'>{label}</div>
            {improvement && (
              <div className='text-sm' style={{ color }}>
                {improvement}
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div
            className='h-2 w-full bg-muted rounded-full overflow-hidden'
            role='progressbar'
            aria-valuenow={progress}
            aria-valuemin='0'
            aria-valuemax='100'
          >
            <div
              className='h-full rounded-full transition-all'
              style={{ backgroundColor: color, width: `${progress}%` }}
            />
          </div>

          {/* Optional note */}
          {showNote && note && (
            <div className='mt-2 text-xs text-muted-foreground text-center'>
              {note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PerformanceMetrics;
