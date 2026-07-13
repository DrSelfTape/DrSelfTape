// Library Imports
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Local Imports
import { setAuthToken } from '../redux/http';
import BootSplash from '../components/Shared/BootSplash';

const PrivateRoutes = () => {
  // Read persisted auth state
  const user = useSelector((state) => state?.auth?.user);
  const isRehydrated = useSelector((state) => state?._persist?.rehydrated);
  const token = user?.token;

  // Ensure axios has the auth header before children render on first paint
  if (token) {
    setAuthToken(token);
  }

  // Wait until redux-persist finishes rehydration to avoid false redirects.
  // Show a branded splash rather than null so cold launch doesn't flash blank.
  if (!isRehydrated) {
    return <BootSplash />;
  }

  if (token) {
    return <Outlet />;
  }

  return <Navigate to='/login' replace />;
};

export default PrivateRoutes;
