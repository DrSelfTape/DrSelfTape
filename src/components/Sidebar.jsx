import { NavLink, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { logoutUser } from '../redux/features/auth/authSlice'
import ProfilePhoto from './Shared/ProfilePhoto'
import AvailabilityToggle from './Dashboard/AvailabilityToggle'
import {
  Monitor,
  BookOpen,
  Target,
  Send,
  LayoutDashboard,
  Users2,
  MessageSquare,
  HeartHandshake,
  UserCircle,
  LogOut,
  Clapperboard,
} from 'lucide-react'

const BASE_NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'CD Sim Mode', path: '/dashboard/cd-sim', icon: Monitor, badge: 'PRO' },
  { label: 'Scene Study', path: '/dashboard/scene-study', icon: BookOpen },
  { label: 'Audition Tracker', path: '/dashboard/auditions', icon: Target },
  { label: 'Submissions', path: '/dashboard/submissions', icon: Send },
  { label: 'Find a Reader', path: '/dashboard/find-a-reader', icon: Users2, badgeKey: 'find-a-reader' },
  { label: 'Green Room', path: '/dashboard/green-room', icon: MessageSquare },
  { label: 'Who Wants to Read', path: '/dashboard/who-wants-to-read', icon: HeartHandshake, badgeKey: 'who-wants-to-read' },
  { label: 'My Profile', path: '/dashboard/profile', icon: UserCircle },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth?.user)
  const profile = useSelector((s) => s.profile?.profile)
  const pendingLikes = useSelector((s) => s.readersMatch?.matchingStats?.pending_likes_count || 0)

  const navItems = BASE_NAV_ITEMS.map((item) => {
    if (item.badgeKey === 'find-a-reader' || item.badgeKey === 'who-wants-to-read') {
      return { ...item, badge: pendingLikes > 0 ? String(pendingLikes) : 'NEW' }
    }
    return item
  })

  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : user?.name || user?.email || 'Actor'

  const email = user?.email || ''

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??'

  const avatarUrl = profile?.user_image || profile?.actor_profile?.headshot || null

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-[#0D0D0D] border-r border-[#1E1E1E] flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-[#1E1E1E] gap-3">
        <div className="w-8 h-8 bg-[#C855F0]/10 rounded-lg flex items-center justify-center">
          <Clapperboard className="w-4 h-4 text-[#C855F0]" />
        </div>
        <span className="text-white text-base font-bold tracking-tight">Dr. Self Tape</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#C855F0]/10 text-[#C855F0]'
                  : 'text-[#999999] hover:text-white hover:bg-[#1E1E1E]'
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  item.badge === 'PRO'
                    ? 'bg-[#C855F0]/10 text-[#C855F0]'
                    : /^\d+$/.test(item.badge)
                      ? 'bg-[#C855F0] text-white min-w-[20px] text-center'
                      : 'bg-emerald-500/10 text-emerald-400'
                }`}
              >
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Availability toggle */}
      <div className="px-4 pb-2">
        <AvailabilityToggle compact />
      </div>

      {/* User footer */}
      <div className="p-4 border-t border-[#1E1E1E]">
        <button
          onClick={() => navigate('/dashboard/profile')}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[#1E1E1E] transition-colors group"
        >
          {/* Avatar */}
          <ProfilePhoto
            src={avatarUrl}
            alt={displayName}
            initials={initials}
            className="w-9 h-9 shrink-0"
          />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-white truncate group-hover:text-[#C855F0] transition-colors">
              {displayName}
            </p>
            <p className="text-xs text-[#666666] truncate">{email}</p>
          </div>
          <UserCircle className="w-4 h-4 text-[#666666] group-hover:text-[#C855F0] transition-colors shrink-0" />
        </button>

        {/* Log Out */}
        <button
          onClick={() => dispatch(logoutUser())}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-[#999999] hover:text-red-400 hover:bg-red-500/10 transition-colors mt-1"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  )
}
