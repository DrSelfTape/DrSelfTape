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

// Library Imports

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <ThemeProvider>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <BrowserRouter>
            <ErrorBoundary>
              <App />
              <Toastbar />
            </ErrorBoundary>
          </BrowserRouter>
        </PersistGate>
      </Provider>
    </ThemeProvider>
  </ErrorBoundary>
)

