// src/components/VideoTiles/RemoteVideoTile.jsx
// ---------------------------------------------------------------
// Remote participant tile (video or avatar)
// ---------------------------------------------------------------

import { useMemo, useRef, useEffect, memo } from 'react';
import { CircularProgress } from '@mui/material';
import { MicOff } from '@mui/icons-material';

const RemoteVideoTile = memo(({
  variant = 'default',
  onSelect,
  isPinned = false,
  containerClassName = '',
  handleRemoteVideoRef,
  remoteStreamRef,
  isRemoteCameraOff,
  isRemoteMuted = false,
  remoteAudioLevel,
  remoteLabel,
  remoteRole,
  getInitials,
  waitingMessage,
  remoteConnected,
  remoteStreamVersion,
}) => {
  const isCompact = variant === 'compact';
  
  // Track if we've ever been connected - once connected, don't show loading again
  const hasEverBeenConnectedRef = useRef(false);
  
  useEffect(() => {
    // Once we have a stream or connection, mark as ever connected
    // Only update when we actually get a connection, not on every stream version change
    if ((remoteStreamRef?.current || remoteConnected) && !hasEverBeenConnectedRef.current) {
      hasEverBeenConnectedRef.current = true;
    }
  }, [remoteStreamRef, remoteConnected]);
  
  // Make showAvatar reactive to isRemoteCameraOff and stream state
  // Don't depend on remoteStreamVersion to prevent flickering during mute/camera toggles
  const showAvatar = useMemo(() => {
    if (isRemoteCameraOff) return true;
    if (!remoteStreamRef?.current) return true;
    const videoTracks = remoteStreamRef.current.getVideoTracks();
    if (!videoTracks || videoTracks.length === 0) return true;
    const hasEnabledTrack = videoTracks.some((t) => t.enabled && !t.muted);
    return !hasEnabledTrack;
  }, [isRemoteCameraOff, remoteStreamRef, remoteStreamVersion]);

  // Check if we have a stream - if stream exists, we're connected (even if tracks are disabled)
  // This prevents loading state from showing when camera/mic is toggled
  const hasStream = !!remoteStreamRef?.current;
  const isActuallyConnected = hasStream || remoteConnected || hasEverBeenConnectedRef.current;
  const initials = getInitials(remoteLabel);
  const intensity = Math.min(1, (remoteAudioLevel || 0) * 3);
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
        ref={handleRemoteVideoRef}
        autoPlay
        playsInline
        className={`w-full h-full object-cover transition-opacity ${showAvatar ? 'opacity-0' : 'opacity-100'}`}
        style={{ borderRadius: '1rem' }}
      />
      {showAvatar && isActuallyConnected && (
        <div
          className="absolute inset-0 flex items-center justify-center p-2"
          style={{ transform: `scale(${scale})` }}
        >
          <div className={`relative flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500/80 via-indigo-500/70 to-fuchsia-500/80 text-white font-semibold ${
            isCompact 
              ? 'w-24 h-24 text-3xl' 
              : 'w-40 h-40 md:w-48 md:h-48 text-5xl md:text-6xl'
          }`}>
            {initials}
          </div>
        </div>
      )}
      {/* Only show loading if we truly have no stream at all */}
      {/* Don't show loading when camera/mic is toggled - stream still exists, just tracks disabled */}
      {!isActuallyConnected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white/70 rounded-2xl" style={{ borderRadius: '1rem' }}>
          <CircularProgress size={24} />
          <p className="text-xs md:text-sm px-4 text-center">{waitingMessage}</p>
        </div>
      )}
      {remoteLabel && (
        <div className={`absolute ${isCompact ? 'bottom-3 left-3' : 'top-4 left-4'} bg-white/10 rounded-full px-4 py-1 text-sm`}>
          {remoteLabel}
        </div>
      )}
      {remoteRole === 'host' && (
        <div className={`absolute ${isCompact ? 'top-3 right-3' : 'top-4 right-4'} bg-amber-500/80 text-black px-3 py-1 rounded-full text-xs font-semibold uppercase`}>
          Host
        </div>
      )}
      {/* Mute icon indicator - smooth CSS transition, no re-renders */}
      <div 
        className={`absolute ${isCompact ? 'bottom-3 right-3' : 'bottom-4 right-4'} bg-red-500/90 rounded-full p-2 flex items-center justify-center transition-opacity duration-150 ease-in-out ${
          isRemoteMuted ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ 
          transform: isRemoteMuted ? 'scale(1)' : 'scale(0.8)',
          transition: 'opacity 150ms ease-in-out, transform 150ms ease-in-out'
        }}
      >
        <MicOff sx={{ fontSize: isCompact ? 16 : 20, color: 'white' }} />
      </div>
      {isPinned && (
        <div className={`absolute ${isCompact ? 'bottom-3 left-3' : 'bottom-4 left-4'} bg-sky-500/90 text-black px-3 py-1 rounded-full text-xs font-semibold uppercase`}>
          Pinned
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  // Only re-render if these specific props change
  return (
    prevProps.isRemoteMuted === nextProps.isRemoteMuted &&
    prevProps.isRemoteCameraOff === nextProps.isRemoteCameraOff &&
    prevProps.remoteConnected === nextProps.remoteConnected &&
    prevProps.remoteStreamVersion === nextProps.remoteStreamVersion &&
    prevProps.remoteLabel === nextProps.remoteLabel &&
    prevProps.remoteRole === nextProps.remoteRole &&
    prevProps.isPinned === nextProps.isPinned &&
    prevProps.variant === nextProps.variant &&
    prevProps.remoteStreamRef?.current === nextProps.remoteStreamRef?.current
  );
});

RemoteVideoTile.displayName = 'RemoteVideoTile';

export { RemoteVideoTile };