import './future-studio.css';

/** Decorative only: never implies that a provider has completed a job. */
export default function StudioArtwork({ review = false }) {
  return (
    <div className={`future-art ${review ? 'future-art-review' : ''}`} aria-hidden="true">
      <div className="future-art-glow" />
      <div className="future-art-orbit" /><div className="future-art-orbit inner" />
      <div className="future-art-mark"><div className="future-art-inset">
        {review ? <span className="future-art-wave">{[0, 1, 2, 3, 4].map(i => <i key={i} />)}</span> : <span className="future-art-play" />}
      </div></div>
      <div className="future-art-film"><b /><i /><i /><i /></div>
      <div className="future-art-note"><span>✧</span><i /><i /></div>
      <span className="future-art-star one">✦</span><span className="future-art-star two">✧</span>
    </div>
  );
}
