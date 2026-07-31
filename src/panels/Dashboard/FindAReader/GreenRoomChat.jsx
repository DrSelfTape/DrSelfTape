import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft, Send, Loader2, Video, Paperclip, X,
  FileText, Bot, Users, ChevronUp, DollarSign, Clock, Check, Sparkles,
} from 'lucide-react';
import GreenRoomMessage from './components/GreenRoomMessage';
import {
  fetchGreenRoomMessages,
  sendGreenRoomMessage,
  appendMessage,
} from '../../../redux/features/readers/readersMatchSlice';
import ReportBlockMenu from '../../../components/Shared/ReportBlockMenu';
import axios from '../../../redux/http';
import { baseURL } from '../../../redux/constant';
import { Capacitor } from '@capacitor/core';
import { openExternal } from '../../../utils/openExternal';

/**
 * Keyword-matching smart-reply suggestions. v1 rule-based; production
 * target is a small completion endpoint seeded with the thread + the
 * actor's calendar/sides context (handoff §14.8).
 */
function smartReplies(text, partnerFirstName) {
  const t = (text || '').toLowerCase();
  const name = partnerFirstName || 'there';
  const has = (...words) => words.some((w) => t.includes(w));

  if (has('tonight', 'after 8', 'around', 'free', 'available', 'work for you', 'this week')) {
    return ['Tonight works. Send me a time and I’m there.', 'Could we do a little earlier? Say 7?', 'Perfect. Want to do it over video or in person?'];
  }
  if (has('sides', 'prep', 'scene', 'script', 'lines')) {
    return ['Sending the sides now.', 'Let’s run it cold first, then trade notes.', 'I’ll mark my lines and share before we meet.'];
  }
  if (has('self-tape', 'tape', 'grounded', 'excited', 'love', 'great')) {
    return ['That means a lot, thank you 🙏', 'Right back at you.', 'Can’t wait to actually work the scene with you.'];
  }
  if (has('coffee', 'energy', '☕', 'haha', 'lol', '😂')) {
    return ['Deal, coffee’s on me ☕', 'Ha, I’ll bring my A-game and the caffeine.', 'You’re going to be a great scene partner, I can tell.'];
  }
  if (has('?', 'how', 'what', 'when', 'where', 'want')) {
    return ['Whatever’s easiest for you works for me.', 'Good question, let me check and get right back to you.', 'Let’s figure it out on a quick call?'];
  }
  return [`Hey ${name}! Thanks for reaching out 👋`, 'Totally down to run sides this week.', 'When are you usually free to rehearse?'];
}

const DURATIONS = [
  { min: 15, label: '15 min' },
  { min: 30, label: '30 min' },
  { min: 60, label: '60 min' },
];

const goldGradient = 'linear-gradient(135deg, var(--aurora-heritage-gold-light) 0%, var(--aurora-heritage-gold) 55%, var(--aurora-heritage-gold-deep) 100%)';
const brightGoldGradient = 'linear-gradient(135deg, var(--aurora-gold-light), var(--aurora-gold))';

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

  // Blob URLs created locally when an upload fails — we render them as the
  // file preview, but we own the lifecycle. Revoke on unmount so they don't
  // leak file handles for the rest of the session.
  const localBlobUrlsRef = useRef([]);
  useEffect(() => () => {
    localBlobUrlsRef.current.forEach((u) => {
      try { URL.revokeObjectURL(u); } catch { /* already revoked */ }
    });
    localBlobUrlsRef.current = [];
  }, []);
  const trackBlobUrl = (file) => {
    const u = URL.createObjectURL(file);
    localBlobUrlsRef.current.push(u);
    return u;
  };

  const match = matches?.find((m) => String(m.id) === String(matchId));
  const partnerName = match?.reader?.name || match?.other_actor?.name || 'Your Reader';
  const partnerInitials = partnerName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const currentUser = useSelector((state) => state.auth?.user);

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
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const actionsRef = useRef(null);

  useEffect(() => {
    if (searchParams.get('booking') === 'success') {
      setSessionBooked(true);
      searchParams.delete('booking');
      setSearchParams(searchParams, { replace: true });
    }
    // (Rating is now captured on the post-call screen; the old ?rehearsal=ended
    // auto-open of a second rating modal has been removed.)
    if (searchParams.get('rehearsal')) {
      searchParams.delete('rehearsal');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (matchId) dispatch(fetchGreenRoomMessages(matchId));
  }, [dispatch, matchId]);

  // APNs window events (Build 23) — refresh thread when a push arrives
  // while the chat is open, so the new message appears without waiting
  // for the WebSocket fallback to round-trip.
  useEffect(() => {
    if (!matchId) return undefined;
    const refresh = (e) => {
      const payloadMatchId = e?.detail?.match_id || e?.detail?.matchId;
      // Only refresh when the push payload is *for* this thread. Previously
      // a missing match_id triggered a refresh on every chat, even for
      // unrelated pushes (likes, system broadcasts).
      if (payloadMatchId && String(payloadMatchId) === String(matchId)) {
        dispatch(fetchGreenRoomMessages(matchId));
      }
    };
    window.addEventListener('drst-push-received', refresh);
    window.addEventListener('drst-push-tap', refresh);
    return () => {
      window.removeEventListener('drst-push-received', refresh);
      window.removeEventListener('drst-push-tap', refresh);
    };
  }, [dispatch, matchId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [greenRoomMessages]);

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
      dispatch(fetchGreenRoomMessages(matchId));
    } catch { /* local msg already shown */ } finally { setSending(false); }
  };

  // Send a pre-written icebreaker on tap. Skips the input field so the
  // user doesn't have to retype — the funnel data (6 matches → 8
  // messages over 7d) said the cold-start barrier was the killer.
  const sendIcebreaker = async (text) => {
    if (sending) return;
    sendLocalMsg(text);
    setSending(true);
    try {
      await dispatch(sendGreenRoomMessage({ match_id: matchId, content: text })).unwrap();
      dispatch(fetchGreenRoomMessages(matchId));
    } catch { /* local msg already shown */ } finally { setSending(false); }
  };

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
        dispatch(fetchGreenRoomMessages(matchId));
      } else {
        sendLocalMsg(`📄 Sides shared: ${file.name}`, 'file', {
          fileName: file.name,
          fileUrl: trackBlobUrl(file),
          fileType: file.type,
        });
      }
    } catch {
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

  const handleBookSession = async () => {
    if (bookingLoading) return;
    setBookingLoading(true);
    // Generate an idempotency key per booking attempt. If the user
    // double-taps (or the network hiccup retries the request), the BE
    // returns the same booking + Stripe URL instead of creating duplicates.
    const idempotencyKey =
      (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `book-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
    try {
      const { data } = await axios.post(
        `${baseURL}/v1/growth/marketplace/book/`,
        {
          reader_id: otherActor.id,
          duration: selectedDuration,
          match_id: matchId,
        },
        { headers: { 'Idempotency-Key': idempotencyKey } },
      );
      const checkoutUrl = data?.data?.checkout_url;
      if (checkoutUrl) {
        try {
          const parsed = new URL(checkoutUrl);
          if (parsed.hostname !== 'checkout.stripe.com') throw new Error('untrusted host');
          // Native (Android): in-app browser so the WebView/SPA survives the
          // round-trip. Web keeps the standard same-tab redirect.
          if (Capacitor.isNativePlatform()) await openExternal(checkoutUrl);
          else window.location.href = checkoutUrl;
        } catch {
          setRehearsalError('Payment setup failed. Please try again.');
          setShowBooking(false);
        }
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

  const handleStartRehearsal = async () => {
    if (startingRehearsal) return;
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

      let roomId;
      try {
        const parsed = new URL(roomUrl);
        roomId = parsed.pathname.split('/').filter(Boolean).pop();
      } catch {
        throw new Error('Invalid room URL');
      }
      if (!roomId) throw new Error('Empty room id');

      const userId = currentUser?.id || 'anon';
      localStorage.setItem(`dr-self-tapes_meeting_host_${userId}_${roomId}`, 'true');

      try { const { trackEvent, Events } = await import('../../../utils/analytics'); trackEvent(Events.START_REHEARSAL, { match_id: matchId, room_id: roomId }); } catch { /* swallow */ }

      sendLocalMsg(`🎬 Live rehearsal started! Joining room...`, 'system');

      // Carry the real matchId (the URL's :meetingId is the Daily room slug, NOT
      // the match) so the post-call screen can rate the right match + route back.
      // startedCall/ringId drive the caller's "Ringing…" overlay + hang-up:
      // ring is 'rang'|'duplicate'|'answered' from the BE — 'answered' means
      // the partner was already calling US, so we're joining, not ringing.
      const ringOutcome = data?.data?.ring || data?.ring;
      const ringId = data?.data?.ring_id || data?.ring_id || null;
      navigate(`/meeting/${roomId}`, {
        state: {
          roomUrl, matchId, partnerName,
          startedCall: ringOutcome !== 'answered',
          ringId,
        },
      });
    } catch (err) {
      // Old code fell into a demo-rehearsal URL when start-rehearsal/
      // failed — that URL points at a Daily room that doesn't exist,
      // so the user landed in a black screen with no way out. Now we
      // surface the real error inline and let them retry. The Live
      // Session button below shows the error banner; no fake room.
      const msg =
        err?.response?.data?.message
        || err?.response?.data?.detail
        || (err?.code === 'ECONNABORTED' || !err?.response
            ? 'Could not reach our servers. Check your connection and try again.'
            : 'Could not start the rehearsal room. Please try again.');
      setRehearsalError(msg);
      sendLocalMsg(`Couldn't start the call: ${msg}`, 'system');
    } finally {
      setStartingRehearsal(false);
    }
  };

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
    <div
      className="flex flex-col aurora-page-in"
      style={{
        background: 'var(--aurora-bg)',
        // 100dvh shrinks with the iOS keyboard so the message input stays
        // visible above the keyboard. 100vh did not — see Build 22 fix.
        height: 'calc(100dvh - 80px)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--aurora-line)', background: 'var(--aurora-surface-solid)' }}
      >
        <button
          onClick={() => (props.onBack ? props.onBack() : navigate('/dashboard/green-room'))}
          className="rounded-full p-1.5 transition-colors"
          style={{ color: 'var(--aurora-sub)' }}
        >
          <ArrowLeft size={18} />
        </button>

        <button
          type="button"
          onClick={() => {
            if (!otherActor?.id) return;
            // react-router navigate() no-ops inside the Capacitor shell — route
            // mobile through the drst-navigate event MobileApp listens for.
            if (props.onViewProfile) {
              props.onViewProfile(otherActor.id);
            } else if (Capacitor.isNativePlatform()) {
              window.dispatchEvent(new CustomEvent('drst-navigate', {
                detail: { panel: 'reader-profile', readerId: otherActor.id },
              }));
            } else {
              navigate(`/dashboard/reader-profile/${otherActor.id}`);
            }
          }}
          aria-label={`View ${partnerName}'s profile`}
          className="flex items-center gap-3 flex-1 min-w-0 text-left transition-opacity hover:opacity-80 active:opacity-70 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-full"
          style={{
            // ring color via inline style — Tailwind hex bracket safe-listing
            // is unreliable for CSS variables
            // eslint-disable-next-line
          }}
        >
          <span
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(212,168,95,0.16)',
              border: '1px solid rgba(212,168,95,0.30)',
            }}
          >
            <span className="text-xs font-bold" style={{ color: 'var(--aurora-heritage-gold-deep)' }}>{partnerInitials}</span>
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--aurora-text)' }}>{partnerName}</p>
            {/* Honest presence — only assert "Online now" on a CONFIRMED true.
                We don't have a presence timestamp, so a stale `false` must not
                claim "Offline"; render nothing when we can't be sure. */}
            {otherActor?.is_online === true && (
              <p className="text-xs flex items-center gap-1" style={{ color: '#1A8A4A' }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#22C55E' }} />
                Online now
              </p>
            )}
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {otherActor?.id && (
            <ReportBlockMenu
              targetType="user"
              targetUserId={otherActor.id}
              targetName={partnerName.split(' ')[0] || 'this user'}
            />
          )}
          <button
            onClick={handleStartRehearsal}
            disabled={startingRehearsal}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all disabled:opacity-50 shrink-0"
            style={{
              background: goldGradient,
              color: '#FFF',
              boxShadow: '0 6px 18px rgba(212,168,95,0.35)',
            }}
          >
            {startingRehearsal ? <Loader2 size={13} className="animate-spin" /> : <Video size={13} />}
            {startingRehearsal ? 'Starting...' : 'Start Rehearsal'}
          </button>
        </div>
      </div>

      {/* Rehearsal error */}
      {rehearsalError && (
        <div
          className="mx-4 mt-2 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs"
          style={{
            background: 'rgba(255,130,128,0.12)',
            border: '1px solid rgba(255,130,128,0.30)',
            color: 'var(--aurora-coral-deep, #C05957)',
          }}
        >
          <span className="flex-1">{rehearsalError}</span>
          <button onClick={() => setRehearsalError('')}><X size={14} /></button>
        </div>
      )}

      {/* Session booked banner */}
      {sessionBooked && (
        <div
          className="mx-4 mt-2 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold"
          style={{ background: 'rgba(159,230,180,0.18)', border: '1px solid rgba(159,230,180,0.40)', color: '#1A6A38' }}
        >
          <Check size={14} />
          <span className="flex-1">Session booked! You can now start your rehearsal.</span>
          <button onClick={() => setSessionBooked(false)}><X size={14} /></button>
        </div>
      )}

      {/* Paid reader booking prompt */}
      {showBooking && (
        <div
          className="mx-4 mt-3 overflow-hidden"
          style={{
            background: 'var(--aurora-surface-solid)',
            borderRadius: 18,
            border: '1px solid rgba(252,224,114,0.32)',
            boxShadow: '0 8px 24px rgba(252,224,114,0.18)',
          }}
        >
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign size={16} style={{ color: 'var(--aurora-gold-deep)' }} />
                <p className="text-sm font-bold" style={{ color: 'var(--aurora-text)' }}>Book a Session</p>
              </div>
              <button onClick={() => setShowBooking(false)} className="p-1 rounded-full" style={{ color: 'var(--aurora-dim)' }}>
                <X size={16} />
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--aurora-sub)' }}>
              {partnerName.split(' ')[0]} is a paid reader. Choose your session length to get started.
            </p>

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
                    style={isSelected
                      ? { background: 'rgba(252,224,114,0.16)', border: '1.5px solid var(--aurora-gold)', color: 'var(--aurora-gold-deep)' }
                      : { background: 'rgba(10,10,10,0.03)', border: '1px solid var(--aurora-line)', color: 'var(--aurora-sub)' }
                    }
                  >
                    <Clock size={14} />
                    <span>{d.label}</span>
                    <span className="text-[11px] font-bold" style={{ color: isSelected ? 'var(--aurora-gold-deep)' : 'var(--aurora-dim)' }}>${rate}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleBookSession}
              disabled={bookingLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-50"
              style={{
                background: brightGoldGradient,
                color: '#0A0A0A',
                boxShadow: '0 6px 18px rgba(252,224,114,0.32)',
              }}
            >
              {bookingLoading ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
              {bookingLoading ? 'Redirecting to payment...' : `Book & Pay $${readerRates[selectedDuration]}`}
            </button>

            <p className="text-center text-[10px] mt-2 pb-1" style={{ color: 'var(--aurora-dim)' }}>
              Secure payment via Stripe. {partnerName.split(' ')[0]} keeps 80%.
            </p>
          </div>
        </div>
      )}

      {/* Session options */}
      <div className="flex gap-2 px-4 pt-3">
        <button
          onClick={handleStartRehearsal}
          disabled={startingRehearsal}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all disabled:opacity-50"
          style={{
            background: 'transparent',
            border: '1px solid rgba(212,168,95,0.35)',
            color: 'var(--aurora-heritage-gold-deep)',
          }}
        >
          <Users size={14} />
          {isPaidReader && !sessionBooked
            ? `Book Session · from $${readerRates[15]}`
            : `Live Session with ${partnerName.split(' ')[0]}`
          }
        </button>
        <button
          onClick={handleAISession}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all"
          style={{ border: '1px solid var(--aurora-line)', color: 'var(--aurora-sub)', background: 'var(--aurora-surface-solid)' }}
        >
          <Bot size={14} />
          Practice with AI First
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messagesLoading && (
          <div className="flex h-full items-center justify-center">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--aurora-heritage-gold)' }} />
          </div>
        )}

        {/* ── ChatIntro — personal context card at top of thread ── */}
        {!messagesLoading && (
          <div className="flex flex-col items-center text-center px-4 pt-2 pb-4" style={{ gap: 8 }}>
            <div
              style={{
                width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
                background: otherActor.headshot
                  ? `url(${otherActor.headshot}) center/cover`
                  : 'linear-gradient(135deg, rgba(212,168,95,0.20), rgba(212,168,95,0.40))',
                border: '3px solid #FFFFFF',
                boxShadow: '0 8px 24px rgba(20,18,14,0.16)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {!otherActor.headshot && (
                <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--aurora-heritage-gold-deep)' }}>
                  {partnerInitials}
                </span>
              )}
            </div>
            <div className="aurora-display" style={{ fontSize: 19, color: 'var(--aurora-text)', letterSpacing: '-0.4px', marginTop: 4 }}>
              {partnerName}
            </div>
            <div
              style={{
                fontSize: 13, color: 'var(--aurora-sub)', lineHeight: 1.5,
                maxWidth: 260, textWrap: 'pretty',
              }}
            >
              You both want to run sides this week. {partnerName.split(' ')[0]}
              {otherActor.is_verified ? ' is a verified ' : ' is a '}
              {(otherActor.actor_type || 'peer').toLowerCase()} actor
              {otherActor.based_in ? ` near ${otherActor.based_in.split(',')[0]}` : ''}.
            </div>
            {Array.isArray(otherActor.genres) && otherActor.genres.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                {otherActor.genres.slice(0, 3).map((g) => (
                  <span
                    key={g}
                    className="aurora-mono"
                    style={{
                      fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase',
                      padding: '4px 10px', borderRadius: 100,
                      background: 'rgba(212,168,95,0.10)',
                      color: 'var(--aurora-heritage-gold-deep)',
                      border: '1px solid rgba(212,168,95,0.30)',
                    }}
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {!messagesLoading && greenRoomMessages.length === 0 && (
          <div className="flex flex-col items-center text-center px-6 gap-4 mt-2">
            <p className="text-sm" style={{ color: 'var(--aurora-sub)' }}>
              Say hi to {partnerName.split(' ')[0] || 'your partner'}, share your sides,
              then start a live rehearsal, or practice with the AI first.
            </p>
            {/* Tap-to-send icebreakers — addresses the 6 matches/7d that
                produced 8 messages total. Most matches went silent after
                the celebration screen because nobody made the first move. */}
            <div className="aurora-eyebrow" style={{ color: 'var(--aurora-dim)', marginTop: 6 }}>
              Break the ice
            </div>
            <div className="flex flex-wrap justify-center gap-2 w-full max-w-md">
              {[
                `Hey ${partnerName.split(' ')[0] || 'there'}, want to run sides this week?`,
                `Down for a quick read whenever you're free.`,
                `I'm prepping for an audition, wanna swap reads?`,
                `Cold read sometime? I've got a few minutes today.`,
              ].map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => sendIcebreaker(text)}
                  disabled={sending}
                  className="text-xs px-3.5 py-2 rounded-full transition"
                  style={{
                    background: 'rgba(212,168,95,0.14)',
                    border: '1px solid rgba(212,168,95,0.35)',
                    color: 'var(--aurora-heritage-gold-deep)',
                    cursor: sending ? 'wait' : 'pointer',
                    opacity: sending ? 0.6 : 1,
                  }}
                >
                  {text}
                </button>
              ))}
            </div>
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

      {/* Smart-reply suggestions — show only when the last message is from
          the partner and the user hasn't typed anything yet. */}
      {(() => {
        const last = greenRoomMessages[greenRoomMessages.length - 1];
        const showSuggestions = last
          && !(last.isMine || last.sender_id === currentUser?.id || last.senderId === (currentUser?.id || 'me'))
          && !input.trim();
        if (!showSuggestions) return null;
        const suggestions = smartReplies(last.text || last.content || '', partnerName.split(' ')[0]);
        return (
          <div className="px-4 pt-2 pb-1" style={{ background: 'var(--aurora-surface-solid)' }}>
            <div className="flex items-center gap-1.5 mb-2" style={{ color: 'var(--aurora-dim)' }}>
              <Sparkles size={11} />
              <span className="aurora-eyebrow" style={{ color: 'var(--aurora-dim)' }}>SUGGESTED REPLIES</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInput(s)}
                  className="text-xs whitespace-nowrap px-3 py-1.5 rounded-full transition"
                  style={{
                    background: 'rgba(212,168,95,0.10)',
                    border: '1px solid rgba(212,168,95,0.30)',
                    color: 'var(--aurora-heritage-gold-deep)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Input bar */}
      <div
        className="px-4 py-3"
        style={{ borderTop: '1px solid var(--aurora-line)', background: 'var(--aurora-surface-solid)' }}
      >
        {sidesFile && (
          <div
            className="mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs"
            style={{ background: 'rgba(10,10,10,0.04)', color: 'var(--aurora-sub)' }}
          >
            <FileText size={14} style={{ color: 'var(--aurora-heritage-gold-deep)' }} />
            <span className="flex-1 truncate">{sidesFile.name}</span>
            <button onClick={() => setSidesFile(null)}><X size={12} /></button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-2">
          <div className="relative" ref={actionsRef}>
            <button
              type="button"
              onClick={() => setShowActions((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
              style={{ background: 'rgba(10,10,10,0.04)', border: '1px solid var(--aurora-line)', color: 'var(--aurora-sub)' }}
            >
              {showActions ? <ChevronUp size={18} /> : <Paperclip size={18} />}
            </button>

            {showActions && (
              <div
                className="absolute bottom-12 left-0 overflow-hidden w-56 z-50"
                style={{
                  background: 'var(--aurora-surface-solid)',
                  border: '1px solid var(--aurora-line)',
                  borderRadius: 14,
                  boxShadow: '0 16px 40px rgba(10,10,10,0.18)',
                }}
              >
                <button
                  type="button"
                  onClick={() => { fileInputRef.current?.click(); setShowActions(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                  style={{ color: 'var(--aurora-text)' }}
                >
                  <FileText size={16} style={{ color: 'var(--aurora-heritage-gold-deep)' }} />
                  <div className="text-left">
                    <p className="font-medium">Share Sides</p>
                    <p className="text-xs" style={{ color: 'var(--aurora-dim)' }}>PDF or image of your sides</p>
                  </div>
                </button>
                <div style={{ borderTop: '1px solid var(--aurora-line)' }} />
                <button
                  type="button"
                  onClick={handleStartRehearsal}
                  disabled={startingRehearsal}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors disabled:opacity-50"
                  style={{ color: 'var(--aurora-text)' }}
                >
                  <Video size={16} style={{ color: 'var(--aurora-heritage-gold-deep)' }} />
                  <div className="text-left">
                    <p className="font-medium">Start Live Rehearsal</p>
                    <p className="text-xs" style={{ color: 'var(--aurora-dim)' }}>Video call via Daily.co</p>
                  </div>
                </button>
                <div style={{ borderTop: '1px solid var(--aurora-line)' }} />
                <button
                  type="button"
                  onClick={handleAISession}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                  style={{ color: 'var(--aurora-text)' }}
                >
                  <Bot size={16} style={{ color: 'var(--aurora-heritage-gold-deep)' }} />
                  <div className="text-left">
                    <p className="font-medium">AI Scene Partner</p>
                    <p className="text-xs" style={{ color: 'var(--aurora-dim)' }}>Practice lines with AI reader</p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Hidden file input — label-wraps-input pattern not needed here
              because the trigger button is in a popover; the input is
              programmatically focused but doesn't use the iOS-fragile
              display:none .click() pattern that breaks in WKWebView for
              direct triggers. Build 18 used this pattern; keeping it. */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.txt,.fountain"
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
            onChange={handleSidesUpload}
          />

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${partnerName.split(' ')[0]}...`}
            className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none transition-colors focus:border-[color:var(--aurora-heritage-gold)]"
            style={{
              border: '1px solid var(--aurora-line)',
              background: 'rgba(10,10,10,0.025)',
              color: 'var(--aurora-text)',
            }}
          />

          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-all disabled:opacity-40"
            style={{
              background: goldGradient,
              color: '#FFF',
              boxShadow: '0 6px 18px rgba(212,168,95,0.32)',
            }}
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>

    </div>
  );
};

export default GreenRoomChat;
