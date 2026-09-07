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
    const onNavigate = (event) => {
      if (event.detail?.tab !== 'tape-review') return;
      const previous = window.history.state || {};
      window.history.pushState({ ...previous, idx: (previous.idx || 0) + 1 }, '', '/dashboard/jericho?tab=tape');
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
