import { useNavigate, useParams } from 'react-router-dom';
import { Clapperboard } from 'lucide-react';
import { useSelector } from 'react-redux';

const ItsAScene = () => {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const { matches } = useSelector((state) => state.readersMatch || {});
  const match = matches?.find((m) => String(m.id) === String(matchId));

  const myName = 'You';
  const theirName = match?.reader?.name || 'Your Reader';
  const myInitials = 'ME';
  const theirInitials = (theirName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)) || 'AR';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{
        background: 'linear-gradient(160deg, #A7ECDA 0%, #FFB49A 50%, #FCE072 100%)',
      }}
    >
      {/* Headshots */}
      <div className="flex items-center justify-center mb-8" style={{ marginRight: '-16px' }}>
        <div
          className="w-32 h-32 rounded-full border-4 border-white shadow-2xl flex items-center justify-center z-10"
          style={{ background: '#2A2A3C' }}
        >
          <span className="text-3xl font-bold text-white">{myInitials}</span>
        </div>
        <div
          className="w-32 h-32 rounded-full border-4 border-white shadow-2xl flex items-center justify-center -ml-6"
          style={{ background: '#FF8280' }}
        >
          <span className="text-3xl font-bold text-white">{theirInitials}</span>
        </div>
      </div>

      {/* Clapperboard */}
      <div className="mb-6 flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur">
        <Clapperboard size={36} color="white" />
      </div>

      {/* Heading */}
      <h1
        className="text-4xl font-bold text-white text-center mb-3"
        style={{ fontFamily: 'Georgia, serif', textShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
      >
        It&apos;s a Scene!
      </h1>

      <p className="text-white/80 text-center text-base mb-10 max-w-xs leading-relaxed">
        {myName} and <strong className="text-white">{theirName}</strong> both want to read together!
      </p>

      {/* CTA */}
      <button
        onClick={() => navigate(`/dashboard/green-room/${matchId}`)}
        className="bg-white font-bold px-10 py-3.5 rounded-full shadow-xl text-lg transition-transform active:scale-95"
        style={{ color: '#FF8280' }}
      >
        Go to Green Room
      </button>

      {/* Keep browsing */}
      <button
        onClick={() => navigate('/dashboard/find-a-reader')}
        className="mt-4 text-white/70 text-sm hover:text-white transition-colors"
      >
        Keep browsing readers
      </button>
    </div>
  );
};

export default ItsAScene;
