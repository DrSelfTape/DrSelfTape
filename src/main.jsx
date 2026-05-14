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

// Init Sentry before render so it captures errors from the very first
// component mount. No-ops in dev (no DSN set).
initSentry();

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
              <App />
              <Toastbar />
            </ErrorBoundary>
          </BrowserRouter>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  </ErrorBoundary>
)

