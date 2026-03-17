// Library Imports
import { Fragment, useMemo } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Local Imports
import PrivateRoutes from './PrivateRoutes';
import PublicRoutes from './PublicRoutes';
import {
  authRoutes,
  commonRoutes,
  actorRoutes,
  agentRoutes,
  castingDirectorRoutes,
  adminRoutes,
  coachRoutes,
} from './config';


export const Router = () => {
  const user = useSelector((state) => state?.auth?.user);
  
  // Get current active role (backward compatible)
  const currentRole = user?.role || '';
  
  // Build routes based on current active role
  // This maintains backward compatibility - existing flows work as before
  const dynamicDashboardRoute = useMemo(() => {
    // Priority order: use current active role first
    if (currentRole === 'actor') {
      return [...commonRoutes, ...actorRoutes];
    } else if (currentRole === 'agent') {
      return [...commonRoutes, ...agentRoutes];
    } else if (currentRole === 'casting_director') {
      return [...commonRoutes, ...castingDirectorRoutes];
    } else if (currentRole === 'admin') {
      return [...commonRoutes, ...adminRoutes];
    } else if (currentRole === 'coach') {
      return [...commonRoutes, ...coachRoutes];
    }
    return commonRoutes;
  }, [currentRole]);

  return (
    <Fragment>
      <Routes>
        
        <Route element={<PrivateRoutes />}>
          {dynamicDashboardRoute?.map((route, index) => {
            return route.child ? (
              route.child.map((childRoute, index) => (
                <Fragment key={index}>
                  <Route path={route.path} element={route.element} />
                  <Route path={childRoute.path} element={childRoute.element} />
                </Fragment>
              ))
            ) : (
              <Route path={route.path} element={route.element} key={index} />
            );
          })}
        </Route>
        <Route element={<PublicRoutes />}>
          {authRoutes?.map((route, index) => {
            return (
              <Route path={route?.path} element={route?.element} key={index} />
            );
          })}
        </Route>
      </Routes>
    </Fragment>
  );
};
