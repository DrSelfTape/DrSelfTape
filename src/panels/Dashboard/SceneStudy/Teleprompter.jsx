import { useState, useEffect, useRef, useCallback } from 'react';

const SPEED_MAP = { slow: 0.5, medium: 1, fast: 2 };
const SPEED_LABELS = ['slow', 'medium', 'fast'];

export default function Teleprompter({ lines, userRole, onRecord, onBack }) {
  const [autoScroll, setAutoScroll] = useState(false);
  const [speed, setSpeed] = useState('medium');
  const [paused, setPaused] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef(null);
  const animRef = useRef(null);

  const updateProgress = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setScrollProgress(max > 0 ? Math.round((el.scrollTop / max) * 100) : 0);
  }, []);

  useEffect(() => {
    if (!autoScroll || paused) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    const el = containerRef.current;
    if (!el) return;

    const step = () => {
      el.scrollTop += SPEED_MAP[speed];
      updateProgress();
      const max = el.scrollHeight - el.clientHeight;
      if (el.scrollTop < max) {
        animRef.current = requestAnimationFrame(step);
      }
    };
    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [autoScroll, paused, speed, updateProgress]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white">Practice Mode</h2>
            <span className="bg-[#C855F0] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">New: Live Scene Mode</span>
          </div>
          <p className="text-[#999999] text-sm mt-1">
            Your lines are highlighted in orange
          </p>
        </div>
        <button
          onClick={onRecord}
          className="bg-[#C855F0] hover:bg-[#A040C8] text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="6" />
          </svg>
          Record Take
        </button>
      </div>

      {/* Controls Bar */}
      <div className="bg-[#1E1E1E] rounded-xl shadow-sm border border-[#2A2A2A] p-3 mb-4 flex items-center gap-4 flex-wrap">
        {/* Auto-scroll toggle */}
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`relative w-9 h-5 rounded-full transition-colors ${
              autoScroll ? 'bg-[#C855F0]' : 'bg-[#3A3A3A]'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-[#1E1E1E] rounded-full shadow transition-transform ${
                autoScroll ? 'translate-x-4' : ''
              }`}
            />
          </button>
          <span className="text-[#999999] font-medium">Auto-scroll</span>
        </label>

        {/* Speed */}
        {autoScroll && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#999999]">Speed:</span>
            {SPEED_LABELS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                  speed === s
                    ? 'bg-[#C855F0] text-white'
                    : 'bg-[#2A2A2A] text-[#999999] hover:bg-[#2A2A2A]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Pause/Resume */}
        {autoScroll && (
          <button
            onClick={() => setPaused(!paused)}
            className="text-xs px-3 py-1 rounded-full font-medium bg-[#2A2A2A] text-[#999999] hover:bg-[#2A2A2A] cursor-pointer"
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-[#2A2A2A] rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-[#C855F0] rounded-full transition-all duration-200"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Script Lines */}
      <div
        ref={containerRef}
        onScroll={updateProgress}
        className="bg-[#1E1E1E] rounded-xl shadow-sm border border-[#2A2A2A] p-6 max-h-[60vh] overflow-y-auto space-y-3"
      >
        {lines.map((line, i) => {
          const isUser = line.character === userRole;
          return (
            <div
              key={i}
              className={`rounded-lg p-3 transition-colors ${
                isUser
                  ? 'bg-[#C855F0]/10 border-l-4 border-[#C855F0]'
                  : 'bg-[#1E1E1E] border-l-4 border-[#3A3A3A]'
              }`}
            >
              <span
                className={`text-xs font-bold uppercase tracking-wide block mb-1 ${
                  isUser ? 'text-[#C855F0]' : 'text-[#666666]'
                }`}
              >
                {line.character}
              </span>
              <p
                className={`leading-relaxed ${
                  isUser ? 'text-white text-base font-medium' : 'text-[#999999] text-sm'
                }`}
              >
                {line.dialogue}
              </p>
            </div>
          );
        })}
      </div>

      <button
        onClick={onBack}
        className="mt-4 text-sm text-[#999999] hover:text-[#999999] font-medium cursor-pointer"
      >
        Back to script
      </button>
    </div>
  );
}
