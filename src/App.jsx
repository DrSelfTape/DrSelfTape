// Library imports
import { useEffect } from 'react';
import { useSelector } from 'react-redux';

// Local imports
import './App.css';
import { SocketProvider } from './socket/socket';
import { Router } from './routes/index';
import { initAnalytics, identifyUser } from './utils/analytics';

function App() {
  const user = useSelector((s) => s.auth?.user);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (user) identifyUser(user);
  }, [user]);

  return (
    <SocketProvider>
      <Router />
    </SocketProvider>
  );
}

export default App;
