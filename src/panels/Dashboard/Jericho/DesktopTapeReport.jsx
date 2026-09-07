import { useEffect, useId, useRef, useState } from 'react';
import { TECH_SCORES, DNA } from './reviewResultFields';
import { noteText, PERFORMANCE_FIELDS, reviewMoments, scoreValue, seekToMoment } from './desktopReviewData';
import axios from '../../../redux/http';
import TapeReviewNotes from './TapeReviewNotes';
import './desktopReview.css';

export default function DesktopTapeReport({ review, headlineScore, band, firstName, file, playbackUrl, role, sides, createdAt, scoreHistory = [],
  sessionId, duration, onReset, onShare, sharing, onNextTake, onCompare, onSlate, renderDna, footer, children }) {
  const prefix = useId();
  const player = useRef(null);
  const [source, setSource] = useState(playbackUrl || null);
  const [mediaReady, setMediaReady] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [seekError, setSeekError] = useState('');
  useEffect(() => {
    setSource(playbackUrl || null);
    setMediaReady(false); setMediaError(false);
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSource(url);
    return () => URL.revokeObjectURL(url);
  }, [file, playbackUrl]);
  useEffect(() => {
    if (!sessionId || createdAt) return;
    const controller = new AbortController();
    // Metadata only. Never replace the caller's trimmed notes with this fetch.
    axios.get(`/v1/ai/session-log/${sessionId}/`, { signal: controller.signal })
      .then(({ data }) => {
        const row = data?.data ?? data;
        if (!controller.signal.aborted && String(row?.id) === String(sessionId)) setMetadata(row);
      }).catch(() => {});
    return () => controller.abort();
  }, [sessionId, createdAt]);
  const date = createdAt || metadata?.created_at ? new Date(createdAt || metadata.created_at) : null;
  const hasDate = date && Number.isFinite(date.getTime());
  const moments = reviewMoments(review, duration);
  const scores = TECH_SCORES.filter(({ key }) => scoreValue(review.scores?.[key]) !== null);
  const dna = DNA.filter(({ key }) => scoreValue(review.performance_dna?.[key]) !== null);
  const working = Array.isArray(review.whats_working) ? review.whats_working : [];
  const adjustments = Array.isArray(review.adjustments) ? review.adjustments : [];
  const focus = review.the_one_thing || noteText(adjustments[0]);
  const title = role || metadata?.role_played || 'Your take';

  return (
    <article className="noir-review" aria-label="Tape review report">
      <header className="nr-header">
        <div>
          <p className="nr-eyebrow">JERICHO / CASTING NOTES{sessionId ? ` / ${sessionId}` : ''}</p>
          <h2>Tape Review <span>· {title}</span></h2>
          <p className="nr-muted">{firstName ? `${firstName} · ` : ''}{hasDate
            ? <>Generated <time dateTime={date.toISOString()}>{date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time></>
            : 'Generation date unavailable'}</p>
        </div>
        <div className="nr-actions">
          {onReset && <button type="button" onClick={onReset}>Re-run review</button>}
          <button type="button" onClick={() => onShare('story')} disabled={sharing || !review.verdict}>{sharing ? 'Preparing…' : 'Share to Story'}</button>
          <button type="button" onClick={() => onShare('square')} disabled={sharing || !review.verdict}>Square post</button>
        </div>
      </header>

      <nav className="nr-evidence" aria-label="Review evidence">
        <a href={`#${prefix}-player`}>1 take analyzed</a>
        <a href={`#${prefix}-moments`}>{moments.length} timestamped {moments.length === 1 ? 'note' : 'notes'}</a>
        {scores.length > 0 && <a href={`#${prefix}-scores`}>{scores.length} tape scores</a>}
        {dna.length > 0 && <a href={`#${prefix}-dna`}>{dna.length} DNA axes scored</a>}
      </nav>

      {scoreValue(headlineScore) !== null && <section className="nr-headline" aria-label="Casting readiness">
        <div><p className="nr-eyebrow">THE READ ON THIS TAKE</p><h3>{band?.label || 'Overall score'}</h3></div>
        <div className="nr-grade">{headlineScore.toFixed(1)}<small>/10</small></div>
        <div className="nr-readiness" role="meter" aria-label="Overall tape score" aria-valuemin={0} aria-valuemax={10} aria-valuenow={headlineScore}>
          <span style={{ left: `${headlineScore * 10}%` }} />
        </div>
      </section>}

      <ScoreTimeline history={scoreHistory} headlineScore={headlineScore} />

      <div className="nr-reading-grid">
        <div className="nr-notes">
          {review.verdict && <section className="nr-section nr-verdict"><p className="nr-eyebrow">01 / QUICK READ</p><p>{review.verdict}</p>
            {Array.isArray(review.tone_tags) && <div className="nr-tags">{review.tone_tags.map((tag, i) => <span key={i}>{tag}</span>)}</div>}
          </section>}
          {working.length > 0 && <section className="nr-section"><h3>What’s working</h3>{working.map((note, i) => <div className="nr-note" key={i}>{note.title && <h4>{note.title}</h4>}<p>{noteText(note)}</p></div>)}</section>}
          {PERFORMANCE_FIELDS.some(([key]) => review.performance?.[key]) && <section className="nr-section"><h3>Performance read</h3>{PERFORMANCE_FIELDS.filter(([key]) => review.performance?.[key]).map(([key, label]) => <div className="nr-note" key={key}><h4>{label}</h4><p>{review.performance[key]}</p></div>)}</section>}
          {(adjustments.length > 0 || focus) && <section className="nr-section"><p className="nr-eyebrow">NEXT TAKE</p><h3>One note. Another take.</h3>
            {review.the_one_thing && <p className="nr-pullquote">{review.the_one_thing}</p>}
            {adjustments.map((note, i) => <div className="nr-note" key={i}><h4>{i + 1}. {note.title || 'Adjustment'}</h4><p>{noteText(note)}</p>{note.why && <p className="nr-muted">{note.why}</p>}</div>)}
            {focus && onNextTake && <button type="button" className="nr-primary" onClick={() => onNextTake(focus)}>Work on this note →</button>}
          </section>}
          {scores.length > 0 && <section className="nr-section" id={`${prefix}-scores`}><h3>Tape scores</h3><dl className="nr-score-list">{scores.map(({ key, label }) => <div key={key}><dt>{label}</dt><dd>{scoreValue(review.scores[key]).toFixed(1)} <span>/10</span></dd></div>)}</dl></section>}
          {dna.length > 0 && <div id={`${prefix}-dna`}><TapeReviewNotes review={{ performance_dna: review.performance_dna }} renderDna={renderDna} /></div>}
          {footer}
          {onCompare && <button type="button" onClick={onCompare}>Compare this take against another →</button>}
        </div>
        <aside className="nr-rail" aria-label="Tape and evidence">
          <div className="nr-pinned">
            <section className="nr-section" id={`${prefix}-player`}><p className="nr-eyebrow">THE FOOTAGE</p>
              {source && !mediaError ? <video ref={player} src={source} controls playsInline preload="metadata" aria-label="Reviewed take" onLoadedMetadata={() => setMediaReady(true)} onError={() => { setMediaError(true); setMediaReady(false); }} />
                : <p className="nr-empty">{mediaError ? 'This video could not be opened. Your notes are still here.' : 'The original video isn’t available in this session. Your notes are still here.'}</p>}
            </section>
            {sides && <details className="nr-section"><summary>Scene sides</summary><p className="nr-sides">{sides}</p></details>}
            <section className="nr-section nr-moments" id={`${prefix}-moments`}><h3>Timestamped moments</h3><p className="nr-muted">Approximate times cited in your notes.</p>
              {moments.length === 0 && <p className="nr-empty">No timestamped notes in this read.</p>}
              {moments.map((moment, i) => <button type="button" key={i} disabled={!mediaReady} onClick={() => setSeekError(seekToMoment(player.current, moment.seconds) ? '' : 'That moment is outside this video.')}><time>{moment.stamp}</time><span>{moment.text}</span></button>)}
              {seekError && <p role="status">{seekError}</p>}
            </section>
            {onSlate && <button type="button" onClick={onSlate}>Talk these notes through with Slate →</button>}
          </div>
        </aside>
      </div>
      {children}
    </article>
  );
}

function ScoreTimeline({ history, headlineScore }) {
  // Same device-local overall history as the mobile readout. Do not imply a
  // cross-device or 30-day aggregate; that is a separate server-side ticket.
  const points = history.filter(row => scoreValue(row?.avg) !== null).slice(-12);
  if (points.length < 2) return null;
  const average = points.reduce((sum, row) => sum + row.avg, 0) / points.length;
  const x = i => 8 + i * 384 / (points.length - 1);
  const y = value => 108 - value * 10;
  return <section className="nr-section nr-timeline" aria-label="Your scores over time">
    <h3>Your scores over time</h3>
    <p className="nr-muted">This device · last {points.length} reviews · average {average.toFixed(1)}/10
      {scoreValue(headlineScore) !== null && ` · this take ${headlineScore.toFixed(1)}/10`}</p>
    <div className="nr-average-bars">
      {[[headlineScore, 'This take'], [average, 'Device average']].filter(([value]) => scoreValue(value) !== null).map(([value, label]) =>
        <div key={label}><span>{label}</span><div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={10} aria-valuenow={value}><i style={{ width: `${value * 10}%` }} /></div><span>{value.toFixed(1)}</span></div>)}
    </div>
    <svg viewBox="0 0 400 120" role="img" aria-label={`Overall scores: ${points.map(row => row.avg.toFixed(1)).join(', ')}. Average ${average.toFixed(1)}.`}>
      <line x1="8" x2="392" y1={y(average)} y2={y(average)} stroke="var(--nr-dim)" strokeDasharray="4 4" />
      <polyline points={points.map((row, i) => `${x(i)},${y(row.avg)}`).join(' ')} fill="none" stroke="var(--nr-gold)" strokeWidth="2" />
      {points.map((row, i) => <circle key={i} cx={x(i)} cy={y(row.avg)} r="3" fill="var(--nr-gold)"><title>{row.avg.toFixed(1)}/10</title></circle>)}
    </svg>
  </section>;
}
