// Library Imports
import axios from 'axios';

// Local Imports
import { baseURL } from './constant';
// NOTE: do NOT import authSlice here — it imports this file (circular dependency)

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
    if (!navigator.onLine) {
      console.log('No internet connection');
    }

    if (error?.response?.status === 402 && error?.response?.data?.code === 'insufficient_tokens') {
      window.dispatchEvent(new CustomEvent('insufficient_tokens'));
    }

    if (error?.response?.status === 401) {
      // Dynamic imports to avoid circular dependency
      const { store, persistor } = await import('./store');
      const { logoutUser } = await import('./features/auth/authSlice');
      store.dispatch(logoutUser());
      persistor.purge();
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
