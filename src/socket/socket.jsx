import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import ReconnectingWebSocket from "reconnecting-websocket";
import { fetchMatches, fetchWhoWantsToRead, fetchMatchingStats } from "../redux/features/readers/readersMatchSlice";

const SocketContext = React.createContext(null);

export const useSocket = () => {
  const state = useContext(SocketContext);
  if (!state) throw new Error("useSocket must be used within a SocketProvider");
  return state;
};

export const SocketProvider = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state?.auth?.user);
  const token = useSelector((state) => state?.auth?.user?.token);

  const socketRef = useRef(null);
  const [isSocketReady, setIsSocketReady] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Incoming call state
  const [incomingCall, setIncomingCall] = useState(null); // { matchId, roomUrl, partnerName }

  const sendCommand = useCallback((payload = {}) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const handleIncomingMessage = useCallback((parsedData) => {
    const { notification_type, data } = parsedData;

    setNotifications((prev) => [parsedData, ...prev]);

    switch (notification_type) {
      // Someone swiped right on you — refresh likes list + dashboard stats
      case 'scene_partner_like':
        dispatch(fetchWhoWantsToRead());
        dispatch(fetchMatchingStats());
        break;

      // Mutual match — refresh matches + navigate to "It's a Scene"
      case 'scene_partner_match':
        dispatch(fetchMatches());
        if (data?.match_id) {
          navigate(`/dashboard/its-a-scene/${data.match_id}`);
        }
        break;

      // Partner started the video call — show incoming call modal
      case 'rehearsal_started':
        if (data?.room_url && data?.match_id) {
          setIncomingCall({
            matchId: data.match_id,
            roomUrl: data.room_url,
            partnerName: data.partner_name || 'Your scene partner',
          });
        }
        break;

      default:
        break;
    }
  }, [dispatch, navigate]);

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

    ws.onopen = () => setIsSocketReady(true);
    ws.onmessage = (event) => {
      try { handleIncomingMessage(JSON.parse(event.data)); } catch (_) {}
    };
    ws.onerror = () => {};
    ws.onclose = () => { setIsSocketReady(false); };

    // Auto-offline when user leaves the app/tab
    const handleVisibility = () => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      const presenceUrl = `${apiUrl}/v1/matching/presence/`;
      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
      if (document.visibilityState === 'hidden') {
        navigator.sendBeacon?.(presenceUrl, new Blob([JSON.stringify({ is_online: false })], { type: 'application/json' }));
      } else {
        fetch(presenceUrl, { method: 'POST', headers, body: JSON.stringify({ is_online: true }) }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      ws.close();
      setIsSocketReady(false);
      socketRef.current = null;
    };
  }, [currentUser, token, handleIncomingMessage]);

  const acceptCall = () => {
    if (!incomingCall) return;
    const { matchId, roomUrl } = incomingCall;
    const roomId = roomUrl.split('/').filter(Boolean).pop();
    setIncomingCall(null);
    navigate(`/meeting/${roomId}`, { state: { roomUrl } });
  };

  const declineCall = () => setIncomingCall(null);

  return (
    <SocketContext.Provider value={{ sendCommand, notifications, isSocketReady }}>
      {children}

      {/* ── Incoming Call Modal ───────────────────────────────────────── */}
      {incomingCall && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A2E] border border-[#C855F0]/40 rounded-2xl px-8 py-8 flex flex-col items-center gap-5 shadow-2xl max-w-sm w-full mx-4"
            style={{ animation: 'badgePop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
          >
            {/* Pulsing avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#C855F0] to-[#7B2FBE] flex items-center justify-center">
                <span className="text-2xl">🎬</span>
              </div>
              <div className="absolute inset-0 rounded-full bg-[#C855F0]/30 animate-ping" />
            </div>

            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#C855F0] mb-1">Incoming Scene Request</p>
              <h2 className="text-xl font-bold text-white">{incomingCall.partnerName}</h2>
              <p className="text-sm text-[#999] mt-1">is inviting you to a live read</p>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={declineCall}
                className="flex-1 py-2.5 rounded-xl border border-[#3A3A3A] text-[#999] text-sm font-semibold hover:bg-[#2A2A2A] transition-colors"
              >
                Decline
              </button>
              <button
                onClick={acceptCall}
                className="flex-1 py-2.5 rounded-xl bg-[#C855F0] text-white text-sm font-semibold hover:bg-[#A040C8] transition-colors"
              >
                Join Scene 🎬
              </button>
            </div>
          </div>
          <style>{`
            @keyframes badgePop {
              from { opacity:0; transform:scale(0.7) translateY(20px); }
              to   { opacity:1; transform:scale(1) translateY(0); }
            }
          `}</style>
        </div>
      )}
    </SocketContext.Provider>
  );
};
