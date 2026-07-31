import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clapperboard, Send } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { V1Sparkles } from '../../../components/Aurora';
import { fetchMatches, sendGreenRoomMessage } from '../../../redux/features/readers/readersMatchSlice';
import { openReaderProfile } from '../../../utils/openReaderProfile';

const ItsAScene = (props = {}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const params = useParams();
  const matchId = props.matchId || params.matchId;
  const { matches } = useSelector((state) => state.readersMatch || {});
  const match = matches?.find((m) => String(m.id) === String(matchId));

  // Deep-link / page-refresh fallback: if `matches` hasn't loaded yet,
  // pull it now so the celebration screen has real names + headshots
  // instead of "ME" / "Your Reader".
  useEffect(() => {
    if (matchId && (!Array.isArray(matches) || matches.length === 0)) {
      dispatch(fetchMatches());
    }
  }, [matchId, matches, dispatch]);

  const myName = 'You';
  // Mirror GreenRoomChat — the partner lives on `other_actor` for most match
  // shapes; `reader` only exists on some. Reading `reader` alone always fell
  // through to the placeholder, so the screen never showed the real name.
  const theirName = match?.reader?.name || match?.other_actor?.name || 'Your Reader';
  const theirFirst = theirName.split(' ')[0] || 'them';
  const myInitials = 'ME';
  const theirInitials = (theirName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)) || 'AR';

  // Message-first match moment (Tinder/Badoo pattern): the first message
  // happens HERE, not after a hop into Green Room. Most matches died silent
  // because the celebration screen had no way to actually say anything.
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const goToChat = () => (
    props.onGoToGreenRoom ? props.onGoToGreenRoom(matchId) : navigate(`/dashboard/green-room/${matchId}`)
  );
  const sendFirstMessage = async (text) => {
    const content = String(text || '').trim();
    if (!content || sending || !matchId) return;
    setSending(true);
    try {
      await dispatch(sendGreenRoomMessage({ match_id: Number(matchId) || matchId, content })).unwrap();
    } catch { /* chat still opens — they can retry there */ }
    goToChat();
  };
  const OPENERS = [
    `What are you working on right now?`,
    `Want to run a scene tonight?`,
  ];

  return (
    <div
      className="aurora-orbs min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{
        background: 'linear-gradient(160deg, #F0D097 0%, #D4A85F 50%, #7A5A18 100%)',
      }}
    >
      {/* Headshots — with sparkle burst on mount */}
      <div className="relative flex items-center justify-center mb-8" style={{ marginRight: '-16px' }}>
        <V1Sparkles count={14} radius={120} size={7} color="#FFFFFF" duration={1200} delayStagger={50} />
        <div
          className="w-32 h-32 rounded-full border-4 border-white shadow-2xl flex items-center justify-center z-10"
          style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)' }}
        >
          <span className="text-3xl font-bold text-white">{myInitials}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            const otherActorId = match?.other_actor?.id || match?.reader?.id;
            openReaderProfile(otherActorId, navigate);
          }}
          aria-label={`View ${theirName}'s profile`}
          className="w-32 h-32 rounded-full border-4 border-white shadow-2xl flex items-center justify-center -ml-6"
          style={{
            background: 'linear-gradient(135deg, #7A5A18, #4A3A10)',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <span className="text-3xl font-bold text-white">{theirInitials}</span>
        </button>
      </div>

      {/* Clapperboard */}
      <div className="mb-6 flex items-center justify-center w-16 h-16 rounded-full" style={{
        background: 'rgba(255,255,255,0.25)',
        backdropFilter: 'blur(12px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(12px) saturate(1.4)',
        border: '1px solid rgba(255,255,255,0.40)',
      }}>
        <Clapperboard size={32} color="white" />
      </div>

      {/* Heading */}
      <span className="aurora-mono text-white/80 mb-2" style={{ fontSize: 11, letterSpacing: '0.2em' }}>
        IT'S A MATCH
      </span>
      <h1
        className="aurora-display text-4xl text-white text-center mb-3"
        style={{ letterSpacing: '-0.6px', textShadow: '0 2px 12px rgba(10,10,10,0.18)' }}
      >
        It&apos;s a Scene!
      </h1>

      <p className="text-white/85 text-center text-base mb-10 max-w-xs leading-relaxed">
        {myName} and <strong className="text-white font-semibold">{theirName}</strong> both want to read together!
      </p>

      {/* Say it HERE — tap an opener or type; sending lands you in the chat */}
      <div className="w-full max-w-sm flex flex-col items-center gap-3">
        <div className="flex flex-wrap justify-center gap-2">
          {OPENERS.map((text) => (
            <button
              key={text}
              type="button"
              disabled={sending}
              onClick={() => sendFirstMessage(text)}
              onTouchEnd={(e) => { e.preventDefault(); sendFirstMessage(text); }}
              className="text-xs font-semibold px-3.5 py-2 rounded-full transition active:scale-95"
              style={{
                background: 'rgba(255,255,255,0.22)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.45)',
                backdropFilter: 'blur(8px)',
                cursor: sending ? 'wait' : 'pointer', opacity: sending ? 0.6 : 1,
                touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
              }}
            >
              {text}
            </button>
          ))}
        </div>
        <div className="w-full flex items-center gap-2 rounded-full pl-5 pr-1.5 py-1.5"
          style={{ background: 'white', boxShadow: '0 14px 30px rgba(10,10,10,0.18)' }}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendFirstMessage(draft); }}
            placeholder={`Say hi to ${theirFirst}…`}
            disabled={sending}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: '#3A2E10', minHeight: 40 }}
          />
          <button
            type="button"
            aria-label="Send"
            disabled={sending || !draft.trim()}
            onClick={() => sendFirstMessage(draft)}
            onTouchEnd={(e) => { e.preventDefault(); sendFirstMessage(draft); }}
            className="rounded-full flex items-center justify-center transition active:scale-95"
            style={{
              width: 40, height: 40,
              background: draft.trim() ? '#7A5A18' : 'rgba(122,90,24,0.35)',
              cursor: sending || !draft.trim() ? 'default' : 'pointer',
              touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Send size={17} color="#fff" />
          </button>
        </div>
      </div>

      {/* Secondary paths */}
      <button
        onClick={goToChat}
        className="aurora-mono mt-6 text-white/85 hover:text-white transition-colors"
        style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}
      >
        Open Green Room
      </button>
      <button
        onClick={() => props.onKeepBrowsing ? props.onKeepBrowsing() : navigate('/dashboard/find-a-reader')}
        className="aurora-mono mt-3 text-white/60 hover:text-white transition-colors"
        style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}
      >
        Keep browsing readers
      </button>
    </div>
  );
};

export default ItsAScene;
