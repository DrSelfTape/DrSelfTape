import React, { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';


// V-02: the legacy side-menu config was retired with the MUI shell; the
// first route per role is now declared here, matching the console Sidebar.
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
  return FIRST_ROUTE_BY_ROLE[role] || '/login';
};

export const RoleBasedRedirect = () => {
  // Get user from persisted state
  const user = useSelector((state) => state?.auth?.user);
  
  // Check rehydration status as a safety measure
  const isRehydrated = useSelector((state) => state?._persist?.rehydrated);

  // Determine authentication status and get role
  const authState = useMemo(() => {
    // If rehydration is explicitly false/undefined and user is null, wait
    if (isRehydrated === false || (isRehydrated === undefined && user === null)) {
      return { isAuthenticated: null, role: null }; // Still checking
    }
    
    // User exists = authenticated
    const isAuthenticated = !!user;
    const role = user?.role || '';
    
    return { isAuthenticated, role };
  }, [user, isRehydrated]);

  // Still rehydrating - return null to prevent navigation
  if (authState.isAuthenticated === null) {
    return null;
  }

  // Not authenticated → redirect to login
  if (!authState.isAuthenticated) {
    return <Navigate to='/login' replace />;
  }

  // Authenticated → redirect to role's first route
  const firstPath = getFirstRouteByRole(authState.role);
  return <Navigate to={firstPath} replace />;
};

