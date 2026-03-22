import { NavLink } from 'react-router-dom'
import {
  Monitor,
  BookOpen,
  Target,
  Send,
  BarChart3,
  LayoutDashboard,
  Users2,
  MessageSquare,
  HeartHandshake,
} from 'lucide-react'
import { Avatar, AvatarFallback } from './ui/avatar.jsx'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'CD Sim Mode', path: '/dashboard/cd-sim', icon: Monitor, badge: 'PRO' },
  { label: 'Scene Study', path: '/dashboard/scene-study', icon: BookOpen },
  { label: 'Audition Tracker', path: '/dashboard/auditions', icon: Target },
  { label: 'Submissions', path: '/dashboard/submissions', icon: Send },
  { label: 'Reports', path: '/dashboard/reports', icon: BarChart3 },
  { label: 'Find a Reader', path: '/dashboard/find-a-reader', icon: Users2, badge: 'NEW' },
  { label: 'Green Room', path: '/dashboard/green-room', icon: MessageSquare },
  { label: 'Who Wants to Read', path: '/dashboard/who-wants-to-read', icon: HeartHandshake },
]

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-[#0D0D0D] border-r border-[#1E1E1E] flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#C855F0]/10 rounded-lg flex items-center justify-center">
            <span className="text-[#C855F0] font-bold text-sm">DS</span>
          </div>
          <span className="text-white text-lg font-bold tracking-tight">Dr. Self Tape</span>
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
              `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#C855F0]/10 text-[#C855F0] font-medium'
                  : 'text-[#999999] hover:text-white hover:bg-[#1E1E1E]'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  item.badge === 'PRO'
                    ? 'bg-[#C855F0]/10 text-[#C855F0]'
                    : 'bg-emerald-500/10 text-emerald-400'
                }`}
              >
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-[#1E1E1E]">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-[#C855F0]/20 text-[#C855F0] text-xs">AD</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Admin User</p>
            <p className="text-xs text-[#999999] truncate">admin@drselftapes.com</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
