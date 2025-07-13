// Library imports
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Local imports
import authSlice from './reducers/auth/authSlice';

// Define the persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth'],
};

// Combine reducers
const rootReducer = combineReducers({
  auth: authSlice,
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
