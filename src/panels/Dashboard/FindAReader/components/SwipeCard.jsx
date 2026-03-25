import { useRef, useState, useEffect } from 'react';
import { MapPin, Clock } from 'lucide-react';

const SwipeCard = ({ actor, onSwipeLeft, onSwipeRight, onStar, isTop }) => {
  const cardRef = useRef(null);
  const dragState = useRef({ startX: 0, isDragging: false, currentX: 0 });
  const [transform, setTransform] = useState('');
  const [slateOpacity, setSlateOpacity] = useState(0);
  const [passOpacity, setPassOpacity] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const initials = (actor?.name || 'A')
    .split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const unionLabel = {
    'sag-aftra': 'SAG-AFTRA', 'aea': 'AEA',
    'non-union': 'Non-Union', 'fi-core': 'Fi-Core',
  }[actor?.union || actor?.unionStatus] || actor?.union || actor?.unionStatus;

  const handleDragStart = (clientX) => {
    if (!isTop) return;
    dragState.current = { startX: clientX, isDragging: true, currentX: 0 };
  };

  const handleDragMove = (clientX) => {
    if (!isTop || !dragState.current.isDragging) return;
    const delta = clientX - dragState.current.startX;
    dragState.current.currentX = delta;
    const rotate = delta * 0.06;
    setTransform(`translateX(${delta}px) rotate(${rotate}deg)`);
    const threshold = 80;
    if (delta > 0) {
      setSlateOpacity(Math.min(delta / threshold, 1));
      setPassOpacity(0);
    } else {
      setPassOpacity(Math.min(-delta / threshold, 1));
      setSlateOpacity(0);
    }
  };

  const handleDragEnd = () => {
    if (!isTop || !dragState.current.isDragging) return;
    dragState.current.isDragging = false;
    const delta = dragState.current.currentX;
    if (delta > 100) {
      setTransform('translateX(150%) rotate(25deg)');
      setTimeout(() => onSwipeRight?.(), 280);
    } else if (delta < -100) {
      setTransform('translateX(-150%) rotate(-25deg)');
      setTimeout(() => onSwipeLeft?.(), 280);
    } else {
      setTransform('');
      setSlateOpacity(0);
      setPassOpacity(0);
    }
  };

  const cardStyle = isMobile ? {
    // Full screen on mobile — fills entire viewport
    position: 'fixed',
    inset: 0,
    zIndex: 40,
    borderRadius: 0,
    width: '100%',
    height: '100%',
    transform,
    transition: dragState.current.isDragging ? 'none' : 'transform 0.3s ease',
    cursor: isTop ? 'grab' : 'default',
    background: '#0a0a0f',
    touchAction: 'none',
  } : {
    // Desktop card style
    position: 'relative',
    width: '100%',
    maxWidth: 360,
    height: 540,
    borderRadius: 20,
    overflow: 'hidden',
    transform,
    transition: dragState.current.isDragging ? 'none' : 'transform 0.3s ease',
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
              alt={actor.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
              draggable={false}
            />
            {/* Brand gradient overlay */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(200,85,240,0.22) 0%, transparent 50%, rgba(167,236,218,0.15) 100%)', pointerEvents: 'none' }} />
          </>
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(160deg, #1a0a2e 0%, #0f0f1a 50%, #0a1a0a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: isMobile ? 120 : 80, fontWeight: 800, color: 'rgba(200,85,240,0.3)', userSelect: 'none' }}>
              {initials}
            </span>
          </div>
        )}
      </div>

      {/* Gradient overlay — bottom heavy */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 35%, rgba(0,0,0,0.1) 65%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── SLATE stamp (swipe right) */}
      <div style={{
        position: 'absolute', top: isMobile ? 80 : 24, left: 20,
        border: '3px solid #C855F0', color: '#C855F0',
        fontSize: isMobile ? 28 : 22, fontWeight: 900, letterSpacing: 2,
        padding: '4px 14px', borderRadius: 6,
        opacity: slateOpacity,
        transform: 'rotate(-12deg)',
        pointerEvents: 'none',
        textShadow: '0 0 20px rgba(200,85,240,0.5)',
      }}>SLATE</div>

      {/* ── PASS stamp (swipe left) */}
      <div style={{
        position: 'absolute', top: isMobile ? 80 : 24, right: 20,
        border: '3px solid #666', color: '#888',
        fontSize: isMobile ? 28 : 22, fontWeight: 900, letterSpacing: 2,
        padding: '4px 14px', borderRadius: 6,
        opacity: passOpacity,
        transform: 'rotate(12deg)',
        pointerEvents: 'none',
      }}>PASS</div>

      {/* ── Actor info — bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: isMobile ? '0 24px calc(env(safe-area-inset-bottom, 0px) + 120px)' : '0 20px 20px',
      }}>
        {/* Name + Union */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: isMobile ? 32 : 24, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.1 }}>
            {actor?.name || 'Actor'}
          </h3>
          {unionLabel && (
            <span style={{
              background: 'rgba(200,85,240,0.2)', border: '1px solid rgba(200,85,240,0.4)',
              color: '#C855F0', fontSize: 11, fontWeight: 700,
              padding: '3px 10px', borderRadius: 20,
            }}>{unionLabel}</span>
          )}
        </div>

        {/* Location + Years */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
          {(actor?.based_in || actor?.experience) && (
            <span style={{ color: '#aaa', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
              📍 {actor.based_in || actor.experience}
            </span>
          )}
          {actor?.years_experience && (
            <span style={{ color: '#aaa', fontSize: 14 }}>
              🎬 {actor.years_experience}yr{actor.years_experience !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Bio */}
        {actor?.bio && (
          <p style={{ color: '#ccc', fontSize: 14, lineHeight: 1.5, margin: '0 0 10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {actor.bio}
          </p>
        )}

        {/* Genres */}
        {actor?.genres?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {actor.genres.slice(0, 4).map((g) => (
              <span key={g} style={{ background: 'rgba(255,255,255,0.1)', color: '#ddd', fontSize: 12, padding: '3px 10px', borderRadius: 20 }}>
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Mobile action buttons overlaid at bottom */}
        {isMobile && isTop && (
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 20 }}>
            {/* Pass */}
            <button
              onTouchEnd={(e) => { e.stopPropagation(); onSwipeLeft?.(); }}
              onClick={(e) => { e.stopPropagation(); onSwipeLeft?.(); }}
              style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'rgba(30,30,30,0.9)', border: '2px solid #444',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, cursor: 'pointer', backdropFilter: 'blur(10px)',
              }}
            >✕</button>

            {/* Star */}
            <button
              onTouchEnd={(e) => { e.stopPropagation(); onStar?.(); }}
              onClick={(e) => { e.stopPropagation(); onStar?.(); }}
              style={{
                width: 50, height: 50, borderRadius: '50%',
                background: 'rgba(30,30,30,0.9)', border: '2px solid rgba(252,224,114,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, cursor: 'pointer', backdropFilter: 'blur(10px)',
              }}
            >⭐</button>

            {/* Slate */}
            <button
              onTouchEnd={(e) => { e.stopPropagation(); onSwipeRight?.(); }}
              onClick={(e) => { e.stopPropagation(); onSwipeRight?.(); }}
              style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'linear-gradient(135deg, #C855F0, #A040C8)',
                border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(200,85,240,0.4)',
              }}
            >🎬</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SwipeCard;
