import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
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
  Shield,
  ChevronDown,
  Sparkles,
  Video,
} from 'lucide-react'

/* ── Grouped navigation structure ── */
const NAV_GROUPS = [
  {
    key: 'home',
    items: [
      { label: 'Home', path: '/dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    key: 'practice',
    label: 'Practice',
    icon: Sparkles,
    items: [
      { label: 'Acting Coach', path: '/dashboard/cd-sim', icon: Monitor },
      { label: 'Scene Study', path: '/dashboard/scene-study', icon: BookOpen },
      { label: 'Self-Tapes', path: '/dashboard/self-tapes', icon: Video },
    ],
  },
  {
    key: 'connect',
    label: 'Connect',
    icon: Users2,
    items: [
      { label: 'Find a Reader', path: '/dashboard/find-a-reader', icon: Users2, badgeKey: 'find-a-reader' },
      { label: 'Green Room', path: '/dashboard/green-room', icon: MessageSquare },
      { label: 'Who Wants to Read', path: '/dashboard/who-wants-to-read', icon: HeartHandshake, badgeKey: 'who-wants-to-read' },
    ],
  },
  {
    key: 'work',
    label: 'My Work',
    icon: Target,
    items: [
      { label: 'Audition Tracker', path: '/dashboard/auditions', icon: Target },
      { label: 'Submissions', path: '/dashboard/submissions', icon: Send },
    ],
  },
  {
    key: 'profile',
    items: [
      { label: 'My Profile', path: '/dashboard/profile', icon: UserCircle },
    ],
  },
]

function SidebarGroup({ group, pendingLikes, expanded, onToggle }) {
  const location = useLocation()

  // Flat groups (Home, Profile) — no collapsible header
  if (!group.label) {
    return group.items.map((item) => (
      <SidebarItem key={item.path} item={item} pendingLikes={pendingLikes} />
    ))
  }

  // Check if any child route is active
  const isGroupActive = group.items.some((item) =>
    item.end ? location.pathname === item.path : location.pathname.startsWith(item.path)
  )

  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest transition-colors cursor-pointer ${
          isGroupActive ? 'text-[#FF8280]' : 'text-[#666] hover:text-[#999]'
        }`}
      >
        <group.icon className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="ml-2 mt-0.5 space-y-0.5">
          {group.items.map((item) => (
            <SidebarItem key={item.path} item={item} pendingLikes={pendingLikes} />
          ))}
        </div>
      )}
    </div>
  )
}

function SidebarItem({ item, pendingLikes }) {
  const badge =
    item.badgeKey === 'find-a-reader' || item.badgeKey === 'who-wants-to-read'
      ? pendingLikes > 0
        ? String(pendingLikes)
        : null
      : item.badge || null

  return (
    <NavLink
      to={item.path}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
          isActive
            ? 'bg-[#FF8280]/10 text-[#FF8280]'
            : 'hover:bg-[#FF8280]/5'
        }`
      }
      style={({ isActive }) => isActive ? {} : { color: 'var(--text-secondary)' }}
    >
      <item.icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {badge && (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          /^\d+$/.test(badge)
            ? 'bg-[#FF8280] text-white min-w-[20px] text-center'
            : badge === 'ADMIN'
              ? 'bg-amber-500/10 text-amber-400'
              : 'bg-emerald-500/10 text-emerald-400'
        }`}>
          {badge}
        </span>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth?.user)
  const profile = useSelector((s) => s.profile?.profile)
  const pendingLikes = useSelector((s) => s.readersMatch?.matchingStats?.pending_likes_count || 0)

  // Auto-expand groups that contain the active route
  const getInitialExpanded = () => {
    const expanded = {}
    NAV_GROUPS.forEach((group) => {
      if (group.label) {
        const isActive = group.items.some((item) =>
          item.end ? location.pathname === item.path : location.pathname.startsWith(item.path)
        )
        expanded[group.key] = isActive
      }
    })
    return expanded
  }

  const [expandedGroups, setExpandedGroups] = useState(getInitialExpanded)

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Build groups with optional admin
  const groups = [
    ...NAV_GROUPS,
    ...(user?.is_staff
      ? [{
          key: 'admin',
          items: [{ label: 'Admin', path: '/dashboard/admin', icon: Shield, badge: 'ADMIN' }],
        }]
      : []),
  ]

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
    <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r flex flex-col transition-colors duration-300" style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border-default)' }}>
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b gap-3" style={{ borderColor: 'var(--border-default)' }}>
        <div className="w-8 h-8 bg-[#FF8280]/10 rounded-lg flex items-center justify-center">
          <Clapperboard className="w-4 h-4 text-[#FF8280]" />
        </div>
        <span className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Dr. Self Tape</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {groups.map((group) => (
          <SidebarGroup
            key={group.key}
            group={group}
            pendingLikes={pendingLikes}
            expanded={expandedGroups[group.key]}
            onToggle={() => toggleGroup(group.key)}
          />
        ))}
      </nav>

      {/* Availability toggle */}
      <div className="px-4 pb-2">
        <AvailabilityToggle compact />
      </div>

      {/* User footer */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
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
            <p className="text-sm font-medium text-white truncate group-hover:text-[#FF8280] transition-colors">
              {displayName}
            </p>
            <p className="text-xs text-[#666666] truncate">{email}</p>
          </div>
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
