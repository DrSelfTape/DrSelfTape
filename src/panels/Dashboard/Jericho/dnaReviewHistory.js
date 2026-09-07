const DAY = 86400000;
export const DNA_KEYS = ['emotional_range', 'cold_read', 'comedy_timing', 'dramatic_depth', 'physicality', 'vocal_variety'];
export function dnaNumber(value) {
  if (value == null || value === '' || typeof value === 'boolean') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 10 ? n : null;
}
const unwrap = response => {
  if (response.data?.success === false) throw new Error('Your review history could not be loaded.');
  return response.data && Object.hasOwn(response.data, 'data') ? response.data.data : response.data;
};

// On-demand reads through the existing owner-scoped, entitlement-gated detail
// endpoint. The list is capped at 50 and has no pagination. Never label a
// truncated or partially failed sample as an actor's full 30-day average.
export async function loadDnaHistory(get, { now = Date.now(), signal } = {}) {
  const rows = unwrap(await get('/v1/ai/session-log/', { params: { limit: 50 }, signal }));
  if (!Array.isArray(rows) || rows.some(row => !row?.id || !Number.isFinite(Date.parse(row.created_at)))) {
    throw new Error('Your review history could not be loaded.');
  }
  const cutoff = now - 30 * DAY;
  if (rows.length >= 50 && rows.every(row => Date.parse(row.created_at) >= cutoff)) {
    throw new Error('Your 30-day history exceeds the available archive window. An average is unavailable.');
  }
  const recent = rows.filter(row => row.session_type === 'self_tape_review' && Date.parse(row.created_at) >= cutoff && Date.parse(row.created_at) <= now);
  const unique = [...new Map(recent.map(row => [row.id, row])).values()];
  const details = [];
  for (let i = 0; i < unique.length; i += 3) {
    if (signal?.aborted) throw new Error('Review history request cancelled.');
    const batch = await Promise.all(unique.slice(i, i + 3).map(async row => {
      const detail = unwrap(await get(`/v1/ai/session-log/${row.id}/`, { signal }));
      if (String(detail?.id) !== String(row.id) || detail.session_type !== 'self_tape_review' || !detail.ai_feedback || typeof detail.ai_feedback !== 'object') {
        throw new Error('Your review history could not be loaded.');
      }
      return detail;
    }));
    details.push(...batch);
  }
  const counts = {}, average = {};
  for (const key of DNA_KEYS) {
    const values = details.map(row => dnaNumber(row.ai_feedback.performance_dna?.[key])).filter(value => value !== null);
    counts[key] = values.length;
    if (values.length) average[key] = values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  const series = details.map(row => ({ date: row.created_at, score: dnaNumber(row.ai_feedback.headline_score) }))
    .filter(row => row.score !== null).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  return { average, counts, count: details.length, series };
}

// A missing dimension is an observation gap, never a point at the origin.
export function dnaPoints(values, radius = 94, cx = 190, cy = 158) {
  return DNA_KEYS.map((key, index) => {
    const value = dnaNumber(values?.[key]);
    const angle = index * Math.PI / 3 - Math.PI / 2;
    return { key, value, x: cx + Math.cos(angle) * radius * (value ?? 0) / 10,
      y: cy + Math.sin(angle) * radius * (value ?? 0) / 10 };
  });
}
