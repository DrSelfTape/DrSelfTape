// src/components/VideoTiles/LocalVideoTile.jsx
// ---------------------------------------------------------------
// Self-view tile (camera or avatar + audio ring)
// ---------------------------------------------------------------

import { useMemo, memo } from 'react';
import { MicOff } from '@mui/icons-material';

const LocalVideoTile = memo(({
  variant = 'default',
  onSelect,
  isPinned = false,
  containerClassName = '',
  handleLocalVideoRef,
  localStreamRef,
  isCameraOff,
  isMuted = false,
  localAudioLevel,
  localLabel,
  getInitials,
  localStreamVersion,
}) => {
  const isCompact = variant === 'compact';
  
  // Make showAvatar reactive to isCameraOff and stream state
  const showAvatar = useMemo(() => {
    if (isCameraOff) return true;
    if (!localStreamRef?.current) return true;
    const videoTracks = localStreamRef.current.getVideoTracks();
    if (!videoTracks || videoTracks.length === 0) return true;
    const hasEnabledTrack = videoTracks.some((t) => t.enabled && !t.muted);
    return !hasEnabledTrack;
  }, [isCameraOff, localStreamRef, localStreamVersion]);
  
  const initials = getInitials(localLabel);
  const intensity = Math.min(1, (localAudioLevel || 0) * 3);
  const scale = 1 + intensity * 0.1;

  return (
    <div
      className={`
        relative bg-black rounded-2xl overflow-hidden shadow-xl flex items-center justify-center
        ${isCompact ? 'aspect-video min-w-[220px] max-w-[320px]' : 'w-full h-full'}
        ${containerClassName}
        ${onSelect ? 'cursor-pointer hover:scale-[1.01] transition-transform' : ''}
        ${isPinned ? 'ring-2 ring-sky-400/70' : ''}
      `}
      style={{ borderRadius: '1rem' }}
      onClick={onSelect}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <video
        ref={handleLocalVideoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-opacity ${showAvatar ? 'opacity-0' : 'opacity-100'}`}
        style={{ borderRadius: '1rem' }}
      />
      {showAvatar && (
        <div
          className="absolute inset-0 flex items-center justify-center p-2"
          style={{ transform: `scale(${scale})` }}
        >
          <div className={`relative flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500/80 via-sky-500/70 to-cyan-500/80 text-white font-semibold ${
            isCompact 
              ? 'w-24 h-24 text-3xl' 
              : 'w-40 h-40 md:w-48 md:h-48 text-5xl md:text-6xl'
          }`}>
            {initials}
          </div>
        </div>
      )}
      <div className={`absolute ${isCompact ? 'bottom-3 left-3' : 'top-4 left-4'} bg-white/10 rounded-full px-4 py-1 text-sm`}>
        {localLabel}
      </div>
      {/* Mute icon indicator - smooth CSS transition, no re-renders */}
      <div 
        className={`absolute ${isCompact ? 'bottom-3 right-3' : 'bottom-4 right-4'} bg-red-500/90 rounded-full p-2 flex items-center justify-center transition-opacity duration-150 ease-in-out ${
          isMuted ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ 
          transform: isMuted ? 'scale(1)' : 'scale(0.8)',
          transition: 'opacity 150ms ease-in-out, transform 150ms ease-in-out'
        }}
      >
        <MicOff sx={{ fontSize: isCompact ? 16 : 20, color: 'white' }} />
      </div>
      {isPinned && (
        <div className="absolute top-4 right-4 bg-sky-500/90 text-black px-3 py-1 rounded-full text-xs font-semibold uppercase">
          Pinned
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  // Only re-render if these specific props change
  return (
    prevProps.isMuted === nextProps.isMuted &&
    prevProps.isCameraOff === nextProps.isCameraOff &&
    prevProps.localStreamVersion === nextProps.localStreamVersion &&
    prevProps.localLabel === nextProps.localLabel &&
    prevProps.isPinned === nextProps.isPinned &&
    prevProps.variant === nextProps.variant &&
    prevProps.localStreamRef?.current === nextProps.localStreamRef?.current
  );
});

LocalVideoTile.displayName = 'LocalVideoTile';

export { LocalVideoTile };