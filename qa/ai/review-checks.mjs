// Deterministic checks, not an acting-quality judge. Human calibration remains required.
export function checkReview(output, context = {}) {
  let r;
  try { r = typeof output === 'string' ? JSON.parse(output) : output; }
  catch { return { pass: false, score: 0, reason: 'invalid-json' }; }
  const problems = [];
  const text = x => typeof x === 'string' && x.trim().length > 0;
  if (!r || typeof r !== 'object' || Array.isArray(r)) return { pass: false, score: 0, reason: 'not-an-object' };
  if (!text(r.verdict)) problems.push('missing-verdict');
  if (!Array.isArray(r.whats_working) || !r.whats_working.length || r.whats_working.some(x => !text(x?.title) || !text(x?.detail))) problems.push('missing-strength');
  if (!Array.isArray(r.adjustments) || !r.adjustments.length || r.adjustments.some(x => !text(x?.note) || !text(x?.why))) problems.push('missing-actionable-adjustment');
  if (context.mode !== 'headline' && !text(r.the_one_thing)) problems.push('missing-next-take-focus');
  const prose = JSON.stringify(r);
  if (!context.hasHistory && /your (?:previous|prior|recent) (?:tapes?|work)|as (?:we|you) (?:discussed|worked)|recurring (?:habit|pattern)/i.test(prose)) problems.push('unsupported-history');
  if (/guarantee(?:d|s)? (?:you(?:'ll| will)? )?(?:a |the )?(?:booking|role|callback)|you will (?:definitely )?(?:book|get the role)/i.test(prose)) problems.push('booking-guarantee');
  if (/frame\s*#?\d+|dissociation test|unified mask/i.test(prose)) problems.push('internal-jargon');
  for (const match of prose.matchAll(/\b(\d+):(\d{2})\b/g)) {
    const seconds = Number(match[1]) * 60 + Number(match[2]);
    if (Number(match[2]) > 59 || (Number.isFinite(context.durationSeconds) && seconds > context.durationSeconds)) problems.push('invalid-timestamp');
  }
  for (const field of ['scores', 'performance_dna']) {
    if (r[field] === undefined) continue;
    if (!r[field] || typeof r[field] !== 'object' || Array.isArray(r[field])) { problems.push('invalid-score-map'); continue; }
    for (const value of Object.values(r[field])) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < (field === 'scores' ? 1 : 0) || value > 10) problems.push('invalid-score');
    }
  }
  const unsupported = typeof context.unsupportedDimensions === 'string'
    ? context.unsupportedDimensions.split(',').map(x => x.trim()).filter(Boolean)
    : context.unsupportedDimensions || [];
  for (const key of unsupported) {
    if (Object.hasOwn(r.performance_dna || {}, key)) problems.push('unsupported-dimension:' + key);
  }
  if (context.mode === 'full') {
    for (const key of ['emotional_arc', 'strongest_beat', 'choices', 'listening_presence', 'truth_vs_indicated']) {
      if (!text(r.performance?.[key])) problems.push('missing-performance:' + key);
    }
  }
  return { pass: problems.length === 0, score: problems.length ? 0 : 1, reason: problems.length ? [...new Set(problems)].join(', ') : 'Deterministic checks passed; coaching accuracy needs human review.' };
}

export default (output, context) => checkReview(output, context.vars);
