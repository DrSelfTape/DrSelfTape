// Library import
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// Local import
import { RoleBasedRedirect } from './routeHelpers';
// Direct file imports (not via the barrel) so tree-shaking can't pull in
// the rest of components/Shared — keeps the initial bundle lean.
import { ComingSoon } from '../components/Shared/ComingSoon';
import { Layout } from '../components/Shared/Layout';

// Login is the most common entry point — keep it eager so first paint is fast.
// All other auth/marketing pages lazy-load to keep the initial bundle small.
import LoginPageBranded from '../panels/Auth/LoginPage';

const JoinPage = lazy(() => import('../panels/Join'));
const Signup = lazy(() => import('../panels/Authentication/SignUp').then((m) => ({ default: m.Signup })));
const ForgotPassword = lazy(() => import('../panels/Authentication/ForgotPassword').then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('../panels/Authentication/ResetPassword').then((m) => ({ default: m.ResetPassword })));
const AppleCallback = lazy(() => import('../panels/Auth/AppleCallback'));
const TermsOfService = lazy(() => import('../panels/Legal/TermsOfService'));
const PrivacyPolicy = lazy(() => import('../panels/Legal/PrivacyPolicy'));

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
const DashboardAuditions = lazy(() => import('../panels/Dashboard/Auditions'));
const Membership = lazy(() => import('../panels/Dashboard/Membership'));
const SceneStudy = lazy(() => import('../panels/Dashboard/SceneStudy'));
const CDSim = lazy(() => import('../panels/Dashboard/CDSim'));
const DashboardProfile = lazy(() => import('../panels/Dashboard/Profile'));
const Scripts = lazy(() => import('../panels/Dashboard/Scripts'));
const Reports = lazy(() => import('../panels/Dashboard/Reports'));
const Submissions = lazy(() => import('../panels/Dashboard/Submissions'));
const AuditionGenerator = lazy(() => import('../panels/Dashboard/AuditionGenerator'));
const CastingDirectorAI = lazy(() => import('../panels/Dashboard/CastingDirectorAI'));
const Referral = lazy(() => import('../panels/Dashboard/Referral'));
const SelfTapes = lazy(() => import('../panels/Dashboard/SelfTapes'));
const Admin = lazy(() => import('../panels/Dashboard/Admin'));
const Jericho = lazy(() => import('../panels/Dashboard/Jericho'));
const CraftJourney = lazy(() => import('../panels/Dashboard/CraftJourney'));
const Leaderboard = lazy(() => import('../panels/Dashboard/Leaderboard'));

// Lazy-loaded Find a Reader imports
const Readers = lazy(() => import('../panels/Dashboard/Readers'));
const ItsAScene = lazy(() => import('../panels/Dashboard/FindAReader/ItsAScene'));
const GreenRoom = lazy(() => import('../panels/Dashboard/FindAReader/GreenRoom'));
const GreenRoomChat = lazy(() => import('../panels/Dashboard/FindAReader/GreenRoomChat'));
const ReaderProfile = lazy(() => import('../panels/Dashboard/FindAReader/ReaderProfile'));
const Favorites = lazy(() => import('../panels/Dashboard/FindAReader/Favorites'));

// Lazy-loaded Admin panel imports
const AdminLayout = lazy(() => import('../panels/Admin/AdminLayout'));
const AdminDashboard = lazy(() => import('../panels/Admin/AdminDashboard'));
const AdminUsers = lazy(() => import('../panels/Admin/AdminUsers'));
const AdminPayments = lazy(() => import('../panels/Admin/AdminPayments'));
const AdminMessages = lazy(() => import('../panels/Admin/AdminMessages'));
const AdminBannedUsers = lazy(() => import('../panels/Admin/AdminBannedUsers'));
const AdminReports = lazy(() => import('../panels/Admin/AdminReports'));

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
      { path: 'scene-study', moduleName: 'SceneStudy', element: <SceneStudy /> },
      { path: 'auditions', moduleName: 'Auditions', element: <DashboardAuditions /> },
      { path: 'submissions', moduleName: 'Submissions', element: <Submissions /> },
      { path: 'reports', moduleName: 'Reports', element: <Reports /> },
      { path: 'scripts', moduleName: 'Scripts', element: <Scripts /> },
      { path: 'membership', moduleName: 'Membership', element: <Membership /> },
      { path: 'profile', moduleName: 'Profile', element: <DashboardProfile /> },
      { path: 'generator', moduleName: 'AuditionGenerator', element: <AuditionGenerator /> },
      { path: 'jericho', moduleName: 'Jericho', element: <Jericho /> },
      { path: 'craft-journey', moduleName: 'CraftJourney', element: <CraftJourney /> },
      { path: 'leaderboard', moduleName: 'Leaderboard', element: <Leaderboard /> },
      { path: 'casting-director-ai', moduleName: 'CastingDirectorAI', element: <CastingDirectorAI /> },
      // Find a Reader
      // P1-05: the three supply routes collapsed into /dashboard/readers; old
      // paths redirect with the right filter so links and bookmarks survive.
      { path: 'readers', moduleName: 'Readers', element: <Readers /> },
      { path: 'find-a-reader', element: <Navigate to='/dashboard/readers?filter=browse' replace /> },
      { path: 'its-a-scene/:matchId', moduleName: 'ItsAScene', element: <ItsAScene /> },
      { path: 'green-room', moduleName: 'GreenRoom', element: <GreenRoom /> },
      { path: 'green-room/:matchId', moduleName: 'GreenRoomChat', element: <GreenRoomChat /> },
      { path: 'who-wants-to-read', element: <Navigate to='/dashboard/readers?filter=interested' replace /> },
      { path: 'favorites', moduleName: 'Favorites', element: <Favorites /> },
      { path: 'reader-profile/:readerId', moduleName: 'ReaderProfile', element: <ReaderProfile /> },
      { path: 'referral', moduleName: 'Referral', element: <Referral /> },
      // Paid readers hidden until P4-02 (zero opt-ins made this a dead end)
      { path: 'marketplace', element: <Navigate to='/dashboard/readers' replace /> },
      { path: 'self-tapes', moduleName: 'SelfTapes', element: <SelfTapes /> },
      { path: 'admin', moduleName: 'Admin', element: <Admin /> },
    ],
  },
  // Admin routes (accessible to all authenticated users, guarded by AdminLayout)
  {
    path: '/admin',
    moduleName: 'AdminLayout',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', moduleName: 'AdminDashboard', element: <AdminDashboard /> },
      { path: 'users', moduleName: 'AdminUsers', element: <AdminUsers /> },
      { path: 'payments', moduleName: 'AdminPayments', element: <AdminPayments /> },
      { path: 'messages', moduleName: 'AdminMessages', element: <AdminMessages /> },
      { path: 'banned', moduleName: 'AdminBannedUsers', element: <AdminBannedUsers /> },
      { path: 'reports', moduleName: 'AdminReports', element: <AdminReports /> },
    ],
  },
];

export const actorRoutes = [
  {
    path: '/auditions-tracker',
    moduleName: '/Audition Tracker',
    element: (
      <Layout>
        <AuditionTracker />
      </Layout>
    ),
    children: [
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
    children: [
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

export const castingDirectorRoutes = [
  {
    path: '/auditions',
    moduleName: '/auditions',
    element: (
      <Layout>
        <CastingDirectorAuditions />
      </Layout>
    ),
    children: [
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
];

export const adminRoutes = [
  {
    path: '/admin',
    moduleName: 'AdminLayout',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', moduleName: 'AdminDashboard', element: <AdminDashboard /> },
      { path: 'users', moduleName: 'AdminUsers', element: <AdminUsers /> },
      { path: 'payments', moduleName: 'AdminPayments', element: <AdminPayments /> },
      { path: 'messages', moduleName: 'AdminMessages', element: <AdminMessages /> },
      { path: 'banned', moduleName: 'AdminBannedUsers', element: <AdminBannedUsers /> },
      { path: 'reports', moduleName: 'AdminReports', element: <AdminReports /> },
    ],
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
  // Apple Services ID redirect URL — registered with Apple Developer
  // Portal for web Sign in with Apple. The popup loads this URL; the JS
  // SDK reads the result via postMessage and resolves on the opener.
  {
    path: '/auth/apple-callback',
    moduleName: 'Apple Callback',
    element: <AppleCallback />,
  },
  {
    path: '/join/:id',
    moduleName: 'JoinRoom',
    element: <JoinPage />,
  },
  {
    path: '/terms',
    moduleName: 'Terms of Service',
    element: <TermsOfService />,
  },
  {
    path: '/privacy',
    moduleName: 'Privacy Policy',
    element: <PrivacyPolicy />,
  },
  // Backwards-compat: old placeholder route now redirects to /terms
  {
    path: '/term-and-conditions',
    moduleName: 'Term and conditions',
    element: <Navigate to='/terms' replace />,
  },
  {
    path: '*',
    element: <Navigate to='/login' replace />,
  },
];
