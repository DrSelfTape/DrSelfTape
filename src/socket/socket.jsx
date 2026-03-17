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
      console.log("Sent WS command:", payload);
    } else {
      console.warn("WebSocket is not ready to send commands");
    }
  }, []);

  const handleIncomingMessage = useCallback((parsedData) => {
    setNotifications((prev) => {
      const updated = [parsedData, ...prev];
      console.log("Updated notifications:", updated);
      return updated;
    });
    console.log("Incoming WS message:", parsedData);
  }, []);

  useEffect(() => {
    if (!currentUser || !token) return;

    const wsUrl = `wss://drselftape-api.testerp.co/ws/notifications/?token=${token}`;
    const ws = new ReconnectingWebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connection established");
      setIsSocketReady(true);
    };

    ws.onmessage = (event) => {
      console.log("Raw WS message:", event.data);
      try {
        const parsedData = JSON.parse(event.data);
        handleIncomingMessage(parsedData);
      } catch (err) {
        console.error("Failed to parse WS message:", err);
      }
    };

    ws.onerror = (err) => console.error("WebSocket error:", err);

    ws.onclose = (event) => {
      console.log("WebSocket connection closed:", event);
      setIsSocketReady(false);
    };

    return () => {
      console.log("Cleaning up WebSocket...");
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
