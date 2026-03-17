// Library imports
import { BrowserRouter } from 'react-router-dom';

// Local imports
import './App.css';
import { Router } from './routes';
import { SocketProvider } from './socket/socket';



function App() {
  return (
    <SocketProvider>
      <Router />
    </SocketProvider>
  );
}

export default App;
