// Library Imports
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

//Local Imports
import { getFirstRouteByRole } from './routeHelpers';
import { setAuthToken } from '../redux/http';
import { RoleSelectionModal } from '../components/Auth/RoleSelectionModal';
import BootSplash from '../components/Shared/BootSplash';
import { isAgeGateHeld, subscribeAgeGateHold } from '../components/AgeGate/ageGateHold';

const PublicRoutes = () => {
  const user = useSelector((state) => state?.auth?.user);
  const isRehydrated = useSelector((state) => state?._persist?.rehydrated);

  const role = user?.role || '';
  const token = user?.token;
  const allUserPermissions = user?.all_user_permissions || [];
  const hasMultipleRoles = Array.isArray(allUserPermissions) && allUserPermissions.length > 1;

  const firstPath = useMemo(() => getFirstRouteByRole(role), [role]);

  // Sign in with Apple authenticates BEFORE a birthdate can be asked for —
  // Apple never supplies one — so the Apple button collects it inline, on
  // this screen, holding the root age gate shut while it does.
  //
  // Without this check the redirect below fires the instant the token lands,
  // unmounts the button mid-capture, releases the hold, and the blocking
  // modal we were avoiding appears anyway. Staying put while a capture is in
  // flight is not a stall: that form IS the screen the user is using, and the
  // hold is a self-releasing lease, so a dropped capture cannot pin them here.
  const ageGateHeld = useSyncExternalStore(subscribeAgeGateHold, isAgeGateHeld, () => false);

  // Set once the multi-role user picks a role in the modal. Drives a
  // declarative <Navigate> below — the SAME mechanism the single-role path
  // uses — so the redirect works inside the iOS Capacitor shell, where
  // react-router's imperative navigate() no-ops.
  const [chosenRoute, setChosenRoute] = useState(null);

  // Ensure axios headers persist across reloads
  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  // Avoid redirecting while state is still loading from storage. Branded splash
  // rather than null so cold launch doesn't flash a blank white screen.
  if (!isRehydrated) {
    return <BootSplash />;
  }

  // Single-role user: redirect straight to their dashboard.
  if (token && !hasMultipleRoles && !ageGateHeld) {
    return <Navigate to={firstPath} replace />;
  }

  // Multi-role user who has now chosen a role: redirect declaratively.
  // switchRole leaves all_user_permissions multi, so hasMultipleRoles stays
  // true and the branch above won't fire — this branch carries them through.
  if (token && hasMultipleRoles && chosenRoute && !ageGateHeld) {
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
