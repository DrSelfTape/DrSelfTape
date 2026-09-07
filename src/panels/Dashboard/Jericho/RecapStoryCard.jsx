import { useCallback, useEffect, useRef, useState } from 'react';
import useHideMobileHeader from '../../../components/Shared/useHideMobileHeader';
import { buildRecapPages } from './recapPages';

/* V-02 (Ring 4): the 9:16 recap that plays over a FRESH desktop result — the
 * reveal moment, paged like a story: the read → what's working → the one
 * thing. Recovered/historical results never trigger it (jerichoSlice only
 * raises revealPending from a review that just finished). 260ms enter,
 * reduced-motion gets the final state, arrows/Escape work, dots page. */
export default function RecapStoryCard({ review, band, avg, firstName, onClose, onShare, sharing }) {
  useHideMobileHeader(true);
  const pages = buildRecapPages(review, { band, avg, firstName });
  const last = pages.length - 1;
  const [index, setIndex] = useState(0);
  const cardRef = useRef(null);
  const go = useCallback((delta) => setIndex((i) => Math.max(0, Math.min(last, i + delta))), [last]);

  useEffect(() => { cardRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose?.(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  if (!pages.length) return null;
  const page = pages[index];
  const accent = band?.color || 'var(--aurora-gold)';
  const atEnd = index === last;

  return (
    <div className="dst-recap-backdrop" role="presentation" onClick={onClose}>
      <div ref={cardRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Your tape recap"
        className="dst-recap-card" style={{ '--recap-accent': accent }} onClick={(e) => e.stopPropagation()}>
        <div className="dst-recap-progress" aria-hidden="true">
          {pages.map((p, i) => <span key={p.key} className={i <= index ? 'is-on' : ''} />)}
        </div>
        <button type="button" className="dst-recap-close" aria-label="Close recap" onClick={onClose}>×</button>

        <div key={page.key} className="dst-recap-page">
          <p className="dst-recap-kicker">{page.kicker}</p>
          <h2 className="dst-recap-title">{page.title}</h2>
          {page.score != null && <p className="dst-recap-score"><span>{page.score}</span>/10</p>}
          {Array.isArray(page.body)
            ? <ul className="dst-recap-list">{page.body.map((line, i) => <li key={i}>{line}</li>)}</ul>
            : page.body ? <p className="dst-recap-body">“{page.body}”</p> : null}
          {page.tags?.length ? <div className="dst-recap-tags">{page.tags.map((t) => <span key={t}>{t}</span>)}</div> : null}
        </div>

        {/* Story-style tap zones over the body: left = back, right = forward */}
        <button type="button" className="dst-recap-zone dst-recap-zone-prev" aria-label="Previous page" onClick={() => go(-1)} disabled={index === 0} />
        <button type="button" className="dst-recap-zone dst-recap-zone-next" aria-label="Next page" onClick={() => go(1)} disabled={atEnd} />

        <div className="dst-recap-foot">
          <div className="dst-recap-dots" role="tablist" aria-label="Recap pages">
            {pages.map((p, i) => (
              <button key={p.key} type="button" role="tab" aria-selected={i === index}
                aria-label={`Page ${i + 1} of ${pages.length}`} className={i === index ? 'is-on' : ''} onClick={() => setIndex(i)} />
            ))}
          </div>
          <div className="dst-recap-actions">
            {onShare && (
              <button type="button" className="dst-recap-share" onClick={() => onShare('story')} disabled={!!sharing}>
                {sharing ? 'Preparing…' : 'Share to Story'}
              </button>
            )}
            <button type="button" className="dst-recap-primary" onClick={atEnd ? onClose : () => go(1)}>
              {atEnd ? 'See the full notes' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
