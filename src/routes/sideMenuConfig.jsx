// Local imports
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
import Dashboard from '../panels/UserPanel/Dashboard';
import { AuditionTracker } from '../panels/UserPanel/Actor/AuditionTracker';
import Notifications from '../panels/UserPanel/Notifications';
import { Collaboration } from '../panels/UserPanel/Actor/SeceneStudy/Collaboration';
import { LiveRehearsal } from '../panels/UserPanel/Actor/SeceneStudy/Collaboration/LiveRehearsal.jsx';
import ScriptUploadAndListing from '../panels/UserPanel/Actor/SeceneStudy/SceneStudyAnalysis/ScriptUploadAndListing';
import CoachCollaboration from '../panels/UserPanel/Coach/Collaboration';

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
    element: <Notifications />,
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
    element: <AuditionTracker />,
  },
  {
    path: '/dashboard/casting-director-ai',
    text: 'CD AI Studio',
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
    path: '/scene-study',
    text: 'Scene Study',
    icon: <SceneStudyIcon height={19} width={19} />,
    element: <Dashboard />,
    child: [
      {
        path: '/scene-study/analysis',
        moduleName: 'Analysis',
        childIcon: <AnalysisIcon height={18} width={18} />,
        element: <ScriptUploadAndListing />,
      },
      {
        path: '/scene-study/collaboration',
        moduleName: 'Collaboration',
        childIcon: <CollaborationIcon height={19} width={19} />,
        element: <Collaboration />,
      },
      {
        path: '/scene-study/live-rehearsal',
        moduleName: 'Live Rehearsal',
        childIcon: <VedioIcon height={19} width={19} strokeWidth={1.2} />,
        element: <LiveRehearsal />,
      },
    ],
  },
  {
    path: '/notifications',
    text: 'Notifications',
    icon: <NotificationIcon height={19} width={19} />,
    element: <Notifications />,
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
    element: <AuditionTracker />,
  },
  {
    path: '/notifications',
    text: 'Notifications',
    icon: <NotificationIcon height={19} width={19} />,
    element: <Notifications />,
  },
];

const coachMenu = [
  {
    path: '/collaboration',
    text: 'Collaboration',
    icon: <CollaborationIcon height={19} width={19} />,
    element: <CoachCollaboration />,
  },
  {
    path: '/notifications',
    text: 'Notifications',
    icon: <NotificationIcon height={19} width={19} />,
    element: <Notifications />,
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
