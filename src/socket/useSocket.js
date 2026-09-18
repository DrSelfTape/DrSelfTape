import { createContext, useContext } from 'react';
export const SocketContext = createContext(null);
export const useSocket = () => {
  const state = useContext(SocketContext);
  if (!state) throw new Error('useSocket must be used within a SocketProvider');
  return state;
};
