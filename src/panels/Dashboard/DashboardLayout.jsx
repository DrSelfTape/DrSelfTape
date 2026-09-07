import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Outlet } from 'react-router-dom'
import MobileApp from '../Mobile/MobileApp.jsx'
import ConsoleFrame from './ConsoleFrame.jsx'
import { useIsMobile } from '../../hooks/useIsMobile';

export default function DashboardLayout() {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile || !Capacitor.isNativePlatform()) return;
    // iPad mounts this Outlet, not MobileApp's tab-event receiver. Bridge only
    // the library's review destination to BrowserRouter's history listener;
    // native navigate() cannot be relied on, and a reload would lose Redux's
    // selected recording before the review panel consumes it.
    // B-01 catch: only tape-review was bridged, so V-03's "Record a take",
    // the Green Room "Find a reader" CTA and audition push taps were dropped
    // on iPad. Map every mobile destination to its console route.
    const routeFor = ({ tab, panel, matchId } = {}) => {
      if (tab === 'tape-review') return '/dashboard/jericho?tab=tape';
      if (tab === 'home') return '/dashboard';
      if (tab === 'scenes') return '/dashboard/scene-study';
      if (tab === 'auditions') return '/dashboard/auditions';
      if (tab === 'connect' || tab === 'green-room' || panel === 'green-room') {
        return matchId ? `/dashboard/green-room/${matchId}` : '/dashboard/green-room';
      }
      const PANELS = {
        'find-a-reader': '/dashboard/readers', 'who-wants-to-read': '/dashboard/who-wants-to-read',
        favorites: '/dashboard/readers', submissions: '/dashboard/submissions', 'self-tapes': '/dashboard/self-tapes',
        jericho: '/dashboard/jericho', 'cd-sim': '/dashboard/cd-sim', 'craft-journey': '/dashboard/craft-journey',
        leaderboard: '/dashboard/leaderboard', scripts: '/dashboard/scripts', generator: '/dashboard/generator',
        membership: '/dashboard/membership', 'dash-profile': '/dashboard/profile', referral: '/dashboard/referral',
        marketplace: '/dashboard/marketplace', 'reader-profile': '/dashboard/readers',
      };
      return PANELS[panel] || null;
    };
    const onNavigate = (event) => {
      const path = routeFor(event.detail);
      if (!path) return;
      const previous = window.history.state || {};
      window.history.pushState({ ...previous, idx: (previous.idx || 0) + 1 }, '', path);
      window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
    };
    window.addEventListener('drst-navigate', onNavigate);
    return () => window.removeEventListener('drst-navigate', onNavigate);
  }, [isMobile]);

  if (isMobile) {
    return <MobileApp />;
  }

  // V-02: the chrome lives in ConsoleFrame so legacy routes share it.
  return (
    <ConsoleFrame>
      <Outlet />
    </ConsoleFrame>
  );
}
