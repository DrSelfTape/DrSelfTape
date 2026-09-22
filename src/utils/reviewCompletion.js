// Completion receipts belong to a generated review, never a screen mount.
// Keep an in-memory fallback when storage is unavailable (e.g. private mode).
const claimed = new Set();

export function reviewCompletionId(result, attempt = {}) {
  if (result?._session_id != null) return `session:${result._session_id}`;
  if (result?.job_id) return `job:${result.job_id}`;
  if (attempt.arg?.idempotencyKey) return `attempt:${attempt.arg.idempotencyKey}`;
  if (attempt.arg?.jobId) return `job:${attempt.arg.jobId}`;
  return attempt.requestId ? `request:${attempt.requestId}` : null;
}

export function claimReviewCompletion(userId, completionId) {
  if (!completionId) return false;
  const key = `dst_review_completed:v2:${userId}:${completionId}`;
  if (claimed.has(key)) return false;
  try {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, '1');
  } catch { /* Memory still prevents duplicates during this app session. */ }
  claimed.add(key);
  return true;
}
