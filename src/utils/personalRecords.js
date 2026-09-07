// Server records are authoritative. The account/tier-scoped copy is used only
// offline; legacy unscoped dst_personal_bests cannot be attributed to a user.
const KEYS = ['overall', 'framing', 'eyeline', 'lighting', 'energy_commitment', 'dynamic_range'];
const finiteScore = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10;

export function reviewRecordId(review) {
  if (review?._session_id) return `session:${review._session_id}`;
  if (review?._meta?.job_id) return `job:${review._meta.job_id}`;
  return '';
}

export function visiblePersonalRecords(data, allowDimensions) {
  if (!data || !Number.isInteger(data.count) || data.count < 0 || !data.bests ||
      !Array.isArray(data.history) || !Array.isArray(data.records)) {
    throw new Error('Personal records are unavailable right now.');
  }
  const keys = allowDimensions ? KEYS : ['overall'];
  return {
    count: data.count,
    first_review_at: data.first_review_at ?? null,
    last_review_at: data.last_review_at ?? null,
    bests: Object.fromEntries(Object.entries(data.bests).filter(([key, value]) => keys.includes(key) && finiteScore(value))),
    history: data.history.filter(entry => Number.isFinite(entry?.t) && finiteScore(entry?.avg)).slice(-50),
    records: data.records.filter(record => keys.includes(record?.key) && finiteScore(record.value) && finiteScore(record.prev))
      .map(({ key, value, prev }) => ({ key, value, prev })),
  };
}

export async function loadPersonalRecords({ request, userId, reviewId = '', allowDimensions = false, signal }) {
  if (userId == null) return null;
  const cacheKey = `dst_personal_bests:${userId}:${allowDimensions ? 'full' : 'overall'}`;
  const offlineCopy = () => {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey));
      const data = visiblePersonalRecords(cached.data, allowDimensions);
      return { ...data, records: cached.reviewId === reviewId ? data.records : [] };
    } catch { return null; }
  };
  if (navigator.onLine === false) return offlineCopy();
  let response;
  try {
    response = await request('/v1/ai/personal-records/', {
      params: reviewId ? { review_id: reviewId } : {}, signal, timeout: 8000,
    });
  } catch (error) {
    // HTTP/auth failures and timeouts while online must never resurrect cache.
    if (!signal?.aborted && !error?.response && navigator.onLine === false) return offlineCopy();
    throw error;
  }
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const data = visiblePersonalRecords(response.data?.data, allowDimensions);
  try { localStorage.setItem(cacheKey, JSON.stringify({ reviewId, data })); } catch { /* private mode */ }
  return data;
}
