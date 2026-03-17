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
