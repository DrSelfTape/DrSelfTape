// Smart link: /go/<campaign> — counts the click server-side in PostHog, then
// routes iPhones to the App Store and everyone else into the web app. Exists
// because the App Store strips every campaign parameter: this hop is the only
// place the comment-gate → install funnel can be measured.
const APP_STORE = 'https://apps.apple.com/us/app/id6770320460';
const POSTHOG_KEY = 'phc_uPT2jCsZhm9ZdJbGoPjUtDQNKjmkT9WK4EzYY34trhhT'; // public write-only key

// The auto-submitter tool download. PLACEHOLDER until Joseph supplies the real
// public link (Drive/Dropbox/Gumroad). Campaigns ending in `-tool` route here;
// everything else is an app-install link (iOS → App Store, else web).
const TOOL_URL = 'https://drselftape.app/?tool=pending';

export default async function handler(req, res) {
  const campaign = String(req.query.c || 'link').slice(0, 60).replace(/[^a-zA-Z0-9_-]/g, '');
  const ua = String(req.headers['user-agent'] || '');
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const wantsTool = campaign.endsWith('-tool');
  const dest = wantsTool
    ? TOOL_URL
    : isIOS
      ? APP_STORE
      : `https://drselftape.app/?utm_source=smartlink&utm_medium=redirect&utm_campaign=${encodeURIComponent(campaign)}`;

  // Fire-and-bound capture: never hold the redirect hostage to telemetry —
  // 800ms budget, then go regardless.
  try {
    await Promise.race([
      fetch('https://us.i.posthog.com/capture/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: POSTHOG_KEY,
          event: 'smart_link_click',
          distinct_id: `smartlink-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          properties: {
            campaign,
            platform: isIOS ? 'ios' : 'other',
            destination: wantsTool ? 'tool' : (isIOS ? 'app_store' : 'web'),
            ua: ua.slice(0, 200),
          },
        }),
      }),
      new Promise((resolve) => { setTimeout(resolve, 800); }),
    ]);
  } catch { /* count lost, click saved */ }

  res.setHeader('Cache-Control', 'no-store');
  res.redirect(302, dest);
}
