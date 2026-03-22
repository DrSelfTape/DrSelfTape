import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Send, Loader2, Video } from 'lucide-react';
import GreenRoomMessage from './components/GreenRoomMessage';
import {
  fetchGreenRoomMessages,
  sendGreenRoomMessage,
  appendMessage,
} from '../../../redux/features/readers/readersMatchSlice';
import axios from '../../../redux/http';
import { baseURL } from '../../../redux/constant';

const GreenRoomChat = () => {
  const { matchId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { greenRoomMessages: allMessages, messagesLoading, matches } = useSelector(
    (state) => state.readersMatch
  );
  const greenRoomMessages = (allMessages[matchId] || allMessages) instanceof Array
    ? (allMessages[matchId] || allMessages)
    : allMessages[matchId] || [];
  const match = matches?.find((m) => String(m.id) === String(matchId));
  const partnerName = match?.reader?.name || 'Reader';
  const currentUser = useSelector((state) => state.auth?.user);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [startingRehearsal, setStartingRehearsal] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (matchId) {
      dispatch(fetchGreenRoomMessages(matchId));
    }
  }, [dispatch, matchId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [greenRoomMessages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    // Optimistic local append
    const localMsg = {
      id: Date.now(),
      matchId,
      senderId: currentUser?.id || 'me',
      senderName: currentUser?.name || 'You',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMine: true,
    };
    dispatch(appendMessage(localMsg));
    setInput('');

    setSending(true);
    try {
      await dispatch(
        sendGreenRoomMessage({ match_id: matchId, content: trimmed })
      ).unwrap();
    } catch {
      // error handled in slice — local message already shown
    } finally {
      setSending(false);
    }
  };

  const handleStartRehearsal = async () => {
    if (startingRehearsal) return;
    setStartingRehearsal(true);

    try {
      const { data } = await axios.post(
        `${baseURL}/v1/readers/start-rehearsal/`,
        { match_id: matchId }
      );
      const roomUrl = data?.data?.room_url || data?.room_url;
      const roomId = roomUrl?.split('/').filter(Boolean).pop() || matchId;
      navigate(`/meeting/${roomId}`);
    } catch {
      setStartingRehearsal(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col bg-[#0D0D0D]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#1E1E1E] px-4 py-3">
        <button
          type="button"
          onClick={() => navigate('/dashboard/green-room')}
          className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-[#1E1E1E] hover:text-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="flex-1 text-sm font-semibold text-white">Green Room</h2>
        <button
          type="button"
          onClick={handleStartRehearsal}
          disabled={startingRehearsal}
          className="flex items-center gap-1.5 rounded-full bg-[#A7ECDA] px-4 py-1.5 text-xs font-semibold text-[#0f0f1a] transition-colors hover:bg-[#8ee0c8] disabled:opacity-50"
        >
          {startingRehearsal ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Video className="h-3.5 w-3.5" />
          )}
          Start Rehearsal
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messagesLoading && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#C855F0]" />
          </div>
        )}

        {!messagesLoading && greenRoomMessages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-400">
              No messages yet. Say hello to your scene partner!
            </p>
          </div>
        )}

        {!messagesLoading &&
          greenRoomMessages.map((msg, i) => (
            <GreenRoomMessage
              key={msg.id || i}
              message={msg}
              isOwn={msg.sender_id === currentUser?.id}
            />
          ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-[#1E1E1E] bg-[#1A1A1A] px-4 py-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full border border-[#3A3A3A] bg-[#2A2A2A] px-4 py-2.5 text-sm text-white placeholder-[#666666] outline-none focus:border-[#C855F0]"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#C855F0] to-[#E88BF5] text-white transition-colors disabled:opacity-40"
          aria-label="Send"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  );
};

export default GreenRoomChat;
