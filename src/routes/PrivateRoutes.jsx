// Library Imports
import { Navigate, Outlet } from 'react-router-dom';

// Local Imports
import { isAuthenticatedUser } from '../utils/utils';

const PrivateRoutes = () => {
  return isAuthenticatedUser() ? <Outlet /> : <Navigate to='/login' />;
};

export default PrivateRoutes;
