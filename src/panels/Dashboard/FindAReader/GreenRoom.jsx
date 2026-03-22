import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Loader2, Users } from 'lucide-react';
import ReaderListItem from './components/ReaderListItem';
import { fetchMatches } from '../../../redux/features/readers/readersMatchSlice';

const GreenRoom = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { matches, matchesLoading } = useSelector(
    (state) => state.readersMatch
  );

  useEffect(() => {
    dispatch(fetchMatches());
  }, [dispatch]);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#0f0f1a] px-4 py-8">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-xl font-bold text-white">Green Room</h1>

        {matchesLoading && (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF8280]" />
          </div>
        )}

        {!matchesLoading && matches.length === 0 && (
          <div className="flex h-60 flex-col items-center justify-center text-center">
            <Users className="mb-3 h-10 w-10 text-gray-500" />
            <p className="text-sm font-semibold text-white">No matches yet</p>
            <p className="mt-1 text-xs text-gray-400">
              Start swiping to find your scene partner!
            </p>
          </div>
        )}

        {!matchesLoading && matches.length > 0 && (
          <div className="divide-y divide-gray-800 rounded-xl border border-gray-800 bg-gray-900/50">
            {matches.map((match) => (
              <ReaderListItem
                key={match.id}
                match={match}
                onClick={() => navigate(`/dashboard/green-room/${match.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GreenRoom;
