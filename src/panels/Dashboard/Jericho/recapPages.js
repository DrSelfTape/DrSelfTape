// V-02: the RecapStoryCard pages, derived from a review the way the share
// cards derive theirs — real fields only, nothing invented. A trimmed (free)
// result yields just the read; a full one adds what's working + the one thing.
//
// Payload shapes the BE actually emits (apps/ai/selftape_analysis.py):
//   whats_working: [{title, detail}] — or a bare non-empty string (accepted by
//   the BE validator), adjustments: [{title, note, why}], the_one_thing: string.
// Older results carried plain strings / {text}; all of those still read.
const text = (item) => {
  if (typeof item === 'string') return item.trim();
  if (!item || typeof item !== 'object') return '';
  const title = String(item.title || '').trim();
  const body = String(item.detail || item.note || item.text || '').trim();
  if (title && body) return `${title} — ${body}`;
  return title || body;
};
const list = (value) => (Array.isArray(value) ? value : value ? [value] : []);

export function buildRecapPages(review, { band, avg, firstName } = {}) {
  if (!review || typeof review !== 'object') return [];
  const pages = [];
  const verdict = String(review.verdict || '').trim();
  const score = Number.isFinite(avg) ? Math.round(avg * 10) / 10 : null;
  if (band?.label || verdict) {
    pages.push({
      key: 'read',
      kicker: firstName ? `${firstName}, the read` : 'The read',
      title: band?.label || 'Your read',
      score,
      body: verdict,
      tags: list(review.tone_tags).filter((t) => typeof t === 'string' && t.trim()).slice(0, 3),
    });
  }
  const working = list(review.whats_working).map(text).filter(Boolean).slice(0, 3);
  if (working.length) pages.push({ key: 'working', kicker: "What's working", title: 'Keep doing this', body: working });
  const oneThing = typeof review.the_one_thing === 'string' && review.the_one_thing.trim()
    ? review.the_one_thing.trim()
    : list(review.adjustments).map(text).filter(Boolean)[0];
  if (oneThing) pages.push({ key: 'one-thing', kicker: 'The one thing', title: 'Next take, fix this', body: oneThing });
  return pages;
}
