import { useState, useEffect, useRef, useCallback } from 'react';

const SPEED_MAP = { slow: 0.5, medium: 1, fast: 2 };
const SPEED_LABELS = ['slow', 'medium', 'fast'];

export default function Teleprompter({ lines, userRole, onRecord, onBack, onGoLive, onSelfTape, hideHeader = false }) {
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
      {!hideHeader && (
        <div className="flex items-start justify-between mb-3 px-1">
          <div>
            <h2 className="aurora-display text-xl leading-tight" style={{ color: 'var(--aurora-text)' }}>Practice Mode</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--aurora-sub)' }}>
              Your lines are highlighted in <span style={{ color: 'var(--aurora-accent-deep)', fontWeight: 600 }}>gold</span>
            </p>
          </div>
          <div className="flex items-center gap-2 ml-3 shrink-0">
            {/* Self-Tape button */}
            {onSelfTape && (
              <button
                onClick={onSelfTape}
                className="aurora-mono flex items-center gap-1.5 px-3 py-2 rounded-full transition-colors cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #D4A85F, #7A5A18)',
                  color: '#fff',
                  fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                  boxShadow: '0 4px 14px rgba(212,168,95,0.30)',
                }}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/>
                </svg>
                Self-Tape
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Controls Bar — single row, compact ── */}
      <div className="flex items-center gap-2 mb-2 px-1 flex-wrap">
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className="aurora-mono flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer"
          style={{
            background: autoScroll ? 'var(--aurora-accent)' : 'var(--aurora-glass)',
            color: autoScroll ? '#fff' : 'var(--aurora-sub)',
            border: autoScroll ? 'none' : '1px solid var(--aurora-glass-border)',
            backdropFilter: autoScroll ? 'none' : 'blur(12px)',
            fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
            boxShadow: autoScroll ? 'var(--aurora-shadow-coral)' : 'none',
          }}
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 10l5 5 5-5H7z" />
          </svg>
          {autoScroll ? 'Scrolling' : 'Auto-scroll'}
        </button>

        {/* Speed pills */}
        {autoScroll && (
          <>
            {SPEED_LABELS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className="aurora-mono px-2.5 py-1.5 rounded-full transition-colors cursor-pointer"
                style={{
                  background: speed === s ? 'var(--aurora-text)' : 'var(--aurora-glass)',
                  color: speed === s ? 'var(--aurora-bg)' : 'var(--aurora-dim)',
                  border: speed === s ? 'none' : '1px solid var(--aurora-glass-border)',
                  fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                  backdropFilter: speed === s ? 'none' : 'blur(12px)',
                }}
              >
                {s}
              </button>
            ))}
            <button
              onClick={() => setPaused(!paused)}
              className="aurora-mono px-3 py-1.5 rounded-full cursor-pointer"
              style={{
                background: 'var(--aurora-glass)', color: 'var(--aurora-text)',
                border: '1px solid var(--aurora-glass-border)',
                fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                backdropFilter: 'blur(12px)',
              }}
            >
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
          </>
        )}
      </div>

      {/* ── Progress Bar ── */}
      <div className="w-full h-[2px] rounded-full mb-2 overflow-hidden" style={{ background: 'var(--aurora-line)' }}>
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{
            width: `${scrollProgress}%`,
            background: 'linear-gradient(to right, var(--aurora-accent), var(--aurora-heritage-gold))',
          }}
        />
      </div>

      {/* ── Script Lines — fills remaining height ── */}
      <div
        ref={containerRef}
        onScroll={updateProgress}
        className="flex-1 min-h-0 overflow-y-auto rounded-2xl space-y-1 p-3"
        style={{
          WebkitOverflowScrolling: 'touch',
          background: 'var(--aurora-glass)',
          border: '1px solid var(--aurora-glass-border)',
          backdropFilter: 'blur(20px) saturate(1.4)',
        }}
      >
        {lines.map((line, i) => {
          const isUser = line.character === userRole;
          return (
            <div
              key={i}
              className="rounded-xl px-3 py-2.5 transition-colors"
              style={{
                background: isUser ? 'rgba(212,168,95,0.10)' : 'transparent',
                borderLeft: isUser
                  ? '2px solid var(--aurora-heritage-gold)'
                  : 'none',
                paddingLeft: isUser ? 14 : 14,
                boxShadow: isUser ? 'inset 6px 0 12px -8px rgba(212,168,95,0.55)' : 'none',
              }}
            >
              <span
                className="aurora-mono"
                style={{
                  fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
                  display: 'block', marginBottom: 4,
                  color: isUser ? 'var(--aurora-heritage-gold-deep)' : 'var(--aurora-dim)',
                  fontWeight: 700,
                }}
              >
                {line.character}
              </span>
              <p
                style={{
                  lineHeight: 1.5, fontSize: 15,
                  color: isUser ? 'var(--aurora-text)' : 'var(--aurora-sub)',
                  fontWeight: isUser ? 600 : 400,
                  margin: 0,
                }}
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
