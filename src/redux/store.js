// Library imports
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore, createMigrate } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Migrations — bump version in persistConfig when breaking state shape changes
const migrations = {
  2: (state) => ({ auth: state?.auth }), // v2: only keep auth, drop everything else
  3: (state) => ({ auth: state?.auth }), // v3: cache bust for logout button deploy
};
const migrationConfig = createMigrate(migrations, { debug: false });

// Local imports
import authSlice from './features/auth/authSlice';
import snackbarReducer from './features/snackbarSlice/snackbarSlice';
import actorAuditionsReducer from './features/actorAuditions/actorAuditionsSlice';
import castingAuditionsSlice from './features/castingAuditions/castingAuditionsSlice';
import notificationSlice from './features/notifications/notificationsSlice';
import auditionTrackerSlice from './features/actorAuditions/auditionTrackerSlice';
import sceneStudyScriptsSlice from './features/sceneStudyScripts/sceneStudyScriptsSlice';
import readersSlice from './features/sceneStudyScripts/readersSlice';

// Dashboard panel slices
import auditionsSlice from './features/auditions/auditionsSlice';
import profileSlice from './features/profile/profileSlice';
import scriptsSlice from './features/scripts/scriptsSlice';
import rehearsalsSlice from './features/rehearsals/rehearsalsSlice';
import reportsSlice from './features/reports/reportsSlice';
import communitySlice from './features/community/communitySlice';
import submissionsSlice from './features/submissions/submissionsSlice';
import readersMatchSlice from './features/readers/readersMatchSlice';
import jerichoSlice from './features/jericho/jerichoSlice';
import craftJourneySlice from './features/craftJourney/craftJourneySlice';

// Admin panel slice
import adminSlice from './features/admin/adminSlice';

// User settings (cross-device sync)
import userSettingsSlice from './features/userSettings/userSettingsSlice';

// Community leaderboard (Aurora v3)
import leaderboardSlice from './features/leaderboard/leaderboardSlice';

// Define the persist configuration
// Whitelisted slices hydrate from disk on app launch so users see their
// last-known data immediately (stale-while-revalidate). Mount-time fetches
// in screens still run and refresh whatever's stale. Logout flow purges.
const persistConfig = {
  key: 'root',
  version: 3,
  storage,
  whitelist: [
    'auth',
    'auditions',          // stats + data drive home cards/chart
    'submissions',        // recent subs list on home
    'readersMatch',       // green room matches, activity feed, availability
    'sceneStudyScripts',  // script list shown on multiple screens
    'profile',            // profile completeness / role hints
    'userSettings',       // theme, tutorial flags (cross-device)
  ],
  migrate: migrationConfig,
};

// Combine reducers
const appReducer = combineReducers({
  auth: authSlice,
  snackbar: snackbarReducer,
  actorAuditions: actorAuditionsReducer,
  CastingDirectorAuditions: castingAuditionsSlice,
  notifications: notificationSlice,
  auditionTracker: auditionTrackerSlice,
  sceneStudyScripts: sceneStudyScriptsSlice,
  readers: readersSlice,
  // Dashboard panel reducers
  auditions: auditionsSlice,
  profile: profileSlice,
  scripts: scriptsSlice,
  rehearsals: rehearsalsSlice,
  reports: reportsSlice,
  community: communitySlice,
  submissions: submissionsSlice,
  readersMatch: readersMatchSlice,
  jericho: jerichoSlice,
  craftJourney: craftJourneySlice,
  // Admin panel reducer
  admin: adminSlice,
  // User settings (theme, tutorial, filters — synced across devices)
  userSettings: userSettingsSlice,
  // Community leaderboard (Aurora v3) — community rank + your_rank
  leaderboard: leaderboardSlice,
});

// Sign-out, and a password reset (which also ends the session), return every
// slice to its initial state. Otherwise the previous account's cached lists
// stay in memory, get written back to storage after performLogout's purge, and
// greet the next account on this device. Only the snackbar survives, so the
// toast explaining the sign-out is not wiped with it. `_persist` is held by
// persistReducer outside this reducer and is unaffected.
const SESSION_END_ACTIONS = new Set(['auth/logoutUser', 'auth/resetPassword/fulfilled']);
export const rootReducer = (state, action) =>
  appReducer(
    SESSION_END_ACTIONS.has(action.type) ? { snackbar: state?.snackbar } : state,
    action
  );

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
