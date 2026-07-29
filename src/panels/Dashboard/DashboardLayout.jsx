import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../../components/Sidebar.jsx'
import MobileApp from '../Mobile/MobileApp.jsx'
import AnnouncementBanner from '../../components/AnnouncementBanner.jsx'
import ConsoleCommandPalette from '../../components/ConsoleCommandPalette.jsx'
import { useIsMobile } from '../../hooks/useIsMobile';
import { consoleSurfaceEnabled } from '../../utils/consoleSurface';

export default function DashboardLayout() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileApp />;
  }

  // Aurora Noir Ring 2: the studio console. Noir stage + one light source;
  // the shared feature panels render on a light "script page" island
  // (.console-paper resets the tokens back to light) floating over it, so
  // nothing inside the panels needs to know about the console at all.
  if (consoleSurfaceEnabled()) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <ConsoleCommandPalette />
        <main className="relative flex-1 ml-64 overflow-auto" style={{ background: 'var(--aurora-bg)' }}>
          {/* The one light source — upper region, ~5% gold, per the spec */}
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 ml-64" style={{
            zIndex: 0,
            background: 'radial-gradient(55% 40% at 72% 0%, rgba(252,224,114,0.05) 0%, transparent 60%)',
          }} />
          <div className="relative z-[1] px-8 pt-6 pb-10" style={{ maxWidth: 1240, margin: '0 auto' }}>
            <AnnouncementBanner />
            {/* The script page under the stage light */}
            <div className="console-paper" style={{
              borderRadius: 22, background: '#FAFAF7', padding: 32, minHeight: 'calc(100vh - 120px)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.5), 0 24px 60px rgba(0,0,0,0.45)',
              border: '1px solid rgba(245,237,220,0.06)',
            }}>
              <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#D4A85F] border-t-transparent rounded-full animate-spin" /></div>}>
                <Outlet />
              </Suspense>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <ConsoleCommandPalette />
      <main className="relative flex-1 ml-64 overflow-auto p-8 aurora-orbs aurora-orbs-live" style={{ background: 'var(--aurora-bg)' }}>
        {/* Subtle logo watermark */}
        <div
          className="pointer-events-none fixed inset-0 ml-64 flex items-center justify-center"
          style={{ opacity: 0.03, zIndex: 0 }}
        >
          <img src="/logo.png" alt="" className="w-[500px] h-auto select-none" draggable={false} />
        </div>
        <div className="relative z-[1]">
          <AnnouncementBanner />
          <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#D4A85F] border-t-transparent rounded-full animate-spin" /></div>}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
