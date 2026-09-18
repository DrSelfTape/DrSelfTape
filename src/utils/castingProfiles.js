export const CASTING_PROVIDERS = [
  {
    key: 'actors_access_profile_url', name: 'Actors Access',
    placeholder: 'https://resumes.actorsaccess.com/yourname',
    help: 'https://actorsaccess.freshdesk.com/support/solutions/articles/17000046534-actors-setting-up-and-sharing-your-custom-link',
    steps: ['Sign in to Actors Access. Choose ABOUT ME → My Profile.', 'Find SHARE MY PROFILE → Actors Access Custom Link. Create and save your custom link if needed.', 'Preview your public profile, then copy the link and paste it below. Use your public résumé link, not your CMail inbox address.'],
  },
  {
    key: 'casting_networks_profile_url', name: 'Casting Networks',
    placeholder: 'https://app.castingnetworks.com/talent/public-profile/yourname',
    help: 'https://support.castingnetworks.com/en/articles/11227841',
    steps: ['Sign in. Open your name menu → Account Settings → Profile Settings, then select your personal profile.', 'Under Custom URL, choose a name and save. Casting Networks currently requires an active Premium membership to create and maintain a custom link.', 'Open Your Profile → Copy Sharable Profile Link. Preview it, then paste that public link below.'],
  },
];

export function normalizeCastingProfile(key, input) {
  const value = String(input ?? '').trim();
  if (!value) return '';
  let url;
  try { url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`); }
  catch { throw new Error('Paste a valid public profile link.'); }
  const safe = url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.search && !url.hash;
  const aa = key === 'actors_access_profile_url'
    && ['resumes.actorsaccess.com', 'resumes.breakdownexpress.com'].includes(url.hostname)
    && /^\/[a-z0-9_-]+\/?$/i.test(url.pathname);
  const cn = key === 'casting_networks_profile_url'
    && url.hostname === 'app.castingnetworks.com'
    && /^\/talent\/public-profile\/[a-z0-9_-]+\/?$/i.test(url.pathname);
  if (!safe || !(aa || cn)) throw new Error('Use the public profile link shown in the tutorial, without tracking parameters. Inbox and account links cannot be connected.');
  return url.href;
}
