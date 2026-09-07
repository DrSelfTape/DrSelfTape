import React from 'react';
import ConsoleFrame from '../../../panels/Dashboard/ConsoleFrame.jsx';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { consoleSurfaceEnabled } from '../../../utils/consoleSurface';

// V-02: wrapper for the routes that live outside the /dashboard Outlet
// (/settings, /notifications, scene study, the auditions tracker). Desktop
// renders the same console frame as /dashboard; mobile renders the page under
// a slim bar with Home + Back. The old MUI SideMenu/Header shell is gone, so no
// route can trapdoor a desktop user out of the console any more.
export const Layout = ({ children }) => {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col" style={{
        background: 'var(--aurora-bg)',
        paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div className="flex items-center justify-between px-4 py-3 shrink-0">
          <button type="button" onClick={() => window.history.back()}
            className="font-semibold" style={{ color: 'var(--aurora-gold)', fontSize: 'var(--type-sm)' }}>
            ← Back
          </button>
          {/* A plain anchor: a full navigation works on mobile web whether or not
              there is history to go back to, and never depends on router navigate(). */}
          <a href="/dashboard" className="font-semibold" style={{ color: 'var(--aurora-gold)', fontSize: 'var(--type-sm)' }}>
            Home
          </a>
        </div>
        <div className="flex-1 min-h-0">{children}</div>
      </div>
    );
  }
  // These pages were written for a bounded, scrolling container (Notifications
  // uses h-full + an inner overflow list to keep its filters pinned). Give them
  // the same bounded height inside either frame: console paper island
  // (100vh - 120 minHeight - 64 padding) or the plain p-8 frame.
  const bounded = consoleSurfaceEnabled() ? 'calc(100vh - 184px)' : 'calc(100vh - 64px)';
  return (
    <ConsoleFrame>
      <div style={{ height: bounded, overflow: 'auto' }}>{children}</div>
    </ConsoleFrame>
  );
};
