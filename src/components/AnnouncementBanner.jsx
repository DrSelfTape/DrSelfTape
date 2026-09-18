import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { X } from 'lucide-react';
import axiosInstance from '../redux/http';
import { openExternal } from '../utils/openExternal';
import { trackEvent } from '../utils/analytics';
import { readStored, storeValue, rememberBannerAction } from '../utils/bannerState';
import './banners.css';

const INTERNAL_TABS = new Set(['home', 'auditions', 'scenes', 'connect', 'tape-review', 'profile', 'more', 'live']);
export default function AnnouncementBanner() {
  const userId = useSelector(s => s.auth?.user?.id) || 'anonymous';
  const reviewed = useSelector(s => !!s.userSettings?.data?.tutorial_progress?.first_review);
  const key = `dst_announcement_dismissed:${userId}`;
  const [result, setResult] = useState(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const element = useRef(null);
  const seen = useRef(new Set());
  const busy = useRef(false);
  const ann = result?.owner === userId ? result.announcement : null;
  useEffect(() => {
    let cancelled = false, fetching = false;
    const refresh = async () => {
      if (fetching || document.visibilityState === 'hidden') return;
      fetching = true;
      try {
        const { data } = await axiosInstance.get('/v1/notifications/system/announcement/', {
          timeout: 8000, params: { platform: Capacitor.getPlatform() },
        });
        const a = data?.announcement || data?.data?.announcement || null;
        if (cancelled) return;
        const dismissed = readStored(key);
        const hidden = !a?.id || (Array.isArray(dismissed) && dismissed.includes(String(a.id))) || (a.ends_at && Date.parse(a.ends_at) <= Date.now());
        setResult({ owner: userId, announcement: hidden ? null : a });
      } catch { /* keep a previously loaded, still-valid announcement */ }
      finally { fetching = false; }
    };
    void refresh();
    const listener = Capacitor.isNativePlatform() ? CapApp.addListener('appStateChange', ({ isActive }) => { if (isActive) void refresh(); }) : null;
    document.addEventListener('visibilitychange', refresh);
    const timer = setInterval(refresh, 60 * 1000);
    return () => {
      cancelled = true; clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      listener?.then(handle => handle.remove()).catch(() => {});
    };
  }, [userId, reviewed, key]);
  useEffect(() => {
    if (!ann?.ends_at) return;
    const expires = Date.parse(ann.ends_at);
    const timer = setInterval(() => { if (Date.now() >= expires) setResult(null); }, 1000);
    return () => clearInterval(timer);
  }, [ann]);
  useEffect(() => {
    if (!ann || !element.current) return;
    const identity = `${userId}:${ann.id}`;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting) && !seen.current.has(identity)) {
        seen.current.add(identity);
        trackEvent('announcement_banner_viewed', { announcement_id: ann.id });
      }
    });
    observer.observe(element.current);
    return () => observer.disconnect();
  }, [ann, userId]);
  if (!ann) return null;
  const dismiss = (reason = 'dismissed') => {
    const old = readStored(key);
    storeValue(key, [...new Set([...(Array.isArray(old) ? old : []), String(ann.id)])].slice(-100));
    trackEvent('announcement_banner_dismissed', { announcement_id: ann.id, reason });
    setResult(null);
  };
  const url = (ann.cta_url || '').trim();
  const external = /^https:\/\//i.test(url);
  const validCta = external || INTERNAL_TABS.has(url);
  const onCta = async () => {
    if (busy.current || !validCta) return;
    busy.current = true; setOpening(true); setError('');
    trackEvent('announcement_banner_clicked', { announcement_id: ann.id, destination: external ? 'external' : url });
    try {
      if (external) {
        if (await openExternal(url) === false) throw new Error('Could not open link');
      } else {
        rememberBannerAction(ann.id, url, userId);
        window.dispatchEvent(new CustomEvent('drst-navigate', { detail: { tab: url } }));
      }
      dismiss('action');
    } catch {
      setError('Could not open that link. Please try again.');
      trackEvent('announcement_banner_open_failed', { announcement_id: ann.id });
    } finally { busy.current = false; setOpening(false); }
  };
  return <section ref={element} className="dst-banner dst-banner-in" aria-label="Announcement">
    <div className="dst-banner__content">
      <strong>{ann.title}</strong><p>{ann.body}</p>
      {error && <p role="alert">{error}</p>}
      {ann.cta_label && validCta && <div className="dst-banner__actions"><button type="button" onClick={onCta} disabled={opening}>{opening ? 'Opening…' : ann.cta_label}</button></div>}
    </div>
    <button type="button" className="dst-banner__close" onClick={() => dismiss()} aria-label="Dismiss announcement"><X size={20} aria-hidden="true" /></button>
  </section>;
}
