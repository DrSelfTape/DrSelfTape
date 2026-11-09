/**
 * Branded cold-start screen. The route guards previously returned `null` while
 * redux-persist rehydrated, which on iOS reads as a frozen white screen right
 * after launch. This gives that beat branded artwork and a loading status so it feels
 * intentional instead of broken.
 */
import { useState } from 'react';
import StudioBrandLoader from '../FutureStudio/StudioBrandLoader';

export default function BootSplash() {
  const [paused, setPaused] = useState(false);
  return (
    <div className="future-boot" data-motion-paused={paused}
    >
      <StudioBrandLoader />
      <span className="future-eyebrow">A little space. A bigger performance.</span>
      <h1 className="sr-only">Dr Self Tape</h1>
      <p>Step into your scene.</p>
      <div className="future-boot-status" role="status" aria-live="polite">
        <span className="future-boot-dots" aria-hidden="true"><i /><i /><i /></span>
        Opening your studio
      </div>
      <button type="button" className="future-motion-control" onClick={() => setPaused(value => !value)}>{paused ? 'Resume animation' : 'Pause animation'}</button>
    </div>
  );
}
