// Library imports
import { useSelector } from 'react-redux';

// Local imports
import './App.css';
import { SocketProvider } from './socket/socket';
import { Router } from './routes/index';

function App() {
  return (
    <SocketProvider>
      <Router />
    </SocketProvider>
  );
}

export default App;
