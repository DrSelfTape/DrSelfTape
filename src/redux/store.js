// Library imports
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore, createMigrate } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Migrations — bump version in persistConfig when breaking state shape changes
const migrations = {
  2: (state) => ({ auth: state?.auth }), // v2: only keep auth, drop everything else
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

// Admin panel slice
import adminSlice from './features/admin/adminSlice';

// Define the persist configuration
const persistConfig = {
  key: 'root',
  version: 2,
  storage,
  whitelist: ['auth'],
  migrate: migrationConfig,
};

// Combine reducers
const rootReducer = combineReducers({
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
  // Admin panel reducer
  admin: adminSlice,
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
