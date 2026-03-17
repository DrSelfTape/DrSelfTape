// Library Imports
import { useEffect, useMemo } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

//Local Imports
import { getFirstRouteByRole } from './routeHelpers';
import { setAuthToken } from '../redux/http';

const PublicRoutes = () => {
  const user = useSelector((state) => state?.auth?.user);
  const isRehydrated = useSelector((state) => state?._persist?.rehydrated);

  const role = user?.role || '';
  const token = user?.token;
  const allUserPermissions = user?.all_user_permissions || [];
  const hasMultipleRoles = Array.isArray(allUserPermissions) && allUserPermissions.length > 1;

  const firstPath = useMemo(() => getFirstRouteByRole(role), [role]);

  // Ensure axios headers persist across reloads
  useEffect(() => {
    setAuthToken(token);
  }, [token]);
  
  // Avoid redirecting while state is still loading from storage
  if (!isRehydrated) {
    return null;
  }

  // If user has multiple roles, don't redirect - let Login component handle role selection
  // Only redirect if user has a single role
  if (token && !hasMultipleRoles) {
    return <Navigate to={firstPath} replace />;
  }
  
  return <Outlet />;
};

export default PublicRoutes;
