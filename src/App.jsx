// Library imports
import { BrowserRouter } from 'react-router-dom';

// Local imports
import './App.css';
import { Router } from './routes';

function App() {
  return (
    <BrowserRouter>
      <Router />
    </BrowserRouter>
  );
}

export default App;
