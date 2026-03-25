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

// Library Imports

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <Provider store={store}>
      <PersistGate loading={<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0D0D0D'}}><div style={{width:32,height:32,border:'3px solid rgba(200,85,240,0.2)',borderTop:'3px solid #C855F0',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>} persistor={persistor}>
        <BrowserRouter>
          <ErrorBoundary>
            <App />
            <Toastbar />
          </ErrorBoundary>
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </ErrorBoundary>
)

