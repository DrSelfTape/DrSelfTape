import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Loader2, Heart } from 'lucide-react';
import ActorProfileCard from './components/ActorProfileCard';
import MatchCelebration from './components/MatchCelebration';
import {
  fetchWhoWantsToRead,
  swipeOnReader,
} from '../../../redux/features/readers/readersMatchSlice';

const WhoWantsToRead = ({ onMatchNavigate, embedded = false } = {}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { whoWantsToRead, likesLoading } = useSelector(
    (state) => state.readersMatch
  );
  const [celebrating, setCelebrating] = useState(null);

  useEffect(() => {
    dispatch(fetchWhoWantsToRead());
  }, [dispatch]);

  const handleSlate = async (actor) => {
    try {
      const result = await dispatch(
        swipeOnReader({ reader_id: actor.id, action: 'right' })
      ).unwrap();
      if (result?.match && result?.match_details?.id) {
        // Hold on the celebration; navigate when burst finishes.
        setCelebrating({ matchId: result.match_details.id });
      } else {
        dispatch(fetchWhoWantsToRead());
      }
    } catch { /* handled in slice */ }
  };

  const onCelebrationDone = useCallback(() => {
    const id = celebrating?.matchId;
    setCelebrating(null);
    if (!id) return;
    if (onMatchNavigate) {
      onMatchNavigate(id);
    } else {
      const isMob = window.innerWidth < 768;
      if (isMob) {
        window.dispatchEvent(new CustomEvent('drst-navigate', { detail: { panel: 'green-room' } }));
      } else {
        navigate(`/dashboard/its-a-scene/${id}`);
      }
    }
  }, [celebrating, onMatchNavigate, navigate]);

  const handleStar = async (actor) => {
    try {
      await dispatch(
        swipeOnReader({ reader_id: actor.id, action: 'star' })
      ).unwrap();
      dispatch(fetchWhoWantsToRead());
    } catch { /* handled in slice */ }
  };

  const handlePass = async (actor) => {
    try {
      await dispatch(
        swipeOnReader({ reader_id: actor.id, action: 'left' })
      ).unwrap();
      dispatch(fetchWhoWantsToRead());
    } catch { /* handled in slice */ }
  };

  return (
    <div className={embedded ? '' : 'min-h-[calc(100vh-80px)] px-4 py-8'} style={embedded ? {} : { background: 'var(--bg-deepest)' }}>
      <div className="mx-auto max-w-2xl">
        {!embedded && (
        <h1 className="mb-6 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Who Wants to Read
        </h1>
        )}

        {likesLoading && (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#7A5A18]" />
          </div>
        )}

        {!likesLoading && whoWantsToRead.length === 0 && (
          <div className="flex h-60 flex-col items-center justify-center text-center">
            <Heart className="mb-3 h-10 w-10" style={{ color: 'var(--text-secondary)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              No one yet
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              When someone swipes right on you, they&apos;ll appear here.
            </p>
          </div>
        )}

        {!likesLoading && whoWantsToRead.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {whoWantsToRead.map((actor) => (
              <ActorProfileCard
                key={actor.id}
                actor={actor}
                onSlate={() => handleSlate(actor)}
                onStar={() => handleStar(actor)}
                onPass={() => handlePass(actor)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Match celebration overlay */}
      {celebrating && <MatchCelebration onDone={onCelebrationDone} />}
    </div>
  );
};

export default WhoWantsToRead;
