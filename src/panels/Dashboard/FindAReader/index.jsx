import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Filter, Loader2, Users } from 'lucide-react';
import SwipeCard from './components/SwipeCard';
import SwipeActions from './components/SwipeActions';
import ReaderFilters from './ReaderFilters';
import {
  fetchAvailableReaders,
  swipeOnReader,
} from '../../../redux/features/readers/readersMatchSlice';

const FindAReader = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { readers = [], readersLoading, onlineCount } = useSelector(
    (state) => state.readersMatch || {}
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    dispatch(fetchAvailableReaders());
  }, [dispatch]);

  const handleSwipe = useCallback(
    async (action) => {
      const actor = readers[currentIndex];
      if (!actor) return;
      try {
        const result = await dispatch(
          swipeOnReader({ reader_id: actor.id, action })
        ).unwrap();
        if (result?.matched) {
          navigate(`/dashboard/its-a-scene/${result.match_id}`);
          return;
        }
      } catch {
        // error handled in slice
      }
      setCurrentIndex((prev) => prev + 1);
    },
    [currentIndex, readers, dispatch, navigate]
  );

  const currentActor = readers[currentIndex];
  const nextActor = readers[currentIndex + 1];
  const noMore = !readersLoading && currentIndex >= readers.length;

  return (
    <div
      className="flex min-h-screen flex-col items-center px-4 py-6"
      style={{ background: '#0f0f1a' }}
    >
      {/* Nav bar */}
      <div
        className="flex w-full max-w-sm items-center justify-between mb-4 px-1"
      >
        <h1 className="text-xl font-bold text-white">Find a Reader</h1>
        <button
          onClick={() => setShowFilters(true)}
          className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <Filter size={14} />
          Filters
        </button>
      </div>

      {/* Online count badge */}
      {!readersLoading && readers.length > 0 && (
        <div className="flex items-center gap-1.5 mb-5">
          <Users size={14} color="#A7ECDA" />
          <span className="text-sm" style={{ color: '#A7ECDA' }}>
            {onlineCount ?? readers.length} readers online
          </span>
        </div>
      )}

      {/* Card stack area */}
      <div className="relative flex w-full max-w-[340px] items-start justify-center" style={{ minHeight: 520 }}>
        {readersLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={36} color="#FF8280" className="animate-spin" />
          </div>
        )}

        {!readersLoading && noMore && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ background: '#2A2A3C' }}
            >
              <Users size={32} color="#9CA3AF" />
            </div>
            <p className="text-lg font-semibold text-white mb-2">No more readers</p>
            <p className="text-sm mb-5" style={{ color: '#9CA3AF' }}>
              Check back later or adjust your filters.
            </p>
            <button
              onClick={() => { setCurrentIndex(0); dispatch(fetchAvailableReaders()); }}
              className="px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-transform active:scale-95"
              style={{ background: '#FF8280' }}
            >
              Refresh
            </button>
          </div>
        )}

        {!readersLoading && currentActor && (
          <>
            {/* Back card (slightly behind) */}
            {nextActor && (
              <div
                className="absolute top-3 left-0 right-0 mx-auto pointer-events-none"
                style={{ transform: 'scale(0.96)', opacity: 0.5, maxWidth: 340 }}
              >
                <SwipeCard actor={nextActor} isTop={false} />
              </div>
            )}

            {/* Top card — draggable */}
            <div className="relative z-10 w-full">
              <SwipeCard
                key={currentActor.id || currentIndex}
                actor={currentActor}
                isTop
                onSwipeLeft={() => handleSwipe('left')}
                onSwipeRight={() => handleSwipe('right')}
                onStar={() => handleSwipe('star')}
              />
            </div>
          </>
        )}
      </div>

      {/* Swipe action buttons */}
      {!readersLoading && currentActor && (
        <SwipeActions
          onPass={() => handleSwipe('left')}
          onStar={() => handleSwipe('star')}
          onMatch={() => handleSwipe('right')}
        />
      )}

      {/* Filters drawer */}
      {showFilters && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowFilters(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ReaderFilters onClose={() => setShowFilters(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default FindAReader;
