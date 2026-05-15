// Library imports
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

// Local imports
import './App.css';
import { SocketProvider } from './socket/socket';
import { Router } from './routes/index';
import { initAnalytics, identifyUser } from './utils/analytics';
import { fetchUserSettings, resetSettings } from './redux/features/userSettings/userSettingsSlice';
import { initPurchases } from './utils/purchases';
import { resumeQueue } from './utils/uploadQueue';

function App() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth?.user);
  const userId = user?.id;

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (user) identifyUser(user);
  }, [user]);

  // Hydrate per-user settings (theme, tutorial state, reader filters, etc.)
  // from the server whenever the user identity changes — login, signup, or
  // app boot after a redux-persist rehydrate. Reset on logout so prefs from
  // the previous user don't leak into an anonymous browsing session.
  useEffect(() => {
    if (userId) {
      dispatch(fetchUserSettings());
      // Tie native iOS purchases to the same backend user ID so
      // RevenueCat's webhook can match the receipt to our user row.
      // No-ops on web or without VITE_REVENUECAT_IOS_KEY.
      initPurchases(userId);
      // Resume any self-tape uploads that were pending when the tab
      // closed. Reads persisted queue state from localStorage and
      // restarts the pump. No-op if the queue is empty.
      resumeQueue();
    } else {
      dispatch(resetSettings());
    }
  }, [userId, dispatch]);

  return (
    <SocketProvider>
      <Router />
    </SocketProvider>
  );
}

export default App;
