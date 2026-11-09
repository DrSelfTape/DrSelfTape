import { useState } from 'react';
import StudioBrandLoader from './StudioBrandLoader';

export default function StudioReviewLoading({ uploading, progress = 0, recording = false }) {
  const [paused, setPaused] = useState(false);
  const percent = Math.min(100, Math.max(0, Number(progress) || 0));
  return (
    <section className="future-review-loading" data-motion-paused={paused} aria-label="Tape review progress" aria-busy="true">
      <span className="future-eyebrow">A fresh perspective on your performance</span>
      <StudioBrandLoader compact />
      <div role="status" aria-live="polite">
        <h2>{uploading ? 'Bringing your take\ninto focus.' : 'Making room\nfor your next take.'}</h2>
        <p>{uploading ? (recording ? 'Loading your saved take' : `Uploading your take · ${percent}%`) : 'Your review is processing. Your notes will appear when it finishes.'}</p>
      </div>
      {uploading && <progress aria-label="Upload progress" max="100" value={percent} />}
      <p className="future-loading-detail">{uploading ? 'Keep the app open until the upload finishes. Large tapes can take a few minutes on a mobile connection.' : 'You can return to this review later. Notification delivery depends on your device permissions.'}</p>
      <button type="button" className="future-motion-control" onClick={() => setPaused(value => !value)}>{paused ? 'Resume animation' : 'Pause animation'}</button>
    </section>
  );
}
