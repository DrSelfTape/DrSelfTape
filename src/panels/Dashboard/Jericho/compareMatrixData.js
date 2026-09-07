const PERFORMANCE = [
  ['emotional_arc', 'Emotional arc'], ['strongest_beat', 'Strongest beat'],
  ['choices', 'The choice'], ['listening_presence', 'Listening & presence'],
  ['truth_vs_indicated', 'Truth vs. indicated'],
];
const TECHNICAL = [['framing', 'Framing'], ['eyeline', 'Eyeline'], ['lighting', 'Lighting'], ['energy_commitment', 'Energy & Commitment'], ['dynamic_range', 'Dynamic Range']];
const DNA = [['emotional_range', 'Emotional Range'], ['cold_read', 'Cold Read'], ['comedy_timing', 'Comedy Timing'], ['dramatic_depth', 'Dramatic Depth'], ['physicality', 'Physicality'], ['vocal_variety', 'Vocal Variety']];
const text = value => typeof value === 'string' ? value : value?.note || value?.detail || '';
const list = value => Array.isArray(value) ? value.map(text).filter(Boolean).join('\n\n') : '';
const number = (value, max) => value != null && value !== '' && typeof value !== 'boolean' && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= max ? Number(value) : null;
const score = (value, max = 10) => { const n = number(value, max); return n === null ? null : `${n.toFixed(1)} / ${max}`; };

export function matrixTakes(result, locked) {
  const byNumber = new Map((Array.isArray(result.takes) ? result.takes : []).filter(t => Number.isInteger(Number(t?.take)) && Number(t.take) > 0).map(t => [String(t.take), t]));
  const order = [...new Set((Array.isArray(result.ranking) ? result.ranking : []).map(String))].filter(n => byNumber.has(n));
  const duplicate = ['duplicate', 'single'].includes(result.comparison_status);
  return order.map(n => {
    const take = byNumber.get(n);
    return { ...take, take: Number(n), analysis: locked ? {} : take.analysis || {}, winner: !duplicate && n === String(result.winner) };
  });
}

export function matrixRows(takes, tab) {
  let rows;
  if (tab === 'scores') {
    rows = [{ key: 'overall', label: 'Overall', values: takes.map(t => score(t.score, 100)) },
      ...DNA.map(([key, label]) => ({ key, label, values: takes.map(t => score(t.analysis.performance_dna?.[key])) }))];
  } else if (tab === 'technicals') {
    rows = TECHNICAL.map(([key, label]) => ({ key, label, values: takes.map(t => score(t.analysis.scores?.[key])) }));
    rows.push({ key: 'shot_size', label: 'Shot size', values: takes.map(t => t.analysis.shot_size || null) });
    rows.push({ key: 'stayed_in_frame', label: 'Stayed in frame', values: takes.map(t => t.analysis.stayed_in_frame === true ? 'Yes' : t.analysis.stayed_in_frame === false ? 'No' : null) });
  } else {
    rows = [
      ...[['one_line', 'At a glance'], ['best_moment', 'Best moment'], ['steal', 'Steal from this take']].map(([key, label]) => ({ key, label, values: takes.map(t => t[key] || null) })),
      { key: 'verdict', label: 'Quick read', values: takes.map(t => t.analysis.verdict || null) },
      ...PERFORMANCE.map(([key, label]) => ({ key, label, values: takes.map(t => t.analysis.performance?.[key] || null) })),
      { key: 'working', label: 'What’s working', values: takes.map(t => list(t.analysis.whats_working)) },
      { key: 'adjustments', label: 'Next take', values: takes.map(t => list(t.analysis.adjustments)) },
      { key: 'one_thing', label: 'The one thing', values: takes.map(t => t.analysis.the_one_thing || null) },
    ];
  }
  return rows.filter(row => row.key === 'overall' || row.values.some(value => value != null && value !== ''));
}

export function scrubTake(video, { clientX, left, width, pointerType = 'mouse', reducedMotion = false }) {
  if (!video || video.paused === false || reducedMotion || pointerType !== 'mouse' || !Number.isFinite(video.duration) || video.duration <= 0 || !Number.isFinite(clientX) || !Number.isFinite(left) || !Number.isFinite(width) || width <= 0) return false;
  video.currentTime = Math.max(0, Math.min(1, (clientX - left) / width)) * Math.max(0, video.duration - 0.05);
  return true;
}

export const MATRIX_TABS = ['scores', 'notes', 'technicals'];
export function nextMatrixTab(tab, key) {
  const index = MATRIX_TABS.indexOf(tab);
  if (key === 'ArrowRight') return MATRIX_TABS[(index + 1) % 3];
  if (key === 'ArrowLeft') return MATRIX_TABS[(index + 2) % 3];
  if (key === 'Home') return MATRIX_TABS[0];
  if (key === 'End') return MATRIX_TABS[2];
  return null;
}
