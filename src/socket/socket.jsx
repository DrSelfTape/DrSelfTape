import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import ReconnectingWebSocket from "reconnecting-websocket";
import { HeartHandshake, Video, PhoneOff } from "lucide-react";
import { Haptics } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";
import { VoipCall, isVoipNative, registerVoip } from "../utils/voipCall";
import { fetchMatches, fetchWhoWantsToRead, fetchMatchingStats, fetchGreenRoomMessages, fetchActivityFeed } from "../redux/features/readers/readersMatchSlice";
import { getNotifications } from "../redux/features/notifications/notificationsSlice";
import { baseURL } from "../redux/constant";
import axiosInstance from "../redux/http";

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
  // navigate's identity changes with the location; using it directly in
  // handleIncomingMessage/joinRoom deps re-created the WebSocket on every
  // route change (ws-ticket burn + missed events during the gap).
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const currentUser = useSelector((state) => state?.auth?.user);
  const token = useSelector((state) => state?.auth?.user?.token);

  const socketRef = useRef(null);
  const [isSocketReady, setIsSocketReady] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // De-dup repeated socket events — both for matches and for incoming calls.
  // Sockets sometimes deliver the same notification twice on reconnect or
  // when the BE re-publishes; without this, the user gets a double navigate
  // or a duplicate ringing modal.
  const lastMatchRef = useRef({ id: null, at: 0 });

  // Tracks the auth token we last (re)registered the VoIP push token for, so we
  // register once per token becoming available — never repeatedly in a loop.
  const voipRegisteredForRef = useRef(null);

  // Incoming call state — { matchId, roomUrl, partnerName, ringId, ttl }.
  // ringId versions each call so a stale socket event can neither resurrect
  // a dead ring nor kill a newer one; endedRingsRef remembers terminal rings.
  const [incomingCall, setIncomingCall] = useState(null);
  const endedRingsRef = useRef(new Set());

  const clearRing = useCallback((ringId) => {
    if (ringId) endedRingsRef.current.add(ringId);
    setIncomingCall((prev) => {
      if (!prev) return prev;
      if (ringId && prev.ringId && prev.ringId !== ringId) return prev; // newer call — keep it
      return null;
    });
  }, []);

  // "Still there when they open the app": ask the BE for a live ring aimed
  // at me. Runs on mount, on every socket (re)connect, and on foreground —
  // a ring that arrived while the socket was down is recovered here.
  const fetchActiveRing = useCallback(async () => {
    try {
      const { data: body } = await axiosInstance.get('/v1/matching/active-ring/');
      const ring = body?.data;
      if (!ring?.match_id || !ring?.ring_id) {
        // Authoritative "no live ring": clear a modal whose cancel event we
        // missed — and its CallKit row, or the phone keeps ringing a call
        // the server says is dead. The 5s age guard avoids racing a ring
        // that arrived over the socket while this request was in flight.
        setIncomingCall((prev) => {
          if (!prev || Date.now() - (prev.setAt || 0) <= 5000) return prev;
          if (isVoipNative()) {
            const callId = prev.ringId || String(prev.matchId || '');
            if (callId) { try { VoipCall.endCall({ callId }).catch(() => {}); } catch { /* noop */ } }
          }
          return null;
        });
        return;
      }
      if (endedRingsRef.current.has(ring.ring_id)) return;
      setIncomingCall((prev) => (prev?.ringId === ring.ring_id ? prev : {
        matchId: ring.match_id,
        roomUrl: ring.room_url,
        partnerName: ring.partner_name,
        ringId: ring.ring_id,
        ttl: ring.seconds_left || 90,
        setAt: Date.now(),
      }));
    } catch { /* not signed in / offline — nothing to recover */ }
  }, []);

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
    // Refresh the global bell on every incoming socket event so the unread
    // count / dropdown row appears without waiting for a polling cycle.
    dispatch(getNotifications());

    switch (notification_type) {
      // Someone swiped right on you — refresh data + show toast
      case 'scene_partner_like':
        dispatch(fetchWhoWantsToRead());
        dispatch(fetchMatchingStats());
        setLikeToast({ fromName: data?.from_name || 'Someone' });
        setTimeout(() => setLikeToast(null), 6000);
        break;

      // Mutual match — refresh matches + activity feed + navigate to "It's a Scene"
      case 'scene_partner_match': {
        const now = Date.now();
        const sameMatch = lastMatchRef.current.id === data?.match_id;
        const within = now - lastMatchRef.current.at < 5000;
        if (sameMatch && within) break;
        lastMatchRef.current = { id: data?.match_id || null, at: now };
        dispatch(fetchMatches());
        dispatch(fetchActivityFeed());
        if (data?.match_id) {
          if (isMobile()) {
            // Carry match_id through so the mobile app opens the "It's a Scene"
            // match screen (a Green Room sub-panel) instead of the generic
            // Green Room list. MobileApp's drst-navigate handler reads the
            // { subPanel: 'its-a-scene', matchId } shape.
            window.dispatchEvent(new CustomEvent('drst-navigate', { detail: { panel: 'green-room', subPanel: 'its-a-scene', matchId: data.match_id } }));
          } else {
            navigateRef.current(`/dashboard/its-a-scene/${data.match_id}`);
          }
        }
        break;
      }

      // Admin broadcast — show toast (bell already refreshed above)
      case 'admin_broadcast':
        setLikeToast({ fromName: data?.title || 'Dr Self Tape', message: data?.message });
        setTimeout(() => setLikeToast(null), 8000);
        break;

      // New chat message — refresh messages for that match
      case 'new_message':
        if (data?.match_id) {
          dispatch(fetchGreenRoomMessages(data.match_id));
        }
        break;

      // New chat message — refresh messages for that match
      // (already handled above, also refresh activity for session count)

      // Partner started the video call — forced incoming-call UI.
      case 'rehearsal_started':
        dispatch(fetchActivityFeed());
        if (data?.room_url && data?.match_id) {
          const partner = data.partner_name || 'Your scene partner';
          const ringId = data.ring_id || null;
          // A ring we already answered/declined/cancelled must not resurrect
          // via a reconnect replay or late delivery.
          if (ringId && endedRingsRef.current.has(ringId)) break;
          const ring = {
            matchId: data.match_id,
            roomUrl: data.room_url,
            partnerName: partner,
            ringId,
            ttl: data.ring_ttl || 90,
            setAt: Date.now(),
          };
          if (isVoipNative()) {
            // Native iOS → real system CallKit UI. callId = ring_id, the same
            // id the VoIP push carries, so double delivery (socket + PushKit)
            // collapses into ONE CallKit call row. The in-app modal shows too
            // (setIncomingCall below) so the call is visible even mid-app.
            VoipCall.showIncomingCall({
              callId: ringId || String(data.match_id),
              matchId: String(data.match_id),
              callerName: partner,
              roomUrl: data.room_url,
              hasVideo: true,
            }).catch(() => { /* CallKit unavailable — modal below still rings */ });
          }
          setIncomingCall(ring);
          try { navigator.vibrate?.([200, 80, 200]); } catch { /* no-op */ }
        }
        break;

      // Caller hung up before we answered — kill the ring everywhere and
      // let the missed-call notification row (sent separately) be the trace.
      case 'rehearsal_cancelled': {
        const rid = data?.ring_id || null;
        clearRing(rid);
        if (isVoipNative()) {
          const callId = rid || String(data?.match_id || '');
          if (callId) { try { VoipCall.endCall({ callId }).catch(() => {}); } catch { /* noop */ } }
        }
        break;
      }

      // Callee answered/declined — the caller's Ringing overlay listens.
      case 'rehearsal_answered':
      case 'rehearsal_declined':
        window.dispatchEvent(new CustomEvent('drst-ring-update', {
          detail: { state: notification_type.replace('rehearsal_', ''), matchId: data?.match_id, ringId: data?.ring_id },
        }));
        break;

      default:
        break;
    }
  }, [dispatch, clearRing]);

  // Ring expiry — the modal dismisses itself when the BE would consider the
  // ring dead anyway (TTL from the payload; server enforces its own copy).
  // The CallKit row for the same ring dies with it — otherwise the phone
  // keeps ringing a call the app no longer shows.
  useEffect(() => {
    if (!incomingCall) return undefined;
    const { ringId, matchId } = incomingCall;
    const t = setTimeout(() => {
      clearRing(ringId);
      if (isVoipNative()) {
        const callId = ringId || String(matchId || '');
        if (callId) { try { VoipCall.endCall({ callId }).catch(() => {}); } catch { /* noop */ } }
      }
    }, (incomingCall.ttl || 90) * 1000);
    return () => clearTimeout(t);
  }, [incomingCall, clearRing]);

  // Ring recovery on foreground — WKWebView suspends JS + sockets in the
  // background, so a ring that fired while backgrounded is only findable by
  // asking the server once we're visible again.
  useEffect(() => {
    if (!currentUser || !token) return undefined;
    fetchActiveRing();
    const onVis = () => { if (document.visibilityState === 'visible') fetchActiveRing(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [currentUser, token, fetchActiveRing]);

  useEffect(() => {
    if (!currentUser || !token) return;

    // baseURL is the single source of truth — it hard-fails in prod
    // builds if VITE_API_URL is missing, so we never silently fall back
    // to localhost in a shipped iOS bundle.
    const wsHost = baseURL.replace(/^https?:\/\//, '').replace(/\/api$/, '');
    const wsProto = baseURL.startsWith('https') ? 'wss' : 'ws';

    // Build the WS URL on demand — for new BE deploys we exchange the JWT
    // for a short-lived single-use ticket, so the token never appears in
    // the URL (which would otherwise leak into browser history / proxy
    // access logs). For BE deploys that don't have the ticket endpoint
    // yet, fall back to the legacy ?token=… form.
    let cancelled = false;
    const urlProvider = async () => {
      // Bail without minting a ticket if the effect was torn down — avoids
      // burning a one-shot ticket on a connection nobody's going to use.
      if (cancelled) return `${wsProto}://${wsHost}/ws/notifications/?token=${token}`;
      try {
        // axiosInstance, not bare fetch: its 401 interceptor runs the silent
        // refresh (and, when the session is truly dead, the logout redirect
        // that ends the reconnect loop). A stale pre-refresh session on bare
        // fetch used to 401 here every ~11s forever.
        const { data: body } = await axiosInstance.post('/v1/users/ws-ticket/');
        if (cancelled) return `${wsProto}://${wsHost}/ws/notifications/?token=${token}`;
        if (body?.ticket) return `${wsProto}://${wsHost}/ws/notifications/?ticket=${body.ticket}`;
      } catch (err) {
        // Auth is dead (interceptor already tried refresh) — the legacy
        // ?token= form would just 403 at the consumer. Return it anyway as
        // the required URL, but the capped backoff below keeps this quiet
        // until the interceptor's logout redirect lands.
        if (err?.response?.status === 401) {
          return `${wsProto}://${wsHost}/ws/notifications/?token=${token}`;
        }
        /* network down or endpoint missing — use legacy form */
      }
      return `${wsProto}://${wsHost}/ws/notifications/?token=${token}`;
    };

    if (cancelled) return;
    // Backoff: first retries stay snappy for real network blips, but a
    // persistently-failing connection decays to one attempt per minute
    // instead of hammering ws-ticket + the WS consumer every ~11s.
    const ws = new ReconnectingWebSocket(urlProvider, [], {
      minReconnectionDelay: 1000,
      maxReconnectionDelay: 60000,
      reconnectionDelayGrowFactor: 2,
    });
    socketRef.current = ws;

    ws.onopen = () => {
      setIsSocketReady(true);
      // A ring fired during the disconnect window never reached this socket —
      // reconcile with the server on every (re)connect, not just page load.
      fetchActiveRing();
    };
    ws.onmessage = (event) => {
      try { handleIncomingMessage(JSON.parse(event.data)); } catch (_) {}
    };
    ws.onerror = () => {};
    ws.onclose = () => { setIsSocketReady(false); };

    // Auto-offline when user leaves the app/tab
    const handleVisibility = () => {
      const presenceUrl = `${baseURL}/v1/matching/presence/`;
      if (document.visibilityState === 'hidden') {
        // sendBeacon can't carry an Authorization header — best-effort only.
        navigator.sendBeacon?.(presenceUrl, new Blob([JSON.stringify({ is_online: false })], { type: 'application/json' }));
      } else {
        // Refresh-aware client (see urlProvider note) instead of a raw fetch
        // pinned to this effect's possibly-stale access token.
        axiosInstance.post('/v1/matching/presence/', { is_online: true }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      ws.close();
      setIsSocketReady(false);
      socketRef.current = null;
    };
  }, [currentUser, token, handleIncomingMessage, fetchActiveRing]);

  // Parse a Daily room URL → in-app meeting route, and navigate. Carry matchId
  // in nav state (the URL's room slug is NOT the match id) so the post-call
  // screen can rate the right match and route back to its chat.
  const joinRoom = useCallback((roomUrl, matchId = null) => {
    if (!roomUrl) return;
    let roomId;
    try { roomId = new URL(roomUrl).pathname.split('/').filter(Boolean).pop(); } catch { return; }
    if (roomId) navigateRef.current(`/meeting/${roomId}`, { state: { roomUrl, matchId } });
  }, []);

  const acceptCall = async () => {
    if (!incomingCall) return;
    const { roomUrl, matchId, ringId } = incomingCall;
    clearRing(ringId);
    // The user has acted on the ring — tear the CallKit row down FIRST, so
    // it can't outlive a 409 (already-cancelled) early return below.
    if (isVoipNative() && ringId) {
      try { VoipCall.endCall({ callId: ringId }).catch(() => {}); } catch { /* noop */ }
    }
    // Server-confirmed answer BEFORE joining: if the caller's cancel already
    // won the race (409), joining would strand us alone in a dead room.
    // Network failure ≠ cancelled — on error we still join.
    try {
      await axiosInstance.post(`/v1/matching/matches/${matchId}/ring-ack/`, { action: 'answered', ring_id: ringId || undefined }, { timeout: 4000 });
    } catch (err) {
      if (err?.response?.status === 409) return; // ring already cancelled/expired
    }
    joinRoom(roomUrl, matchId);
  };

  const declineCall = () => {
    if (!incomingCall) return;
    const { matchId, ringId } = incomingCall;
    clearRing(ringId);
    // Tell the server — a purely local dismiss would leave the caller
    // listening to a ring nobody will ever answer.
    axiosInstance.post(`/v1/matching/matches/${matchId}/ring-ack/`, { action: 'declined', ring_id: ringId || undefined }).catch(() => {});
    if (isVoipNative() && ringId) {
      try { VoipCall.endCall({ callId: ringId }).catch(() => {}); } catch { /* noop */ }
    }
  };

  // ── Native CallKit (iOS) — Level 1 (app alive, via showIncomingCall) AND
  // Level 2 (app killed/locked, via PushKit VoIP push). One native CXProvider;
  // the answer event carries the room URL, so JS just joins.
  useEffect(() => {
    if (!isVoipNative()) return;
    let subs = [];
    (async () => {
      try {
        // Tie VoIP token registration to AUTH, not just app launch. A user who
        // signs in AFTER a logged-out cold start must (re)report their VoIP
        // token now — otherwise killed-app CallKit incoming rings never reach
        // them this session. The guard ref keeps this to once per token (and the
        // launch-time case for an already-authed user still fires here too).
        if (token && voipRegisteredForRef.current !== token) {
          voipRegisteredForRef.current = token;
          registerVoip(token); // register for VoIP pushes + report token to BE (auth-keyed ack)
        }
        subs.push(await VoipCall.addListener('callAnswered', (e) => {
          // e.callId is the ring_id; e.matchId is the real match. Legacy
          // payloads carried the match id AS callId — accept callId as the
          // match ONLY if it's numeric (ring_ids are hex, match ids ints),
          // otherwise PostCallScreen would rate against a ring_id.
          const mid = e?.matchId || (/^\d+$/.test(String(e?.callId || '')) ? e.callId : null);
          // Answering via CallKit must also dismiss the in-app modal for the
          // same ring — both surfaces show for a foreground ring, and the
          // modal otherwise sits on TOP of the meeting screen (z-index max).
          if (e?.callId) clearRing(e.callId);
          if (mid) {
            axiosInstance.post(`/v1/matching/matches/${mid}/ring-ack/`, { action: 'answered', ring_id: e?.callId || undefined }).catch(() => {});
          }
          if (e?.roomUrl) joinRoom(e.roomUrl, mid);
          // End the CallKit call immediately — the real call lives in the Daily
          // room, so leaving it "active" would show a lingering iOS call bar.
          if (e?.callId) {
            // .catch, not try/catch: the plugin proxy rejects async, so a
            // sync catch alone would leak an unhandledrejection.
            try { VoipCall.endCall({ callId: e.callId }).catch(() => {}); } catch { /* noop */ }
          }
        }));
        // Cold launch: the app was opened by answering a CallKit call before JS
        // was listening — drain the stashed answer.
        // CallKit DECLINE (user tapped the red button on the system UI) —
        // without this the server keeps ringing the caller for the full TTL
        // and then files a false missed-call for an explicitly declined ring.
        subs.push(await VoipCall.addListener('callEnded', (e) => {
          const cid = String(e?.callId || '');
          if (!cid || endedRingsRef.current.has(cid)) return; // we ended it ourselves
          clearRing(cid);
          const mid = e?.matchId || (/^\d+$/.test(cid) ? cid : null);
          if (mid) {
            axiosInstance.post(`/v1/matching/matches/${mid}/ring-ack/`, { action: 'declined', ring_id: cid }).catch(() => {});
          }
        }));
        const pending = await VoipCall.getPendingAnswer();
        if (pending?.roomUrl) {
          const pmid = pending?.matchId
            || (/^\d+$/.test(String(pending?.callId || '')) ? pending.callId : null);
          if (pending?.callId) clearRing(pending.callId);
          if (pmid) {
            axiosInstance.post(`/v1/matching/matches/${pmid}/ring-ack/`, { action: 'answered', ring_id: pending?.callId || undefined }).catch(() => {});
          }
          joinRoom(pending.roomUrl, pmid);
        }
      } catch { /* plugin unavailable */ }
    })();
    return () => { subs.forEach((s) => { try { s.remove(); } catch { /* noop */ } }); };
  }, [joinRoom, token, clearRing]);

  // Pulse a ringing haptic while the full-screen incoming-call alert is up.
  useEffect(() => {
    if (!incomingCall) return;
    let active = true;
    (async () => {
      while (active) {
        try { await Haptics.vibrate({ duration: 700 }); } catch { /* web / no haptics */ }
        await new Promise((r) => setTimeout(r, 1500));
      }
    })();
    return () => { active = false; };
  }, [incomingCall]);

  const handleLikeToastTap = () => {
    setLikeToast(null);
    if (isMobile()) {
      window.dispatchEvent(new CustomEvent('drst-navigate', { detail: { panel: 'who-wants-to-read' } }));
    } else {
      navigateRef.current('/dashboard/who-wants-to-read');
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
          <div className="bg-[#1A1A2E] border border-[#FF8280]/30 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-2xl">
            <div className="w-11 h-11 rounded-full bg-[#FF8280]/20 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-5 h-5 text-[#FF8280]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">
                {likeToast.message ? likeToast.fromName : `${likeToast.fromName} wants to read with you!`}
              </p>
              <p className="text-[#A7ECDA] text-xs mt-0.5">
                {likeToast.message || 'Tap to see who →'}
              </p>
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

      {/* ── Full-screen Incoming Video Call (FaceTime-style) ──────────────── */}
      {incomingCall && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-between"
          style={{
            zIndex: 2147483600,
            background: 'linear-gradient(180deg, #1A1726 0%, #0A0A0F 100%)',
            padding: 'calc(env(safe-area-inset-top, 0px) + 72px) 28px calc(env(safe-area-inset-bottom, 0px) + 56px)',
          }}
        >
          {/* Caller */}
          <div className="flex flex-col items-center" style={{ marginTop: 24 }}>
            <div className="relative mb-8">
              <div
                className="rounded-full flex items-center justify-center text-5xl"
                style={{ width: 132, height: 132, background: 'linear-gradient(135deg, #FF8280, #7B2FBE)', boxShadow: '0 0 70px rgba(255,130,128,0.45)' }}
              >
                {(incomingCall.partnerName || '🎬').trim()[0]?.toUpperCase() || '🎬'}
              </div>
              <div className="absolute inset-0 rounded-full animate-ping" style={{ border: '2px solid rgba(255,130,128,0.45)' }} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#FF8280] mb-3">Incoming video call</p>
            <h2 className="text-white font-bold text-center" style={{ fontSize: 30, letterSpacing: '-0.5px' }}>{incomingCall.partnerName || 'Scene Partner'}</h2>
            <p className="text-white/50 mt-2 text-base">Live scene reading…</p>
          </div>

          {/* FaceTime-style controls */}
          <div className="flex items-start justify-between w-full" style={{ maxWidth: 300 }}>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={declineCall}
                onTouchEnd={(e) => { e.preventDefault(); declineCall(); }}
                aria-label="Decline"
                className="rounded-full flex items-center justify-center active:scale-95 transition-transform"
                style={{ width: 76, height: 76, background: '#FF3B30', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                <PhoneOff size={30} color="#fff" />
              </button>
              <span className="text-sm text-white/70">Decline</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={acceptCall}
                onTouchEnd={(e) => { e.preventDefault(); acceptCall(); }}
                aria-label="Connect"
                className="rounded-full flex items-center justify-center active:scale-95 transition-transform"
                style={{ width: 76, height: 76, background: '#34C759', boxShadow: '0 0 28px rgba(52,199,89,0.5)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', animation: 'callPulse 1.4s ease-in-out infinite' }}
              >
                <Video size={32} color="#fff" />
              </button>
              <span className="text-sm text-white/70">Connect</span>
            </div>
          </div>
          <style>{`
            @keyframes callPulse {
              0%,100% { transform: scale(1); box-shadow: 0 0 28px rgba(52,199,89,0.5); }
              50%     { transform: scale(1.08); box-shadow: 0 0 44px rgba(52,199,89,0.8); }
            }
          `}</style>
        </div>
      )}
    </SocketContext.Provider>
  );
};
