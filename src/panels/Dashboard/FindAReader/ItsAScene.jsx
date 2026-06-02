import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clapperboard } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { V1Sparkles } from '../../../components/Aurora';
import { fetchMatches } from '../../../redux/features/readers/readersMatchSlice';

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
  const theirName = match?.reader?.name || 'Your Reader';
  const myInitials = 'ME';
  const theirInitials = (theirName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)) || 'AR';

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
            if (otherActorId) navigate(`/dashboard/reader-profile/${otherActorId}`);
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

      {/* CTA */}
      <button
        onClick={() => props.onGoToGreenRoom ? props.onGoToGreenRoom(matchId) : navigate(`/dashboard/green-room/${matchId}`)}
        className="aurora-mono font-bold px-10 py-3.5 rounded-full shadow-xl transition-transform active:scale-95"
        style={{
          color: '#7A5A18',
          background: 'white',
          fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase',
          boxShadow: '0 14px 30px rgba(10,10,10,0.18)',
        }}
      >
        Go to Green Room
      </button>

      {/* Keep browsing */}
      <button
        onClick={() => props.onKeepBrowsing ? props.onKeepBrowsing() : navigate('/dashboard/find-a-reader')}
        className="aurora-mono mt-5 text-white/75 hover:text-white transition-colors"
        style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}
      >
        Keep browsing readers
      </button>
    </div>
  );
};

export default ItsAScene;
