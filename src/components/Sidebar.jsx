import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { performLogout } from '../redux/features/auth/authSlice'
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
  Crown,
  Film,
  Brain,
  FileText,
  Store,
  Trophy,
  Gift,
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
    // The AI suite — flagship. These were already routed but never surfaced in
    // the desktop sidebar (they live in the mobile shell), so desktop/iPad web
    // users couldn't reach Tape Review, Compare Takes, or Jericho. Tape Review
    // deep-links to the Jericho hub's Tape tab.
    key: 'studio',
    label: 'AI Studio',
    icon: Sparkles,
    items: [
      { label: 'Tape Review', path: '/dashboard/jericho?tab=tape', icon: Film },
      { label: 'My Growth', path: '/dashboard/jericho', icon: Brain },
      { label: 'Scene Generator', path: '/dashboard/generator', icon: Clapperboard },
    ],
  },
  {
    key: 'practice',
    label: 'Practice',
    icon: BookOpen,
    items: [
      { label: 'Acting Coach', path: '/dashboard/cd-sim', icon: Monitor },
      { label: 'Scene Study', path: '/dashboard/scene-study', icon: BookOpen },
      { label: 'Scripts', path: '/dashboard/scripts', icon: FileText },
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
      { label: 'Reader Market', path: '/dashboard/marketplace', icon: Store },
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
    key: 'community',
    label: 'Community',
    icon: Trophy,
    items: [
      { label: 'Leaderboard', path: '/dashboard/leaderboard', icon: Trophy },
      { label: 'Invite Friends', path: '/dashboard/referral', icon: Gift },
    ],
  },
  {
    key: 'profile',
    items: [
      { label: 'My Profile', path: '/dashboard/profile', icon: UserCircle },
      { label: 'Subscription', path: '/dashboard/membership', icon: Crown },
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
        className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest transition-colors cursor-pointer hover:bg-[var(--aurora-glass)]"
        style={{
          color: isGroupActive ? 'var(--aurora-accent-deep)' : 'var(--aurora-dim)',
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        }}
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
        `flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
          isActive
            ? 'shadow-sm'
            : 'hover:bg-[var(--aurora-glass)]'
        }`
      }
      style={({ isActive }) => ({
        color: isActive ? 'var(--aurora-accent-deep)' : 'var(--aurora-sub)',
        background: isActive
          ? 'color-mix(in oklch, var(--aurora-heritage-gold) 18%, var(--aurora-glass-strong))'
          : 'transparent',
        borderColor: isActive
          ? 'color-mix(in oklch, var(--aurora-heritage-gold) 34%, var(--aurora-line))'
          : 'transparent',
        boxShadow: isActive
          ? 'inset 3px 0 0 var(--aurora-heritage-gold), 0 8px 24px color-mix(in oklch, var(--aurora-heritage-gold) 14%, transparent)'
          : 'none',
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
      })}
    >
      <item.icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {badge && (
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            /^\d+$/.test(badge) ? 'min-w-[20px] text-center' : ''
          }`}
          style={{
            background: /^\d+$/.test(badge)
              ? 'var(--aurora-heritage-gold)'
              : badge === 'ADMIN'
                ? 'color-mix(in oklch, var(--aurora-heritage-gold) 18%, var(--aurora-glass))'
                : 'color-mix(in oklch, var(--aurora-mint) 24%, var(--aurora-glass))',
            color: badge === 'ADMIN' ? 'var(--aurora-accent-deep)' : 'var(--aurora-text)',
            border: '1px solid var(--aurora-glass-border)',
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          }}
        >
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
    <aside
      className="fixed inset-y-0 left-0 z-50 w-64 border-r flex flex-col transition-colors duration-300"
      style={{
        background: 'var(--aurora-glass-strong)',
        borderColor: 'var(--aurora-line)',
        color: 'var(--aurora-text)',
        boxShadow: 'var(--aurora-shadow-dock)',
        backdropFilter: 'blur(22px) saturate(150%)',
        WebkitBackdropFilter: 'blur(22px) saturate(150%)',
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
      }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b gap-3" style={{ borderColor: 'var(--aurora-line)' }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center border"
          style={{
            background: 'color-mix(in oklch, var(--aurora-heritage-gold) 18%, var(--aurora-glass))',
            borderColor: 'var(--aurora-glass-border)',
            color: 'var(--aurora-accent-deep)',
          }}
        >
          <Clapperboard className="w-4 h-4" />
        </div>
        <span className="text-base font-bold tracking-tight" style={{ color: 'var(--aurora-text)' }}>Dr. Self Tape</span>
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
      <div className="p-4 border-t" style={{ borderColor: 'var(--aurora-line)' }}>
        <button
          onClick={() => navigate('/dashboard/profile')}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[var(--aurora-glass)] transition-colors group"
        >
          {/* Avatar */}
          <ProfilePhoto
            src={avatarUrl}
            alt={displayName}
            initials={initials}
            className="w-9 h-9 shrink-0"
          />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold text-[var(--aurora-text)] truncate group-hover:text-[var(--aurora-accent-deep)] transition-colors">
              {displayName}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--aurora-dim)' }}>{email}</p>
          </div>
        </button>

        {/* Log Out */}
        <button
          onClick={() => dispatch(performLogout())}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--aurora-glass)] transition-colors mt-1"
          style={{ color: 'var(--aurora-sub)', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  )
}
