// Library Imports
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Local Imports
import { setAuthToken } from '../redux/http';
import { usePushNotifications } from '../hooks/usePushNotifications';

const PrivateRoutes = () => {
  // Initialize push notifications for authenticated users
  usePushNotifications();

  // Read persisted auth state
  const user = useSelector((state) => state?.auth?.user);
  const isRehydrated = useSelector((state) => state?._persist?.rehydrated);
  const token = user?.token;

  // Ensure axios has the auth header before children render on first paint
  if (token) {
    setAuthToken(token);
  }

  // Wait until redux-persist finishes rehydration to avoid false redirects
  if (!isRehydrated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0D0D0D' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(200,85,240,0.2)', borderTop: '3px solid #C855F0', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (token) {
    return <Outlet />;
  }

  return <Navigate to='/login' replace />;
};

export default PrivateRoutes;
