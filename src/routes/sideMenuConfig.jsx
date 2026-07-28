// Side-menu navigation config — PURE DATA (path / text / icon / child only).
//
// This module is imported by routeHelpers (used at login) and the SideMenu /
// Header. It must stay lightweight: it previously also imported and attached a
// heavy `element: <Panel/>` to each row, which dragged Dashboard, AuditionTracker,
// Notifications, Collaboration, LiveRehearsal, ScriptUploadAndListing and
// CoachCollaboration (and their MUI/chart deps) into the login/cold-boot chunk —
// even though NOTHING renders `route.element` (SideMenu/Header use path/text/icon;
// the real routes live in config.jsx). Removing them keeps the boot path slim.
import {
  AnalysisIcon,
  AuditionTrackerIcon,
  CollaborationIcon,
  DashboardIcon,
  NotificationIcon,
  SceneStudyIcon,
  SparklesIcon,
  VedioIcon,
} from '../assets/icons';

const adminMenu = [
  {
    path: '/admin/dashboard',
    text: 'Dashboard',
    icon: <DashboardIcon height={19} width={19} />,
  },
  {
    path: '/notifications',
    text: 'Notifications',
    icon: <NotificationIcon height={19} width={19} />,
  },
];

const actorMenu = [
  {
    path: '/dashboard',
    text: 'Dashboard',
    icon: <DashboardIcon height={19} width={19} />,
  },
  {
    path: '/auditions-tracker',
    text: 'Audition Tracker',
    icon: <AuditionTrackerIcon height={19} width={19} />,
  },
  {
    path: '/dashboard/casting-director-ai',
    text: 'CD AI Studio',
    icon: <SparklesIcon height={19} width={19} />,
  },
  {
    // The aha feature gets its own door — it was only reachable buried
    // inside My Growth. Deep-links straight onto the Tape tab.
    path: '/dashboard/jericho?tab=tape',
    text: 'Tape Review',
    icon: <SparklesIcon height={19} width={19} />,
  },
  {
    path: '/dashboard/jericho',
    text: 'My Growth',
    icon: <SparklesIcon height={19} width={19} />,
  },
  {
    path: '/dashboard/cd-sim',
    text: 'Acting Coach',
    icon: <SparklesIcon height={19} width={19} />,
  },
  {
    path: '/dashboard/generator',
    text: 'Scene Generator',
    icon: <SparklesIcon height={19} width={19} />,
  },
  {
    path: '/dashboard/find-a-reader',
    text: 'Find a Reader',
    icon: <SparklesIcon height={19} width={19} />,
  },
  {
    path: '/dashboard/green-room',
    text: 'Green Room',
    icon: <SparklesIcon height={19} width={19} />,
  },
  {
    path: '/dashboard/who-wants-to-read',
    text: 'Who Wants to Read',
    icon: <SparklesIcon height={19} width={19} />,
  },
  {
    path: '/dashboard/favorites',
    text: 'Favorites',
    icon: <SparklesIcon height={19} width={19} />,
  },
  {
    path: '/dashboard/leaderboard',
    text: 'Leaderboard',
    icon: <SparklesIcon height={19} width={19} />,
  },
  {
    path: '/scene-study',
    text: 'Scene Study',
    icon: <SceneStudyIcon height={19} width={19} />,
    child: [
      {
        path: '/scene-study/analysis',
        moduleName: 'Analysis',
        childIcon: <AnalysisIcon height={18} width={18} />,
      },
      {
        path: '/scene-study/collaboration',
        moduleName: 'Collaboration',
        childIcon: <CollaborationIcon height={19} width={19} />,
      },
      {
        path: '/scene-study/live-rehearsal',
        moduleName: 'Live Rehearsal',
        childIcon: <VedioIcon height={19} width={19} strokeWidth={1.2} />,
      },
    ],
  },
  {
    path: '/notifications',
    text: 'Notifications',
    icon: <NotificationIcon height={19} width={19} />,
  },
];

const castingDirectorMenu = [
  {
    path: '/dashboard',
    text: 'Dashboard',
    icon: <DashboardIcon height={19} width={19} />,
  },
  {
    path: '/auditions-tracker',
    text: 'Audition Tracker',
    icon: <AuditionTrackerIcon height={19} width={19} />,
  },
  {
    path: '/notifications',
    text: 'Notifications',
    icon: <NotificationIcon height={19} width={19} />,
  },
];

const coachMenu = [
  {
    path: '/collaboration',
    text: 'Collaboration',
    icon: <CollaborationIcon height={19} width={19} />,
  },
  {
    path: '/notifications',
    text: 'Notifications',
    icon: <NotificationIcon height={19} width={19} />,
  },
];

export const sideMenuRoutes = (role) => {
  switch (role) {
    case 'admin':
      return adminMenu;
    case 'actor':
      return actorMenu;
    case 'casting_director':
      return castingDirectorMenu;
    case 'coach':
      return coachMenu;
    default:
      return actorMenu;
  }
};
