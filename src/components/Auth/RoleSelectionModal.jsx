// Library imports
import { useEffect } from 'react';
import { useSelector } from 'react-redux';

// Local imports
import { getFirstRouteByRole } from '../../routes/routeHelpers';

// This used to be a picker that POSTed the chosen role to
// /v1/users/switch-role/. The API has never had that endpoint and an account
// has exactly one `role`, so every choice failed, and PublicRoutes mounts this
// with a no-op onClose: anyone whose all_user_permissions has two entries (a
// superuser, a studio-desk operator) was held on /login with no way through.
// There is nothing to choose, so hand back the route for the role the account
// actually has.
export const RoleSelectionModal = ({ open, onRoleSelected }) => {
  const role = useSelector((state) => state?.auth?.user?.role);
  useEffect(() => {
    if (open) onRoleSelected?.(role, getFirstRouteByRole(role));
  }, [open, role, onRoleSelected]);
  return null;
};
