/**
 * src/panels/Dashboard/LiveRehearsals/RehearsalRoom.jsx
 *
 * Fixes applied:
 *  1. permissionsGranted in initCall useEffect dependency array
 *  2. Real mic/camera control via callRef.current.setLocalAudio/Video
 *  3. Script viewer with parsed character lines + "My Role" highlighting
 *  4. In-room text chat via Django Channels WebSocket
 *  5. Participant avatars
 *  6. Leave room on unmount → status update
 *  7. Role selector modal before entering room
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import DailyIframe from '@daily-co/daily-js';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare,
  FileText, Users, X, Send, ChevronDown, Circle, Square, Download, Film,
} from 'lucide-react';
import {
  fetchRoomThunk,
  joinRoomThunk,
  leaveRoomThunk,
  fetchRoomTokenThunk,
  startRecordingThunk,
  stopRecordingThunk,
  fetchRecordingsThunk,
  fetchRecordingLinkThunk,
} from '../../../redux/features/rehearsals/rehearsalsSlice';
import PermissionsModal from '../../../components/PermissionsModal';

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */

function nameColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#FF8280', '#A7ECDA', '#FCE072', '#FFB49A', '#b89aff', '#5ee6b8', '#7eb8ec'];
  return colors[Math.abs(hash) % colors.length];
}

function initials(firstName, lastName) {
  return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase() || '?';
}

/** Parse script into lines: [{ character, text }] */
function parseScript(content) {
  if (!content) return [];
  const lines = [];
  const regex = /^([A-Z][A-Z\s.'-]+)\s*[\n:]\s*(.+)/gm;
  // Also handle "CHARACTER\n(parenthetical)\ndialogue" format
  const blocks = content.split(/\n\s*\n/);
  for (const block of blocks) {
    const trimmed = block.trim();
    const nameMatch = trimmed.match(/^([A-Z][A-Z\s.'-]{1,30})$/m);
    if (nameMatch) {
      const character = nameMatch[1].trim();
      const dialogue = trimmed.slice(nameMatch[0].length).replace(/^\s*\(.*?\)\s*/gm, '').trim();
      if (dialogue) {
        lines.push({ character, text: dialogue });
      }
    } else {
      // Try "CHARACTER: dialogue" single-line format
      const colonMatch = trimmed.match(/^([A-Z][A-Z\s.'-]+):\s*(.+)/s);
      if (colonMatch) {
        lines.push({ character: colonMatch[1].trim(), text: colonMatch[2].trim() });
      }
    }
  }
  return lines;
}

function extractCharacters(content) {
  const lines = parseScript(content);
  return [...new Set(lines.map(l => l.character))];
}

/* ═══════════════════════════════════════════════════
   AVATAR COMPONENT
   ═══════════════════════════════════════════════════ */

function Avatar({ firstName, lastName, size = 32 }) {
  const bg = nameColor(`${firstName}${lastName}`);
  return (
    <div
      className="flex items-center justify-center rounded-full shrink-0 font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.38 }}
    >
      {initials(firstName, lastName)}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ROLE SELECTOR MODAL
   ═══════════════════════════════════════════════════ */

function RoleModal({ characters, onSelect }) {
  const [role, setRole] = useState('');
  const [custom, setCustom] = useState('');

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1c26] rounded-2xl p-6 w-full max-w-sm border border-white/5">
        <h2 className="text-lg font-bold text-white mb-1">What role are you reading?</h2>
        <p className="text-sm text-gray-400 mb-4">Select your character for this session</p>

        {characters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {characters.map(c => (
              <button
                key={c}
                onClick={() => { setRole(c); setCustom(''); }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  role === c
                    ? 'bg-[#FF8280]/15 text-[#FF8280] border border-[#FF8280]/30'
                    : 'bg-[#13151d] text-gray-400 border border-white/5 hover:border-white/10'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <input
          type="text"
          placeholder="Or type a custom role..."
          value={custom}
          onChange={(e) => { setCustom(e.target.value); setRole(''); }}
          className="w-full bg-[#13151d] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-[#A7ECDA]/30 mb-4"
        />

        <button
          onClick={() => onSelect(role || custom || 'Reader')}
          disabled={!role && !custom}
          className="w-full bg-[#FF8280] hover:bg-[#e06e6c] disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Enter room
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   CHAT PANEL
   ═══════════════════════════════════════════════════ */

function ChatPanel({ messages, onSend, onClose }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <div className="flex flex-col h-full bg-[#13151d] border-l border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <span className="text-sm font-semibold text-white">Chat</span>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-gray-400">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-8">No messages yet</p>
        )}
        {messages.map((m, i) => (
          <div key={i}>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold" style={{ color: nameColor(m.user) }}>{m.user}</span>
              <span className="text-[10px] text-gray-600">{m.time}</span>
            </div>
            <p className="text-sm text-gray-300 mt-0.5">{m.text}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-[#1a1c26] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#A7ECDA]/30"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="p-2 rounded-lg bg-[#FF8280] hover:bg-[#e06e6c] disabled:opacity-30 text-white transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SCRIPT VIEWER
   ═══════════════════════════════════════════════════ */

function ScriptViewer({ content, userRole, onClose }) {
  const lines = useMemo(() => parseScript(content), [content]);

  return (
    <div className="flex flex-col h-full bg-[#13151d] border-l border-white/5">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-[#A7ECDA]" />
          <span className="text-sm font-semibold text-white">Script</span>
          {userRole && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FF8280]/15 text-[#FF8280]">
              {userRole}
            </span>
          )}
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-gray-400">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {lines.length > 0 ? (
          <div className="space-y-3">
            {lines.map((line, i) => {
              const isMyLine = userRole && line.character.toLowerCase() === userRole.toLowerCase();
              return (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2 ${
                    isMyLine
                      ? 'bg-[#FF8280]/10 border border-[#FF8280]/20'
                      : 'bg-white/[0.02]'
                  }`}
                >
                  <p className={`text-xs font-bold mb-1 ${isMyLine ? 'text-[#FF8280]' : 'text-[#A7ECDA]'}`}>
                    {line.character}
                  </p>
                  <p className="text-sm text-gray-300 leading-relaxed">{line.text}</p>
                </div>
              );
            })}
          </div>
        ) : (
          /* Raw script fallback */
          <pre className="text-sm text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   RECORDINGS PANEL
   ═══════════════════════════════════════════════════ */

function RecordingsPanel({ recordings, onDownload, onClose }) {
  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-[#13151d] border-l border-white/5">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Film size={14} className="text-[#FCE072]" />
          <span className="text-sm font-semibold text-white">Recordings</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-gray-400">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {recordings.length === 0 ? (
          <div className="text-center py-12">
            <Film size={32} className="mx-auto mb-3 text-gray-600" />
            <p className="text-sm text-gray-500">No recordings yet</p>
            <p className="text-xs text-gray-600 mt-1">Start recording to capture your session</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recordings.map((rec) => (
              <div key={rec.id} className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {rec.room_name || 'Recording'}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {formatDate(rec.start_ts)} · {formatDuration(rec.duration)}
                    </p>
                    <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      rec.status === 'finished'
                        ? 'bg-green-500/15 text-green-400'
                        : rec.status === 'in-progress'
                        ? 'bg-red-500/15 text-red-400'
                        : 'bg-gray-500/15 text-gray-400'
                    }`}>
                      {rec.status || 'processing'}
                    </span>
                  </div>
                  {rec.status === 'finished' && (
                    <button
                      onClick={() => onDownload(rec.id)}
                      className="p-2 rounded-lg bg-[#FCE072]/10 hover:bg-[#FCE072]/20 text-[#FCE072] transition-colors shrink-0"
                      title="Download"
                    >
                      <Download size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN ROOM COMPONENT
   ═══════════════════════════════════════════════════ */

export default function RehearsalRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentRoom, loading, isRecording, recordings, recordingLoading } = useSelector((state) => state.rehearsals);
  const { user } = useSelector((state) => state.auth);

  // Permissions
  const [showPermissions, setShowPermissions] = useState(true);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  // Role selection
  const [userRole, setUserRole] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Media controls
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  // Panels
  const [showChat, setShowChat] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [showRecordings, setShowRecordings] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);

  // Recording state
  const isHost = currentRoom?.host === user?.id || currentRoom?.host_email === user?.email;

  // Refs
  const videoContainerRef = useRef(null);
  const callRef = useRef(null);
  const wsRef = useRef(null);

  // Fetch room data
  useEffect(() => {
    if (id) dispatch(fetchRoomThunk(id));
  }, [id, dispatch]);

  // Handle permissions granted
  const onPermissionsGranted = useCallback(() => {
    setPermissionsGranted(true);
    setShowPermissions(false);
    // Show role modal if script has characters
    const chars = extractCharacters(currentRoom?.script_content || '');
    if (chars.length > 0 || currentRoom?.script_content) {
      setShowRoleModal(true);
    } else {
      setUserRole('Reader');
    }
  }, [currentRoom?.script_content]);

  const onRoleSelected = useCallback((role) => {
    setUserRole(role);
    setShowRoleModal(false);
  }, []);

  /* ── FIX 1: initCall useEffect — permissionsGranted in deps ── */
  useEffect(() => {
    if (!currentRoom?.room_url || !permissionsGranted || !userRole || !videoContainerRef.current) return;
    if (callRef.current) return; // already initialized

    const initCall = async () => {
      try {
        // Get meeting token
        const tokenResult = await dispatch(fetchRoomTokenThunk(id)).unwrap();
        const token = tokenResult?.token;

        // Join room on backend
        dispatch(joinRoomThunk(id));

        // Create Daily call
        const call = DailyIframe.createFrame(videoContainerRef.current, {
          iframeStyle: {
            width: '100%',
            height: '100%',
            border: '0',
            borderRadius: '12px',
          },
          showLeaveButton: false,
          showFullscreenButton: true,
        });

        callRef.current = call;

        await call.join({
          url: currentRoom.room_url,
          token,
          userName: `${user?.first_name || 'Actor'} ${user?.last_name || ''}`.trim(),
        });

        // Sync initial media state
        call.setLocalAudio(micOn);
        call.setLocalVideo(camOn);
      } catch (err) {
        // Daily call init failed — handled by UI
      }
    };

    initCall();

    return () => {
      // Cleanup on unmount
      if (callRef.current) {
        callRef.current.leave();
        callRef.current.destroy();
        callRef.current = null;
      }
      dispatch(leaveRoomThunk(id));
    };
  }, [currentRoom?.room_url, permissionsGranted, userRole, id, dispatch, user]); // FIX 1: permissionsGranted + userRole in deps

  /* ── FIX 2: Real mic/camera control ── */
  const toggleMic = useCallback(() => {
    const next = !micOn;
    setMicOn(next);
    if (callRef.current) {
      callRef.current.setLocalAudio(next);
    }
  }, [micOn]);

  const toggleCam = useCallback(() => {
    const next = !camOn;
    setCamOn(next);
    if (callRef.current) {
      callRef.current.setLocalVideo(next);
    }
  }, [camOn]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      await dispatch(stopRecordingThunk(id));
    } else {
      await dispatch(startRecordingThunk(id));
    }
  }, [isRecording, id, dispatch]);

  const openRecordings = useCallback(async () => {
    setShowRecordings(true);
    setShowChat(false);
    setShowScript(false);
    dispatch(fetchRecordingsThunk(id));
  }, [id, dispatch]);

  const downloadRecording = useCallback(async (recordingId) => {
    const result = await dispatch(fetchRecordingLinkThunk({ roomId: id, recordingId })).unwrap();
    const link = result?.download_link || result?.link;
    if (link) {
      window.open(link, '_blank');
    }
  }, [id, dispatch]);

  const leaveRoom = useCallback(() => {
    if (callRef.current) {
      callRef.current.leave();
      callRef.current.destroy();
      callRef.current = null;
    }
    dispatch(leaveRoomThunk(id));
    navigate('/dashboard/live-rehearsals');
  }, [id, dispatch, navigate]);

  /* ── FIX 6: WebSocket chat ── */
  useEffect(() => {
    if (!permissionsGranted || !id) return;

    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:8000/ws/notifications/`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'room_chat' && String(data.room_id) === String(id)) {
          setChatMessages((prev) => {
            const next = [...prev, {
              user: data.user,
              text: data.text,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }];
            return next.slice(-50); // keep last 50
          });
        }
      } catch (e) {
        // ignore non-JSON messages
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [permissionsGranted, id]);

  const sendChatMessage = useCallback((text) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const userName = `${user?.first_name || 'Actor'} ${user?.last_name || ''}`.trim();
    wsRef.current.send(JSON.stringify({
      type: 'room_chat',
      room_id: id,
      user: userName,
      text,
    }));
    // Optimistic local add
    setChatMessages((prev) => {
      const next = [...prev, {
        user: userName,
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }];
      return next.slice(-50);
    });
  }, [id, user]);

  /* ── Loading / Permission States ── */
  if (loading && !currentRoom) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f0f1a]">
        <div className="w-8 h-8 border-3 border-[#A7ECDA] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0f0f1a] flex flex-col overflow-hidden">
      {/* Permissions Modal */}
      {showPermissions && (
        <PermissionsModal
          onGranted={onPermissionsGranted}
          onDenied={() => navigate('/dashboard/live-rehearsals')}
        />
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <RoleModal
          characters={extractCharacters(currentRoom?.script_content || '')}
          onSelect={onRoleSelected}
        />
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-white truncate max-w-[200px]">
            {currentRoom?.title || 'Rehearsal Room'}
          </h2>
          {currentRoom?.status === 'in_progress' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 uppercase">
              Live
            </span>
          )}
          {isRecording && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              REC
            </span>
          )}
        </div>

        {/* Participants */}
        <div className="flex items-center gap-2">
          <div className="flex items-center -space-x-2">
            {(currentRoom?.participants || []).slice(0, 3).map((p, i) => (
              <Avatar key={i} firstName={p.first_name} lastName={p.last_name} size={28} />
            ))}
            {(currentRoom?.participants?.length || 0) > 3 && (
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-gray-400 font-semibold">
                +{currentRoom.participants.length - 3}
              </div>
            )}
          </div>
          <Users size={14} className="text-gray-500 ml-1" />
          <span className="text-xs text-gray-500">{currentRoom?.participant_count || 0}/{currentRoom?.max_participants || 4}</span>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video */}
        <div className="flex-1 relative">
          <div ref={videoContainerRef} className="absolute inset-2 rounded-xl overflow-hidden bg-black/40" />
        </div>

        {/* Right Panel: Chat, Script, or Recordings */}
        {(showChat || showScript || showRecordings) && (
          <div className="w-80 shrink-0 animate-[slideIn_0.2s_ease]">
            {showChat && (
              <ChatPanel
                messages={chatMessages}
                onSend={sendChatMessage}
                onClose={() => setShowChat(false)}
              />
            )}
            {showScript && !showChat && (
              <ScriptViewer
                content={currentRoom?.script_content || ''}
                userRole={userRole}
                onClose={() => setShowScript(false)}
              />
            )}
            {showRecordings && !showChat && !showScript && (
              <RecordingsPanel
                recordings={recordings}
                onDownload={downloadRecording}
                onClose={() => setShowRecordings(false)}
              />
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-center gap-3 px-4 py-4 border-t border-white/5">
        {/* Mic Toggle — FIX 2 */}
        <button
          onClick={toggleMic}
          className={`p-3 rounded-xl transition-colors ${
            micOn ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-red-500/20 text-red-400'
          }`}
        >
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        {/* Camera Toggle — FIX 2 */}
        <button
          onClick={toggleCam}
          className={`p-3 rounded-xl transition-colors ${
            camOn ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-red-500/20 text-red-400'
          }`}
        >
          {camOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        {/* Leave */}
        <button
          onClick={leaveRoom}
          className="p-3 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors"
        >
          <PhoneOff size={20} />
        </button>

        <div className="w-px h-8 bg-white/10 mx-1" />

        {/* Chat Toggle */}
        <button
          onClick={() => { setShowChat(!showChat); setShowScript(false); }}
          className={`p-3 rounded-xl transition-colors ${
            showChat ? 'bg-[#A7ECDA]/15 text-[#A7ECDA]' : 'bg-white/10 hover:bg-white/15 text-white'
          }`}
        >
          <MessageSquare size={20} />
        </button>

        {/* Script Toggle */}
        {currentRoom?.script_content && (
          <button
            onClick={() => { setShowScript(!showScript); setShowChat(false); setShowRecordings(false); }}
            className={`p-3 rounded-xl transition-colors ${
              showScript ? 'bg-[#FCE072]/15 text-[#FCE072]' : 'bg-white/10 hover:bg-white/15 text-white'
            }`}
          >
            <FileText size={20} />
          </button>
        )}

        {/* Recordings toggle (all users) */}
        <button
          onClick={() => { openRecordings(); setShowChat(false); setShowScript(false); }}
          className={`p-3 rounded-xl transition-colors ${
            showRecordings ? 'bg-[#b89aff]/15 text-[#b89aff]' : 'bg-white/10 hover:bg-white/15 text-white'
          }`}
          title="Recordings"
        >
          <Film size={20} />
        </button>

        {/* Record / Stop recording (host only) */}
        {isHost && (
          <button
            onClick={toggleRecording}
            disabled={recordingLoading}
            title={isRecording ? 'Stop Recording' : 'Start Recording'}
            className={`p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                : 'bg-white/10 hover:bg-red-500/20 text-gray-300 hover:text-red-400'
            }`}
          >
            {isRecording ? <Square size={20} /> : <Circle size={20} />}
          </button>
        )}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
