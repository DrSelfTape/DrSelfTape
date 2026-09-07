import React from 'react';
import ConsoleFrame from '../../../panels/Dashboard/ConsoleFrame.jsx';
import { useIsMobile } from '../../../hooks/useIsMobile';

// V-02: wrapper for the routes that live outside the /dashboard Outlet
// (/settings, /notifications, scene study, the auditions tracker). Desktop
// renders the same console frame as /dashboard; mobile renders the page bare
// with a back affordance. The old MUI SideMenu/Header shell is gone, so no
// route can trapdoor a desktop user out of the console any more.
export const Layout = ({ children }) => {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <div className="min-h-screen overflow-auto" style={{
        background: 'var(--aurora-bg)',
        paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <button type="button" onClick={() => window.history.back()}
          className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--aurora-gold)' }}>
          ← Back
        </button>
        {children}
      </div>
    );
  }
  return <ConsoleFrame>{children}</ConsoleFrame>;
};
