import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import ReconnectingWebSocket from "reconnecting-websocket";

const SocketContext = React.createContext(null);

export const useSocket = () => {
  const state = useContext(SocketContext);
  if (!state) throw new Error("useSocket must be used within a SocketProvider");
  return state;
};

export const SocketProvider = ({ children }) => {
  const currentUser = useSelector((state) => state?.auth?.user);
  const token = useSelector((state) => state?.auth?.user?.token); // JWT token

  const socketRef = useRef(null);
  const [isSocketReady, setIsSocketReady] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const sendCommand = useCallback((payload = {}) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const handleIncomingMessage = useCallback((parsedData) => {
    setNotifications((prev) => [parsedData, ...prev]);
  }, []);

  useEffect(() => {
    if (!currentUser || !token) return;

    const apiUrl = import.meta.env.VITE_API_URL || '';
    const wsHost = apiUrl
      ? apiUrl.replace(/^https?:\/\//, '').replace(/\/api$/, '')
      : window.location.hostname !== 'localhost'
        ? window.location.hostname
        : 'localhost:8000';
    const wsProto = (apiUrl.startsWith('https') || window.location.protocol === 'https:') ? 'wss' : 'ws';
    const wsUrl = `${wsProto}://${wsHost}/ws/notifications/?token=${token}`;
    const ws = new ReconnectingWebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsSocketReady(true);
    };

    ws.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        handleIncomingMessage(parsedData);
      } catch (err) {
      }
    };

    ws.onerror = () => {};

    ws.onclose = () => {
      setIsSocketReady(false);
    };

    return () => {
      ws.close();
      setIsSocketReady(false);
      socketRef.current = null;
    };
  }, [currentUser, token, handleIncomingMessage]);

  return (
    <SocketContext.Provider
      value={{
        sendCommand,
        notifications,
        isSocketReady,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
