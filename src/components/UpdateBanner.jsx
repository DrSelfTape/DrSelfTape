import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import axiosInstance from '../redux/http';
import { openExternal } from '../utils/openExternal';
import { trackEvent } from '../utils/analytics';
import { REMIND_AFTER_MS, readStored, storeValue, snoozed, validVersion, versionGt } from '../utils/bannerState';
import './banners.css';

const SNOOZE_KEY = 'dst_update_snooze_v2';
const ACTION_KEY = 'dst_update_action';
export default function UpdateBanner() {
  const [versions, setVersions] = useState(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const [snooze, setSnooze] = useState(() => readStored(SNOOZE_KEY));
  const [now, setNow] = useState(Date.now);
  const shown = useRef(new Set());
  const busy = useRef(false);
  const element = useRef(null);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false, refreshing = false;
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      setNow(Date.now());
      try {
        const [info, response] = await Promise.all([
          CapApp.getInfo(), axiosInstance.get('/v1/notifications/system/latest-version/', { timeout: 8000 }),
        ]);
        const latest = response.data?.[Capacitor.getPlatform()];
        if (cancelled) return;
        if (!validVersion(info?.version) || !validVersion(latest)) { setVersions(null); return; }
        setVersions({ installed: info.version, latest });
        const action = readStored(ACTION_KEY);
        if (validVersion(action?.target) && !versionGt(action.target, info.version)) {
          trackEvent('update_banner_completed', { from: action.from, to: info.version });
          storeValue(ACTION_KEY, null);
        }
      } catch { if (!cancelled) setVersions(null); }
      finally { refreshing = false; }
    };
    const resume = () => {
      if (document.visibilityState === 'hidden') return;
      busy.current = false;
      setOpening(false);
      void refresh();
    };
    void refresh();
    const listener = CapApp.addListener('appStateChange', ({ isActive }) => { if (isActive) resume(); });
    document.addEventListener('visibilitychange', resume);
    const timer = setInterval(resume, 60 * 1000);
    return () => {
      cancelled = true; clearInterval(timer);
      document.removeEventListener('visibilitychange', resume);
      listener.then(handle => handle.remove()).catch(() => {});
    };
  }, []);
  const visible = !!versions && versionGt(versions.latest, versions.installed) && !snoozed(snooze, versions.latest, now);
  useEffect(() => {
    if (!visible || !element.current || shown.current.has(versions.latest)) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting) && !shown.current.has(versions.latest)) {
        shown.current.add(versions.latest);
        trackEvent('update_banner_viewed', { from: versions.installed, to: versions.latest });
      }
    });
    observer.observe(element.current);
    return () => observer.disconnect();
  }, [visible, versions]);
  if (!visible) return null;
  const android = Capacitor.getPlatform() === 'android';
  const store = android ? 'Google Play' : 'App Store';
  const handleUpdate = async () => {
    if (busy.current) return;
    busy.current = true; setOpening(true); setError('');
    trackEvent('update_banner_tapped', { from: versions.installed, to: versions.latest });
    try {
      const url = android ? 'https://play.google.com/store/apps/details?id=com.drselftape.app' : 'itms-apps://itunes.apple.com/app/id6770320460';
      if (await openExternal(url) === false) throw new Error('Store unavailable');
      storeValue(ACTION_KEY, { from: versions.installed, target: versions.latest });
    } catch {
      setError(`Could not open ${store}. Please try again.`);
      trackEvent('update_banner_open_failed', { to: versions.latest });
    } finally { busy.current = false; setOpening(false); }
  };
  const remindLater = () => {
    const value = { version: versions.latest, until: Date.now() + REMIND_AFTER_MS };
    storeValue(SNOOZE_KEY, value); setSnooze(value);
    trackEvent('update_banner_dismissed', { to: versions.latest, remind_after_hours: 72 });
  };
  return <section ref={element} className="dst-banner dst-banner--update dst-banner-in" aria-label="App update">
    <div className="dst-banner__content">
      <strong>Dr Self Tape {versions.latest} is available</strong>
      <p>Get the latest version from {store}.</p>
      {error && <p role="alert">{error}</p>}
      <div className="dst-banner__actions">
        <button type="button" onClick={handleUpdate} disabled={opening}>{opening ? 'Opening…' : 'Update now'}</button>
        <button type="button" className="dst-banner__secondary" onClick={remindLater}>Remind me in 3 days</button>
      </div>
    </div>
  </section>;
}
