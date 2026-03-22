import { useRef, useState } from 'react';
import GenreTags from './GenreTags';
import UnionBadge from './UnionBadge';
import AvailabilityStatus from './AvailabilityStatus';

const SwipeCard = ({ actor, onSwipeLeft, onSwipeRight, onStar, isTop }) => {
  const cardRef = useRef(null);
  const dragState = useRef({ startX: 0, startY: 0, isDragging: false, currentX: 0 });
  const [transform, setTransform] = useState('');
  const [likeOpacity, setLikeOpacity] = useState(0);
  const [passOpacity, setPassOpacity] = useState(0);

  const initials = (actor?.name || 'A')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleDragStart = (clientX) => {
    if (!isTop) return;
    dragState.current = { startX: clientX, isDragging: true, currentX: 0 };
  };

  const handleDragMove = (clientX) => {
    if (!isTop || !dragState.current.isDragging) return;
    const delta = clientX - dragState.current.startX;
    dragState.current.currentX = delta;
    const rotate = delta * 0.08;
    setTransform(`translateX(${delta}px) rotate(${rotate}deg)`);
    const threshold = 80;
    if (delta > 0) {
      setLikeOpacity(Math.min(delta / threshold, 1));
      setPassOpacity(0);
    } else {
      setPassOpacity(Math.min(-delta / threshold, 1));
      setLikeOpacity(0);
    }
  };

  const handleDragEnd = () => {
    if (!isTop || !dragState.current.isDragging) return;
    dragState.current.isDragging = false;
    const delta = dragState.current.currentX;
    if (delta > 100) {
      setTransform('translateX(150%) rotate(30deg)');
      setTimeout(() => onSwipeRight?.(), 300);
    } else if (delta < -100) {
      setTransform('translateX(-150%) rotate(-30deg)');
      setTimeout(() => onSwipeLeft?.(), 300);
    } else {
      setTransform('');
      setLikeOpacity(0);
      setPassOpacity(0);
    }
  };

  return (
    <div
      ref={cardRef}
      className="relative w-full max-w-[340px] rounded-2xl overflow-hidden shadow-2xl select-none"
      style={{
        height: '520px',
        transform,
        transition: dragState.current.isDragging ? 'none' : 'transform 0.3s ease',
        cursor: isTop ? 'grab' : 'default',
        background: '#1C1C2E',
      }}
      onMouseDown={(e) => handleDragStart(e.clientX)}
      onMouseMove={(e) => handleDragMove(e.clientX)}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
      onTouchEnd={handleDragEnd}
    >
      {/* Headshot area */}
      <div className="absolute inset-0">
        {actor?.headshotUrl ? (
          <img src={actor.headshotUrl} alt={actor.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <span className="text-7xl font-bold text-gray-600">{initials}</span>
          </div>
        )}
      </div>

      {/* Bottom gradient overlay */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: '60%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)',
        }}
      />

      {/* LIKE stamp */}
      <div
        className="absolute top-8 left-6 border-2 border-[#FF8280] text-[#FF8280] text-2xl font-black uppercase px-3 py-1 rounded pointer-events-none"
        style={{ opacity: likeOpacity, transform: 'rotate(-15deg)' }}
      >
        SCENE IT
      </div>

      {/* PASS stamp */}
      <div
        className="absolute top-8 right-6 border-2 border-gray-400 text-gray-400 text-2xl font-black uppercase px-3 py-1 rounded pointer-events-none"
        style={{ opacity: passOpacity, transform: 'rotate(15deg)' }}
      >
        PASS
      </div>

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        {/* Name + experience */}
        <div className="flex items-end justify-between mb-1">
          <h3 className="text-2xl font-bold text-white leading-tight">
            {actor?.name || 'Actor'}
          </h3>
          {actor?.unionStatus && <UnionBadge union={actor.unionStatus} />}
        </div>

        <div className="flex items-center gap-2 mb-2">
          <AvailabilityStatus online={actor?.isAvailable} />
          {actor?.experience && (
            <>
              <span className="text-gray-500 text-xs">·</span>
              <span className="text-gray-300 text-sm">{actor.experience}</span>
            </>
          )}
        </div>

        {actor?.bio && (
          <p className="text-gray-300 text-sm leading-relaxed mb-3 line-clamp-2">
            {actor.bio}
          </p>
        )}

        {actor?.genres?.length > 0 && <GenreTags genres={actor.genres} />}
      </div>
    </div>
  );
};

export default SwipeCard;
