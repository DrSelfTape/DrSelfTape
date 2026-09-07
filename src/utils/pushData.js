// B-01 catch: APNs delivers our custom keys NESTED — the BE sends
// {"aps": …, "data": {type, …}} and Capacitor hands the whole userInfo over as
// notification.data, so the fields live at notification.data.data. FCM
// flattens them. Every reader goes through here so both shapes route.
export function pushData(notif) {
  const raw = notif?.data || notif?.notification?.data || {};
  const nested = raw && typeof raw.data === 'object' && raw.data !== null ? raw.data : null;
  return nested ? { ...raw, ...nested } : raw;
}
