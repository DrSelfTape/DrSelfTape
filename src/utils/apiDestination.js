// The authenticated client is for our API only. Uploads and external links
// must use their separate unauthenticated clients, never inherit the JWT.
export function assertApiDestination(url, requestBase, apiBase) {
  let allowed = false;
  try {
    const trusted = new URL(apiBase);
    const base = new URL(requestBase || apiBase);
    const destination = new URL(url || '', `${base.href.replace(/\/$/, '')}/`);
    allowed = base.origin === trusted.origin && destination.origin === trusted.origin
      && !destination.username && !destination.password;
  } catch { /* reject malformed or non-HTTP destinations below */ }
  if (!allowed) {
    const error = new Error('Authenticated requests must use the configured API origin.');
    error.code = 'ERR_UNTRUSTED_API_DESTINATION';
    throw error;
  }
}
