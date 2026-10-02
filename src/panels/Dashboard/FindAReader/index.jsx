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
import { markStep } from '../../../components/Dashboard/tutorialProgress';
import { tapPrimary, cheer } from '../../../utils/haptics';
import { supplyCounts, supplyLine } from '../../../utils/supply';
import VisibilityPrompt from '../../../components/Shared/VisibilityPrompt';
import '../studioScreens.css';

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
  // Supply is read from the ONE normalizer, never counted here. We only ask
  // it a yes/no question ("is there anybody at all?") — no new number is
  // rendered from this.
  const { available: availableSupply } = supplyCounts(matchingStats);
  const statsLoaded = !!matchingStats;
  const profile = useSelector((state) => state.profile?.profile);
  // Visibility is a SERVER decision — `needs_visual` is computed from the same
  // rule the deck uses. Checking headshot/user_image here instead meant someone
  // who picked the illustrated avatar was still told they were invisible AND
  // was locked out of the card stack, which broke the avatar route entirely.
  // While the profile is still loading, assume visible: showing the deck early
  // is recoverable, wrongly accusing someone of being invisible is not.
  const hasPhoto = profile ? !profile.needs_visual : true;
  const savedFilters = useSelector((s) => s.userSettings?.data?.reader_filters);
  const settingsLoaded = useSelector((s) => !!s.userSettings?.loaded);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

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
  // "You're caught up" is a claim that you finished something. On a cold
  // start with zero matchable supply the user has never swiped a card, so
  // that copy told them they'd completed a deck that never existed. Only
  // say it when there IS supply and this particular deck has run dry.
  const noSupplyAtAll = statsLoaded && availableSupply === 0;

  return (
    <div
      className="sx sx-page flex min-h-screen flex-col items-center px-4 pt-6"
      style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* Nav bar — hidden on mobile because the SwipeCard takes over the
       * full viewport. The bottom tab bar's active state already indicates
       * which screen we're on. */}
      <div className={`${embedded ? 'hidden' : 'hidden md:flex'} sx-head w-full max-w-sm mb-4 px-1`}>
        <div>
          <span className="sx-eyebrow">FIND A READER</span>
          <h1 className="sx-title">Match</h1>
        </div>
        <button type="button" onClick={() => setShowFilters(true)} className="sx-chip">
          <Filter size={12} aria-hidden="true" />
          Filters
        </button>
      </div>

      {/* Floating filter button — mobile only, top-right corner above card */}
      <button
        type="button"
        onClick={() => setShowFilters(true)}
        className="md:hidden sx-chip"
        style={{
          position: 'fixed',
          top: 'calc(50px + env(safe-area-inset-top, 0px) + 12px)',
          right: 12,
          zIndex: 41,
          boxShadow: '0 4px 14px color-mix(in srgb, var(--sx-ink) 10%, transparent)',
        }}
      >
        <Filter size={11} aria-hidden="true" />
        Filters
      </button>

      {/* Photo/avatar gate. Copy and both routes out live in VisibilityPrompt
          so this and the Home card can never tell different stories. */}
      {!hasPhoto && !readersLoading && (
        <div className="w-full max-w-sm mt-4">
          <VisibilityPrompt userId={profile?.id} name={profile?.first_name} />
        </div>
      )}

      {/* Supply line */}
      {hasPhoto && !readersLoading && readers.length > 0 && (
        <div className="sx-badge mb-5" data-tone={supply?.live ? 'ok' : 'quiet'}>
          <Users size={11} aria-hidden="true" />
          {/* "Nearby" was a lie: there is no geography anywhere in the deck
              query. Supply phrasing is owned by utils/supply so a label can
              never drift from the number it describes. */}
          {supply ? supply.text : `${Math.max(0, readers.length - currentIndex)} in your deck`}
          <span style={{ opacity: 0.45 }}>·</span>
          {/* Cards left in THIS deck — a page position, not a supply figure. */}
          {Math.max(0, readers.length - currentIndex)} left to swipe
        </div>
      )}

      {/* Card stack area */}
      {hasPhoto && <div className="relative flex w-full max-w-[340px] items-start justify-center" style={{ minHeight: 520 }}>
        {readersLoading && (
          <div className="absolute inset-0 flex items-center justify-center" aria-busy="true">
            <Loader2 size={30} style={{ color: 'var(--sx-gold)' }} className="animate-spin" aria-hidden="true" />
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
          <div className="absolute inset-0 flex flex-col items-center justify-center sx-empty">
            <WifiOff size={24} style={{ color: 'var(--sx-faint)', marginBottom: 12 }} aria-hidden="true" />
            <h2>Couldn&apos;t load readers</h2>
            <p>Check your connection and try again.</p>
            <button
              type="button"
              onClick={() => { setCurrentIndex(0); dispatch(fetchAvailableReaders()); }}
              className="sx-btn"
            >
              Try again
            </button>
          </div>
        )}

        {/* No matchable supply at all — they have not finished anything, so
            saying "caught up" would be a lie about their own progress. */}
        {!readersLoading && !readersError && noMore && sessionSwipes.length === 0 && noSupplyAtAll && (
          <div className="absolute inset-0 flex flex-col items-center justify-center sx-empty">
            <Users size={24} style={{ color: 'var(--sx-faint)', marginBottom: 12 }} aria-hidden="true" />
            <h2>No readers available right now</h2>
            <p>
              Nobody matches what you&apos;re looking for yet. Widening your filters
              usually turns a few up, and new readers join most weeks.
            </p>
            <div className="flex flex-col items-stretch gap-2 w-full" style={{ maxWidth: 240 }}>
              <button type="button" onClick={() => setShowFilters(true)} className="sx-btn">
                Adjust filters
              </button>
              <button
                type="button"
                onClick={() => { setCurrentIndex(0); dispatch(fetchAvailableReaders()); }}
                className="sx-btn sx-btn--quiet"
              >
                Check again
              </button>
            </div>
          </div>
        )}

        {/* Deck drained, but there IS supply — this one really is "caught up". */}
        {!readersLoading && !readersError && noMore && sessionSwipes.length === 0 && !noSupplyAtAll && (
          <div className="absolute inset-0 flex flex-col items-center justify-center sx-empty">
            <Users size={24} style={{ color: 'var(--sx-faint)', marginBottom: 12 }} aria-hidden="true" />
            <h2>You&apos;re caught up</h2>
            <p>You&apos;ve seen everyone in this deck. Check back later or adjust your filters.</p>
            <button
              type="button"
              onClick={() => { setCurrentIndex(0); dispatch(fetchAvailableReaders()); }}
              className="sx-btn"
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
            padding: '9px 15px', borderRadius: 100, cursor: 'pointer',
            background: 'var(--sx-gold-wash)',
            border: '1px solid var(--sx-gold-edge)',
            color: 'var(--sx-gold-ink)', fontSize: 12.5, fontWeight: 600, letterSpacing: '-0.01em',
            boxShadow: '0 8px 24px color-mix(in srgb, var(--sx-ink) 14%, transparent)',
            whiteSpace: 'nowrap',
          }}
        >
          {pendingLikes} reader{pendingLikes !== 1 ? 's' : ''} want to read with you
          <span aria-hidden="true" style={{ opacity: 0.65 }}>→</span>
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
            background: 'var(--sx-surface)', border: '1px solid var(--sx-line)',
            color: 'var(--sx-ink)', fontSize: 19, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 18px color-mix(in srgb, var(--sx-ink) 16%, transparent)',
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
          background: swipeToast.gold ? 'var(--sx-gold-wash)' : 'var(--sx-surface)',
          border: `1px solid ${swipeToast.gold ? 'var(--sx-gold-edge)' : 'var(--sx-line)'}`,
          color: swipeToast.gold ? 'var(--sx-gold-ink)' : 'var(--sx-ink)',
          fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em',
          boxShadow: '0 8px 26px color-mix(in srgb, var(--sx-ink) 16%, transparent)',
          display: 'flex', alignItems: 'center', gap: 6,
          animation: 'drst-swipe-toast 0.24s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          {swipeToast.text}
        </div>
      )}
      <style>{`@keyframes drst-swipe-toast { from { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.92); } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }`}</style>
    </div>
  );
};

export default FindAReader;
