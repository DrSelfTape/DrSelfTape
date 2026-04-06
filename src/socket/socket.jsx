import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import ReconnectingWebSocket from "reconnecting-websocket";
import { HeartHandshake } from "lucide-react";
import { fetchMatches, fetchWhoWantsToRead, fetchMatchingStats, fetchGreenRoomMessages } from "../redux/features/readers/readersMatchSlice";

const SocketContext = React.createContext(null);
const isMobile = () => window.innerWidth < 768;

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

  // Like toast state
  const [likeToast, setLikeToast] = useState(null); // { fromName }

  const sendCommand = useCallback((payload = {}) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const handleIncomingMessage = useCallback((parsedData) => {
    const { notification_type, data } = parsedData;

    setNotifications((prev) => [parsedData, ...prev]);

    switch (notification_type) {
      // Someone swiped right on you — refresh data + show toast
      case 'scene_partner_like':
        dispatch(fetchWhoWantsToRead());
        dispatch(fetchMatchingStats());
        setLikeToast({ fromName: data?.from_name || 'Someone' });
        setTimeout(() => setLikeToast(null), 6000);
        break;

      // Mutual match — refresh matches + navigate to "It's a Scene"
      case 'scene_partner_match':
        dispatch(fetchMatches());
        if (data?.match_id) {
          if (isMobile()) {
            // Use custom event for mobile tab navigation
            window.dispatchEvent(new CustomEvent('drst-navigate', { detail: { panel: 'green-room' } }));
          } else {
            navigate(`/dashboard/its-a-scene/${data.match_id}`);
          }
        }
        break;

      // New chat message — refresh messages for that match
      case 'new_message':
        if (data?.match_id) {
          dispatch(fetchGreenRoomMessages(data.match_id));
        }
        break;

      // Partner started the video call — show incoming call modal (auto-dismiss after 30s)
      case 'rehearsal_started':
        if (data?.room_url && data?.match_id) {
          setIncomingCall({
            matchId: data.match_id,
            roomUrl: data.room_url,
            partnerName: data.partner_name || 'Your scene partner',
          });
          setTimeout(() => setIncomingCall((prev) =>
            prev?.matchId === data.match_id ? null : prev
          ), 30000);
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

  const handleLikeToastTap = () => {
    setLikeToast(null);
    if (isMobile()) {
      window.dispatchEvent(new CustomEvent('drst-navigate', { detail: { panel: 'who-wants-to-read' } }));
    } else {
      navigate('/dashboard/who-wants-to-read');
    }
  };

  return (
    <SocketContext.Provider value={{ sendCommand, notifications, isSocketReady }}>
      {children}

      {/* ── Like Toast Notification ──────────────────────────────────── */}
      {likeToast && (
        <div
          className="fixed top-4 left-4 right-4 z-[998] mx-auto max-w-sm cursor-pointer"
          onClick={handleLikeToastTap}
          style={{ animation: 'slideDown 0.4s ease-out forwards' }}
        >
          <div className="bg-[#1A1A2E] border border-[#C855F0]/30 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-2xl">
            <div className="w-11 h-11 rounded-full bg-[#C855F0]/20 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-5 h-5 text-[#C855F0]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">{likeToast.fromName} wants to read with you!</p>
              <p className="text-[#A7ECDA] text-xs mt-0.5">Tap to see who &rarr;</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setLikeToast(null); }}
              className="text-[#666] hover:text-white text-lg leading-none"
            >&times;</button>
          </div>
          <style>{`
            @keyframes slideDown {
              from { opacity: 0; transform: translateY(-20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}

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
