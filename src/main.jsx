import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { BrowserRouter } from 'react-router-dom';

// Local Imports
import './index.css'
import App from './App.jsx'
import { persistor, store } from './redux/store.js'
import { Toastbar } from './components/Shared/Toastbar/index.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { ThemeProvider } from './utils/theme.jsx';
import { initSentry } from './utils/sentry.js';
import ForceUpdateGate from './components/ForceUpdateGate.jsx';

// Init Sentry before render so it captures errors from the very first
// component mount. No-ops in dev (no DSN set).
initSentry();

// Stale-chunk auto-recovery. After we deploy a new build to Vercel, the
// hashed chunk filenames change. Anyone with the prior index.html cached
// still references the old chunk names; tapping a lazy() route then fails
// with "Failed to fetch dynamically imported module" and the screen
// freezes (Joseph saw this trying to start a peer-to-peer session). One
// reload pulls the fresh index + chunks. The sessionStorage guard means
// we don't reload-loop when the failure is something other than a stale
// chunk (network down, etc.).
(function installStaleChunkReloader() {
  if (typeof window === 'undefined') return;
  const STALE_PATTERNS = [
    /Failed to fetch dynamically imported module/i,
    /Importing a module script failed/i,
    /error loading dynamically imported module/i,
    /ChunkLoadError/i,
  ];
  // Only reload on OUR bundle's chunk failures. Third-party SDKs (Daily.co,
  // Stripe, RevenueCat) routinely load their own dynamic modules; if one
  // hiccups, reloading the whole app is catastrophic — Joseph reported
  // tapping Live Session and the screen "loading then exiting" because
  // Daily's iframe init was tripping this handler.
  const OURS_PATTERNS = [
    /\/assets\//i,                          // Vite's hashed bundle path
    /capacitor:\/\/localhost/i,             // Capacitor's own scheme
    /drselftape\.app/i,                     // Web origin
  ];
  const RELOAD_KEY = '__dst_reloaded_stale_chunk__';
  const isStale = (msg) => STALE_PATTERNS.some((r) => r.test(String(msg || '')));
  const isOurs  = (msg) => {
    const s = String(msg || '');
    return OURS_PATTERNS.some((r) => r.test(s));
  };
  const reloadOnce = () => {
    try {
      if (sessionStorage.getItem(RELOAD_KEY)) return false;
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch { /* storage unavailable — still try a reload */ }
    window.location.reload();
    return true;
  };
  window.addEventListener('error', (e) => {
    const msg = e?.message || e?.error?.message;
    if (isStale(msg) && isOurs(msg)) reloadOnce();
  });
  window.addEventListener('unhandledrejection', (e) => {
    const msg = e?.reason?.message || e?.reason;
    if (isStale(msg) && isOurs(msg)) reloadOnce();
  });
  // Clear the guard once the new bundle has booted cleanly so the next
  // future redeploy can also self-heal.
  setTimeout(() => {
    try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* storage gone */ }
  }, 5000);
})();

// Library Imports

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {/* ThemeProvider must sit INSIDE Provider — it now uses
            useSelector/useDispatch to sync theme with the server-
            backed userSettings slice. Outside Provider, the Redux
            context is null and its hooks crash on first render. */}
        <ThemeProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <ForceUpdateGate>
                <App />
                <Toastbar />
              </ForceUpdateGate>
            </ErrorBoundary>
          </BrowserRouter>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  </ErrorBoundary>
)

