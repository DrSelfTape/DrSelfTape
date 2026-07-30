import {
  Monitor, BookOpen, Target, Send, LayoutDashboard, Users2, MessageSquare,
  UserCircle, Clapperboard, Sparkles, Video, Crown, Film,
  Brain, FileText, Trophy, Gift,
} from 'lucide-react';

/* ── Grouped desktop navigation ──
 * Shared by Sidebar (renders the rail) and ConsoleCommandPalette (the ⌘K
 * jump list). One structure, two consumers, zero drift. */
export const NAV_GROUPS = [
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
      // P1-05: one reader surface (browse + interested-in-you); Green Room
      // stays as the conversations home. Marketplace returns with P4-02.
      { label: 'Readers', path: '/dashboard/readers', icon: Users2, badgeKey: 'find-a-reader' },
      { label: 'Green Room', path: '/dashboard/green-room', icon: MessageSquare },
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
];
