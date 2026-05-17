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
    <div className="aurora-orbs min-h-[calc(100vh-80px)] px-4 py-2" style={{ background: 'var(--aurora-bg)' }}>
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
            {/* Activity stats — single-row inline pills, no wrapping labels */}
            {activityFeed && (
              <div
                className="aurora-glass mb-5 flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
                style={{ fontSize: 12 }}
              >
                <span style={{ color: 'var(--aurora-text)' }}>
                  <span className="aurora-mono" style={{ fontSize: 15, fontWeight: 600 }}>
                    {activityFeed.available_now_count || 0}
                  </span>
                  <span className="ml-1.5" style={{ color: 'var(--aurora-sub)' }}>available</span>
                </span>
                <span aria-hidden style={{ color: 'var(--aurora-line)' }}>·</span>
                <span style={{ color: 'var(--aurora-text)' }}>
                  <span className="aurora-mono" style={{ fontSize: 15, fontWeight: 600 }}>
                    {activityFeed.recent_matches_count || 0}
                  </span>
                  <span className="ml-1.5" style={{ color: 'var(--aurora-sub)' }}>today</span>
                </span>
                <span aria-hidden style={{ color: 'var(--aurora-line)' }}>·</span>
                <span style={{ color: 'var(--aurora-text)' }}>
                  <span
                    className="aurora-mono"
                    style={{
                      fontSize: 15, fontWeight: 600,
                      color: activityFeed.active_sessions_count > 0 ? '#FF8280' : 'var(--aurora-text)',
                    }}
                  >
                    {activityFeed.active_sessions_count || 0}
                  </span>
                  <span className="ml-1.5" style={{ color: 'var(--aurora-sub)' }}>live now</span>
                </span>
              </div>
            )}

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
