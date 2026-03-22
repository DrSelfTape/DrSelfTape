// Library import
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// Local import
import { RoleBasedRedirect } from './routeHelpers';
import { ComingSoon, Layout } from '../components/shared/index.js';

// Auth panels (keep static — small and needed immediately)
import JoinPage from '../panels/Join';
import { Login } from '../panels/Authentication/Login';
import LoginPageBranded from '../panels/Auth/LoginPage';
import { Signup } from '../panels/Authentication/SignUp';
import { ForgotPassword } from '../panels/Authentication/ForgotPassword';
import { ResetPassword } from '../panels/Authentication/ResetPassword';

// Lazy-loaded UserPanel imports
const Dashboard = lazy(() => import('../panels/UserPanel/Dashboard'));
const CastingDirectorAuditions = lazy(() =>
  import('../panels/UserPanel/CastingDirector/Audition').then((m) => ({ default: m.CastingDirectorAuditions }))
);
const AddCastingDirectorAudition = lazy(() =>
  import('../panels/UserPanel/CastingDirector/Audition/AddAudition').then((m) => ({ default: m.AddCastingDirectorAudition }))
);
const AddActorAudition = lazy(() =>
  import('../panels/UserPanel/Actor/Audition/AddAudition').then((m) => ({ default: m.AddActorAudition }))
);
const ActorBooking = lazy(() =>
  import('../panels/UserPanel/Actor/Bookings').then((m) => ({ default: m.ActorBooking }))
);
const CastingDirectorBooking = lazy(() =>
  import('../panels/UserPanel/CastingDirector/Bookings').then((m) => ({ default: m.CastingDirectorBooking }))
);
const AuditionTracker = lazy(() =>
  import('../panels/UserPanel/Actor/AuditionTracker').then((m) => ({ default: m.AuditionTracker }))
);
const ProfileSetting = lazy(() => import('../panels/UserPanel/ProfileSetting'));
const Collaboration = lazy(() =>
  import('../panels/UserPanel/Actor/SeceneStudy/Collaboration').then((m) => ({ default: m.Collaboration }))
);
const LiveRehearsal = lazy(() =>
  import('../panels/UserPanel/Actor/SeceneStudy/Collaboration/LiveRehearsal').then((m) => ({ default: m.LiveRehearsal }))
);
const AiScenePartner = lazy(() => import('../panels/UserPanel/Actor/SeceneStudy/Collaboration/AiScenePartner'));
const AiScenePartnerSession = lazy(() => import('../panels/UserPanel/Actor/SeceneStudy/Collaboration/AiScenePartnerSession'));
const ScriptUploadAndListing = lazy(() => import('../panels/UserPanel/Actor/SeceneStudy/SceneStudyAnalysis/ScriptUploadAndListing'));
const ScriptAnalysis = lazy(() => import('../panels/UserPanel/Actor/SeceneStudy/SceneStudyAnalysis/ScriptAnalysis'));
const CoachCollaboration = lazy(() => import('../panels/UserPanel/Coach/Collaboration/index.jsx'));
const CoachScriptInsights = lazy(() => import('../panels/UserPanel/Coach/Collaboration/CoachScriptInsights.jsx'));
const MeetingRoom = lazy(() => import('../panels/Meeting/MeetingRoom.jsx'));
const Notifications = lazy(() => import('../panels/UserPanel/Notifications'));

// Lazy-loaded Dashboard panel imports
const DashboardLayout = lazy(() => import('../panels/Dashboard/DashboardLayout'));
const DashboardHome = lazy(() => import('../panels/Dashboard/Home'));
const BookSession = lazy(() => import('../panels/Dashboard/BookSession'));
const DashboardAuditions = lazy(() => import('../panels/Dashboard/Auditions'));
const Membership = lazy(() => import('../panels/Dashboard/Membership'));
const SceneStudy = lazy(() => import('../panels/Dashboard/SceneStudy'));
const CDSim = lazy(() => import('../panels/Dashboard/CDSim'));
const DashboardProfile = lazy(() => import('../panels/Dashboard/Profile'));
const DashboardBookings = lazy(() => import('../panels/Dashboard/Bookings'));
const Scripts = lazy(() => import('../panels/Dashboard/Scripts'));
const LiveRehearsals = lazy(() => import('../panels/Dashboard/LiveRehearsals'));
const RehearsalRoom = lazy(() => import('../panels/Dashboard/LiveRehearsals/RehearsalRoom'));
const Reports = lazy(() => import('../panels/Dashboard/Reports'));
const Insights = lazy(() => import('../panels/Dashboard/Insights'));
const Community = lazy(() => import('../panels/Dashboard/Community'));
const Submissions = lazy(() => import('../panels/Dashboard/Submissions'));
const AuditionGenerator = lazy(() => import('../panels/Dashboard/AuditionGenerator'));
const AgentPortal = lazy(() => import('../panels/Dashboard/AgentPortal'));
const CastingDirectorAI = lazy(() => import('../panels/Dashboard/CastingDirectorAI'));

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
  {
    path: '/dashboard',
    moduleName: 'Dashboard',
    element: <DashboardLayout />,
    children: [
      { index: true, moduleName: 'DashboardHome', element: <DashboardHome /> },
      { path: 'cd-sim', moduleName: 'CDSimMode', element: <CDSim /> },
      { path: 'live-rehearsals', moduleName: 'LiveRehearsals', element: <LiveRehearsals /> },
      { path: 'live-rehearsals/room/:id', moduleName: 'RehearsalRoom', element: <RehearsalRoom /> },
      { path: 'community', moduleName: 'Community', element: <Community /> },
      { path: 'scene-study', moduleName: 'SceneStudy', element: <SceneStudy /> },
      { path: 'auditions', moduleName: 'Auditions', element: <DashboardAuditions /> },
      { path: 'submissions', moduleName: 'Submissions', element: <Submissions /> },
      { path: 'reports', moduleName: 'Reports', element: <Reports /> },
      { path: 'marketing', moduleName: 'MarketingTools', element: <ComingSoon /> },
      { path: 'bookings', moduleName: 'Bookings', element: <DashboardBookings /> },
      { path: 'book-session', moduleName: 'BookSession', element: <BookSession /> },
      { path: 'insights', moduleName: 'CustomerInsights', element: <Insights /> },
      { path: 'scripts', moduleName: 'Scripts', element: <Scripts /> },
      { path: 'membership', moduleName: 'Membership', element: <Membership /> },
      { path: 'profile', moduleName: 'Profile', element: <DashboardProfile /> },
      { path: 'generator', moduleName: 'AuditionGenerator', element: <AuditionGenerator /> },
      { path: 'agent-portal', moduleName: 'AgentPortal', element: <AgentPortal /> },
      { path: 'casting-director-ai', moduleName: 'CastingDirectorAI', element: <CastingDirectorAI /> },
    ],
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
    element: <LoginPageBranded />,
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
    path: '/join/:id',
    moduleName: 'JoinRoom',
    element: <JoinPage />,
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
