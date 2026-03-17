// Library Imports
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Local Imports
import { setAuthToken } from '../redux/http';

const PrivateRoutes = () => {
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
    return null;
  }

  if (token) {
    return <Outlet />;
  }

  return <Navigate to='/login' replace />;
};

export default PrivateRoutes;
