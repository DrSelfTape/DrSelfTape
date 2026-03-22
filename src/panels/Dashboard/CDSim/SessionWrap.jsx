export default function SessionWrap({ stats, onRunAgain, onDone }) {
  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // Use the last 3 feedback items from the actual session as highlights
  const highlights = (stats.feedbackHistory || []).slice(-3);

  return (
    <div className="max-w-lg mx-auto text-center">
      <div className="mb-6">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-7 h-7 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Session Complete</h2>
        <p className="text-gray-500 text-sm mt-1">Great work in the room today.</p>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-left space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 font-mono">
              {formatTime(stats.elapsedSeconds)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Time in Session</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.linesCompleted}</p>
            <p className="text-xs text-gray-400 mt-1">Lines Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.redirectCount}</p>
            <p className="text-xs text-gray-400 mt-1">Redirects Taken</p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Session Highlights
          </p>
          {highlights.length > 0 ? (
            <div className="space-y-3">
              {highlights.map((fb, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-gray-300">CD</span>
                  </div>
                  <div className="flex-1">
                    {fb.type === 'redirect' && (
                      <span className="text-[10px] font-semibold uppercase text-orange-500 block mb-0.5">
                        Redirect
                      </span>
                    )}
                    <p className="text-sm text-gray-700 italic">"{fb.note}"</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-gray-300">CD</span>
              </div>
              <p className="text-sm text-gray-700 italic">"Good instincts throughout. Trust yourself more."</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onRunAgain}
          className="flex-1 bg-[#ff6b35] hover:bg-[#e55a2b] text-white px-5 py-3 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
        >
          Run It Again
        </button>
        <button
          onClick={onDone}
          className="flex-1 px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
}
