import { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Filter, Loader2, Users, Camera, WifiOff } from 'lucide-react';
import SwipeCard from './components/SwipeCard';
import SwipeActions from './components/SwipeActions';
import SwipeTutorial from './components/SwipeTutorial';
import SessionRecap from './components/SessionRecap';
import MatchCelebration from './components/MatchCelebration';
import ReaderFilters from './ReaderFilters';
import {
  fetchAvailableReaders,
  swipeOnReader,
  setFiltersLocal,
  fetchMatchingStats,
} from '../../../redux/features/readers/readersMatchSlice';
import { fetchProfileThunk } from '../../../redux/features/profile/profileSlice';
import { showSnackbar } from '../../../redux/features/snackbarSlice/snackbarSlice';
import axios from '../../../redux/http';
import { baseURL } from '../../../redux/constant';
import { markStep } from '../../../components/Dashboard/TutorialChecklist';
import { tapPrimary, cheer } from '../../../utils/haptics';
import HeadshotCropper from '../../../components/Shared/HeadshotCropper';
import { supplyLine } from '../../../utils/supply';

// Backend serializes a null last_name as the Python string "None"; strip it
// before we put a name in front of the user.
const firstNameOf = (actor) =>
  (actor?.name || 'them').replace(/\bNone\b/g, '').trim().split(' ')[0] || 'them';

const FindAReader = ({ embedded = false }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { readers = [], readersLoading, matchingStats, readersError } = useSelector(
    (state) => state.readersMatch || {}
  );
  const pendingLikes = matchingStats?.pending_likes_count || 0;
  const supply = supplyLine(matchingStats);
  const profile = useSelector((state) => state.profile?.profile);
  const hasPhoto = !!(profile?.actor_profile?.headshot || profile?.user_image);
  const savedFilters = useSelector((s) => s.userSettings?.data?.reader_filters);
  const settingsLoaded = useSelector((s) => !!s.userSettings?.loaded);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState(null); // object URL being positioned
  const fileInputRef = useRef(null);

  useEffect(() => {
    dispatch(fetchProfileThunk());
    dispatch(fetchMatchingStats());
    markStep('find_reader');
  }, [dispatch]);

  // The Hinge "likes-you" tease — surface REAL incoming interest (people who
  // already swiped right on you). Honest, never fabricated. Taps through to
  // the "Who Wants to Read" list.
  const goToLikes = useCallback(() => {
    tapPrimary();
    if (window.innerWidth < 768) {
      window.dispatchEvent(new CustomEvent('drst-navigate', { detail: { panel: 'who-wants-to-read' } }));
    } else {
      navigate('/dashboard/who-wants-to-read');
    }
  }, [navigate]);

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

  // Pick a file → open the cropper so they frame their face perfectly.
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
      dispatch(showSnackbar({ message: 'Please choose an image file.', variant: 'error' }));
      return;
    }
    setCropSrc(URL.createObjectURL(file));
  };

  // Upload the positioned/cropped square headshot.
  const uploadCroppedHeadshot = async (blob) => {
    const src = cropSrc;
    setCropSrc(null);
    if (src) URL.revokeObjectURL(src);
    if (!blob) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('headshot', blob, 'headshot.jpg');
      await axios.patch(`${baseURL}/v1/users/profile/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      dispatch(fetchProfileThunk());
      markStep('headshot');
    } catch (err) {
      console.error('Failed to upload photo:', err);
      dispatch(showSnackbar({
        message: err?.response?.data?.message || "Couldn't upload photo. Please try again.",
        variant: 'error',
      }));
    }
    setUploading(false);
  };

  const [celebrating, setCelebrating] = useState(null); // null | { matchId }
  // Swipes made this browsing session — drives the Session-Complete recap
  // shown when the deck runs out. Reset on a fresh load-more.
  const [sessionSwipes, setSessionSwipes] = useState([]); // [{ actor, action, matched }]
  // Brief, HONEST per-swipe payoff chip. Right = "you're on their list"
  // (a real status — they'll see it); left = an occasional deck-tuning note.
  // Never fabricated interest.
  const [swipeToast, setSwipeToast] = useState(null); // null | { text, gold }
  // Free Rewind — undo the immediately-previous (non-match) swipe.
  const [lastSwipe, setLastSwipe] = useState(null); // null | { index }
  // The deck cursor, advanced SYNCHRONOUSLY. `currentIndex` is state, so two
  // swipes fired inside one frame (a double-tap on the desktop buttons) would
  // both read the same stale value and swipe the same card twice — the old
  // in-flight lock used to hide that, and going optimistic removed the lock.
  const cursorRef = useRef(0);
  useEffect(() => { cursorRef.current = currentIndex; }, [currentIndex]);

  // Send the swipe AFTER the deck has already moved on. The network
  // round-trip must never gate the next card — that's the whole point of an
  // optimistic deck, and it's what made swiping feel laggy on cellular.
  // One silent retry covers a dropped connection; only a second failure
  // surfaces, and it never rewinds the deck (yanking a card back after the
  // user has moved past it is worse than losing one swipe).
  const sendSwipe = useCallback(
    async (actor, action) => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const result = await dispatch(
            swipeOnReader({ reader_id: actor.id, action })
          ).unwrap();
          // Refresh the dashboard pending-likes counter so the home-tab
          // CTA isn't stale next time the user lands there.
          dispatch(fetchMatchingStats());
          if (result?.matched && result?.matchId) {
            // The biggest moment in the app — make it land in the hand.
            cheer();
            setSessionSwipes((s) => s.map((e) => (
              e.actor?.id === actor.id ? { ...e, matched: true } : e
            )));
            // Hold the user on the celebration overlay; navigation runs
            // when the burst finishes (MatchCelebration calls onDone).
            setCelebrating({ matchId: result.matchId, actor });
          }
          return;
        } catch {
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 700));
            continue;
          }
          dispatch(showSnackbar({
            message: `Couldn't save your swipe on ${firstNameOf(actor)}. They'll come back around.`,
            variant: 'error',
          }));
        }
      }
    },
    [dispatch]
  );

  const handleSwipe = useCallback(
    (action) => {
      const idx = cursorRef.current;
      const actor = readers[idx];
      if (!actor) return true;
      // Advance the deck NOW; the request goes out behind it.
      cursorRef.current = idx + 1;
      setSessionSwipes((s) => [...s, { actor, action, matched: false }]);
      setLastSwipe({ index: idx });
      setCurrentIndex(idx + 1);
      // Per-swipe payoff chip — honest, never fabricated. Right/star =
      // the real status ("you're on their list"); left = an occasional,
      // quiet deck-tuning note (the left payoff is mostly the glide itself).
      if (action !== 'left') {
        setSwipeToast({ text: `You're on ${firstNameOf(actor)}'s list to read`, gold: true });
        setTimeout(() => setSwipeToast(null), 1500);
      } else if (Math.random() < 0.34) {
        setSwipeToast({ text: 'Tuning your deck', gold: false });
        setTimeout(() => setSwipeToast(null), 1300);
      }
      sendSwipe(actor, action);
      return true;
    },
    [readers, sendSwipe]
  );

  // Reset the carousel cursor when the reader list shrinks below it
  // (filters changed, list refetched). Without this, we silently land
  // on "no more readers" when there are actually fresh cards available.
  useEffect(() => {
    if (currentIndex >= readers.length && readers.length > 0) {
      setCurrentIndex(0);
    }
  }, [readers.length, currentIndex]);

  const onCelebrationDone = useCallback(() => {
    const id = celebrating?.matchId;
    setCelebrating(null);
    // The matched card was already consumed when the swipe fired optimistically
    // — advancing again here would skip the reader behind it.
    setLastSwipe(null);
    if (!id) return;
    const isMob = window.innerWidth < 768;
    if (isMob) {
      window.dispatchEvent(new CustomEvent('drst-navigate', { detail: { panel: 'green-room' } }));
    } else {
      navigate(`/dashboard/its-a-scene/${id}`);
    }
  }, [celebrating, navigate]);

  // "Keep swiping" from the match screen — consume the card, stay in the deck.
  const onMatchDismiss = useCallback(() => {
    setCelebrating(null);
    setLastSwipe(null);
  }, []);

  // Free Rewind — bring back the last card so a mis-flick isn't a lost reader.
  const rewind = useCallback(() => {
    if (!lastSwipe || celebrating) return;
    tapPrimary();
    setCurrentIndex(lastSwipe.index);
    setSessionSwipes((s) => s.slice(0, -1));
    setLastSwipe(null);
  }, [lastSwipe, celebrating]);

  const currentActor = readers[currentIndex];
  const nextActor = readers[currentIndex + 1];
  const noMore = !readersLoading && currentIndex >= readers.length;

  return (
    <div
      className="aurora-orbs aurora-orbs-live flex min-h-screen flex-col items-center px-4 pt-6 pb-[calc(96px+env(safe-area-inset-bottom,0px))]"
      style={{ background: 'var(--aurora-bg)' }}
    >
      {/* Nav bar — hidden on mobile because the SwipeCard takes over the
       * full viewport. The bottom tab bar's active state already indicates
       * which screen we're on. */}
      <div className={`${embedded ? 'hidden' : 'hidden md:flex'} w-full max-w-sm items-end justify-between mb-4 px-1`}>
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
          {/* "Nearby" was a lie: there is no geography anywhere in the deck
              query. Supply phrasing is owned by utils/supply so a label can
              never drift from the number it describes. */}
          {supply ? supply.text : `${Math.max(0, readers.length - currentIndex)} in your deck`}
          <span style={{ opacity: 0.5 }}>·</span>
          {/* Cards left in THIS deck — a page position, not a supply figure. */}
          {Math.max(0, readers.length - currentIndex)} left to swipe
        </div>
      )}

      {/* Card stack area */}
      {hasPhoto && <div className="relative flex w-full max-w-[340px] items-start justify-center" style={{ minHeight: 520 }}>
        {readersLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={36} color="#FF8280" className="animate-spin" />
          </div>
        )}

        {/* Session-Complete recap — once the deck runs out AND the user
            actually swiped this session. Otherwise fall through to the plain
            "You're caught up" empty state below. */}
        {!readersLoading && noMore && sessionSwipes.length > 0 && (
          <SessionRecap
            swipes={sessionSwipes}
            pendingLikes={pendingLikes}
            onSeeLikes={goToLikes}
            onRefresh={() => { setSessionSwipes([]); setCurrentIndex(0); dispatch(fetchAvailableReaders()); }}
          />
        )}

        {/* Load FAILED — a network error must not masquerade as an empty deck
            ("you're caught up"). Offer a real retry. */}
        {!readersLoading && readersError && readers.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{
                background: 'var(--aurora-glass)',
                border: '1px solid var(--aurora-glass-border)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <WifiOff size={26} color="var(--aurora-sub)" />
            </div>
            <p className="aurora-display text-xl mb-2" style={{ color: 'var(--aurora-text)' }}>Couldn&apos;t load readers</p>
            <p className="text-sm mb-5" style={{ color: 'var(--aurora-sub)' }}>
              Check your connection and try again.
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
              Try again
            </button>
          </div>
        )}

        {!readersLoading && !readersError && noMore && sessionSwipes.length === 0 && (
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
            {/* First-visit swipe coach (shows once) */}
            <SwipeTutorial />
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

      {/* Match celebration — fixed overlay; holds nav until burst finishes */}
      {celebrating && (
        <MatchCelebration
          actor={celebrating.actor}
          onConnect={onCelebrationDone}
          onDismiss={onMatchDismiss}
        />
      )}

      {/* Headshot cropper — position your face in the circle before uploading */}
      {cropSrc && (
        <HeadshotCropper
          imageSrc={cropSrc}
          onCancel={() => { URL.revokeObjectURL(cropSrc); setCropSrc(null); }}
          onComplete={uploadCroppedHeadshot}
        />
      )}

      {/* "Readers want to read with you" tease — REAL incoming interest (mobile) */}
      {pendingLikes > 0 && !celebrating && (
        <button
          className="md:hidden"
          onClick={goToLikes}
          style={{
            position: 'fixed', left: '50%', transform: 'translateX(-50%)',
            top: 'calc(54px + env(safe-area-inset-top, 0px) + 16px)',
            zIndex: 45,
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 14px 8px 11px', borderRadius: 100, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(120deg, #D4A85F, #7A5A18)',
            color: '#0E0D0A', fontSize: 12.5, fontWeight: 800, letterSpacing: '-0.01em',
            boxShadow: '0 8px 24px rgba(122,90,24,0.42)',
            animation: 'drst-likes-pulse 2.6s ease-in-out infinite',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 15 }}>🎬</span>
          {pendingLikes} reader{pendingLikes !== 1 ? 's' : ''} want to read with you
          <span style={{ opacity: 0.65 }}>→</span>
        </button>
      )}

      {/* Free Rewind — undo a mis-flick (mobile) */}
      {lastSwipe && currentActor && !celebrating && (
        <button
          className="md:hidden"
          onClick={rewind}
          aria-label="Undo last swipe"
          style={{
            position: 'fixed', left: 18,
            bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
            zIndex: 45, width: 46, height: 46, borderRadius: '50%',
            background: 'rgba(20,18,14,0.82)', border: '1px solid rgba(252,224,114,0.35)',
            color: '#FCE072', fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 6px 18px rgba(10,10,10,0.32)',
          }}
        >↩</button>
      )}

      {/* Per-swipe payoff chip — brief, honest status reward */}
      {swipeToast && (
        <div style={{
          position: 'fixed', left: '50%', transform: 'translateX(-50%)',
          bottom: 'calc(104px + env(safe-area-inset-bottom, 0px))',
          zIndex: 60, pointerEvents: 'none',
          padding: '9px 16px', borderRadius: 100,
          background: swipeToast.gold ? 'rgba(212,168,95,0.97)' : 'rgba(20,18,14,0.9)',
          color: swipeToast.gold ? '#0E0D0A' : '#fff',
          fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
          boxShadow: '0 8px 26px rgba(10,10,10,0.3)',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', gap: 6,
          animation: 'drst-swipe-toast 0.24s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          {swipeToast.gold && <span>🎬</span>}{swipeToast.text}
        </div>
      )}
      <style>{`@keyframes drst-swipe-toast { from { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.92); } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } } @keyframes drst-likes-pulse { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.045); } }`}</style>
    </div>
  );
};

export default FindAReader;
