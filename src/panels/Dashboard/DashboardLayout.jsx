import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../../components/Sidebar.jsx'
import MobileApp from '../Mobile/MobileApp.jsx'
import { useIsMobile } from '../../hooks/useIsMobile';

export default function DashboardLayout() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileApp />;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="relative flex-1 ml-64 overflow-auto p-8 aurora-orbs aurora-orbs-live" style={{ background: 'var(--aurora-bg)' }}>
        {/* Subtle logo watermark */}
        <div
          className="pointer-events-none fixed inset-0 ml-64 flex items-center justify-center"
          style={{ opacity: 0.03, zIndex: 0 }}
        >
          <img src="/logo.png" alt="" className="w-[500px] h-auto select-none" draggable={false} />
        </div>
        <div className="relative z-[1]">
          <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#D4A85F] border-t-transparent rounded-full animate-spin" /></div>}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
