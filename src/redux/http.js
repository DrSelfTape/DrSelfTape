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

// Request Interceptor — attach JWT from Redux store on every request
axiosInstance.interceptors.request.use(
  async (config) => {
    if (!config.headers['Authorization']) {
      const { store } = await import('./store');
      const state = store.getState();
      // This build stores token at state.auth.user.token
      const token = state?.auth?.user?.token;
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.log('Error from axios:', error);

    if (!navigator.onLine) {
      console.log('No internet connection');
    }

    if (error?.response?.status === 402 && error?.response?.data?.code === 'insufficient_tokens') {
      // Fire a custom event that components can listen to
      window.dispatchEvent(new CustomEvent('insufficient_tokens'));
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
