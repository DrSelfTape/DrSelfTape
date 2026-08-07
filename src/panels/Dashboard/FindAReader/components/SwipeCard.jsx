import { useRef, useState, useEffect } from 'react';
import { MapPin, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { tapSelect, tapPrimary } from '../../../../utils/haptics';
import { lastSeenLabel } from '../../../../utils/matchSignals';
import { ReaderPortrait } from '../../../../components/Aurora';
import { openReaderProfile } from '../../../../utils/openReaderProfile';

// Kept in one place because the drag turns it off and back on imperatively;
// if the string here and the string in the style object drift, the exit
// animation silently stops running.
const TRANSITION = 'transform 0.3s ease, box-shadow 0.3s ease';

const SwipeCard = ({ actor, onSwipeLeft, onSwipeRight, onStar, isTop }) => {
  const navigate = useNavigate();
  // Tap (not swipe) the name/bio strip → open the reader's full profile.
  // The outer card eats swipe drags; this handler short-circuits via
  // stopPropagation so it never registers as a swipe.
  const openProfile = (e) => {
    e?.stopPropagation?.();
    openReaderProfile(actor?.id, navigate);
  };
  const cardRef = useRef(null);
  const slateRef = useRef(null);
  const passRef = useRef(null);
  const dragState = useRef({ startX: 0, isDragging: false, currentX: 0 });
  const [flyDir, setFlyDir] = useState(null); // 'right' = energetic gold-trail exit
  const [isMobile, setIsMobile] = useState(false);

  // ── The drag runs OUTSIDE React on purpose.
  // Routing every pointer-move through setState re-rendered this whole card
  // (a full-bleed headshot, gradients, badges) on every frame of the gesture,
  // on the same JS thread the drag is being tracked on. That is where the
  // stutter came from inside WKWebView. Position is now written straight to
  // the nodes and coalesced into one paint per frame; React only hears about
  // the exit (flyDir), which happens once.
  const rafRef = useRef(0);
  const pendingRef = useRef(0);

  const paint = (delta) => {
    const el = cardRef.current;
    if (el) el.style.transform = `translateX(${delta}px) rotate(${delta * 0.06}deg)`;
    const threshold = 80;
    const slate = delta > 0 ? Math.min(delta / threshold, 1) : 0;
    const pass = delta < 0 ? Math.min(-delta / threshold, 1) : 0;
    if (slateRef.current) {
      slateRef.current.style.opacity = slate;
      slateRef.current.style.transform = `rotate(-12deg) scale(${0.9 + slate * 0.18})`;
    }
    if (passRef.current) passRef.current.style.opacity = pass;
  };

  // Coalesce pointer-moves to one paint per frame — a finger can outrun the
  // display, and painting twice in a frame is work nobody sees.
  const schedulePaint = (delta) => {
    pendingRef.current = delta;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      paint(pendingRef.current);
    });
  };

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // When this slot promotes to a new actor (deck advances), start clean so a
  // freshly-promoted card never inherits the previous card's fly-off/glow.
  useEffect(() => {
    setFlyDir(null);
    paint(0);
    dragState.current = { startX: 0, isDragging: false, currentX: 0, crossedDir: null };
  }, [actor?.id]);

  // Strip "None" artifact when backend serializes a null last_name as the
  // Python string "None" (e.g. "Courtney Richards None"). Also collapse
  // doubled whitespace.
  const cleanName = ((actor?.name || 'Actor')
    .replace(/\bNone\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()) || 'Actor';

  const initials = cleanName
    .split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const unionLabel = {
    'sag-aftra': 'SAG-AFTRA', 'aea': 'AEA',
    'non-union': 'Non-Union', 'fi-core': 'Fi-Core',
  }[actor?.union || actor?.unionStatus] || actor?.union || actor?.unionStatus;

  const handleDragStart = (clientX) => {
    if (!isTop) return;
    dragState.current = { startX: clientX, isDragging: true, currentX: 0, crossedDir: null };
    // The card must track the finger exactly — no easing mid-drag.
    if (cardRef.current) cardRef.current.style.transition = 'none';
  };

  const handleDragMove = (clientX) => {
    if (!isTop || !dragState.current.isDragging) return;
    const delta = clientX - dragState.current.startX;
    dragState.current.currentX = delta;
    schedulePaint(delta);
    // Dopamine in the gesture: fire the commit haptic the MOMENT the stamp
    // locks in (threshold-cross), not on release — so the body learns where
    // "commit" lives. RIGHT ("read with") = a meatier medium tap; LEFT
    // ("not now") = a quiet light tick. Re-arms if they pull back below.
    const COMMIT = 100;
    if (delta > COMMIT && dragState.current.crossedDir !== 'right') {
      dragState.current.crossedDir = 'right';
      tapPrimary();
    } else if (delta < -COMMIT && dragState.current.crossedDir !== 'left') {
      dragState.current.crossedDir = 'left';
      tapSelect();
    } else if (Math.abs(delta) < COMMIT && dragState.current.crossedDir) {
      dragState.current.crossedDir = null;
    }
  };

  // Snap the card back to center — used when a fling's swipe call fails, so a
  // failed swipe doesn't leave the (still-mounted, index-unchanged) card flung
  // off-screen and invisible.
  // Hand the card back to CSS. `transition: none` is live from the drag, so
  // the property has to be restored AND flushed (the offsetWidth read) before
  // the new transform lands, or the card teleports instead of flying.
  const animateTo = (transform) => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = TRANSITION;
    void el.offsetWidth; // force the reflow that arms the transition
    if (transform) {
      el.style.transform = transform;
    } else {
      paint(0);
    }
  };

  const resetCard = () => {
    setFlyDir(null);
    animateTo(null);
    dragState.current.crossedDir = null;
  };

  const handleDragEnd = () => {
    if (!isTop || !dragState.current.isDragging) return;
    dragState.current.isDragging = false;
    const delta = dragState.current.currentX;
    if (delta > 100) {
      // RIGHT — "read with": energetic, higher-spin exit + a gold trail. This
      // is the rewarded act (seeking a partner), so it gets the satisfying beat.
      setFlyDir('right');
      animateTo('translateX(165%) rotate(32deg) scale(1.03)');
      setTimeout(async () => { if ((await onSwipeRight?.()) === false) resetCard(); }, 280);
    } else if (delta < -100) {
      // LEFT — "not now": a quiet, lower-energy glide. No flourish, no penalty.
      animateTo('translateX(-135%) rotate(-16deg)');
      setTimeout(async () => { if ((await onSwipeLeft?.()) === false) resetCard(); }, 280);
    } else {
      animateTo(null);
      dragState.current.crossedDir = null;
    }
  };

  const cardStyle = isMobile ? {
    // Mobile: fit between the top bar (54px + safe-area-top) and the
    // floating tab pill (64px + 10px gap + safe-area-bottom). The card
    // keeps a margin from each edge so it visibly "floats" between the
    // top bar and the tab pill.
    position: 'fixed',
    top: 'calc(54px + env(safe-area-inset-top, 0px) + 8px)',
    bottom: 'calc(84px + env(safe-area-inset-bottom, 0px) + 6px)',
    left: 12,
    right: 12,
    zIndex: 40,
    borderRadius: 28,
    overflow: 'hidden',
    // `transform` is deliberately absent — it's owned by the drag, written
    // straight to the node. Listing it here would let a re-render (resize,
    // flyDir) snap the card back to the start of the gesture.
    transition: TRANSITION,
    cursor: isTop ? 'grab' : 'default',
    background: '#0a0a0f',
    touchAction: 'none',
    boxShadow: flyDir === 'right'
      ? '0 18px 64px rgba(212,168,95,0.7), 0 0 0 2px rgba(252,224,114,0.55)'
      : '0 16px 50px rgba(10,10,10,0.18)',
  } : {
    // Desktop card style
    position: 'relative',
    width: '100%',
    maxWidth: 360,
    height: 540,
    borderRadius: 20,
    overflow: 'hidden',
    transition: TRANSITION,
    cursor: isTop ? 'grab' : 'default',
    background: '#1A1A1A',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    touchAction: 'none',
  };

  return (
    <div
      ref={cardRef}
      style={cardStyle}
      onMouseDown={(e) => handleDragStart(e.clientX)}
      onMouseMove={(e) => handleDragMove(e.clientX)}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      onTouchStart={(e) => { e.preventDefault(); handleDragStart(e.touches[0].clientX); }}
      onTouchMove={(e) => { e.preventDefault(); handleDragMove(e.touches[0].clientX); }}
      onTouchEnd={handleDragEnd}
    >
      {/* Full-bleed headshot */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {actor?.headshot || actor?.user_image || actor?.headshotUrl ? (
          <>
            <img
              src={actor.headshot || actor.user_image || actor.headshotUrl}
              alt={cleanName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
              draggable={false}
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.parentElement.innerHTML = `<div style="width:100%;height:100%;background:linear-gradient(160deg,#1A1308 0%,#2E2415 45%,#0F0E0A 100%);display:flex;align-items:center;justify-content:center"><span style="font-size:${isMobile ? 120 : 80}px;font-weight:800;color:rgba(212,168,95,0.35);user-select:none">${initials}</span></div>`); }}
            />
            {/* Brand gradient overlay */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255, 130, 128,0.12) 0%, transparent 50%, rgba(167,236,218,0.08) 100%)', pointerEvents: 'none' }} />
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <ReaderPortrait
              reader={{ id: actor?.id, name: cleanName, color: actor?.brandColor, avatar_style: actor?.avatar_style }}
              viewWidth={400}
              viewHeight={isMobile ? 520 : 540}
              showBackground
            />
          </div>
        )}
      </div>

      {/* Gradient overlay — bottom heavy */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.08) 60%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── Free / Paid badge */}
      <div className="aurora-mono" style={{
        position: 'absolute', top: isMobile ? 60 : 16, right: 16,
        padding: '6px 14px', borderRadius: 100, zIndex: 5,
        background: actor?.is_paid_reader ? 'rgba(212,168,95,0.95)' : 'rgba(159,230,180,0.95)',
        color: '#0E0D0A',
        fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        backdropFilter: 'blur(8px)',
      }}>
        {actor?.is_paid_reader ? `$${actor.session_rate || ''}/SESSION` : 'FREE'}
      </div>

      {/* ── READ WITH stamp (swipe right) — warm gold, the rewarded act */}
      <div ref={slateRef} style={{
        position: 'absolute', top: isMobile ? 80 : 24, left: 20,
        border: '2.5px solid #FCE072', color: '#FCE072',
        fontSize: isMobile ? 21 : 17, fontWeight: 900, letterSpacing: 1.5,
        padding: '5px 14px', borderRadius: 6,
        // opacity + transform are driven by the drag, not by React.
        opacity: 0,
        transform: 'rotate(-12deg) scale(0.9)',
        pointerEvents: 'none',
        textShadow: '0 0 22px rgba(252,224,114,0.6)',
        fontFamily: '"Space Grotesk", sans-serif',
      }}>READ WITH</div>

      {/* ── NOT NOW stamp (swipe left) — neutral slate, never a red rejection */}
      <div ref={passRef} style={{
        position: 'absolute', top: isMobile ? 80 : 24, right: 20,
        border: '2.5px solid rgba(255,255,255,0.4)', color: 'rgba(255,255,255,0.7)',
        fontSize: isMobile ? 21 : 17, fontWeight: 900, letterSpacing: 1.5,
        padding: '5px 14px', borderRadius: 6,
        opacity: 0,
        transform: 'rotate(12deg)',
        pointerEvents: 'none',
        fontFamily: '"Space Grotesk", sans-serif',
      }}>NOT NOW</div>

      {/* ── Actor info — bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '0 20px 16px',
        display: 'flex', flexDirection: 'column', gap: isMobile ? 6 : 8,
      }}>
        {/* Name + Union — name is tappable to open the full profile.
            Pointer events are not blocked here so swipes still register
            on the surrounding card; the explicit stopPropagation in the
            onClick handler keeps the tap from being interpreted as a
            tiny swipe. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h3
            onClick={openProfile}
            onTouchEnd={(e) => { e.stopPropagation(); openProfile(e); }}
            style={{
              fontSize: isMobile ? 26 : 24, fontWeight: 700, color: '#fff',
              margin: 0, lineHeight: 1.1,
              cursor: actor?.id ? 'pointer' : 'default',
              textDecoration: actor?.id ? 'underline' : 'none',
              textDecorationColor: 'rgba(212,168,95,0.5)',
              textUnderlineOffset: 4,
              textDecorationThickness: 1,
            }}
            aria-label={`View ${cleanName}'s profile`}
            role={actor?.id ? 'button' : undefined}
          >
            {cleanName}
          </h3>
          {unionLabel && (
            <span className="aurora-mono" style={{
              background: 'rgba(255, 130, 128,0.25)',
              border: '1px solid rgba(255, 130, 128,0.5)',
              color: '#FF8280',
              fontSize: 9, padding: '3px 10px', borderRadius: 100,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              backdropFilter: 'blur(8px)',
            }}>{unionLabel}</span>
          )}
        </div>

        {/* Location + Years + Metrics — single compact row */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {(actor?.based_in || actor?.experience) && (
            <span style={{ color: '#aaa', fontSize: isMobile ? 12 : 14, display: 'flex', alignItems: 'center', gap: 3 }}>
              📍 {actor.based_in || actor.experience}
            </span>
          )}
          {lastSeenLabel(actor?.last_seen) && (
            <span style={{
              color: lastSeenLabel(actor?.last_seen) === 'Online now' ? '#A7ECDA' : '#ccc',
              fontSize: isMobile ? 11 : 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: lastSeenLabel(actor?.last_seen) === 'Online now' ? '#34C759' : '#999',
              }} />
              {lastSeenLabel(actor?.last_seen)}
            </span>
          )}
          {actor?.years_experience && (
            <span style={{ color: '#aaa', fontSize: isMobile ? 12 : 14 }}>
              🎬 {actor.years_experience}yr{actor.years_experience !== 1 ? 's' : ''}
            </span>
          )}
          {actor?.rating > 0 && (
            <span style={{ color: '#FCE072', fontSize: isMobile ? 12 : 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
              ⭐ {actor.rating.toFixed(1)}
              {actor.review_count > 0 && <span style={{ color: '#888', fontWeight: 400, fontSize: 11 }}>({actor.review_count})</span>}
            </span>
          )}
          {actor?.response_rate > 0 && (
            <span style={{ color: '#A7ECDA', fontSize: isMobile ? 12 : 13, fontWeight: 600 }}>
              ⚡ {actor.response_rate}%
            </span>
          )}
          {actor?.total_sessions > 0 && (
            <span style={{ color: '#aaa', fontSize: isMobile ? 12 : 13 }}>
              {actor.total_sessions} session{actor.total_sessions !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* What they're prepping RIGHT NOW — the most castable signal we
            have, straight from presence.working_on (was never rendered). */}
        {String(actor?.working_on || '').trim() && (
          <p style={{
            color: '#FCE072', fontSize: isMobile ? 12 : 13, fontWeight: 600,
            margin: 0, display: '-webkit-box', WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            🎬 Working on: <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{String(actor.working_on).trim()}</span>
          </p>
        )}

        {/* Bio — 1 line on mobile, 2 on desktop */}
        {actor?.bio && (
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? 13 : 15, lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: isMobile ? 1 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {actor.bio}
          </p>
        )}

        {/* Genres */}
        {actor?.genres?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {actor.genres.slice(0, isMobile ? 3 : 4).map((g) => (
              <span key={g} style={{ background: 'rgba(255,255,255,0.08)', color: '#ddd', fontSize: isMobile ? 10 : 12, padding: isMobile ? '3px 8px' : '5px 12px', borderRadius: 20 }}>
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Mobile action buttons */}
        {isMobile && isTop && (
          <div style={{ display: 'flex', gap: 18, justifyContent: 'center', paddingTop: 12, paddingBottom: 8, alignItems: 'center' }}>
            {/* Pass */}
            <button
              onTouchEnd={(e) => { e.stopPropagation(); tapSelect(); onSwipeLeft?.(); }}
              onClick={(e) => { e.stopPropagation(); tapSelect(); onSwipeLeft?.(); }}
              style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.22)',
                color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, cursor: 'pointer',
                backdropFilter: 'blur(20px) saturate(1.4)',
                WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
              }}
            >✕</button>

            {/* Star */}
            <button
              onTouchEnd={(e) => { e.stopPropagation(); onStar?.(); }}
              onClick={(e) => { e.stopPropagation(); onStar?.(); }}
              style={{
                width: 50, height: 50, borderRadius: '50%',
                background: 'rgba(252,224,114,0.18)',
                border: '1px solid rgba(252,224,114,0.45)',
                color: '#FCE072',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, cursor: 'pointer',
                backdropFilter: 'blur(20px) saturate(1.4)',
                WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
              }}
            >⭐</button>

            {/* Slate */}
            <button
              onTouchEnd={(e) => { e.stopPropagation(); tapPrimary(); onSwipeRight?.(); }}
              onClick={(e) => { e.stopPropagation(); tapPrimary(); onSwipeRight?.(); }}
              style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'linear-gradient(135deg, #D4A85F, #7A5A18)',
                border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, cursor: 'pointer',
                boxShadow: '0 8px 22px rgba(212,168,95,0.45)',
              }}
            >🎬</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SwipeCard;
