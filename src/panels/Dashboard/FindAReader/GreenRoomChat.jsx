import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft, Send, Loader2, Video, Paperclip, X,
  FileText, Bot, Users, ChevronUp, DollarSign, Clock, Check,
} from 'lucide-react';
import GreenRoomMessage from './components/GreenRoomMessage';
import {
  fetchGreenRoomMessages,
  sendGreenRoomMessage,
  appendMessage,
  submitReaderRating,
} from '../../../redux/features/readers/readersMatchSlice';
import ReaderRatingModal from '../../../components/Shared/ReaderRatingModal';
import axios from '../../../redux/http';
import { baseURL } from '../../../redux/constant';
import { isMeetingHost } from '../../../utils/meeting';

const DURATIONS = [
  { min: 15, label: '15 min' },
  { min: 30, label: '30 min' },
  { min: 60, label: '60 min' },
];

const GreenRoomChat = (props = {}) => {
  const params = useParams();
  const matchId = props.matchId || params.matchId;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { greenRoomMessages: allMessages, messagesLoading, matches } = useSelector(
    (state) => state.readersMatch
  );
  const greenRoomMessages = Array.isArray(allMessages?.[matchId]) ? allMessages[matchId] : [];

  const match = matches?.find((m) => String(m.id) === String(matchId));
  const partnerName = match?.reader?.name || match?.other_actor?.name || 'Your Reader';
  const partnerInitials = partnerName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const currentUser = useSelector((state) => state.auth?.user);

  // Paid reader info
  const otherActor = match?.other_actor || {};
  const isPaidReader = otherActor.is_paid_reader || false;
  const readerRates = {
    15: otherActor.session_rate_15 || 0,
    30: otherActor.session_rate_30 || 0,
    60: otherActor.session_rate_60 || 0,
  };

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [startingRehearsal, setStartingRehearsal] = useState(false);
  const [rehearsalError, setRehearsalError] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [sidesFile, setSidesFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [sessionBooked, setSessionBooked] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const actionsRef = useRef(null);

  // Handle return from Stripe checkout
  useEffect(() => {
    if (searchParams.get('booking') === 'success') {
      setSessionBooked(true);
      searchParams.delete('booking');
      setSearchParams(searchParams, { replace: true });
    }
    // Show rating modal when returning from a rehearsal
    if (searchParams.get('rehearsal') === 'ended') {
      setShowRating(true);
      searchParams.delete('rehearsal');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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

  // Book a paid session via Stripe
  const handleBookSession = async () => {
    setBookingLoading(true);
    try {
      const { data } = await axios.post(`${baseURL}/v1/growth/marketplace/book/`, {
        reader_id: otherActor.id,
        duration: selectedDuration,
        match_id: matchId,
      });
      const checkoutUrl = data?.data?.checkout_url;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        setRehearsalError('Payment setup failed. Please try again.');
        setShowBooking(false);
      }
    } catch (err) {
      setRehearsalError(err?.response?.data?.message || 'Booking failed. Please try again.');
      setShowBooking(false);
    } finally {
      setBookingLoading(false);
    }
  };

  // Start live rehearsal with Daily.co
  const handleStartRehearsal = async () => {
    if (startingRehearsal) return;
    // If paid reader and not yet booked, show booking prompt
    if (isPaidReader && !sessionBooked) {
      setShowBooking(true);
      return;
    }
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

      try { const { trackEvent, Events } = await import('../../../utils/analytics'); trackEvent(Events.START_REHEARSAL, { match_id: matchId, room_id: roomId }); } catch { /* swallow */ }

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
    <div className="flex flex-col" style={{
      background: 'var(--bg-deep)',
      // 100dvh shrinks with the iOS keyboard so the message input stays
      // visible above the keyboard. 100vh did not.
      height: 'calc(100dvh - 80px)',
    }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--bg-surface)' }}>
        <button
          onClick={() => (props.onBack ? props.onBack() : navigate('/dashboard/green-room'))}
          className="rounded-full p-1.5 transition-colors hover:text-white"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={18} />
        </button>

        {/* Partner avatar */}
        <div className="w-9 h-9 rounded-full bg-[#D4A85F]/20 border border-[#D4A85F]/20 flex items-center justify-center shrink-0">
          <span className="text-[#7A5A18] text-xs font-bold">{partnerInitials}</span>
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
            background: 'linear-gradient(135deg, #D4A85F, #7A5A18)',
            boxShadow: '0 3px 12px rgba(255, 130, 128,0.35)',
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

      {/* Session booked success banner */}
      {sessionBooked && (
        <div className="mx-4 mt-2 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }}
        >
          <Check size={14} />
          <span className="flex-1">Session booked! You can now start your rehearsal.</span>
          <button onClick={() => setSessionBooked(false)}><X size={14} /></button>
        </div>
      )}

      {/* Paid reader booking prompt */}
      {showBooking && (
        <div className="mx-4 mt-3 rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-surface)', border: '1px solid rgba(252,224,114,0.2)' }}
        >
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign size={16} color="#FCE072" />
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Book a Session</p>
              </div>
              <button onClick={() => setShowBooking(false)} className="p-1 rounded-full" style={{ color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
              {partnerName.split(' ')[0]} is a paid reader. Choose your session length to get started.
            </p>

            {/* Duration picker */}
            <div className="flex gap-2 mb-4">
              {DURATIONS.map((d) => {
                const isSelected = selectedDuration === d.min;
                const rate = readerRates[d.min];
                return (
                  <button
                    key={d.min}
                    type="button"
                    onClick={() => setSelectedDuration(d.min)}
                    className="flex-1 flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-semibold transition-all"
                    style={{
                      background: isSelected ? 'rgba(252,224,114,0.12)' : 'var(--bg-input)',
                      border: isSelected ? '1.5px solid #FCE072' : '1px solid var(--border-active)',
                      color: isSelected ? '#FCE072' : 'var(--text-secondary)',
                    }}
                  >
                    <Clock size={14} />
                    <span>{d.label}</span>
                    <span className="text-[11px] font-bold" style={{ color: isSelected ? '#FCE072' : 'var(--text-muted)' }}>${rate}</span>
                  </button>
                );
              })}
            </div>

            {/* Book button */}
            <button
              type="button"
              onClick={handleBookSession}
              disabled={bookingLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-black transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #FCE072, #F5D54A)', boxShadow: '0 3px 12px rgba(252,224,114,0.3)' }}
            >
              {bookingLoading ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
              {bookingLoading ? 'Redirecting to payment...' : `Book & Pay $${readerRates[selectedDuration]}`}
            </button>

            <p className="text-center text-[10px] mt-2 pb-1" style={{ color: 'var(--text-muted)' }}>
              Secure payment via Stripe. {partnerName.split(' ')[0]} keeps 80%.
            </p>
          </div>
        </div>
      )}

      {/* Session options banner */}
      <div className="flex gap-2 px-4 pt-3">
        <button
          onClick={handleStartRehearsal}
          disabled={startingRehearsal}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all border border-[#D4A85F]/30 text-[#7A5A18] hover:bg-[#D4A85F]/10 disabled:opacity-50"
        >
          <Users size={14} />
          {isPaidReader && !sessionBooked
            ? `Book Session — from $${readerRates[15]}`
            : `Live Session with ${partnerName.split(' ')[0]}`
          }
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
            <Loader2 size={24} className="animate-spin text-[#7A5A18]" />
          </div>
        )}

        {!messagesLoading && greenRoomMessages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center px-8 gap-3">
            <div className="w-16 h-16 rounded-full bg-[#D4A85F]/10 flex items-center justify-center">
              <Video size={28} color="#FF8280" />
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
            <FileText size={14} className="text-[#7A5A18]" />
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
                  <FileText size={16} className="text-[#7A5A18]" />
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
                  <Video size={16} className="text-[#7A5A18]" />
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
                  <Bot size={16} className="text-[#7A5A18]" />
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
            className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#D4A85F]"
            style={{ border: '1px solid var(--border-active)', background: 'var(--border-default)', color: 'var(--text-primary)', '--tw-placeholder-opacity': 1 }}
          />

          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #D4A85F, #7A5A18)' }}
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>

      {/* Post-rehearsal rating modal */}
      {showRating && (
        <ReaderRatingModal
          partnerName={partnerName}
          matchId={matchId}
          onSubmit={async (rating, review) => {
            await dispatch(submitReaderRating({ match_id: matchId, rating, review })).unwrap();
          }}
          onClose={() => setShowRating(false)}
        />
      )}
    </div>
  );
};

export default GreenRoomChat;
