import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useHideMobileHeader from '../../../components/Shared/useHideMobileHeader';
import { buildRecapPages } from './recapPages';

/* V-02 (Ring 4): the 9:16 recap that plays over a FRESH desktop result — the
 * reveal moment, paged like a story: the read → what's working → the one
 * thing. Recovered/historical results never trigger it (jerichoSlice only
 * raises revealPending from a review that just finished). 260ms enter,
 * reduced-motion gets the final state, arrows/Escape work, dots page.
 *
 * Portaled to <body>: it mounts from inside DesktopTapeReport, whose
 * `.noir-review button` / `h2` rules would otherwise restyle the tap zones and
 * the hero (review catch). Keyboard handling is scoped to the dialog itself so
 * an open ⌘K palette or any input behind it keeps its own arrows/Escape. */
export default function RecapStoryCard({ review, band, avg, firstName, thumbnailUrl, file, onClose, onShare, sharing }) {
  useHideMobileHeader(true);
  const pages = buildRecapPages(review, { band, avg, firstName });
  const last = pages.length - 1;
  const [index, setIndex] = useState(0);
  const cardRef = useRef(null);
  const go = useCallback((delta) => setIndex((i) => Math.max(0, Math.min(last, i + delta))), [last]);

  useEffect(() => { if (pages.length) cardRef.current?.focus(); }, [pages.length]);
  // Another surface (the ⌘K palette) may take focus and then unmount without
  // handing it back; when focus falls to <body> while we are open, reclaim it
  // so arrows/Escape/Tab keep reaching the dialog. Never steals from a real
  // target — only from the empty document.
  useEffect(() => {
    if (!pages.length) return undefined;
    const onFocusOut = (e) => {
      if (e.relatedTarget) return;
      requestAnimationFrame(() => {
        if (document.activeElement === document.body && cardRef.current) cardRef.current.focus();
      });
    };
    document.addEventListener('focusout', onFocusOut);
    return () => document.removeEventListener('focusout', onFocusOut);
  }, [pages.length]);
  // An uploaded take has no library playback URL yet — mirror DesktopTapeReport
  // and derive a poster from the File itself, revoked when it changes.
  const [fileUrl, setFileUrl] = useState(null);
  useEffect(() => {
    if (!file || typeof URL === 'undefined' || !URL.createObjectURL) { setFileUrl(null); return undefined; }
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const poster = thumbnailUrl || fileUrl;

  if (!pages.length) return null;
  const page = pages[index];
  const accent = band?.color || 'var(--aurora-gold)';
  const atEnd = index === last;

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose?.(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); return; }
    if (e.key !== 'Tab') return;
    // Focus stays inside the dialog while it is open.
    const nodes = cardRef.current?.querySelectorAll('button:not(:disabled)');
    if (!nodes?.length) return;
    const first = nodes[0];
    const end = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === cardRef.current)) { e.preventDefault(); end.focus(); }
    else if (!e.shiftKey && active === end) { e.preventDefault(); first.focus(); }
  };

  const card = (
    <div className="dst-recap-backdrop" role="presentation" onClick={onClose}>
      <div ref={cardRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Your tape recap"
        className="dst-recap-card" style={{ '--recap-accent': accent }}
        onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        <div className="dst-recap-progress" aria-hidden="true">
          {pages.map((p, i) => <span key={p.key} className={i <= index ? 'is-on' : ''} />)}
        </div>
        <button type="button" className="dst-recap-close" aria-label="Close recap" onClick={onClose}>×</button>

        <div key={page.key} className="dst-recap-page">
          {page.key === 'read' && poster && (
            // The take itself, as a poster frame — display only, never fetched
            // for analysis. Muted + metadata so nothing plays or downloads.
            <video className="dst-recap-thumb" src={poster} muted playsInline preload="metadata" aria-label="Your take" />
          )}
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
  return typeof document === 'undefined' ? card : createPortal(card, document.body);
}
