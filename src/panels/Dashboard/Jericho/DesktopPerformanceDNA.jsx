import { useEffect, useId, useRef, useState } from 'react';
import { DNA } from './reviewResultFields';
import { DNA_KEYS, dnaNumber, dnaPoints, loadDnaHistory } from './dnaReviewHistory';
import './desktopDNA.css';

function Polygon({ values, average = false }) {
  const points = dnaPoints(values);
  const complete = points.every(point => point.value !== null);
  const pairs = points.flatMap((point, i) => point.value !== null && points[(i + 1) % 6].value !== null
    ? [[point, points[(i + 1) % 6]]] : []);
  return <g className={average ? 'nd-average' : 'nd-current'}>
    {complete ? <polygon points={points.map(p => `${p.x},${p.y}`).join(' ')} />
      : pairs.map(([a, b], i) => <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />)}
    {points.filter(point => point.value !== null).map(point => <circle key={point.key} cx={point.x} cy={point.y} r={average ? 3 : 4} />)}
  </g>;
}

async function fetchHistory(options) {
  const { default: axios } = await import('../../../redux/http');
  return loadDnaHistory(axios.get, options);
}

export default function DesktopPerformanceDNA({ dna, firstName, loadHistory = fetchHistory }) {
  const titleId = useId();
  const [table, setTable] = useState(false);
  const [thisTape, setThisTape] = useState(true);
  const [showAverage, setShowAverage] = useState(false);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);
  const toggleAverage = async () => {
    if (loading) return;
    if (history) { setShowAverage(value => !value); return; }
    const controller = new AbortController();
    request.current = controller;
    setLoading(true); setError('');
    try {
      const result = await loadHistory({ signal: controller.signal });
      if (controller.signal.aborted) return;
      setHistory(result);
      setShowAverage(Object.keys(result.average).length > 0);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message || 'Your average could not be loaded. Try again.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };
  const labelPoints = dnaPoints(Object.fromEntries(DNA_KEYS.map(key => [key, 10])), 130);
  return <section className="noir-dna" aria-labelledby={titleId}>
    <header className="nd-header"><div><p className="nd-eyebrow">DR SELF TAPE / PERFORMANCE PROFILE</p><h3 id={titleId}>Performance DNA</h3><p>{firstName ? `${firstName} · ` : ''}This take, in six dimensions.</p></div>
      <button type="button" aria-pressed={table} onClick={() => setTable(value => !value)}>{table ? 'Hexagon view' : 'Table view'}</button>
    </header>
    <div className="nd-controls" aria-label="DNA overlays">
      <button type="button" aria-pressed={thisTape} onClick={() => setThisTape(value => !value)}>This tape</button>
      <button type="button" aria-pressed={showAverage} disabled={loading} onClick={toggleAverage}>{loading ? 'Loading average…' : '30-day average'}</button>
      {/* docs/selftape-research-study.md defines a lighting benchmark, not an
          approved six-axis performance profile. Do not invent an ideal. */}
    </div>
    {error && <p role="alert" className="nd-status">{error} Select 30-day average to retry.</p>}
    {history && !Object.keys(history.average).length && <p className="nd-status">No DNA scores available in your last 30 days.</p>}
    {table ? <div className="nd-table-wrap"><table><caption>Performance DNA · scores out of 10</caption><thead><tr><th scope="col">Dimension</th>{thisTape && <th scope="col">This tape</th>}{showAverage && <><th scope="col">30-day average</th><th scope="col">Reviews scored</th></>}</tr></thead>
      <tbody>{DNA.map(({ key, label }) => <tr key={key}><th scope="row">{label}</th>{thisTape && <td>{dnaNumber(dna?.[key])?.toFixed(1) ?? 'Not scored'}</td>}{showAverage && <><td>{dnaNumber(history.average[key])?.toFixed(1) ?? 'Not scored'}</td><td>{history.counts[key]}</td></>}</tr>)}</tbody></table></div>
      : <svg viewBox="0 0 380 320" role="img" aria-labelledby={`${titleId}-chart`} className="nd-chart">
        <title id={`${titleId}-chart`}>{`Performance DNA. ${DNA.map(({ key, label }) => `${label}: ${thisTape ? dnaNumber(dna?.[key]) ?? 'not scored' : 'hidden'}${showAverage ? `, average ${dnaNumber(history.average[key]) ?? 'not scored'}` : ''}`).join('. ')}`}</title>
        <g className="nd-grid">{[2, 4, 6, 8, 10].map(value => <polygon key={value} points={dnaPoints(Object.fromEntries(DNA_KEYS.map(key => [key, value]))).map(p => `${p.x},${p.y}`).join(' ')} />)}
          {dnaPoints(Object.fromEntries(DNA_KEYS.map(key => [key, 10]))).map(p => <line key={p.key} x1={190} y1={158} x2={p.x} y2={p.y} />)}
        </g>
        {showAverage && <Polygon values={history.average} average />}
        {thisTape && <Polygon values={dna} />}
        {labelPoints.map((point, i) => <text key={point.key} x={point.x} y={point.y} textAnchor="middle" className="nd-vertex">
          <tspan x={point.x} dy={i === 3 ? 8 : -6}>{DNA[i].label.split(' ')[0]}</tspan><tspan x={point.x} dy={13}>{DNA[i].label.split(' ').slice(1).join(' ')}</tspan>
          <tspan className="nd-number" x={point.x} dy={19}>{thisTape ? dnaNumber(dna?.[point.key])?.toFixed(1) ?? '—' : '—'}{showAverage ? ` / ${dnaNumber(history.average[point.key])?.toFixed(1) ?? '—'}` : ''}</tspan>
        </text>)}
      </svg>}
    <p className="nd-legend">{thisTape && <span>● This tape</span>}{showAverage && <span>┄ 30-day average · {history.count} reviews</span>}</p>
    <p className="nd-footnote">Unscored dimensions stay open. They are not zero.</p>
  </section>;
}
