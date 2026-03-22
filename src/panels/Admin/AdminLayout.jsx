import { Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Clapperboard,
  LayoutDashboard,
  Users,
  CreditCard,
  MessageSquare,
  ShieldBan,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Users', to: '/admin/users', icon: Users },
  { label: 'Payments', to: '/admin/payments', icon: CreditCard },
  { label: 'Messages', to: '/admin/messages', icon: MessageSquare },
  { label: 'Banned Users', to: '/admin/banned', icon: ShieldBan },
];

function getPageTitle(pathname) {
  const item = navItems.find((n) => pathname.startsWith(n.to));
  return item?.label || 'Admin';
}

function getInitials(name = '') {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function AdminLayout() {
  const location = useLocation();
  const user = useSelector((state) => state.auth?.user);
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col" style={{ backgroundColor: '#0f0f1a' }}>
        {/* Logo */}
        <div className="px-6 py-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF8280]/10 flex items-center justify-center">
            <Clapperboard className="w-6 h-6 text-[#FF8280]" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">DrSelfTape</h1>
            <p className="text-gray-500 text-xs">Admin Panel</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 mt-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#FF8280]/10 text-[#FF8280]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Footer */}
        <div className="px-4 py-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-[#FF8280]/20 text-[#FF8280] flex items-center justify-center text-xs font-bold">
              {getInitials(user?.name || user?.first_name || 'A')}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user?.name || user?.first_name || 'Admin'}
              </p>
              <p className="text-gray-500 text-xs truncate">{user?.email || 'admin@drselftape.com'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar */}
        <header className="flex-shrink-0 h-16 bg-white border-b border-gray-100 flex items-center px-8">
          <h2 className="text-xl font-bold text-gray-900">{pageTitle}</h2>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-50/50 p-8">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-[#FF8280] border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
