import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play } from 'lucide-react';
import useHideMobileHeader from './useHideMobileHeader';

const TOTAL_SECONDS = 60;
const INHALE = 4;
const HOLD = 4;
const EXHALE = 6;
const CYCLE = INHALE + HOLD + EXHALE;

/**
 * Pre-audition breathing exercise — 60-second guided focus mode.
 * 4-4-6 box breathing pattern with visual animation.
 *
 * Props:
 *   onComplete — called when exercise finishes or user skips
 */
export default function FocusMode({ onComplete }) {
  useHideMobileHeader(true);
  const [started, setStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [phase, setPhase] = useState('inhale'); // inhale | hold | exhale
  const [phaseSeconds, setPhaseSeconds] = useState(0);
  const intervalRef = useRef(null);

  const getPhaseFromCycleSecond = (s) => {
    const inCycle = s % CYCLE;
    if (inCycle < INHALE) return { phase: 'inhale', sec: inCycle, total: INHALE };
    if (inCycle < INHALE + HOLD) return { phase: 'hold', sec: inCycle - INHALE, total: HOLD };
    return { phase: 'exhale', sec: inCycle - INHALE - HOLD, total: EXHALE };
  };

  const start = useCallback(() => {
    setStarted(true);
    let elapsed = 0;
    intervalRef.current = setInterval(() => {
      elapsed++;
      const remaining = TOTAL_SECONDS - elapsed;
      setSecondsLeft(remaining);
      const p = getPhaseFromCycleSecond(elapsed);
      setPhase(p.phase);
      setPhaseSeconds(p.sec);
      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        setTimeout(onComplete, 500);
      }
    }, 1000);
  }, [onComplete]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Circle scale based on phase
  const getScale = () => {
    const p = getPhaseFromCycleSecond(TOTAL_SECONDS - secondsLeft);
    if (p.phase === 'inhale') return 0.6 + 0.4 * (p.sec / INHALE);
    if (p.phase === 'hold') return 1;
    return 1 - 0.4 * (p.sec / EXHALE);
  };

  const phaseLabel = phase === 'inhale' ? 'Breathe in...' : phase === 'hold' ? 'Hold...' : 'Breathe out...';

  if (!started) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80">
        <div className="text-center px-8 max-w-sm">
          <div className="w-20 h-20 rounded-full bg-[#D4A85F]/10 border border-[#D4A85F]/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🧘</span>
          </div>
          <h2 className="text-white font-bold text-xl mb-2">Focus Mode</h2>
          <p className="text-[#999] text-sm mb-6 leading-relaxed">
            60 seconds of guided breathing to center yourself before recording. Clear your mind, find your character.
          </p>
          <button
            onClick={start}
            className="flex items-center justify-center gap-2 mx-auto px-8 py-3 rounded-full text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-[#D4A85F]/30 dst-press"
            style={{ background: 'linear-gradient(135deg, #D4A85F, #7A5A18)' }}
          >
            <Play className="w-4 h-4" />
            Begin
          </button>
          <button
            onClick={onComplete}
            className="block mx-auto mt-4 text-sm text-[#666] hover:text-[#999] transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90">
      {/* Skip button */}
      <button
        onClick={() => { clearInterval(intervalRef.current); onComplete(); }}
        className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors"
      >
        <X className="w-5 h-5 text-white/40" />
      </button>

      {/* Breathing circle */}
      <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
        {/* Outer glow */}
        <div
          className="absolute rounded-full transition-transform"
          style={{
            width: 220,
            height: 220,
            background: `radial-gradient(circle, rgba(212,168,95,${phase === 'hold' ? 0.2 : 0.1}) 0%, transparent 70%)`,
            transform: `scale(${getScale()})`,
            transition: 'transform 1s ease-in-out',
          }}
        />
        {/* Inner circle */}
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: 160,
            height: 160,
            background: 'rgba(212,168,95,0.08)',
            border: '2px solid rgba(212,168,95,0.3)',
            transform: `scale(${getScale()})`,
            transition: 'transform 1s ease-in-out',
          }}
        >
          <span className="text-white/90 text-base font-medium">{phaseLabel}</span>
        </div>
      </div>

      {/* Timer */}
      <p className="mt-8 text-[#666] text-sm font-medium">{secondsLeft}s remaining</p>

      {/* Progress bar */}
      <div className="w-48 h-1 bg-[#2A2A2A] rounded-full mt-4 overflow-hidden">
        <div
          className="h-full bg-[#D4A85F] rounded-full transition-all"
          style={{ width: `${((TOTAL_SECONDS - secondsLeft) / TOTAL_SECONDS) * 100}%`, transition: 'width 1s linear' }}
        />
      </div>
    </div>
  );
}
