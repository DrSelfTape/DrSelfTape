import { NavLink } from 'react-router-dom'
import {
  Monitor,
  Video,
  Users,
  BookOpen,
  Target,
  Send,
  BarChart3,
  Megaphone,
  Calendar,
  Eye,
  LayoutDashboard,
  Briefcase,
} from 'lucide-react'
import { Avatar, AvatarFallback } from './ui/avatar.jsx'

const navItems = [
  { label: 'CD Sim Mode', path: '/dashboard/cd-sim', icon: Monitor, badge: 'PRO' },
  { label: 'Live Rehearsals', path: '/dashboard/live-rehearsals', icon: Video, badge: 'NEW' },
  { label: 'Community', path: '/dashboard/community', icon: Users },
  { label: 'Scene Study', path: '/dashboard/scene-study', icon: BookOpen },
  { label: 'Audition Tracker', path: '/dashboard/auditions', icon: Target },
  { label: 'Submissions', path: '/dashboard/submissions', icon: Send },
  { label: 'Reports', path: '/dashboard/reports', icon: BarChart3 },
  { label: 'Marketing Tools', path: '/dashboard/marketing', icon: Megaphone },
  { label: 'Bookings', path: '/dashboard/bookings', icon: Calendar },
  { label: 'Customer Insights', path: '/dashboard/insights', icon: Eye },
  { label: 'Agent Portal', path: '/dashboard/agent-portal', icon: Briefcase },
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
]

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[hsl(262,83%,58%)] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">DS</span>
          </div>
          <span className="text-gray-900 text-lg font-bold tracking-tight">Dr. Self Tape</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[hsl(262,83%,58%)] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  item.badge === 'PRO'
                    ? 'bg-[hsl(262,83%,58%)]/10 text-[hsl(262,83%,58%)]'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-[hsl(262,83%,58%)] text-white text-xs">AD</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">Admin User</p>
            <p className="text-xs text-gray-500 truncate">admin@drselftapes.com</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
