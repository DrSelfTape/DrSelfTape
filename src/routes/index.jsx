// Library Imports
import { Fragment } from 'react';
import { Route, Routes } from 'react-router-dom';

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
} from './config';
import { currentRole } from '../utils/utils';

export const Router = () => {
  
  const dynamicDashboardRoute =
    currentRole === 'actor'
      ? [...commonRoutes, ...actorRoutes]
      : currentRole === 'agent'
      ? [...commonRoutes, ...agentRoutes]
      : currentRole === 'castingDirector'
      ? [...commonRoutes, ...castingDirectorRoutes]
      : currentRole === 'admin'
      ? [...commonRoutes, ...adminRoutes]
      : commonRoutes;

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
