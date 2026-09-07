// One in-memory handoff survives lazy panel mounting and a native cold start.
// It contains only a record ID; each panel still uses its user-scoped API data.
const TYPES = new Set(['audition_update', 'audition_reminder', 'audition-reminder', 'callback_reminder', 'callback-reminder']);
let pending = null;
const listeners = new Set();

export function auditionNotificationDestination(data = {}) {
  if (!TYPES.has(data.type)) return null;
  const id = value => /^[1-9]\d*$/.test(String(value ?? '')) ? String(value) : null;
  const auditionId = id(data.audition_id);
  const submissionId = id(data.submission_id);
  const panel = !auditionId && submissionId ? 'submissions' : 'auditions';
  // `mobile` is the shape MobileApp's drst-navigate handler accepts: the
  // audition tracker is a TAB (a registered screen, reachable via setTab even
  // though it left the tab bar), while Submissions is a registered PANEL.
  // A {panel:'auditions'} would be silently dropped by the panel registry.
  const mobile = panel === 'auditions' ? { tab: 'auditions' } : { panel: 'submissions' };
  return { panel, id: auditionId || submissionId, web: `/dashboard/${panel}`, mobile };
}

export function findNotifiedAudition(tracker, id) {
  for (const [column, items] of Object.entries(tracker?.data || {})) {
    if (!Array.isArray(items)) continue;
    const item = items.find(audition => String(audition.id) === id);
    if (item) return { ...item, _column: column };
  }
  return null;
}

export function queueAuditionNotification(data) {
  const target = auditionNotificationDestination(data);
  if (!target) return null;
  pending = target;
  listeners.forEach(listener => listener());
  return target;
}

export const getPendingAuditionNotification = () => pending;
export function subscribeAuditionNotification(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function clearAuditionNotification(target) {
  // A late response from one panel must not consume a newer notification.
  if (pending !== target) return;
  pending = null;
  listeners.forEach(listener => listener());
}
