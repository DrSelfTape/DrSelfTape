import axiosInstance from '../redux/http';
import { openExternal } from './openExternal';
import { trackEvent } from './analytics';

export const COMMUNICATIONS_URL = '/v1/notifications/communications/';
export const CAMPAIGN_DESTINATIONS = ['home', 'auditions', 'scenes', 'connect', 'tape-review', 'profile', 'more', 'live'];
const PENDING_KEY = 'dst_pending_campaign';

export function clearCampaignNavigation() {
  try { sessionStorage.removeItem(PENDING_KEY); } catch { /* optional storage */ }
}

export function takeCampaignNavigation(userId) {
  try {
    const value = JSON.parse(sessionStorage.getItem(PENDING_KEY));
    if (!value || !userId) return null;
    clearCampaignNavigation();
    if (String(value.recipient_id) !== String(userId) || !Number.isFinite(value.at) || Date.now() - value.at > 300000 || Date.now() < value.at || !CAMPAIGN_DESTINATIONS.includes(value.cta_url)) return null;
    void campaignReceipt(value.campaign_id, 'opened', value.channel);
    return { tab: value.cta_url, campaign_id: value.campaign_id };
  } catch { return null; }
}

export function campaignReceipt(campaignId, event, channel = 'inbox') {
  if (!campaignId) return Promise.resolve();
  trackEvent(`campaign_${event}`, { campaign_id: campaignId, channel });
  return axiosInstance.post(`${COMMUNICATIONS_URL}${campaignId}/receipt/`, { event, channel }).catch(() => {});
}

export function trackCampaignArrival(search) {
  const params = new URLSearchParams(search);
  const id = params.get('campaign');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '') || params.get('campaign_channel') !== 'email') return;
  // Only an authenticated app arrival counts. No email tracking pixels or
  // raw redirect hits that scanners could inflate into human engagement.
  void campaignReceipt(id, 'opened', 'email');
  void campaignReceipt(id, 'clicked', 'email');
}

export const CAMPAIGN_ROUTES = { home: '/dashboard', auditions: '/dashboard/auditions', scenes: '/dashboard/scene-study',
  connect: '/dashboard/green-room', 'tape-review': '/dashboard/jericho?tab=tape', profile: '/dashboard/profile', more: '/dashboard', live: '/dashboard/scene-study' };

export async function openCampaign(data, channel = 'inbox', navigate) {
  const url = data?.cta_url?.trim();
  if (!url) return false;
  if (CAMPAIGN_DESTINATIONS.includes(url)) {
    if (navigate) navigate(CAMPAIGN_ROUTES[url]);
    else {
      if (data.recipient_id) {
        try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ recipient_id: data.recipient_id, campaign_id: data.campaign_id, cta_url: url, channel, at: Date.now() })); } catch { /* optional storage */ }
      }
      window.dispatchEvent(new CustomEvent('drst-navigate', { detail: { tab: url, campaign_id: data.campaign_id } }));
    }
  } else {
    let parsed;
    try { parsed = new URL(url); } catch { return false; }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return false;
    if (await openExternal(url) === false) throw new Error('Could not open this link. Please try again.');
  }
  void campaignReceipt(data.campaign_id, 'clicked', channel);
  return true;
}
