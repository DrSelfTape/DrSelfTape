import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft, Send, Loader2, Video, Paperclip, X,
  FileText, Bot, Users, ChevronUp,
} from 'lucide-react';
import GreenRoomMessage from './components/GreenRoomMessage';
import {
  fetchGreenRoomMessages,
  sendGreenRoomMessage,
  appendMessage,
} from '../../../redux/features/readers/readersMatchSlice';
import axios from '../../../redux/http';
import { baseURL } from '../../../redux/constant';
import { isMeetingHost } from '../../../utils/meeting';

const GreenRoomChat = (props = {}) => {
  const params = useParams();
  const matchId = props.matchId || params.matchId;
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { greenRoomMessages: allMessages, messagesLoading, matches } = useSelector(
    (state) => state.readersMatch
  );
  const greenRoomMessages = Array.isArray(allMessages?.[matchId]) ? allMessages[matchId] : [];

  const match = matches?.find((m) => String(m.id) === String(matchId));
  const partnerName = match?.reader?.name || 'Your Reader';
  const partnerInitials = partnerName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const currentUser = useSelector((state) => state.auth?.user);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [startingRehearsal, setStartingRehearsal] = useState(false);
  const [rehearsalError, setRehearsalError] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [sidesFile, setSidesFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const actionsRef = useRef(null);

  useEffect(() => {
    if (matchId) dispatch(fetchGreenRoomMessages(matchId));
  }, [dispatch, matchId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [greenRoomMessages]);

  // Close actions menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setShowActions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const sendLocalMsg = (text, type = 'text', meta = {}) => {
    dispatch(appendMessage({
      id: Date.now(),
      matchId,
      senderId: currentUser?.id || 'me',
      senderName: currentUser?.name || 'You',
      text,
      type,
      ...meta,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMine: true,
    }));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    sendLocalMsg(trimmed);
    setInput('');
    setSending(true);
    try {
      await dispatch(sendGreenRoomMessage({ match_id: matchId, content: trimmed })).unwrap();
      // Refresh from server to get the persisted message with correct ID
      dispatch(fetchGreenRoomMessages(matchId));
    } catch { /* local msg already shown */ } finally { setSending(false); }
  };

  // Upload sides PDF/image and send as chat message
  const handleSidesUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSidesFile(file);
    setShowActions(false);
    setUploadingFile(true);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('match_id', matchId);
      fd.append('message_type', 'sides');

      const res = await axios.post(`${baseURL}/v1/matching/messages/upload/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fileUrl = res.data?.data?.url;

      if (fileUrl) {
        // Backend already created the message + notified partner
        // Just refresh to show the persisted message
        dispatch(fetchGreenRoomMessages(matchId));
      } else {
        // Fallback: show locally if upload response missing URL
        sendLocalMsg(`📄 Sides shared: ${file.name}`, 'file', {
          fileName: file.name,
          fileUrl: URL.createObjectURL(file),
          fileType: file.type,
        });
      }
    } catch {
      // Upload failed — show locally
      sendLocalMsg(`📄 Sides shared: ${file.name}`, 'file', {
        fileName: file.name,
        fileUrl: URL.createObjectURL(file),
        fileType: file.type,
      });
    } finally {
      setUploadingFile(false);
      setSidesFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Start live rehearsal with Daily.co
  const handleStartRehearsal = async () => {
    if (startingRehearsal) return;
    setStartingRehearsal(true);
    setRehearsalError('');
    setShowActions(false);

    try {
      const { data } = await axios.post(
        `${baseURL}/v1/matching/matches/${matchId}/start-rehearsal/`
      );
      const roomUrl = data?.data?.room_url || data?.room_url || data?.data?.url || data?.url;
      if (!roomUrl) throw new Error('No room URL returned');

      // Extract room name/ID from Daily.co URL (e.g. https://drselftape.daily.co/match-101)
      const roomId = roomUrl.split('/').filter(Boolean).pop();

      // Mark as host so PeerJS creates the hosting peer
      localStorage.setItem(`dr-self-tapes_meeting_host_${roomId}`, 'true');

      // Send a system message to the chat
      sendLocalMsg(`🎬 Live rehearsal started! Joining room...`, 'system');

      navigate(`/meeting/${roomId}`, { state: { roomUrl } });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Could not start rehearsal room';
      setRehearsalError(msg);

      // Fallback: if no match in DB yet (mock mode), create a demo room
      if (err?.response?.status === 404 || !err?.response) {
        sendLocalMsg(`🎬 Starting virtual rehearsal session...`, 'system');
        // Use a shared demo Daily.co room for testing
        navigate(`/meeting/demo-rehearsal-${matchId}`, {
          state: { roomUrl: `https://drselftape.daily.co/demo-rehearsal-${matchId}` }
        });
      }
    } finally {
      setStartingRehearsal(false);
    }
  };

  // Launch AI virtual session (AI reads opposite lines)
  const handleAISession = () => {
    setShowActions(false);
    sendLocalMsg('🤖 Launching AI scene partner session...', 'system');
    const isMob = window.innerWidth < 768;
    if (isMob) {
      window.dispatchEvent(new CustomEvent('drst-navigate', { detail: { tab: 'live' } }));
    } else {
      navigate('/dashboard/scene-study');
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col" style={{ background: 'var(--bg-deep)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--bg-surface)' }}>
        <button
          onClick={() => navigate('/dashboard/green-room')}
          className="rounded-full p-1.5 transition-colors hover:text-white"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={18} />
        </button>

        {/* Partner avatar */}
        <div className="w-9 h-9 rounded-full bg-[#C855F0]/20 border border-[#C855F0]/20 flex items-center justify-center shrink-0">
          <span className="text-[#C855F0] text-xs font-bold">{partnerInitials}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{partnerName}</p>
          <p className="text-[#22C55E] text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] inline-block" />
            Online
          </p>
        </div>

        {/* Start Rehearsal CTA */}
        <button
          onClick={handleStartRehearsal}
          disabled={startingRehearsal}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white transition-all disabled:opacity-50 shrink-0"
          style={{
            background: 'linear-gradient(135deg, #C855F0, #E88BF5)',
            boxShadow: '0 3px 12px rgba(200,85,240,0.35)',
          }}
        >
          {startingRehearsal ? <Loader2 size={13} className="animate-spin" /> : <Video size={13} />}
          {startingRehearsal ? 'Starting...' : 'Start Rehearsal'}
        </button>
      </div>

      {/* Rehearsal error */}
      {rehearsalError && (
        <div className="mx-4 mt-2 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-xs text-red-400">
          <span className="flex-1">{rehearsalError}</span>
          <button onClick={() => setRehearsalError('')}><X size={14} /></button>
        </div>
      )}

      {/* Session options banner */}
      <div className="flex gap-2 px-4 pt-3">
        <button
          onClick={handleStartRehearsal}
          disabled={startingRehearsal}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all border border-[#C855F0]/30 text-[#C855F0] hover:bg-[#C855F0]/10 disabled:opacity-50"
        >
          <Users size={14} />
          Live Session with {partnerName.split(' ')[0]}
        </button>
        <button
          onClick={handleAISession}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all hover:text-white"
          style={{ border: '1px solid var(--border-active)', color: 'var(--text-secondary)' }}
        >
          <Bot size={14} />
          Practice with AI First
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messagesLoading && (
          <div className="flex h-full items-center justify-center">
            <Loader2 size={24} className="animate-spin text-[#C855F0]" />
          </div>
        )}

        {!messagesLoading && greenRoomMessages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center px-8 gap-3">
            <div className="w-16 h-16 rounded-full bg-[#C855F0]/10 flex items-center justify-center">
              <Video size={28} color="#C855F0" />
            </div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>You matched with {partnerName}!</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Say hi, share your sides, then start a live rehearsal together — or practice with the AI first.
            </p>
          </div>
        )}

        {greenRoomMessages.map((msg, i) => (
          <GreenRoomMessage
            key={msg.id || i}
            message={msg}
            isOwn={msg.isMine || msg.sender_id === currentUser?.id || msg.senderId === (currentUser?.id || 'me')}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid var(--bg-surface)', background: 'var(--bg-card)' }}>
        {/* Upload sides preview */}
        {sidesFile && (
          <div className="mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs" style={{ background: 'var(--border-default)', color: 'var(--text-secondary)' }}>
            <FileText size={14} className="text-[#C855F0]" />
            <span className="flex-1 truncate">{sidesFile.name}</span>
            <button onClick={() => setSidesFile(null)}><X size={12} /></button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-2">
          {/* Attach button with popover */}
          <div className="relative" ref={actionsRef}>
            <button
              type="button"
              onClick={() => setShowActions((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:text-white transition-colors"
              style={{ background: 'var(--border-default)', border: '1px solid var(--border-active)', color: 'var(--text-secondary)' }}
            >
              {showActions ? <ChevronUp size={18} /> : <Paperclip size={18} />}
            </button>

            {showActions && (
              <div className="absolute bottom-12 left-0 rounded-2xl overflow-hidden shadow-xl w-56 z-50" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-active)' }}>
                <button
                  type="button"
                  onClick={() => { fileInputRef.current?.click(); setShowActions(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <FileText size={16} className="text-[#C855F0]" />
                  <div className="text-left">
                    <p className="font-medium">Share Sides</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>PDF or image of your sides</p>
                  </div>
                </button>
                <div style={{ borderTop: '1px solid var(--border-active)' }} />
                <button
                  type="button"
                  onClick={handleStartRehearsal}
                  disabled={startingRehearsal}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors disabled:opacity-50"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <Video size={16} className="text-[#C855F0]" />
                  <div className="text-left">
                    <p className="font-medium">Start Live Rehearsal</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Video call via Daily.co</p>
                  </div>
                </button>
                <div style={{ borderTop: '1px solid var(--border-active)' }} />
                <button
                  type="button"
                  onClick={handleAISession}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <Bot size={16} className="text-[#C855F0]" />
                  <div className="text-left">
                    <p className="font-medium">AI Scene Partner</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Practice lines with AI reader</p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.txt,.fountain"
            className="hidden"
            onChange={handleSidesUpload}
          />

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${partnerName.split(' ')[0]}...`}
            className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#C855F0]"
            style={{ border: '1px solid var(--border-active)', background: 'var(--border-default)', color: 'var(--text-primary)', '--tw-placeholder-opacity': 1 }}
          />

          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #C855F0, #E88BF5)' }}
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GreenRoomChat;
