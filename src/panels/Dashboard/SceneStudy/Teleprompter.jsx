import { useState, useEffect, useRef, useCallback } from 'react';

const SPEED_MAP = { slow: 0.5, medium: 1, fast: 2 };
const SPEED_LABELS = ['slow', 'medium', 'fast'];

export default function Teleprompter({ lines, userRole, onRecord, onBack, onGoLive }) {
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
    <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)', maxWidth: '48rem', margin: '0 auto' }}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-3 px-1">
        <div>
          <h2 className="text-xl font-bold text-white leading-tight">Practice Mode</h2>
          <p className="text-[#666666] text-xs mt-0.5">
            Your lines are highlighted in <span className="text-[#C855F0]">purple</span>
          </p>
        </div>
        {/* Record button — compact on mobile */}
        <button
          onClick={onRecord}
          className="flex items-center gap-1.5 bg-[#1E1E1E] border border-[#3A3A3A] text-white px-3 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer shrink-0 ml-3"
        >
          <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="6" />
          </svg>
          Record
        </button>
      </div>

      {/* ── Controls Bar — single row, compact ── */}
      <div className="flex items-center gap-2 mb-2 px-1 flex-wrap">
        {/* Auto-scroll toggle */}
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            autoScroll
              ? 'bg-[#C855F0] border-[#C855F0] text-white'
              : 'bg-[#1E1E1E] border-[#2A2A2A] text-[#999999]'
          }`}
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 10l5 5 5-5H7z" />
          </svg>
          {autoScroll ? 'Scrolling' : 'Auto-scroll'}
        </button>

        {/* Speed pills — only when scrolling */}
        {autoScroll && (
          <>
            {SPEED_LABELS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`text-xs px-2.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer capitalize ${
                  speed === s
                    ? 'bg-[#C855F0] text-white'
                    : 'bg-[#2A2A2A] text-[#666666]'
                }`}
              >
                {s}
              </button>
            ))}
            <button
              onClick={() => setPaused(!paused)}
              className="text-xs px-3 py-1.5 rounded-full font-semibold bg-[#2A2A2A] text-[#999999] cursor-pointer"
            >
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
          </>
        )}
      </div>

      {/* ── Progress Bar ── */}
      <div className="w-full h-1 bg-[#1E1E1E] rounded-full mb-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#C855F0] to-[#9333ea] rounded-full transition-all duration-200"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* ── Script Lines — fills remaining height ── */}
      <div
        ref={containerRef}
        onScroll={updateProgress}
        className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-[#2A2A2A] bg-[#0f0f14] space-y-1 p-3"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {lines.map((line, i) => {
          const isUser = line.character === userRole;
          return (
            <div
              key={i}
              className={`rounded-xl px-3 py-2.5 transition-colors ${
                isUser
                  ? 'bg-[#C855F0]/10 border-l-[3px] border-[#C855F0]'
                  : 'bg-transparent border-l-[3px] border-[#2A2A2A]'
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${
                  isUser ? 'text-[#C855F0]' : 'text-[#444444]'
                }`}
              >
                {line.character}
              </span>
              <p
                className={`leading-relaxed text-sm ${
                  isUser ? 'text-white font-medium' : 'text-[#666666]'
                }`}
              >
                {line.dialogue}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Bottom Actions ── */}
      <div className="mt-3 flex flex-col gap-2">
        {/* Go Live — primary CTA */}
        {onGoLive && (
          <button
            onClick={onGoLive}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #C855F0, #9333ea)',
              boxShadow: '0 4px 20px rgba(200,85,240,0.35)',
            }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
            Go Live with AI Scene Partner
          </button>
        )}

        {/* Secondary row — Record + Back */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRecord}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white border border-[#3A3A3A] bg-[#1A1A1A] flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="6" />
            </svg>
            Record Take
          </button>
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl text-sm text-[#666666] font-medium cursor-pointer bg-[#1A1A1A] border border-[#2A2A2A]"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
