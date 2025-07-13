// Library import
import { Navigate } from 'react-router-dom';

// Local import
import { ComingSoon, InvalidRole } from '../components/Shared';
import { isAuthenticatedUser, isValidRole } from '../utils/utils';
import Login from '../panels/Authentication/Login';
import Signup from '../panels/Authentication/SignUp';
import ForgotPassword from '../panels/Authentication/ForgotPassword';
import VerifyEmail from '../panels/Authentication/VerifyEmail';
import ResetPassword from '../panels/ResetPassword';

// Private routes
export const commonRoutes = [
  {
    path: '/',
    moduleName: 'Base',
    element: <Navigate to='/dashboard' replace />,
  },
  {
    path: '/dashboard',
    moduleName: 'Dashboard',
    element: isValidRole ? <ComingSoon /> : <InvalidRole />,
  },
];

export const actorRoutes = [
  {
    path: '/actor',
    moduleName: 'Actor',
    element: <ComingSoon />,
  },
];

export const agentRoutes = [
  {
    path: '/agent',
    moduleName: 'Agent',
    element: <ComingSoon />,
  },
];

export const castingDirectorRoutes = [
  {
    path: '/castingDirector',
    moduleName: 'CastingDirector',
    element: <ComingSoon />,
  },
];

export const adminRoutes = [
  {
    path: '/admin',
    moduleName: 'Admin',
    element: <ComingSoon />,
  },
];

// Auth routes
export const authRoutes = [
  {
    path: '/',
    moduleName: 'Base',
    element: isAuthenticatedUser ? (
      <Navigate to='/dashboard' replace />
    ) : (
      <Navigate to='/login' replace />
    ),
  },
  {
    path: '/login',
    moduleName: 'Login',
    element: <Login />,
  },
  {
    path: '/signup',
    moduleName: 'Signup',
    element: <Signup />,
  },
  {
    path: '/forgot-password',
    moduleName: 'Forgot password',
    element: <ForgotPassword />,
  },
  {
    path: '/reset-password',
    moduleName: 'Reset Password',
    element: <ResetPassword />,
  },
    {
    path: '/verify-email',
    moduleName: 'Verify Email',
    element: <VerifyEmail />,
  },
  {
    path: '/term-and-conditions',
    moduleName: 'Term and conditions',
    element: <ComingSoon />,
  },
  {
    path: '*',
    element: isAuthenticatedUser ? (
      <Navigate to='/dashboard' replace />
    ) : (
      <Navigate to='/login' replace />
    ),
  },
];
