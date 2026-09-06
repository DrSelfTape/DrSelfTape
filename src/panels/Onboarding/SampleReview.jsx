import { useEffect, useRef, useState } from 'react';
import useHideMobileHeader from '../../components/Shared/useHideMobileHeader';
import TapeReviewNotes from '../Dashboard/Jericho/TapeReviewNotes';
import { SAMPLE_ACTOR_NAME, sampleReview } from '../../data/sampleReview';
import { PRACTICE_SCENE_TITLE } from '../../data/practiceScene';

export default function SampleReview({ firstName, onClose, onTry }) {
  useHideMobileHeader(true);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const launchingRef = useRef(false);
  const [launching, setLaunching] = useState(false);

  useEffect(() => { closeRef.current?.focus(); }, []);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (!launchingRef.current) onClose();
    }
    if (event.key !== 'Tab') return;
    const buttons = [...dialogRef.current.querySelectorAll('button:not(:disabled)')];
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const start = async (variant) => {
    if (launchingRef.current) return;
    launchingRef.current = true;
    setLaunching(true);
    try {
      await onTry(variant);
    } finally {
      launchingRef.current = false;
      setLaunching(false);
    }
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sample-review-title"
      onKeyDown={handleKeyDown}
      style={{
        position: 'absolute', inset: 0, overflowY: 'auto',
        WebkitOverflowScrolling: 'touch', background: 'var(--aurora-bg)',
        padding: 'max(16px, env(safe-area-inset-top, 0px)) max(20px, env(safe-area-inset-right, 0px)) calc(28px + env(safe-area-inset-bottom, 0px)) max(20px, env(safe-area-inset-left, 0px))',
      }}
    >
      <div className="max-w-2xl mx-auto space-y-5">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          disabled={launching}
          className="text-sm underline py-3 disabled:opacity-50"
          style={{ color: 'var(--aurora-sub)', touchAction: 'manipulation' }}
        >← Back to the free review offer</button>
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--aurora-accent-deep)' }}>Sample full review</p>
          <h1 id="sample-review-title" className="text-2xl font-semibold" style={{ color: 'var(--aurora-text)' }}>
            {firstName?.trim() ? `${firstName.trim()}, here’s how a review reads.` : 'Here’s how a review reads.'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--aurora-sub)' }}>{PRACTICE_SCENE_TITLE}</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--aurora-sub)' }}>
            {SAMPLE_ACTOR_NAME} is a fictional actor playing Morgan. These notes and scores are illustrative examples, not an assessment of your acting.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--aurora-sub)' }}>
            Your free review includes the headline and a first adjustment. The full breakdown and Performance DNA require a plan.
          </p>
        </header>
        <div className="space-y-4 sm:space-y-5">
          <TapeReviewNotes review={sampleReview} />
        </div>
        <footer className="space-y-3 pt-2">
          <p className="text-base font-semibold" style={{ color: 'var(--aurora-text)' }}>Now get notes on your take.</p>
          <button
            type="button"
            disabled={launching}
            onClick={() => start('record')}
            className="w-full rounded-full px-5 py-4 text-sm font-semibold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #D4A85F, #7A5A18)', color: '#0A0A0A', touchAction: 'manipulation' }}
          >Record the practice scene →</button>
          <button
            type="button"
            disabled={launching}
            onClick={() => start('upload')}
            className="w-full rounded-full border px-5 py-4 text-sm font-semibold disabled:opacity-50"
            style={{ borderColor: 'var(--aurora-heritage-gold)', color: 'var(--aurora-text)', touchAction: 'manipulation' }}
          >Upload my own tape →</button>
        </footer>
      </div>
    </div>
  );
}
