import { useEffect, useId, useRef, useState } from 'react';
import { matrixRows, matrixTakes, MATRIX_TABS, nextMatrixTab, scrubTake } from './compareMatrixData';
import './desktopCompare.css';

function TakePreview({ file, take }) {
  const ref = useRef(null);
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setUrl(null); setFailed(false);
    if (!file) return;
    const source = URL.createObjectURL(file);
    setUrl(source);
    return () => URL.revokeObjectURL(source);
  }, [file]);
  return <div className="nc-preview" onPointerMove={event => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientY > bounds.bottom - 32) return; // leave the native controls alone
    scrubTake(ref.current, { clientX: event.clientX, left: bounds.left, width: bounds.width,
      pointerType: event.pointerType, reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches });
  }}>
    {file && url && !failed ? <video ref={ref} src={url} muted controls playsInline preload="metadata" aria-label={`Preview take ${take}`} onError={() => setFailed(true)} />
      : <p>{failed ? 'Preview could not be opened' : 'Preview unavailable in this session'}</p>}
  </div>;
}

export default function DesktopCompareMatrix({ result, files = [], role, locked, hideDetails = locked, onUpgrade, onReset }) {
  const [tab, setTab] = useState('scores');
  const prefix = useId();
  const takes = matrixTakes(result, hideDetails);
  const rows = matrixRows(takes, tab);
  const duplicate = ['duplicate', 'single'].includes(result.comparison_status);
  return <article className="noir-compare" aria-label="Compare takes matrix">
    <header className="nc-header"><div><p className="nc-eyebrow">JERICHO / COMPARE TAKES</p><h2>{role || 'One scene. Every choice.'}</h2><p className="nc-muted">{takes.length} {takes.length === 1 ? 'take' : 'takes'} · Read across the room.</p></div>
      <button type="button" onClick={onReset}>Compare another set</button>
    </header>
    <section className="nc-verdict"><p className="nc-eyebrow">{duplicate ? 'SAME TAKE' : 'SUBMIT THIS ONE'}</p><h3>{result.headline || (duplicate ? 'These are the same performance.' : takes.find(t => t.winner) ? `Take ${takes.find(t => t.winner).take} is your strongest` : 'Your comparison')}</h3>
      {result.why_winner && <p>{result.why_winner}</p>}
    </section>
    <div role="tablist" aria-label="Comparison detail" className="nc-tabs" onKeyDown={event => {
      const next = nextMatrixTab(tab, event.key);
      if (!next) return;
      event.preventDefault(); setTab(next);
      event.currentTarget.querySelector(`[data-tab="${next}"]`)?.focus();
    }}>
      {MATRIX_TABS.map(value => <button key={value} type="button" role="tab" data-tab={value} id={`${prefix}-${value}`} aria-selected={tab === value} aria-controls={`${prefix}-panel`} tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
    </div>
    <div role="tabpanel" id={`${prefix}-panel`} aria-labelledby={`${prefix}-${tab}`} tabIndex={0} className="nc-scroll">
      <table className="nc-table" style={{ '--nc-columns': takes.length }}>
        <caption>{tab[0].toUpperCase() + tab.slice(1)} by take{duplicate ? ' · duplicate performances are not ranked' : ''}</caption>
        <thead><tr><th scope="col" className="nc-criterion">Rubric</th>{takes.map(take => <th scope="col" key={take.take} className={take.winner ? 'nc-winner' : ''}>
          <div className="nc-take-label">Take {take.take}{take.winner && <span>Winner</span>}</div>
          <TakePreview file={files[take.take - 1]} take={take.take} />
          {files[take.take - 1] && <p className="nc-scrub-hint">Hover to scrub · controls to play</p>}
        </th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.key}><th scope="row" className="nc-criterion">{row.label}</th>{takes.map((take, i) => <td key={take.take} className={take.winner ? 'nc-winner' : ''}>
          {row.values[i] == null || row.values[i] === '' ? <span className="nc-missing">Not {tab === 'notes' ? 'included' : 'scored'}</span> : row.values[i]}
        </td>)}</tr>)}</tbody>
      </table>
      {rows.length === 0 && <p className="nc-empty">{locked ? 'Detailed per-take notes are included with a plan.' : 'These details were not included in this comparison.'}</p>}
    </div>
    {locked && <section className="nc-unlock"><p>Your ranking and highlights are here. Unlock the full read on all {takes.length} takes, on any plan.</p><button type="button" onClick={onUpgrade}>See plans</button></section>}
    {result.what_to_do && <section className="nc-next"><p className="nc-eyebrow">YOUR MOVE</p><p>{result.what_to_do}</p></section>}
  </article>;
}
