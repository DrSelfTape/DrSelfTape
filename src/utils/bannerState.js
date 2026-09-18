export const REMIND_AFTER_MS = 3 * 24 * 60 * 60 * 1000;
export function validVersion(value) { return typeof value === 'string' && /^\d+\.\d+\.\d+$/.test(value); }
export function versionGt(a, b) {
  if (!validVersion(a) || !validVersion(b)) return false;
  const left = a.split('.').map(Number), right = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) { if (left[i] !== right[i]) return left[i] > right[i]; }
  return false;
}
export function readStored(key, storage) {
  try { return JSON.parse((storage || globalThis.localStorage).getItem(key)); } catch { return null; }
}
export function storeValue(key, value, storage) {
  try { (storage || globalThis.localStorage).setItem(key, JSON.stringify(value)); } catch { /* optional persistence */ }
}
export function snoozed(value, version, now = Date.now()) {
  return value?.version === version && Number.isFinite(value?.until) && value.until > now;
}
export function rememberBannerAction(id, destination, userId) {
  try { sessionStorage.setItem('dst_banner_action', JSON.stringify({ id, destination, userId, at: Date.now() })); } catch { /* optional */ }
}
export function takeBannerAttribution(event, userId, storage, now = Date.now()) {
  if (!['first_review_completed', 'tape_review_completed'].includes(event)) return {};
  try {
    storage = storage || globalThis.sessionStorage;
    const value = readStored('dst_banner_action', storage);
    if (!value || value.userId !== userId || value.destination !== 'tape-review' || !Number.isFinite(value.at) || now - value.at > 30 * 60 * 1000 || now < value.at) return {};
    storage.removeItem('dst_banner_action');
    return { announcement_id: value.id, entry_point: 'announcement_banner' };
  } catch { return {}; }
}
