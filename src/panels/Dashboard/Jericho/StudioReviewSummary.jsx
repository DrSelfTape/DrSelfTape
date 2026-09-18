import { useEffect, useState } from 'react';
import { Film } from 'lucide-react';

/** Presentation only: receives the already entitlement-filtered review. */
export default function StudioReviewSummary({ review, score, band, file, playbackUrl, role }) {
  const [localMedia, setLocalMedia] = useState(null);
  const [failedUrl, setFailedUrl] = useState(null);
  useEffect(() => {
    if (!file || playbackUrl) return;
    const url = URL.createObjectURL(file);
    setLocalMedia({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file, playbackUrl]);
  const source = playbackUrl || (localMedia?.file === file ? localMedia?.url : null);
  const adjustment = review.adjustments?.[0];
  const focus = review.the_one_thing || adjustment?.note || (typeof adjustment === 'string' ? adjustment : null);
  return <>
    {source && source !== failedUrl ? (
      <div className="studio-tape-preview">
        <video key={source} src={source} controls playsInline preload="metadata"
          aria-label="Play your reviewed self-tape" onError={() => setFailedUrl(source)}
          onLoadedMetadata={event => {
            const video = event.currentTarget;
            // Decode an opening frame on iOS without starting playback.
            if (video.currentTime === 0 && Number.isFinite(video.duration) && video.duration > 0) video.currentTime = Math.min(.01, video.duration / 2);
          }} />
        <span className="studio-tape-caption">{role || 'Your self-tape'}</span>
      </div>
    ) : <div className="studio-tape-unavailable"><Film size={20} aria-hidden="true" />
      <span>Your review is ready{failedUrl ? ' · Video unavailable' : ''}</span>
    </div>}
    {score != null && <div className="studio-score" aria-label={`Overall score ${score.toFixed(1)} out of 10. ${band.label}`}>
      <div className="studio-score-row">
        <div className="studio-score-value">{score.toFixed(1)}<span>/10</span></div>
        <div className="studio-score-caption"><h2>{band.label}</h2><p>Your next step is below</p></div>
      </div>
      <div className="studio-score-track" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(10, score)) * 10}%` }} /></div>
    </div>}
    {review.verdict && <section className="studio-quick-read">
      <h2>The quick read</h2><p>{review.verdict}</p>
    </section>}
    {focus && <section className="studio-focus">
      <span aria-hidden="true">01</span><div><h2>Focus for your next take</h2><p>{focus}</p></div>
    </section>}
  </>;
}
