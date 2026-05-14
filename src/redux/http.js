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

// Endpoints that return 401 on bad credentials/missing data — a 401 here
// means "wrong password" or "expired reset link," NOT "your session
// expired." We must not log the user out on these.
const PUBLIC_AUTH_PATHS = [
  '/v1/users/login/',
  '/v1/users/personal-info-registration/',
  '/v1/users/forgotpassword/',
  '/v1/users/reset-password/',
];

// Guard against the post-logout 401 cascade: once we kick a user out,
// every in-flight request will also 401 and try to log them out again.
// Only handle the first one per session.
let sessionExpiredHandled = false;

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
      const requestUrl = error?.config?.url || '';
      const hadAuthHeader = !!error?.config?.headers?.Authorization;
      const isPublicAuth = PUBLIC_AUTH_PATHS.some((p) => requestUrl.includes(p));

      // Only treat 401 as session-expired when the caller was actually
      // authenticated AND wasn't hitting a public auth endpoint.
      if (hadAuthHeader && !isPublicAuth && !sessionExpiredHandled) {
        sessionExpiredHandled = true;
        // Sequential awaits, not Promise.all — the modules form a small
        // circular dep graph (store ↔ http.js indirectly through the
        // auth slice), and parallel evaluation can leave one module's
        // exports as null on the first 401 of a session. Sequential
        // calls let each module fully initialize before we read it.
        try {
          const storeMod = await import('./store');
          const authMod = await import('./features/auth/authSlice');
          const snackMod = await import('./features/snackbarSlice/snackbarSlice');
          const store = storeMod?.store;
          const persistor = storeMod?.persistor;
          if (store && persistor) {
            store.dispatch(authMod.logoutUser());
            setAuthToken(null);
            store.dispatch(snackMod.showSnackbar({
              message: 'Your session has expired. Please log in again.',
              variant: 'error',
            }));
            await persistor.purge();
          }
        } catch (e) {
          // If the dynamic imports themselves fail (stale chunk after
          // deploy, network hiccup), we still want to bounce the user
          // to /login rather than crash the app.
          console.warn('Session-expired handler failed:', e);
        }
        // Full reload to /login — clears any in-memory state from the
        // previous user and avoids partially-rendered protected views.
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
