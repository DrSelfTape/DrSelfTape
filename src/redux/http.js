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
  '/v1/users/token/refresh/',
];

// Guard against the post-logout 401 cascade: once we kick a user out,
// every in-flight request will also 401 and try to log them out again.
// Only handle the first one per session.
let sessionExpiredHandled = false;

// Reset the one-shot 401 latch on logout/login so a later genuine session
// expiry still triggers the logout+redirect (the latch otherwise sticks true
// if a 401 fired while already on /login, permanently disabling expiry logout).
export const resetSessionExpiredLatch = () => { sessionExpiredHandled = false; };

// Silent session refresh. Access tokens live 60 minutes; the refresh token
// (30 days, rotated on every use) is exchanged here for a new pair so the
// user never sees a login wall mid-session. Single-flight: when a burst of
// requests 401s together (dashboard fires 10-15 calls per page), only ONE
// refresh hits the BE — the rest await the same promise. This matters
// beyond politeness: rotation blacklists the used refresh token, so a
// second concurrent refresh with the same token would 401 and log the
// user out.
let refreshPromise = null;

const refreshSession = async () => {
  // Sequential dynamic imports for the same circular-dep reason as the
  // logout path below.
  const storeMod = await import('./store');
  const store = storeMod?.store;
  const refresh = store?.getState?.()?.auth?.user?.refresh;
  if (!refresh) throw new Error('no refresh token stored');
  // Bare axios, NOT axiosInstance: skips this interceptor (no recursion)
  // and doesn't carry the expired Bearer header.
  const { data } = await axios.post(`${baseURL}/v1/users/token/refresh/`, { refresh });
  if (!data?.access) throw new Error('refresh response missing access token');
  const authMod = await import('./features/auth/authSlice');
  store.dispatch(authMod.setTokens({ access: data.access, refresh: data.refresh }));
  setAuthToken(data.access);
  return data.access;
};

const trySessionRefresh = async (failedConfig) => {
  refreshPromise = refreshPromise || refreshSession().finally(() => { refreshPromise = null; });
  const access = await refreshPromise;
  const retryConfig = {
    ...failedConfig,
    headers: { ...(failedConfig?.headers || {}), Authorization: `Bearer ${access}` },
  };
  return axiosInstance(retryConfig);
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
      // Fire the funnel entry event — paired with no_tokens_modal_shown
      // (mount), no_tokens_upgrade_tapped, and no_tokens_modal_dismissed.
      // Lazy import so analytics never delays a 402 response handling.
      import('../utils/analytics').then(({ trackEvent }) => {
        trackEvent('insufficient_tokens', {
          path: error?.config?.url,
          method: error?.config?.method,
        });
      }).catch(() => { /* swallow */ });
    }

    // Apple Guideline 5.1.1(i) — if a panel slips past the AIGate and
    // an AI request hits the BE without consent, the user gets a 403
    // with detail='ai_consent_required'. Open the consent modal so the
    // user can accept and retry, rather than dumping a raw HTTP error.
    if (
      error?.response?.status === 403 &&
      (error?.response?.data?.detail === 'ai_consent_required' ||
       error?.response?.data?.code === 'ai_consent_required' ||
       (typeof error?.response?.data?.message === 'string' &&
        error.response.data.message.toLowerCase().includes('ai features require')))
    ) {
      try { window.dispatchEvent(new CustomEvent('drst-open-ai-consent')); } catch { /* swallow */ }
    }

    if (error?.response?.status === 401) {
      const requestUrl = error?.config?.url || '';
      const hadAuthHeader = !!error?.config?.headers?.Authorization;
      const isPublicAuth = PUBLIC_AUTH_PATHS.some((p) => requestUrl.includes(p));

      // Only treat 401 as session-expired when the caller was actually
      // authenticated AND wasn't hitting a public auth endpoint.
      if (hadAuthHeader && !isPublicAuth && !sessionExpiredHandled) {
        // First line of defense: the access token likely just expired
        // (60-min lifetime). Try one silent refresh + retry of the failed
        // request. Only when THAT fails (refresh token expired/blacklisted/
        // absent, or the retried request 401s again) fall through to the
        // logout below. _authRetried guards the retried request itself from
        // looping back in here.
        if (error.config && !error.config._authRetried) {
          error.config._authRetried = true;
          try {
            return await trySessionRefresh(error.config);
          } catch { /* refresh failed — fall through to session-expired logout */ }
        }
        if (sessionExpiredHandled) return Promise.reject(error);
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
