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
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0D0D0D' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(200,85,240,0.2)', borderTop: '3px solid #C855F0', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // If user has multiple roles, don't redirect - let Login component handle role selection
  // Only redirect if user has a single role
  if (token && !hasMultipleRoles) {
    return <Navigate to={firstPath} replace />;
  }
  
  return <Outlet />;
};

export default PublicRoutes;
