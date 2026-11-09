/** The supplied logo stays intact; CSS/native template tint handles dark surfaces. */
export default function StudioBrandLoader({ compact = false }) {
  return (
    <div className={`future-brand-loader${compact ? ' future-brand-loader--compact' : ''}`}>
      <div className="future-brand-halo" aria-hidden="true" />
      <div className="future-brand-ring" aria-hidden="true" />
      <div className="future-brand-ring future-brand-ring--inner" aria-hidden="true" />
      <span className="future-brand-spark future-brand-spark--one" aria-hidden="true" />
      <span className="future-brand-spark future-brand-spark--two" aria-hidden="true" />
      <img className="future-brand-logo" src="/brand/dr-self-tape-logo.png" alt="Dr Self Tape" width="800" height="800" fetchPriority="high" />
    </div>
  );
}
