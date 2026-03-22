// Library Imports
import { Fragment, Suspense, useMemo } from 'react';
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
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[#ff6b35] border-t-transparent rounded-full animate-spin" /></div>}>
      <Routes>

        <Route element={<PrivateRoutes />}>
          {dynamicDashboardRoute?.map((route, index) => {
            if (route.children) {
              return (
                <Route path={route.path} element={route.element} key={index}>
                  {route.children.map((child, ci) =>
                    child.index ? (
                      <Route index element={child.element} key={ci} />
                    ) : (
                      <Route path={child.path} element={child.element} key={ci} />
                    )
                  )}
                </Route>
              );
            }
            return route.child ? (
              route.child.map((childRoute, ci) => (
                <Fragment key={`${index}-${ci}`}>
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
    </Suspense>
  );
};
