// Library Imports
import { Navigate, Outlet } from 'react-router-dom';

//Local Imports
import { isAuthenticatedUser } from '../utils/utils';

const PublicRoutes = () => {
  return isAuthenticatedUser() ?  <Navigate to='/dashboard' /> :<Outlet /> ;
};

export default PublicRoutes;
