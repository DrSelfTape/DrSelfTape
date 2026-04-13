import { useState, useEffect, useRef, useCallback } from 'react';

const SPEED_MAP = { slow: 0.5, medium: 1, fast: 2 };
const SPEED_LABELS = ['slow', 'medium', 'fast'];

export default function Teleprompter({ lines, userRole, onRecord, onBack, onGoLive, onSelfTape }) {
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
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)', maxWidth: '44rem', margin: '0 auto', width: '100%' }}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-3 px-1">
        <div>
          <h2 className="text-xl font-bold text-white leading-tight">Practice Mode</h2>
          <p className="text-[#666666] text-xs mt-0.5">
            Your lines are highlighted in <span className="text-[#C855F0]">purple</span>
          </p>
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          {/* Self-Tape button */}
          {onSelfTape && (
            <button
              onClick={onSelfTape}
              className="flex items-center gap-1.5 bg-[#C855F0] text-white px-3 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/>
              </svg>
              Self-Tape
            </button>
          )}
        </div>
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
        {/* Back button */}
        <button
          onClick={onBack}
          className="w-full py-2.5 rounded-xl text-sm font-medium cursor-pointer flex items-center justify-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
        >
          ← Back to Role Selection
        </button>
      </div>
    </div>
  );
}
