import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Loader2, Users, Users2 } from 'lucide-react';
import ReaderListItem from './components/ReaderListItem';
import ActivityFeedCard from './components/ActivityFeedCard';
import { fetchMatches, fetchActivityFeed } from '../../../redux/features/readers/readersMatchSlice';
import { markStep } from '../../../components/Dashboard/TutorialChecklist';

const GreenRoom = ({ onSelectMatch } = {}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { matches, matchesLoading, activityFeed } = useSelector(
    (state) => state.readersMatch
  );

  useEffect(() => {
    dispatch(fetchMatches());
    dispatch(fetchActivityFeed());
    // Mark tutorial step
    markStep('green_room');
  }, [dispatch]);

  return (
    <div className="aurora-orbs min-h-[calc(100vh-80px)] px-4 py-8" style={{ background: 'var(--aurora-bg)' }}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <span className="aurora-eyebrow" style={{ display: 'block', marginBottom: 4 }}>GREEN ROOM</span>
          <h1 className="aurora-display text-2xl" style={{ color: 'var(--aurora-text)', letterSpacing: '-0.6px' }}>
            Your matches
          </h1>
        </div>

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

            {/* Activity stats to show the community is active */}
            {activityFeed && (
              <div className="w-full grid gap-2 mb-6">
                <ActivityFeedCard type="available" count={activityFeed.available_now_count || 0} label="actors available right now" pulse />
                <ActivityFeedCard type="matches" count={activityFeed.recent_matches_count || 0} label="matches made today" />
                <ActivityFeedCard type="sessions" count={activityFeed.active_sessions_count || 0} label="live sessions happening" pulse={activityFeed.active_sessions_count > 0} />
              </div>
            )}

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
            {/* Activity stats */}
            {activityFeed && (
              <div className="grid grid-cols-3 gap-2 mb-6">
                <ActivityFeedCard type="available" count={activityFeed.available_now_count || 0} label="available" pulse />
                <ActivityFeedCard type="matches" count={activityFeed.recent_matches_count || 0} label="matches today" />
                <ActivityFeedCard type="sessions" count={activityFeed.active_sessions_count || 0} label="live now" pulse={activityFeed.active_sessions_count > 0} />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
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
