import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Loader2, Users, Users2 } from 'lucide-react';
import ReaderListItem from './components/ReaderListItem';
import { fetchMatches } from '../../../redux/features/readers/readersMatchSlice';
import { markStep } from '../../../components/Dashboard/TutorialChecklist';

const GreenRoom = ({ onSelectMatch } = {}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { matches, matchesLoading } = useSelector(
    (state) => state.readersMatch
  );

  useEffect(() => {
    dispatch(fetchMatches());
    // Mark tutorial step
    markStep('green_room');
  }, [dispatch]);

  return (
    <div className="aurora-orbs aurora-orbs-live min-h-[calc(100vh-80px)] px-4 py-2 aurora-page-in" style={{ background: 'var(--aurora-bg)' }}>
      <div className="mx-auto max-w-2xl">
        <p className="aurora-eyebrow mb-4" style={{ color: 'var(--aurora-dim)' }}>
          Your matches
        </p>

        {matchesLoading && (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--aurora-accent)' }} />
          </div>
        )}

        {!matchesLoading && matches.length === 0 && (
          <div className="aurora-glass flex flex-col items-center justify-center text-center p-8 mt-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{
              background: 'color-mix(in oklch, var(--aurora-accent) 18%, transparent)',
            }}>
              <Users2 className="h-8 w-8" style={{ color: 'var(--aurora-accent)' }} />
            </div>
            <p className="aurora-display text-xl mb-2" style={{ color: 'var(--aurora-text)' }}>Your Green Room is empty</p>
            <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--aurora-sub)' }}>
              Match with other actors to start running lines together.
            </p>

            {/* Supply stats removed (P1-05): this strip told a different
                supply story than the Readers page ("195 available" vs a
                20-cap deck). One surface owns supply numbers now. */}

            <button
              onClick={() => navigate('/dashboard/find-a-reader')}
              className="aurora-mono px-8 py-3 rounded-full text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, var(--aurora-accent), var(--aurora-accent-deep))',
                fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                boxShadow: 'var(--aurora-shadow-coral)',
              }}
            >
              Start Swiping
            </button>
          </div>
        )}

        {!matchesLoading && matches.length > 0 && (
          <>
            {/* Supply pills removed (P1-05) — the Readers page owns
                supply numbers; this is the conversations home. */}

            <div className="grid gap-3 sm:grid-cols-2">
              {matches.map((match) => (
                <ReaderListItem
                  key={match.id}
                  match={match}
                  onClick={() => onSelectMatch ? onSelectMatch(match.id) : navigate(`/dashboard/green-room/${match.id}`)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GreenRoom;
