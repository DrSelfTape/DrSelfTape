import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Loader2, Users, Users2 } from 'lucide-react';
import ReaderListItem from './components/ReaderListItem';
import ActivityFeedCard from './components/ActivityFeedCard';
import { fetchMatches, fetchActivityFeed } from '../../../redux/features/readers/readersMatchSlice';

const GreenRoom = ({ onSelectMatch } = {}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { matches, matchesLoading, activityFeed } = useSelector(
    (state) => state.readersMatch
  );

  useEffect(() => {
    dispatch(fetchMatches());
    dispatch(fetchActivityFeed());
  }, [dispatch]);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#0f0f1a] px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-xl font-bold text-white">Green Room</h1>

        {matchesLoading && (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#C855F0]" />
          </div>
        )}

        {!matchesLoading && matches.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-8">
            <div className="w-16 h-16 rounded-full bg-[#C855F0]/10 flex items-center justify-center mb-4">
              <Users2 className="h-8 w-8 text-[#C855F0]" />
            </div>
            <p className="text-lg font-bold text-white mb-2">Your Green Room is empty</p>
            <p className="text-sm text-[#999999] mb-6 max-w-xs">
              Match with other actors to start running lines together
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
              className="bg-[#C855F0] hover:bg-[#A040C8] text-white font-semibold px-8 py-3 rounded-xl transition-all text-sm"
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
