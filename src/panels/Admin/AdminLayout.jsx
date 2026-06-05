import { Suspense } from 'react';
import { NavLink, Outlet, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Clapperboard,
  LayoutDashboard,
  Users,
  CreditCard,
  MessageSquare,
  ShieldBan,
  BarChart3,
  LogOut,
} from 'lucide-react';
import { performLogout } from '../../redux/features/auth/authSlice';

const navItems = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Users', to: '/admin/users', icon: Users },
  { label: 'Payments', to: '/admin/payments', icon: CreditCard },
  { label: 'Reports', to: '/admin/reports', icon: BarChart3 },
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
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth?.user);
  const pageTitle = getPageTitle(location.pathname);

  const handleLogout = () => {
    dispatch(performLogout());
    navigate('/login', { replace: true });
  };

  // Hard gate: admin routes require Django staff/superuser status.
  // The BE permission also blocks unauthorized API calls (IsAdminUser
  // now requires is_staff), but bouncing here means a non-admin user
  // never even sees the admin chrome.
  const isAdmin = !!(user?.is_staff || user?.is_superuser);
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col" style={{ backgroundColor: '#0D0D0D' }}>
        {/* Logo */}
        <div className="px-6 py-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D4A85F]/10 flex items-center justify-center">
            <Clapperboard className="w-6 h-6 text-[#7A5A18]" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Dr Self Tape</h1>
            <p className="text-[#999999] text-xs">Admin Panel</p>
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
                    ? 'bg-[#D4A85F]/10 text-[#7A5A18]'
                    : 'text-[#999999] hover:text-white hover:bg-[#1E1E1E]'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Footer */}
        <div className="px-4 py-4 border-t border-[#1E1E1E]">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-[#D4A85F]/20 text-[#7A5A18] flex items-center justify-center text-xs font-bold">
              {getInitials(user?.name || user?.first_name || 'A')}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user?.name || user?.first_name || 'Admin'}
              </p>
              <p className="text-[#999999] text-xs truncate">{user?.email || 'admin@drselftape.com'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#999999] hover:text-white hover:bg-[#1E1E1E] transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar */}
        <header className="flex-shrink-0 h-16 bg-[#0D0D0D] border-b border-[#1E1E1E] flex items-center px-8">
          <h2 className="text-xl font-bold text-white">{pageTitle}</h2>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-[#0D0D0D] p-8">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-[#D4A85F] border-t-transparent rounded-full animate-spin" />
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
