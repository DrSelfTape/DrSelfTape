// Library Imports
import axios from 'axios';

// Local Imports
import { baseURL } from './constant';
import { logoutUser } from '../redux/features/auth/authSlice';

const axiosInstance = axios.create({
  baseURL,
});

export const setAuthToken = (token) => {
  if (token) {
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axiosInstance.defaults.headers.common['Authorization'];
  }
};

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.log('Error from axios:', error);

    if (!navigator.onLine) {
      console.log('No internet connection');
    }

    if (error?.response?.status === 401) {
      const { store, persistor } = await import('./store');
      const dispatch = store.dispatch;

      dispatch(logoutUser());
      persistor.purge(); 
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
