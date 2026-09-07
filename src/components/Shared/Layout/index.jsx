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
      // 100dvh + min-h-0 give the page a DEFINITE height so a screen built on
      // h-full with an inner scrolling list (Notifications) keeps its filters
      // pinned instead of growing with the list.
      <div className="flex flex-col" style={{
        height: '100dvh', background: 'var(--aurora-bg)',
        paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div className="flex items-center justify-between gap-4 px-4 py-3 shrink-0">
          <button type="button" onClick={() => window.history.back()}
            className="font-semibold" style={{ color: 'var(--aurora-gold)', fontSize: 'var(--type-sm)' }}>
            ← Back
          </button>
          {/* Plain anchors: a full navigation works on mobile web whether or not
              there is history to go back to, and never depends on router
              navigate(). Settings carries the account controls (role switch)
              the legacy header used to hold. */}
          <div className="flex items-center gap-4">
            <a href="/settings" className="font-semibold" style={{ color: 'var(--aurora-gold)', fontSize: 'var(--type-sm)' }}>
              Settings
            </a>
            <a href="/dashboard" className="font-semibold" style={{ color: 'var(--aurora-gold)', fontSize: 'var(--type-sm)' }}>
              Home
            </a>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">{children}</div>
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
