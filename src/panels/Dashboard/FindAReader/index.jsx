import { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Filter, Loader2, Users, Camera } from 'lucide-react';
import SwipeCard from './components/SwipeCard';
import SwipeActions from './components/SwipeActions';
import ReaderFilters from './ReaderFilters';
import {
  fetchAvailableReaders,
  swipeOnReader,
} from '../../../redux/features/readers/readersMatchSlice';
import { fetchProfileThunk } from '../../../redux/features/profile/profileSlice';
import axios from '../../../redux/http';
import { baseURL } from '../../../redux/constant';

const FindAReader = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { readers = [], readersLoading, onlineCount } = useSelector(
    (state) => state.readersMatch || {}
  );
  const profile = useSelector((state) => state.profile?.profile);
  const hasPhoto = !!(profile?.actor_profile?.headshot || profile?.user_image);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    dispatch(fetchProfileThunk());
    // Mark tutorial step
    try { const { markStep } = require('../../../components/Dashboard/TutorialChecklist'); markStep('find_reader'); } catch {}
    // Restore saved filters and pass to API
    try {
      const saved = JSON.parse(localStorage.getItem('drst-reader-filters') || '{}');
      if (Object.keys(saved).length > 0) {
        const { setFiltersLocal } = require('../../../redux/features/readers/readersMatchSlice');
        dispatch(setFiltersLocal(saved));
        dispatch(fetchAvailableReaders(saved));
      } else {
        dispatch(fetchAvailableReaders());
      }
    } catch {
      dispatch(fetchAvailableReaders());
    }
  }, [dispatch]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('headshot', file);
      await axios.patch(`${baseURL}/v1/users/profile/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      dispatch(fetchProfileThunk());
    } catch (err) {
      console.error('Failed to upload photo:', err);
    }
    setUploading(false);
  };

  const [swiping, setSwiping] = useState(false);

  const handleSwipe = useCallback(
    async (action) => {
      if (swiping) return;
      const actor = readers[currentIndex];
      if (!actor) return;
      setSwiping(true);
      try {
        const result = await dispatch(
          swipeOnReader({ reader_id: actor.id, action })
        ).unwrap();
        if (result?.match && result?.match_details?.id) {
          const isMob = window.innerWidth < 768;
          if (isMob) {
            window.dispatchEvent(new CustomEvent('drst-navigate', { detail: { panel: 'green-room' } }));
          } else {
            navigate(`/dashboard/its-a-scene/${result.match_details.id}`);
          }
          return;
        }
      } catch {
        // error handled in slice
      }
      setCurrentIndex((prev) => prev + 1);
      setSwiping(false);
    },
    [currentIndex, readers, dispatch, navigate, swiping]
  );

  const currentActor = readers[currentIndex];
  const nextActor = readers[currentIndex + 1];
  const noMore = !readersLoading && currentIndex >= readers.length;

  return (
    <div
      className="flex min-h-screen flex-col items-center px-4 py-6"
      style={{ background: '#0D0D0D' }}
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

      {/* Photo required gate */}
      {!hasPhoto && !readersLoading && (
        <div className="w-full max-w-sm flex flex-col items-center text-center py-12 px-6">
          <div className="w-20 h-20 rounded-full bg-[#C855F0]/10 flex items-center justify-center mb-4">
            <Camera className="w-10 h-10 text-[#C855F0]" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Add a Headshot to Start</h2>
          <p className="text-sm text-[#999999] mb-6">
            Other actors want to see who they're reading with. Upload a photo to start matching.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-[#C855F0] hover:bg-[#A040C8] text-white font-semibold px-8 py-3 rounded-xl transition-all text-sm disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </button>
          <button
            onClick={() => {
              const isMob = window.innerWidth < 768;
              if (isMob) {
                window.dispatchEvent(new CustomEvent('drst-navigate', { detail: { panel: 'dash-profile' } }));
              } else {
                navigate('/dashboard/profile');
              }
            }}
            className="mt-3 text-xs text-[#999999] hover:text-white transition-colors"
          >
            Or update your full profile
          </button>
        </div>
      )}

      {/* Online count badge */}
      {hasPhoto && !readersLoading && readers.length > 0 && (
        <div className="flex items-center gap-1.5 mb-5">
          <Users size={14} color="#A7ECDA" />
          <span className="text-sm" style={{ color: '#A7ECDA' }}>
            {onlineCount ?? readers.length} readers online
          </span>
        </div>
      )}

      {/* Card stack area */}
      {hasPhoto && <div className="relative flex w-full max-w-[340px] items-start justify-center" style={{ minHeight: 520 }}>
        {readersLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={36} color="#C855F0" className="animate-spin" />
          </div>
        )}

        {!readersLoading && noMore && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ background: '#2A2A2A' }}
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
              style={{ background: 'linear-gradient(135deg, #C855F0, #E88BF5)' }}
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
      </div>}

      {/* Swipe action buttons */}
      {hasPhoto && !readersLoading && currentActor && (
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
