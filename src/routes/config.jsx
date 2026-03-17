// Library import
import { Navigate } from 'react-router-dom';

// Local import
import { RoleBasedRedirect } from './routeHelpers';
import { Login } from '../panels/Authentication/Login';
import { Signup } from '../panels/Authentication/SignUp';
import { ForgotPassword } from '../panels/Authentication/ForgotPassword';
import { ResetPassword } from '../panels/Authentication/ResetPassword';
import Dashboard from '../panels/UserPanel/Dashboard';
import { CastingDirectorAuditions } from '../panels/UserPanel/CastingDirector/Audition';
import { AddCastingDirectorAudition } from '../panels/UserPanel/CastingDirector/Audition/AddAudition';
import { AddActorAudition } from '../panels/UserPanel/Actor/Audition/AddAudition';
import { ActorBooking } from '../panels/UserPanel/Actor/Bookings';
import { CastingDirectorBooking } from '../panels/UserPanel/CastingDirector/Bookings';
import { AuditionTracker } from '../panels/UserPanel/Actor/AuditionTracker';
import ProfileSetting from '../panels/UserPanel/ProfileSetting';
import { Collaboration } from '../panels/UserPanel/Actor/SeceneStudy/Collaboration';
import { LiveRehearsal } from '../panels/UserPanel/Actor/SeceneStudy/Collaboration/LiveRehearsal';
import AiScenePartner from '../panels/UserPanel/Actor/SeceneStudy/Collaboration/AiScenePartner';
import AiScenePartnerSession from '../panels/UserPanel/Actor/SeceneStudy/Collaboration/AiScenePartnerSession';
import ScriptUploadAndListing from '../panels/UserPanel/Actor/SeceneStudy/SceneStudyAnalysis/ScriptUploadAndListing';
import ScriptAnalysis from '../panels/UserPanel/Actor/SeceneStudy/SceneStudyAnalysis/ScriptAnalysis';
import CoachCollaboration from '../panels/UserPanel/Coach/Collaboration/index.jsx';
import CoachScriptInsights from '../panels/UserPanel/Coach/Collaboration/CoachScriptInsights.jsx';
import MeetingRoom from '../panels/Meeting/MeetingRoom.jsx';
import Notifications from '../panels/UserPanel/Notifications';
import { ComingSoon, Layout } from '../components/shared/index.js';

export const commonRoutes = [
  {
    path: '/',
    moduleName: 'Base',
    element: <RoleBasedRedirect />,
  },
  {
    path: '/meeting/:meetingId',
    moduleName: 'MeetinG',
    element: <MeetingRoom />,
  },
  {
    path: '/settings',
    moduleName: 'Settings',
    element: (
      <Layout>
        <ProfileSetting />
      </Layout>
    ),
  },
  {
    path: '/notifications',
    moduleName: 'Notifications',
    element: (
      <Layout>
        <Notifications />
      </Layout>
    ),
  },
];

export const actorRoutes = [
  {
    path: '/bookings',
    moduleName: '/bookings',
    element: (
      <Layout>
        <ActorBooking />
      </Layout>
    ),
    child: [
      {
        path: '/bookings/:action',
        moduleName: 'Audition',
        element: (
          <Layout>
            <AddActorAudition />
          </Layout>
        ),
      },
    ],
  },
  {
    path: '/auditions-tracker',
    moduleName: '/Audition Tracker',
    element: (
      <Layout>
        <AuditionTracker />
      </Layout>
    ),
    child: [
      {
        path: '/auditions-tracker/:action',
        moduleName: 'Audition',
        element: (
          <Layout>
            <AddActorAudition />
          </Layout>
        ),
      },
    ],
  },
  {
    path: '/scene-study',
    moduleName: 'Scene-study',
    element: (
      <Layout>
        <ComingSoon />
      </Layout>
    ),
    child: [
      {
        path: '/scene-study/analysis',
        moduleName: 'Analysis',
        element: (
          <Layout>
            <ScriptUploadAndListing />
          </Layout>
        ),
      },
      {
        path: '/scene-study/analysis/:scriptId',
        moduleName: 'Analysis',
        element: (
          <Layout>
            <ScriptAnalysis />
          </Layout>
        ),
      },
      {
        path: '/scene-study/collaboration',
        moduleName: 'Collaboration',
        element: (
          <Layout>
            <Collaboration />
          </Layout>
        ),
      },
      {
        path: '/scene-study/collaboration/ai-scene-partner',
        moduleName: 'AI Scene Partner',
        element: (
          <Layout>
            <AiScenePartner />
          </Layout>
        ),
      },
      {
        path: '/scene-study/collaboration/ai-scene-partner/:scriptId',
        moduleName: 'AI Scene Partner Session',
        element: (
          <Layout>
            <AiScenePartnerSession />
          </Layout>
        ),
      },
      {
        path: '/scene-study/live-rehearsal',
        moduleName: 'Live Rehearsal',
        element: (
          <Layout>
            <LiveRehearsal />
          </Layout>
        ),
      },
    ],
  },
];

export const agentRoutes = [
  {
    path: '/agent',
    moduleName: 'Agent',
    element: (
      <Layout>
        <ComingSoon />
      </Layout>
    ),
  },
];

export const castingDirectorRoutes = [
  {
    path: '/auditions',
    moduleName: '/auditions',
    element: (
      <Layout>
        <CastingDirectorAuditions />
      </Layout>
    ),
    child: [
      {
        path: '/auditions/audition-details',
        moduleName: 'Audition',
        element: (
          <Layout>
            <AddCastingDirectorAudition />
          </Layout>
        ),
      },
    ],
  },
  {
    path: '/bookings',
    moduleName: '/bookings',
    element: (
      <Layout>
        <CastingDirectorBooking />
      </Layout>
    ),
  },
  {
    path: '/castingDirector',
    moduleName: 'CastingDirector',
    element: (
      <Layout>
        <ComingSoon />
      </Layout>
    ),
  },
];

export const adminRoutes = [
  {
    path: '/dashboard',
    moduleName: 'Dashboard',
    element: (
      <Layout>
        <Dashboard />
      </Layout>
    ),
  },
  {
    path: '/admin',
    moduleName: 'Admin',
    element: (
      <Layout>
        <ComingSoon />
      </Layout>
    ),
  },
];

export const coachRoutes = [
  {
    path: '/collaboration',
    moduleName: 'Collaboration',
    element: (
      <Layout>
        <CoachCollaboration />
      </Layout>
    ),
  },
  {
    path: '/collaboration/script-insights/:scriptId',
    moduleName: 'Script Insights',
    element: (
      <Layout>
        <CoachScriptInsights />
      </Layout>
    ),
  },
];

// Auth routes
export const authRoutes = [
  {
    path: '/',
    moduleName: 'Base',
    element: <Navigate to='/login' replace />,
  },
  {
    path: '/login',
    moduleName: 'Login',
    element: <Login />,
  },
  {
    path: '/signup',
    moduleName: 'Signup',
    element: <Signup />,
  },
  {
    path: '/forgot-password',
    moduleName: 'Forgot password',
    element: <ForgotPassword />,
  },
  {
    path: '/reset-password',
    moduleName: 'Reset Password',
    element: <ResetPassword />,
  },
  {
    path: '/term-and-conditions',
    moduleName: 'Term and conditions',
    element: <ComingSoon />,
  },
  {
    path: '*',
    element: <Navigate to='/login' replace />,
  },
];
