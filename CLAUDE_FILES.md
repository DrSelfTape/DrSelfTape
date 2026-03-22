---
## src/redux/constant.js
```
// Base URL
export const baseURL = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? 'https://drselftape-api.loca.lt/api'
  : 'http://localhost:8000/api';

// Endpoints
const endPoints = {
  /*********************** Authentication *************************/
  // Login User
  login: `${baseURL}/v1/users/login/`,

  // Register User
  register: `${baseURL}/v1/users/personal-info-registration/`,

  // Forgot Password
  forgotPassword: `${baseURL}/v1/users/forgotpassword/`,

  // Reset Password
  resetPassword: `${baseURL}/v1/users/reset-password/`,

  // Update Profile
  updateProfile: `${baseURL}/v1/users/update-profile/`,

  // Update Password
  updatePassword: `${baseURL}/v1/users/passwordupdate/`,

  // Profile Details
  profileDetails: `${baseURL}/v1/users/profile-details/`,

  // Add Coach Profile
  addCoachProfile: `${baseURL}/v1/users/actor-coach/`,

  // Switch Role
  switchRole: `${baseURL}/v1/users/switch-role/`,

  /*********************** Authentication *************************/

  /************************* Auditions ****************************/
  // Casting Auditions
  castingAuditions: `${baseURL}/v1/auditions/casting-auditions/`,

  // Self Auditions
  selfAudition: `${baseURL}/v1/auditions/self-auditions/`,
  actorCastingAuditions: `${baseURL}/v1/auditions/actor-casting-auditions/`,

  auditionTracker: `${baseURL}/v1/auditions/tracker/`,

  auditionMaterial: `${baseURL}/v1/auditions/self-materials/`,
  getAuditionMaterial: `${baseURL}/v1/auditions/self-materials/get_audition_materials`,
  /************************* Auditions ****************************/

  /************************* Bookings ****************************/
  bookings: `${baseURL}/v1/bookings/`,
  bookingDetail: (id) => `${baseURL}/v1/bookings/${id}/`,
  availableSlots: `${baseURL}/v1/bookings/available-slots/`,
  /************************* Bookings ****************************/

  /************************* Notifications ************************/
  myNotifications: `${baseURL}/v1/notifications/my-notifications/`,
  markNotificationRead: `${baseURL}/v1/notifications/mark-read/`,

  /************************* Notifications ************************/

  /************************Script ************************/
  scripts: `${baseURL}/v1/scene-study/scripts/`,
  scriptAnalysis: `${baseURL}/v1/scene-study`,
  coachScriptScenes: `${baseURL}/v1/scene-study/coach/scripts/`,
  updateScriptMetadata: `${baseURL}/v1/scene-study/script/`,
  rehearsalStart: `${baseURL}/v1/scene-study/rehearsal/start/`,
  rehearsalComplete: `${baseURL}/v1/scene-study/rehearsal/complete/`,
  /*************************Script************************/

  /************************* Coaches ************************/
  coaches: `${baseURL}/v1/users/coaches/`,
  /************************* Coaches ************************/

  /******************** Dashboard Panels ********************/
  // Booking locations & membership
  locations: `${baseURL}/v1/bookings/locations/`,
  membership: `${baseURL}/v1/bookings/membership/`,

  // Dashboard auditions (generic)
  auditions: `${baseURL}/v1/auditions/`,
  auditionStats: `${baseURL}/v1/auditions/stats/`,

  // Reports
  reports: `${baseURL}/v1/auditions/reports/`,

  // Audition scripts (distinct from scene-study scripts)
  auditionScripts: `${baseURL}/v1/auditions/scripts/`,

  // Submissions
  submissions: `${baseURL}/v1/auditions/submissions/`,

  // Profile
  profile: `${baseURL}/v1/users/profile/`,

  // Rehearsals
  rehearsals: `${baseURL}/v1/rehearsals/`,

  // Community
  communityPosts: `${baseURL}/v1/community/posts/`,

  // AI
  cdFeedback: `${baseURL}/v1/ai/cd-feedback/`,
  scenePartner: `${baseURL}/v1/ai/scene-partner/`,
  transcribe: `${baseURL}/v1/ai/transcribe/`,
  tts: `${baseURL}/v1/ai/tts/`,
  /******************** Dashboard Panels ********************/
};

export default endPoints;

```

---
## src/redux/store.js
```
// Library imports
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Local imports
import authSlice from './features/auth/authSlice';
import snackbarReducer from './features/snackbarSlice/snackbarSlice';
import actorAuditionsReducer from './features/actorAuditions/actorAuditionsSlice';
import castingAuditionsSlice from './features/castingAuditions/castingAuditionsSlice';
import actorBookingsSlice from './features/actorBookings/actorBookingsSlice';
import notificationSlice from './features/notifications/notificationsSlice';
import auditionTrackerSlice from './features/actorAuditions/auditionTrackerSlice';
import sceneStudyScriptsSlice from './features/sceneStudyScripts/sceneStudyScriptsSlice';
import readersSlice from './features/sceneStudyScripts/readersSlice';

// Dashboard panel slices
import bookingsSlice from './features/bookings/bookingsSlice';
import auditionsSlice from './features/auditions/auditionsSlice';
import profileSlice from './features/profile/profileSlice';
import scriptsSlice from './features/scripts/scriptsSlice';
import rehearsalsSlice from './features/rehearsals/rehearsalsSlice';
import reportsSlice from './features/reports/reportsSlice';
import communitySlice from './features/community/communitySlice';
import submissionsSlice from './features/submissions/submissionsSlice';

// Define the persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth'],
};

// Combine reducers
const rootReducer = combineReducers({
  auth: authSlice,
  snackbar: snackbarReducer,
  actorAuditions: actorAuditionsReducer,
  CastingDirectorAuditions: castingAuditionsSlice,
  actorBookings: actorBookingsSlice,
  notifications: notificationSlice,
  auditionTracker: auditionTrackerSlice,
  sceneStudyScripts: sceneStudyScriptsSlice,
  readers: readersSlice,
  // Dashboard panel reducers
  bookings: bookingsSlice,
  auditions: auditionsSlice,
  profile: profileSlice,
  scripts: scriptsSlice,
  rehearsals: rehearsalsSlice,
  reports: reportsSlice,
  community: communitySlice,
  submissions: submissionsSlice,
});

// Create a persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure the store with the persisted reducer
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

// Create a persistor
export const persistor = persistStore(store);

```

---
## src/routes/config.jsx
```
// Library import
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// Local import
import { RoleBasedRedirect } from './routeHelpers';
import { ComingSoon, Layout } from '../components/shared/index.js';

// Auth panels (keep static — small and needed immediately)
import { Login } from '../panels/Authentication/Login';
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

```

---
## src/routes/sideMenuConfig.jsx
```
// Local imports
import {
  AnalysisIcon,
  AuditionTrackerIcon,
  BookingIcon,
  BriefcaseIcon,
  CollaborationIcon,
  DashboardIcon,
  NotificationIcon,
  SceneStudyIcon,
  SparklesIcon,
  VedioIcon,
} from '../assets/icons';
import Dashboard from '../panels/UserPanel/Dashboard';
import { ActorBooking } from '../panels/UserPanel/Actor/Bookings';
import { CastingDirectorBooking } from '../panels/UserPanel/CastingDirector/Bookings';
import { AuditionTracker } from '../panels/UserPanel/Actor/AuditionTracker';
import Notifications from '../panels/UserPanel/Notifications';
import { Collaboration } from '../panels/UserPanel/Actor/SeceneStudy/Collaboration';
import { LiveRehearsal } from '../panels/UserPanel/Actor/SeceneStudy/Collaboration/LiveRehearsal.jsx';
import ScriptUploadAndListing from '../panels/UserPanel/Actor/SeceneStudy/SceneStudyAnalysis/ScriptUploadAndListing';
import CoachCollaboration from '../panels/UserPanel/Coach/Collaboration';

const adminMenu = [
  {
    path: '/dashboard',
    text: 'Dashboard',
    icon: <DashboardIcon height={19} width={19} />,
    element: <Dashboard />,
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
    path: '/bookings',
    text: 'Bookings',
    icon: <BookingIcon height={19} width={19} />,
    element: <ActorBooking />,
  },
  {
    path: '/auditions-tracker',
    text: 'Audition Tracker',
    icon: <AuditionTrackerIcon height={19} width={19} />,
    element: <AuditionTracker />,
  },
  {
    path: '/dashboard/cd-sim',
    text: 'CD Sim',
    icon: <SparklesIcon height={19} width={19} />,
  },
  {
    path: '/dashboard/generator',
    text: 'Scene Generator',
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
    path: '/bookings',
    text: 'Bookings',
    icon: <BookingIcon height={19} width={19} />,
    element: <CastingDirectorBooking />,
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

const agentMenu = [
  {
    path: '/dashboard/agent-portal',
    text: 'My Roster',
    icon: <BriefcaseIcon height={19} width={19} />,
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
    case 'agent':
      return agentMenu;
    default:
      return agentMenu;
  }
};

```

---
## src/panels/Dashboard/Home/index.jsx
```
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import StatsCard from '../../../components/StatsCard.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { fetchAuditionStatsThunk } from '../../../redux/features/auditions/auditionsSlice';
import { fetchBookingsThunk, fetchMembershipThunk } from '../../../redux/features/bookings/bookingsSlice';
import AuditionBadges from '../../../components/AuditionBadges';

const TYPE_COLORS = {
  film: '#ff6b35',
  commercial: '#3b82f6',
  theatrical: '#8b5cf6',
  industrial: '#6b7280',
  theater: '#22c55e',
  voiceover: '#eab308',
};

const TYPE_LABELS = {
  film: 'Film/TV',
  commercial: 'Commercial',
  theatrical: 'Theatrical',
  industrial: 'Industrial',
  theater: 'Theater',
  voiceover: 'Voice Over',
};

const FUNNEL_STEPS = ['submitted', 'reviewed', 'callback', 'booked'];
const FUNNEL_LABELS = { submitted: 'Submitted', reviewed: 'In Review', callback: 'Callback', booked: 'Booked' };

const LoadingSkeleton = () => (
  <div className="animate-pulse bg-gray-200 rounded-xl h-28" />
);

export default function DashboardHome() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { stats } = useSelector((state) => state.auditions);
  const { bookings, loading: bookingsLoading } = useSelector((state) => state.bookings);

  useEffect(() => {
    dispatch(fetchAuditionStatsThunk());
    dispatch(fetchBookingsThunk());
    dispatch(fetchMembershipThunk());
  }, [dispatch]);

  const s = stats.data || {};
  const isLoading = stats.loading;

  const statCards = [
    { title: 'Total Auditions', value: isLoading ? '...' : String(s.total || 0), change: '', positive: true },
    { title: 'This Month', value: isLoading ? '...' : String(s.this_month || 0), change: '', positive: true },
    { title: 'Callbacks', value: isLoading ? '...' : String(s.by_status?.callback || 0), change: '', positive: true },
    { title: 'Booked', value: isLoading ? '...' : String(s.by_status?.booked || 0), change: s.booked_rate ? `${s.booked_rate}%` : '', positive: true },
  ];

  // Type breakdown chart data
  const typeData = Object.entries(s.by_type || {}).map(([key, count]) => ({
    name: TYPE_LABELS[key] || key,
    value: count,
    color: TYPE_COLORS[key] || '#ff6b35',
  }));

  // Funnel data
  const funnelData = FUNNEL_STEPS.map((step) => ({
    name: FUNNEL_LABELS[step],
    count: s.by_status?.[step] || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        {stats?.data && <AuditionBadges stats={stats.data} compact={true} />}
      </div>

      {/* Feature Banners */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* AI Scene Generator Banner */}
        <div
          onClick={() => navigate('/dashboard/generator')}
          className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f0f23] rounded-2xl p-6 border border-[#2a2a4a] cursor-pointer hover:shadow-xl hover:shadow-[#ff6b35]/10 transition-all duration-300 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,_rgba(255,107,53,0.12),_transparent_60%)]" />
          <div className="relative">
            <h2 className="text-white text-xl font-bold flex items-center gap-2">
              Try AI Scene Generator
            </h2>
            <p className="text-gray-400 text-sm mt-1 mb-4">
              Pick a genre, character &amp; tone — get a custom audition scene in seconds.
            </p>
            <button className="bg-[#ff6b35] hover:bg-[#e85d2c] text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 group-hover:shadow-lg group-hover:shadow-[#ff6b35]/30 whitespace-nowrap cursor-pointer text-sm">
              Generate a Scene &rarr;
            </button>
          </div>
        </div>

        {/* Live Scene Mode Banner */}
        <div
          onClick={() => navigate('/dashboard/scene-study')}
          className="bg-gradient-to-r from-[#0f0f23] via-[#16213e] to-[#1a1a2e] rounded-2xl p-6 border border-[#2a2a4a] cursor-pointer hover:shadow-xl hover:shadow-[#ff6b35]/10 transition-all duration-300 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_rgba(255,107,53,0.15),_transparent_60%)]" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#ff6b35] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">New</span>
              <h2 className="text-white text-xl font-bold">Live Scene Mode</h2>
            </div>
            <p className="text-gray-400 text-sm mt-1 mb-4">
              Hands-free AI scene partner. Say your lines — get instant voice responses in real-time.
            </p>
            <button className="bg-[#ff6b35] hover:bg-[#e85d2c] text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 group-hover:shadow-lg group-hover:shadow-[#ff6b35]/30 whitespace-nowrap cursor-pointer text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
              Go Live &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <LoadingSkeleton key={i} />)
          : statCards.map((stat) => <StatsCard key={stat.title} {...stat} />)}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Audition Breakdown by Type — Donut */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">By Type</CardTitle>
            </CardHeader>
            <CardContent>
              {typeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {typeData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-12">No audition data yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Funnel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Audition Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              {(s.total || 0) > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={funnelData} layout="vertical" barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: '#374151', fontWeight: 500 }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip formatter={(value) => [value, 'Auditions']} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {funnelData.map((_, i) => (
                        <Cell key={i} fill={`rgba(255, 107, 53, ${1 - i * 0.2})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-12">Submit auditions to see your pipeline</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

```

---
## backend: urls.py
```
"""
URL configuration for self_tape_api project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

version = 'v1'

urlpatterns = [
    path("admin/", admin.site.urls),
    path(f'api/{version}/users/', include('apps.users.urls')),
    path(f'api/{version}/bookings/', include('apps.bookings.urls')),
    path(f'api/{version}/auditions/', include('apps.auditions.urls')),
    path(f'api/{version}/notifications/', include('apps.notifications.urls')),
    path(f'api/{version}/rehearsals/', include('apps.rehearsals.urls')),
    path(f'api/{version}/community/', include('apps.community.urls')),
    path(f'api/{version}/scene-study/', include('apps.scene_study.urls')),
    path(f'api/{version}/ai/', include('apps.ai.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

```

---
## backend: auditions/models.py
```
from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.utils import timezone

from helpers.models import DateModel
from safedelete import SOFT_DELETE_CASCADE
from safedelete.models import SafeDeleteModel


PROJECT_TYPE_CHOICES = [
    ('film', 'Film/TV'),
    ('commercial', 'Commercial'),
    ('theatrical', 'Theatrical'),
    ('industrial', 'Industrial'),
    ('theater', 'Theater'),
    ('voiceover', 'Voice Over'),
]

AUDITION_STATUS_CHOICES = [
    ('submitted', 'Submitted'),
    ('reviewed', 'Reviewed'),
    ('callback', 'Callback'),
    ('booked', 'Booked'),
    ('passed', 'Passed'),
]

SUBMISSION_METHOD_CHOICES = [
    ('self_submitted', 'Self Submitted'),
    ('agent', 'Agent'),
    ('manager', 'Manager'),
    ('casting_network', 'Casting Network'),
    ('actors_access', 'Actors Access'),
    ('other', 'Other'),
]

SUBMISSION_STATUS_CHOICES = [
    ('sent', 'Sent'),
    ('viewed', 'Viewed'),
    ('callback', 'Callback'),
    ('passed', 'Passed'),
    ('booked', 'Booked'),
]


# -------------------------------------------------------------------
# Project
# -------------------------------------------------------------------
class Project(DateModel, SafeDeleteModel):
    _safedelete_policy = SOFT_DELETE_CASCADE

    title = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=PROJECT_TYPE_CHOICES)
    casting_director = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='projects'
    )
    description = models.TextField(blank=True, default='')
    deadline = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'projects'
        verbose_name = 'project'
        verbose_name_plural = 'projects'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.get_type_display()})"


# -------------------------------------------------------------------
# Audition Slot
# -------------------------------------------------------------------
class AuditionSlot(DateModel, SafeDeleteModel):
    _safedelete_policy = SOFT_DELETE_CASCADE

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='audition_slots')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='audition_slots')
    session = models.ForeignKey(
        'bookings.BookingSession', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='audition_slots'
    )
    status = models.CharField(max_length=20, choices=AUDITION_STATUS_CHOICES, default='submitted')
    notes = models.TextField(blank=True, default='')
    submitted_at = models.DateTimeField(auto_now_add=True)
    video_file = models.FileField(
        upload_to='auditions/videos/%Y/%m/%d/',
        validators=[FileExtensionValidator(['mp4', 'mov', 'avi', 'webm'])],
        blank=True, null=True
    )
    video_url = models.URLField(blank=True, null=True)
    sides = models.ForeignKey(
        'Script', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='audition_slots'
    )
    project_type = models.CharField(max_length=20, choices=PROJECT_TYPE_CHOICES, default='film', blank=True)
    agency = models.CharField(max_length=255, blank=True, default='')
    callback_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'audition_slots'
        verbose_name = 'audition slot'
        verbose_name_plural = 'audition slots'
        ordering = ['-submitted_at']

    def __str__(self):
        return f"{self.actor.email} → {self.project.title} ({self.status})"


# -------------------------------------------------------------------
# Script
# -------------------------------------------------------------------
class Script(DateModel, SafeDeleteModel):
    _safedelete_policy = SOFT_DELETE_CASCADE

    title = models.CharField(max_length=255)
    project = models.ForeignKey(
        Project, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='scripts'
    )
    content = models.TextField(blank=True, default='')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='scripts'
    )
    file_upload = models.FileField(
        upload_to='scripts/%Y/%m/%d/',
        validators=[FileExtensionValidator(['pdf', 'doc', 'docx', 'txt'])],
        blank=True, null=True
    )

    class Meta:
        db_table = 'scripts'
        verbose_name = 'script'
        verbose_name_plural = 'scripts'

    def __str__(self):
        return self.title


# -------------------------------------------------------------------
# Tape Submission
# -------------------------------------------------------------------
class TapeSubmission(DateModel, SafeDeleteModel):
    _safedelete_policy = SOFT_DELETE_CASCADE

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='submissions'
    )
    audition_slot = models.ForeignKey(
        AuditionSlot, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='submissions'
    )
    project_name = models.CharField(max_length=255)
    role = models.CharField(max_length=255, blank=True, default='')
    casting_office = models.CharField(max_length=255, blank=True, default='')
    casting_director = models.CharField(max_length=255, blank=True, default='')
    submitted_via = models.CharField(
        max_length=20, choices=SUBMISSION_METHOD_CHOICES, default='self_submitted'
    )
    submitted_at = models.DateTimeField(default=timezone.now)
    deadline = models.DateTimeField(null=True, blank=True)
    video_url = models.URLField(blank=True, null=True)
    status = models.CharField(
        max_length=20, choices=SUBMISSION_STATUS_CHOICES, default='sent'
    )
    notes = models.TextField(blank=True, default='')
    follow_up_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'tape_submissions'
        verbose_name = 'tape submission'
        verbose_name_plural = 'tape submissions'
        ordering = ['-submitted_at']

    def __str__(self):
        return f"{self.project_name} — {self.actor.email} ({self.status})"


# -------------------------------------------------------------------
# Self Material (script sides for scene study)
# -------------------------------------------------------------------
class SelfMaterial(DateModel, SafeDeleteModel):
    _safedelete_policy = SOFT_DELETE_CASCADE

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='self_materials'
    )
    audition = models.ForeignKey(
        AuditionSlot, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='self_materials'
    )
    title = models.CharField(max_length=255)
    file = models.FileField(
        upload_to='self_materials/%Y/%m/%d/',
        validators=[FileExtensionValidator(['pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg'])],
        blank=True, null=True
    )

    class Meta:
        db_table = 'self_materials'
        verbose_name = 'self material'
        verbose_name_plural = 'self materials'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} — {self.user.email}"

```

---
## backend: auditions/views.py
```
from collections import Counter
from datetime import timedelta

from django.db.models import Count
from django.db.models.functions import TruncMonth
from django.utils import timezone

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.auditions.models import AuditionSlot, Script, Project, TapeSubmission, SelfMaterial, PROJECT_TYPE_CHOICES
from apps.auditions.serializers import AuditionSlotSerializer, ScriptSerializer, SubmissionSerializer, SelfMaterialSerializer
from apps.notifications.utils import send_notification
from helpers.utils import api_response_parser


# -------------------------------------------------------------------
# Audition Slot List / Create
# -------------------------------------------------------------------
class AuditionSlotListCreateView(generics.ListCreateAPIView):
    serializer_class = AuditionSlotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AuditionSlot.objects.filter(actor=self.request.user)

    def perform_create(self, serializer):
        serializer.save(actor=self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return api_response_parser(
            data=serializer.data, message="Audition slots retrieved successfully",
            success=True, status=status.HTTP_200_OK
        )

    def create(self, request, *args, **kwargs):
        data = request.data.copy()

        # Accept project as a string name — auto-create Project if needed
        project_val = data.get('project')
        if project_val and not str(project_val).isdigit():
            project, _ = Project.objects.get_or_create(
                title=project_val,
                defaults={'type': 'film', 'casting_director': None}
            )
            data['project'] = project.id

        # Accept role as free text — store in notes if no role field
        role = data.pop('role', None)
        casting_director_name = data.pop('casting_director', None)
        notes_parts = []
        if role:
            notes_parts.append(f"Role: {role}")
        if casting_director_name:
            notes_parts.append(f"CD: {casting_director_name}")
        if notes_parts:
            data['notes'] = '\n'.join(notes_parts)

        # Handle new audition fields
        if 'project_type' not in data:
            data.setdefault('project_type', 'film')

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        send_notification(
            user_id=request.user.id,
            notification_type="audition_update",
            data={
                "audition_id": serializer.instance.id,
                "status": "created",
                "message": "New audition slot added.",
            },
        )
        return api_response_parser(
            data=serializer.data, message="Audition slot created successfully",
            success=True, status=status.HTTP_201_CREATED
        )


# -------------------------------------------------------------------
# Script List / Create
# -------------------------------------------------------------------
class ScriptListCreateView(generics.ListCreateAPIView):
    serializer_class = ScriptSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Script.objects.filter(uploaded_by=self.request.user)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(title__icontains=search)
        return qs

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return api_response_parser(
            data=serializer.data, message="Scripts retrieved successfully",
            success=True, status=status.HTTP_200_OK
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return api_response_parser(
            data=serializer.data, message="Script uploaded successfully",
            success=True, status=status.HTTP_201_CREATED
        )


# -------------------------------------------------------------------
# Script Detail (Retrieve / Update / Delete)
# -------------------------------------------------------------------
class ScriptDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ScriptSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Script.objects.filter(uploaded_by=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return api_response_parser(
            data=serializer.data, message="Script retrieved successfully",
            success=True, status=status.HTTP_200_OK
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return api_response_parser(
            data=serializer.data, message="Script updated successfully",
            success=True, status=status.HTTP_200_OK
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return api_response_parser(
            data=None, message="Script deleted successfully",
            success=True, status=status.HTTP_204_NO_CONTENT
        )


# -------------------------------------------------------------------
# Submission List / Create
# -------------------------------------------------------------------
class SubmissionListCreateView(generics.ListCreateAPIView):
    serializer_class = SubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = TapeSubmission.objects.filter(actor=self.request.user)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def perform_create(self, serializer):
        serializer.save(actor=self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return api_response_parser(
            data=serializer.data, message="Submissions retrieved successfully",
            success=True, status=status.HTTP_200_OK
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return api_response_parser(
            data=serializer.data, message="Submission logged successfully",
            success=True, status=status.HTTP_201_CREATED
        )


# -------------------------------------------------------------------
# Submission Detail (Retrieve / Update / Delete)
# -------------------------------------------------------------------
class SubmissionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TapeSubmission.objects.filter(actor=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return api_response_parser(
            data=serializer.data, message="Submission retrieved successfully",
            success=True, status=status.HTTP_200_OK
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return api_response_parser(
            data=serializer.data, message="Submission updated successfully",
            success=True, status=status.HTTP_200_OK
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return api_response_parser(
            data=None, message="Submission deleted successfully",
            success=True, status=status.HTTP_204_NO_CONTENT
        )


# -------------------------------------------------------------------
# Audition Tracker (kanban view grouped by status)
# -------------------------------------------------------------------
class AuditionTrackerView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = AuditionSlot.objects.select_related('project').filter(actor=request.user)
        buckets = {
            'submitted': [],
            'in_review': [],
            'callback': [],
            'booked': [],
            'passed': [],
        }
        status_map = {
            'submitted': 'submitted',
            'reviewed': 'in_review',
            'callback': 'callback',
            'booked': 'booked',
            'passed': 'passed',
        }
        for slot in qs:
            bucket = status_map.get(slot.status, 'submitted')
            # Parse CD and Role from notes
            cd = ''
            character = ''
            for line in (slot.notes or '').splitlines():
                if line.startswith('CD:'):
                    cd = line[3:].strip()
                elif line.startswith('Role:'):
                    character = line[5:].strip()
            buckets[bucket].append({
                'id': slot.id,
                'project_title': slot.project.title,
                'character': character,
                'casting_director': cd,
                'agency': slot.agency,
                'project_type': slot.project_type,
                'status': slot.status,
                'callback_date': slot.callback_date,
                'notes': slot.notes,
                'created_at': slot.created_at,
            })
        return api_response_parser(
            data=buckets,
            message="Success",
            success=True,
            status=status.HTTP_200_OK,
        )


# -------------------------------------------------------------------
# Audition Stats
# -------------------------------------------------------------------
class AuditionStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = AuditionSlot.objects.filter(actor=request.user)
        total = qs.count()

        # By project_type
        by_type_qs = qs.values('project_type').annotate(count=Count('id'))
        by_type = {item['project_type']: item['count'] for item in by_type_qs}

        # By status
        by_status_qs = qs.values('status').annotate(count=Count('id'))
        by_status = {item['status']: item['count'] for item in by_status_qs}

        # This month
        now = timezone.now()
        this_month = qs.filter(
            submitted_at__year=now.year,
            submitted_at__month=now.month
        ).count()

        # Booked rate
        booked = by_status.get('booked', 0)
        booked_rate = round((booked / total) * 100, 1) if total > 0 else 0.0

        return api_response_parser(
            data={
                'total': total,
                'by_type': by_type,
                'by_status': by_status,
                'this_month': this_month,
                'booked_rate': booked_rate,
            },
            message="Audition stats retrieved successfully",
            success=True,
            status=status.HTTP_200_OK,
        )


# -------------------------------------------------------------------
# Reports — aggregated career analytics
# -------------------------------------------------------------------
class ReportsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = AuditionSlot.objects.filter(actor=request.user)
        now = timezone.now()
        six_months_ago = now - timedelta(days=180)

        # Monthly aggregations (last 6 months)
        monthly_qs = qs.filter(submitted_at__gte=six_months_ago)

        auditions_by_month_qs = (
            monthly_qs.annotate(month=TruncMonth('submitted_at'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        submissions_by_month_qs = (
            monthly_qs.filter(status__in=['submitted', 'reviewed', 'callback', 'booked', 'passed'])
            .annotate(month=TruncMonth('submitted_at'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        bookings_by_month_qs = (
            monthly_qs.filter(status='booked')
            .annotate(month=TruncMonth('submitted_at'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )

        def fmt_months(month_qs):
            return [
                {'month': item['month'].strftime('%b %Y'), 'count': item['count']}
                for item in month_qs
            ]

        # Type breakdown
        type_qs = qs.values('project_type').annotate(count=Count('id'))
        type_breakdown = {item['project_type']: item['count'] for item in type_qs}

        # Totals
        total_auditions = qs.count()
        total_booked = qs.filter(status='booked').count()
        total_callbacks = qs.filter(status='callback').count()
        total_submissions = total_auditions  # every audition slot is a submission

        booking_rate = round((total_booked / total_auditions) * 100, 1) if total_auditions > 0 else 0.0
        callback_rate = round(((total_callbacks + total_booked) / total_auditions) * 100, 1) if total_auditions > 0 else 0.0

        # Top casting offices (parsed from notes "CD: ..." lines)
        cd_counter = Counter()
        for notes in qs.exclude(notes='').values_list('notes', flat=True):
            for line in notes.split('\n'):
                if line.startswith('CD:'):
                    cd_name = line[3:].strip()
                    if cd_name:
                        cd_counter[cd_name] += 1
        top_casting_offices = [
            {'name': name, 'count': count}
            for name, count in cd_counter.most_common(10)
        ]

        # Busiest month
        busiest = auditions_by_month_qs.order_by('-count').first()
        busiest_month = busiest['month'].strftime('%B %Y') if busiest else None

        return api_response_parser(
            data={
                'auditions_by_month': fmt_months(auditions_by_month_qs),
                'submissions_by_month': fmt_months(submissions_by_month_qs),
                'bookings_by_month': fmt_months(bookings_by_month_qs),
                'type_breakdown': type_breakdown,
                'booking_rate': booking_rate,
                'callback_rate': callback_rate,
                'top_casting_offices': top_casting_offices,
                'busiest_month': busiest_month,
                'total_auditions': total_auditions,
                'total_submissions': total_submissions,
                'total_booked': total_booked,
            },
            message="Reports data retrieved successfully",
            success=True,
            status=status.HTTP_200_OK,
        )


# -------------------------------------------------------------------
# Self Auditions (auditions created by the user themselves)
# -------------------------------------------------------------------
class SelfAuditionListView(generics.ListAPIView):
    serializer_class = AuditionSlotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AuditionSlot.objects.filter(actor=self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return api_response_parser(
            data=serializer.data,
            message="Success",
            success=True,
            status=status.HTTP_200_OK,
        )


# -------------------------------------------------------------------
# Self Materials (script sides / tape materials)
# -------------------------------------------------------------------
class SelfMaterialListCreateView(generics.ListCreateAPIView):
    serializer_class = SelfMaterialSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SelfMaterial.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return api_response_parser(
            data=serializer.data,
            message="Success",
            success=True,
            status=status.HTTP_200_OK,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return api_response_parser(
            data=serializer.data,
            message="Material created successfully",
            success=True,
            status=status.HTTP_201_CREATED,
        )


class SelfMaterialAuditionMaterialsView(generics.ListAPIView):
    serializer_class = SelfMaterialSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SelfMaterial.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return api_response_parser(
            data=serializer.data,
            message="Success",
            success=True,
            status=status.HTTP_200_OK,
        )

```

---
## backend: auditions/urls.py
```
from django.urls import path

from apps.auditions.views import (
    AuditionSlotListCreateView, ScriptListCreateView, ScriptDetailView,
    AuditionStatsView, ReportsView, SubmissionListCreateView, SubmissionDetailView,
    AuditionTrackerView, SelfAuditionListView,
    SelfMaterialListCreateView, SelfMaterialAuditionMaterialsView,
)

app_name = 'auditions'

urlpatterns = [
    path('', AuditionSlotListCreateView.as_view(), name='audition-list-create'),
    path('tracker/', AuditionTrackerView.as_view(), name='audition-tracker'),
    path('stats/', AuditionStatsView.as_view(), name='audition-stats'),
    path('reports/', ReportsView.as_view(), name='reports'),
    path('scripts/', ScriptListCreateView.as_view(), name='script-list-create'),
    path('scripts/<int:pk>/', ScriptDetailView.as_view(), name='script-detail'),
    path('submissions/', SubmissionListCreateView.as_view(), name='submission-list-create'),
    path('submissions/<int:pk>/', SubmissionDetailView.as_view(), name='submission-detail'),
    path('self-auditions/', SelfAuditionListView.as_view(), name='self-audition-list'),
    path('self-materials/', SelfMaterialListCreateView.as_view(), name='self-material-list-create'),
    path('self-materials/get_audition_materials', SelfMaterialAuditionMaterialsView.as_view(), name='self-material-audition-materials'),
]

```

---
## backend: ai/views.py
```
from django.conf import settings as django_settings
import os

from openai import OpenAI
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from helpers.utils import api_response_parser

client = OpenAI(api_key=django_settings.OPENAI_API_KEY)


class CDFeedbackView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        line = request.data.get("line", "")
        script_context = request.data.get("script_context", "")
        character = request.data.get("character", "")
        feedback_type = request.data.get("type", "line")

        if not line:
            return api_response_parser(
                data=None, message="'line' is required.",
                success=False, status=status.HTTP_400_BAD_REQUEST,
            )

        system_prompt = (
            "You are a seasoned casting director giving real-time feedback during an audition. "
            "Be direct, professional, and specific. Keep feedback to 1-2 sentences max. "
            f"For type=line give acting notes on the delivered line. "
            f"For type=redirect give a redirect note asking the actor to try a different choice."
        )

        user_message = (
            f"Type: {feedback_type}\n"
            f"Character: {character}\n"
            f"Script context: {script_context}\n"
            f"Delivered line: {line}"
        )

        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=200,
        )

        feedback = completion.choices[0].message.content

        return api_response_parser(
            data={"feedback": feedback},
            message="Success",
            success=True,
            status=status.HTTP_200_OK,
        )


class ScenePartnerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        script_context = request.data.get("script_context", "")
        character = request.data.get("character", "")
        actor_line = request.data.get("actor_line", "")
        previous_lines = request.data.get("previous_lines", [])

        if not actor_line:
            return api_response_parser(
                data=None, message="'actor_line' is required.",
                success=False, status=status.HTTP_400_BAD_REQUEST,
            )

        system_prompt = (
            f"You are an AI scene partner playing opposite an actor in rehearsal. "
            f"Stay in character as {character}. Respond naturally to the actor's line "
            f"based on the script context. Keep responses concise and in-character."
        )

        messages = [{"role": "system", "content": system_prompt}]

        if script_context:
            messages.append({
                "role": "user",
                "content": f"[Script context]: {script_context}",
            })

        for prev in previous_lines:
            messages.append({"role": "assistant", "content": prev})

        messages.append({"role": "user", "content": actor_line})

        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=300,
        )

        response_text = completion.choices[0].message.content

        return api_response_parser(
            data={"response": response_text, "character": character},
            message="Success",
            success=True,
            status=status.HTTP_200_OK,
        )


class TranscribeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        audio_file = request.FILES.get("audio")

        if not audio_file:
            return api_response_parser(
                data=None, message="'audio' file is required.",
                success=False, status=status.HTTP_400_BAD_REQUEST,
            )

        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=(audio_file.name, audio_file.read(), audio_file.content_type),
        )

        return api_response_parser(
            data={"transcript": transcript.text},
            message="Success",
            success=True,
            status=status.HTTP_200_OK,
        )


class TTSView(APIView):
    """ElevenLabs text-to-speech — returns audio/mpeg stream."""
    permission_classes = [IsAuthenticated]

    VOICE_MAP = {
        # CD voices
        'cd_female': 'EXAVITQu4vr4xnSDxMaL',   # Sarah
        'cd_male':   'onwK4e9ZLuTAKqWW03F9',   # Daniel
        # Scene partner voices
        'partner_male':    'JBFqnCBsd6RMkjVDRZzb',  # George
        'partner_female':  'pFZP5JQG7iQjIQuC4Bku',  # Lily
        'partner_neutral': 'SAz9YHcvj6GT2YYXdXww',  # River
    }

    def post(self, request):
        import requests as req_lib
        text = request.data.get('text', '').strip()
        voice_key = request.data.get('voice', 'cd_female')

        if not text:
            return api_response_parser(
                data=None, message="'text' is required.",
                success=False, status=status.HTTP_400_BAD_REQUEST,
            )

        voice_id = self.VOICE_MAP.get(voice_key, self.VOICE_MAP['cd_female'])
        api_key = django_settings.ELEVENLABS_API_KEY
        url = f'https://api.elevenlabs.io/v1/text-to-speech/{voice_id}'

        resp = req_lib.post(
            url,
            headers={'xi-api-key': api_key, 'Content-Type': 'application/json'},
            json={'text': text, 'model_id': 'eleven_turbo_v2', 'voice_settings': {'stability': 0.5, 'similarity_boost': 0.75}},
            timeout=15,
        )

        if resp.status_code != 200:
            return api_response_parser(
                data=None, message="TTS generation failed.",
                success=False, status=status.HTTP_502_BAD_GATEWAY,
            )

        from django.http import HttpResponse
        return HttpResponse(resp.content, content_type='audio/mpeg')

```
