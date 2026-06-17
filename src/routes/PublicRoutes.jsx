// Library Imports
import { useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

//Local Imports
import { getFirstRouteByRole } from './routeHelpers';
import { setAuthToken } from '../redux/http';
import { RoleSelectionModal } from '../components/Auth/RoleSelectionModal';

const PublicRoutes = () => {
  const user = useSelector((state) => state?.auth?.user);
  const isRehydrated = useSelector((state) => state?._persist?.rehydrated);

  const role = user?.role || '';
  const token = user?.token;
  const allUserPermissions = user?.all_user_permissions || [];
  const hasMultipleRoles = Array.isArray(allUserPermissions) && allUserPermissions.length > 1;

  const firstPath = useMemo(() => getFirstRouteByRole(role), [role]);

  // Set once the multi-role user picks a role in the modal. Drives a
  // declarative <Navigate> below — the SAME mechanism the single-role path
  // uses — so the redirect works inside the iOS Capacitor shell, where
  // react-router's imperative navigate() no-ops.
  const [chosenRoute, setChosenRoute] = useState(null);

  // Ensure axios headers persist across reloads
  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  // Avoid redirecting while state is still loading from storage
  if (!isRehydrated) {
    return null;
  }

  // Single-role user: redirect straight to their dashboard.
  if (token && !hasMultipleRoles) {
    return <Navigate to={firstPath} replace />;
  }

  // Multi-role user who has now chosen a role: redirect declaratively.
  // switchRole leaves all_user_permissions multi, so hasMultipleRoles stays
  // true and the branch above won't fire — this branch carries them through.
  if (token && hasMultipleRoles && chosenRoute) {
    return <Navigate to={chosenRoute} replace />;
  }

  // Multi-role user who hasn't picked yet: show the role picker over the
  // public route. Previously this just rendered <Outlet /> (the login screen)
  // expecting "Login to handle role selection" — but nothing did, so the user
  // was stranded on /login. The modal handles selection + redirect on iOS.
  if (token && hasMultipleRoles) {
    return (
      <>
        <Outlet />
        <RoleSelectionModal
          open
          onClose={() => {}}
          availableRoles={allUserPermissions}
          onRoleSelected={(_role, firstRoute) => setChosenRoute(firstRoute)}
        />
      </>
    );
  }

  return <Outlet />;
};

export default PublicRoutes;
