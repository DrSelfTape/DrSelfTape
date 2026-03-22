import React, { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { sideMenuRoutes } from './sideMenuConfig';


export const getFirstRouteByRole = (role) => {
  if (!role || typeof role !== 'string') {
    return '/login';
  }
  try {
    const routes = sideMenuRoutes(role);
    if (routes && routes.length > 0 && routes[0]?.path) {
      return routes[0].path;
    }
  } catch (error) {
    console.warn(
      'Error getting first route from sideMenuRoutes, using fallback:',
      error
    );
  }

  // Fallback routes if sideMenuRoutes fails or returns empty
  const fallbackRoutes = {
    admin: '/admin/dashboard',
    actor: '/dashboard',
    casting_director: '/dashboard',
    coach: '/collaboration',
  };

  return fallbackRoutes[role] || '/login';
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

