// V-02: the legacy side-menu config was retired with the MUI shell; the
// first route per role is now declared here, matching the console Sidebar.
// Any other real role (e.g. `agent`) took the actor menu's first route in the
// old config's default branch, so it lands on /dashboard — never /login.
const FIRST_ROUTE_BY_ROLE = {
  admin: '/admin/dashboard',
  actor: '/dashboard',
  casting_director: '/dashboard',
  coach: '/collaboration',
};

export const getFirstRouteByRole = (role) => {
  if (!role || typeof role !== 'string') {
    return '/login';
  }
  return FIRST_ROUTE_BY_ROLE[role] || '/dashboard';
};
