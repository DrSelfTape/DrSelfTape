// V-02: the RecapStoryCard pages, derived from a review the way the share
// cards derive theirs — real fields only, nothing invented. A trimmed (free)
// result yields just the read; a full one adds what's working + the one thing.
const text = (item) => (typeof item === 'string' ? item : item?.text || item?.note || '');

export function buildRecapPages(review, { band, avg, firstName } = {}) {
  if (!review) return [];
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
      tags: (review.tone_tags || []).filter(Boolean).slice(0, 3),
    });
  }
  const working = (review.whats_working || []).map(text).filter(Boolean).slice(0, 3);
  if (working.length) pages.push({ key: 'working', kicker: "What's working", title: 'Keep doing this', body: working });
  const fix = (review.adjustments || []).map(text).filter(Boolean)[0];
  if (fix) pages.push({ key: 'one-thing', kicker: 'The one thing', title: 'Next take, fix this', body: fix });
  return pages;
}
