// Device-local personal bests across Tape Reviews (rank 14, Fitbod pattern:
// reframe review #5 as a chance to beat review #4). Local-first on purpose —
// honest per-device baseline now, swappable for a BE aggregate later without
// changing the render contract.

const KEY = 'dst_personal_bests';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

/**
 * Compare this review's scores against stored bests; persist new highs.
 * Returns [] on the very first recorded review (everything would be a
 * "record" — that's a baseline, not an achievement).
 *
 * @param {Object} scores { [key]: number } per-dimension scores
 * @param {Array}  dims   [{key, label}] dimension metadata
 * @param {number|null} avg overall average
 * @returns {Array<{key, label, value, prev}>} new records, overall first
 */
export function recordAndDiffBests(scores, dims, avg) {
  const bests = load();
  const isBaseline = Object.keys(bests).length === 0;
  const records = [];

  const consider = (key, label, value) => {
    if (!Number.isFinite(value)) return;
    const prev = bests[key];
    if (prev == null || value > prev) {
      bests[key] = value;
      if (!isBaseline && prev != null) records.push({ key, label, value, prev });
    }
  };

  consider('overall', 'Overall', avg);
  (dims || []).forEach((d) => consider(d.key, d.label, Number(scores?.[d.key])));

  try { localStorage.setItem(KEY, JSON.stringify(bests)); } catch { /* private mode */ }
  return records;
}

// ── Score history (the "watch your scores climb" loop) ──
// Device-local overall-average timeline, capped at the last 50 reviews.
// Same local-first contract as the bests above.
const HISTORY_KEY = 'dst_score_history';

export function appendScoreHistory(avg) {
  if (!Number.isFinite(avg)) return getScoreHistory();
  let hist = getScoreHistory();
  hist = [...hist, { t: Date.now(), avg: Math.round(avg * 10) / 10 }].slice(-50);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(hist)); } catch { /* private mode */ }
  return hist;
}

export function getScoreHistory() {
  try {
    const h = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(h) ? h.filter((e) => Number.isFinite(e?.avg)) : [];
  } catch { return []; }
}
