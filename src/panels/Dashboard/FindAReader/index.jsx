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
  setFiltersLocal,
} from '../../../redux/features/readers/readersMatchSlice';
import { fetchProfileThunk } from '../../../redux/features/profile/profileSlice';
import axios from '../../../redux/http';
import { baseURL } from '../../../redux/constant';
import { markStep } from '../../../components/Dashboard/TutorialChecklist';

const FindAReader = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { readers = [], readersLoading, onlineCount } = useSelector(
    (state) => state.readersMatch || {}
  );
  const profile = useSelector((state) => state.profile?.profile);
  const hasPhoto = !!(profile?.actor_profile?.headshot || profile?.user_image);
  const savedFilters = useSelector((s) => s.userSettings?.data?.reader_filters);
  const settingsLoaded = useSelector((s) => !!s.userSettings?.loaded);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    dispatch(fetchProfileThunk());
    markStep('find_reader');
  }, [dispatch]);

  // Hydrate saved filters from userSettings once it has loaded, then fetch.
  useEffect(() => {
    if (!settingsLoaded) return;
    if (savedFilters && typeof savedFilters === 'object' && Object.keys(savedFilters).length > 0) {
      dispatch(setFiltersLocal(savedFilters));
      dispatch(fetchAvailableReaders(savedFilters));
    } else {
      dispatch(fetchAvailableReaders());
    }
  }, [settingsLoaded, savedFilters, dispatch]);

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
      markStep('headshot');
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
      className="aurora-orbs flex min-h-screen flex-col items-center px-4 pt-6 pb-[calc(96px+env(safe-area-inset-bottom,0px))]"
      style={{ background: 'var(--aurora-bg)' }}
    >
      {/* Nav bar — hidden on mobile because the SwipeCard takes over the
       * full viewport. The bottom tab bar's active state already indicates
       * which screen we're on. */}
      <div className="hidden md:flex w-full max-w-sm items-end justify-between mb-4 px-1">
        <div>
          <span className="aurora-eyebrow" style={{ display: 'block', marginBottom: 4 }}>FIND A READER</span>
          <h1 className="aurora-display text-2xl" style={{ color: 'var(--aurora-text)', letterSpacing: '-0.6px' }}>
            Match
          </h1>
        </div>
        <button
          onClick={() => setShowFilters(true)}
          className="aurora-mono flex items-center gap-1.5 rounded-full px-3.5 py-1.5"
          style={{
            background: 'var(--aurora-glass)',
            border: '1px solid var(--aurora-glass-border)',
            color: 'var(--aurora-text)',
            fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
            backdropFilter: 'blur(12px)',
          }}
        >
          <Filter size={12} />
          Filters
        </button>
      </div>

      {/* Floating filter button — mobile only, top-right corner above card */}
      <button
        onClick={() => setShowFilters(true)}
        className="md:hidden aurora-mono"
        style={{
          position: 'fixed',
          top: 'calc(50px + env(safe-area-inset-top, 0px) + 12px)',
          right: 12,
          zIndex: 41,
          background: 'rgba(255,255,255,0.85)',
          border: '1px solid var(--aurora-glass-border)',
          backdropFilter: 'blur(20px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
          color: '#0A0A0A',
          padding: '6px 12px', borderRadius: 100,
          fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: '0 4px 14px rgba(10,10,10,0.10)',
        }}
      >
        <Filter size={11} />
        Filters
      </button>

      {/* Photo required gate */}
      {!hasPhoto && !readersLoading && (
        <div className="aurora-glass w-full max-w-sm flex flex-col items-center text-center p-8 mt-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{
            background: 'color-mix(in oklch, var(--aurora-accent) 18%, transparent)',
          }}>
            <Camera className="w-9 h-9" style={{ color: 'var(--aurora-accent)' }} />
          </div>
          <span className="aurora-eyebrow mb-2">STEP 1</span>
          <h2 className="aurora-display text-xl mb-2" style={{ color: 'var(--aurora-text)' }}>Add a headshot</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--aurora-sub)' }}>
            Other actors want to see who they're reading with.
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
            className="aurora-mono px-8 py-3 rounded-full text-white transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, var(--aurora-accent), var(--aurora-accent-deep))',
              fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
              boxShadow: 'var(--aurora-shadow-coral)',
            }}
          >
            {uploading ? 'Uploading…' : 'Upload Photo'}
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
            className="mt-3 text-xs transition-colors"
            style={{ color: 'var(--aurora-sub)' }}
          >
            Or update your full profile
          </button>
        </div>
      )}

      {/* Online count badge */}
      {hasPhoto && !readersLoading && readers.length > 0 && (
        <div className="aurora-mono flex items-center gap-1.5 mb-5 px-3 py-1.5 rounded-full" style={{
          background: 'color-mix(in oklch, var(--aurora-mint) 18%, transparent)',
          border: '1px solid color-mix(in oklch, var(--aurora-mint) 35%, transparent)',
          color: 'color-mix(in oklch, var(--aurora-mint) 80%, var(--aurora-text))',
          fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          backdropFilter: 'blur(12px)',
        }}>
          <Users size={11} />
          {onlineCount ?? readers.length} readers online
        </div>
      )}

      {/* Card stack area */}
      {hasPhoto && <div className="relative flex w-full max-w-[340px] items-start justify-center" style={{ minHeight: 520 }}>
        {readersLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={36} color="#FF8280" className="animate-spin" />
          </div>
        )}

        {!readersLoading && noMore && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{
                background: 'var(--aurora-glass)',
                border: '1px solid var(--aurora-glass-border)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <Users size={28} color="var(--aurora-sub)" />
            </div>
            <p className="aurora-display text-xl mb-2" style={{ color: 'var(--aurora-text)' }}>You're caught up</p>
            <p className="text-sm mb-5" style={{ color: 'var(--aurora-sub)' }}>
              Check back later or adjust your filters.
            </p>
            <button
              onClick={() => { setCurrentIndex(0); dispatch(fetchAvailableReaders()); }}
              className="aurora-mono px-6 py-2.5 rounded-full text-white transition-transform active:scale-95"
              style={{
                background: 'linear-gradient(135deg, var(--aurora-accent), var(--aurora-accent-deep))',
                fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                boxShadow: 'var(--aurora-shadow-coral)',
              }}
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

      {/* Swipe action buttons — desktop only; mobile shows them inside the card */}
      {hasPhoto && !readersLoading && currentActor && (
        <div className="hidden md:block">
          <SwipeActions
            onPass={() => handleSwipe('left')}
            onStar={() => handleSwipe('star')}
            onMatch={() => handleSwipe('right')}
          />
        </div>
      )}

      {/* Filters drawer — ReaderFilters handles its own fixed backdrop */}
      {showFilters && (
        <ReaderFilters onClose={() => setShowFilters(false)} />
      )}
    </div>
  );
};

export default FindAReader;
