// src/components/VideoTiles/ScreenShareTile.jsx
// ---------------------------------------------------------------
// Tile that shows the shared screen with control buttons.
// ---------------------------------------------------------------

import { memo } from 'react';
import { Tooltip, IconButton, CircularProgress } from '@mui/material';
import {
  SwapHoriz,
  PictureInPictureAlt,
  CloseFullscreen,
  Fullscreen,
  FullscreenExit,
  StopScreenShare,
} from '@mui/icons-material';

const ScreenShareTile = memo(({
  className = '',
  hideLayoutToggle = false,
  isFloating = false,
  isPinned = false,
  onSelect,
  handleScreenVideoRef,
  screenStreamRef,
  isScreenShareCollapsed,
  isScreenShareFullscreen,
  setIsScreenShareCollapsed,
  setIsScreenShareFullscreen,
  stopScreenShare,
  isRemote = false,
  remoteDisplayName = '',
}) => (
  <div
    className={`
      ${className}
      ${isFloating ? 'bg-black/80 backdrop-blur-md border border-white/15' : 'bg-black'}
      rounded-2xl overflow-hidden shadow-xl flex items-center justify-center
      ${!isFloating ? 'w-full h-full' : ''}
      ${onSelect ? 'cursor-pointer hover:scale-[1.01] transition-transform' : ''}
      ${isPinned ? 'ring-2 ring-sky-400/70' : ''}
    `}
    style={{ borderRadius: '1rem' }}
    onClick={onSelect}
    role={onSelect ? 'button' : undefined}
    tabIndex={onSelect ? 0 : undefined}
  >
    <video
      ref={handleScreenVideoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-cover"
      style={{ borderRadius: '1rem' }}
    />
    {(!screenStreamRef?.current || !screenStreamRef.current.getVideoTracks()?.length) && (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white/70 rounded-2xl" style={{ borderRadius: '1rem' }}>
        <CircularProgress size={32} />
        <p className="px-4 text-center text-sm">{isRemote ? 'Waiting for screen share…' : 'Preparing screen share…'}</p>
      </div>
    )}
    <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium text-white border border-white/20">
      {isRemote ? `${remoteDisplayName || 'Someone'} is sharing their screen` : "You're sharing your screen"}
    </div>
    <div className="absolute top-4 right-4 flex gap-2">
      {/* Show layout toggle for both local and remote */}
      {!hideLayoutToggle && (
        <Tooltip title={isPinned ? 'Unpin' : 'Pin to main screen'}>
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.();
            }}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
              }
            }}
          >
            <SwapHoriz fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {/* Show pop out for both local and remote */}
      <Tooltip title={isScreenShareCollapsed ? 'Return to layout' : 'Pop out'}>
        <IconButton 
          size="small" 
          onClick={(e) => {
            e.stopPropagation();
            setIsScreenShareCollapsed((v) => !v);
          }}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(8px)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
            }
          }}
        >
          {isScreenShareCollapsed ? <CloseFullscreen fontSize="small" /> : <PictureInPictureAlt fontSize="small" />}
        </IconButton>
      </Tooltip>
      {/* Show fullscreen for both local and remote */}
      <Tooltip title={isScreenShareFullscreen ? 'Exit full screen' : 'Full screen'}>
        <IconButton 
          size="small" 
          onClick={(e) => {
            e.stopPropagation();
            setIsScreenShareFullscreen((v) => !v);
          }}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(8px)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
            }
          }}
        >
          {isScreenShareFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
        </IconButton>
      </Tooltip>
      {/* Only show stop sharing for local user */}
      {!isRemote && stopScreenShare && (
        <Tooltip title="Stop sharing">
          <IconButton 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              stopScreenShare();
            }}
            sx={{
              backgroundColor: 'rgba(239, 68, 68, 0.8)',
              backdropFilter: 'blur(8px)',
              color: 'white',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              '&:hover': {
                backgroundColor: 'rgba(239, 68, 68, 0.9)',
              }
            }}
          >
            <StopScreenShare fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </div>
    {isPinned && (
      <div className="absolute bottom-4 left-4 bg-sky-500/90 text-black px-3 py-1 rounded-full text-xs font-semibold uppercase">
        Pinned
      </div>
    )}
  </div>
), (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  // Only re-render if these specific props change
  return (
    prevProps.screenStreamRef?.current === nextProps.screenStreamRef?.current &&
    prevProps.isScreenShareCollapsed === nextProps.isScreenShareCollapsed &&
    prevProps.isScreenShareFullscreen === nextProps.isScreenShareFullscreen &&
    prevProps.isPinned === nextProps.isPinned &&
    prevProps.isRemote === nextProps.isRemote &&
    prevProps.remoteDisplayName === nextProps.remoteDisplayName &&
    prevProps.className === nextProps.className
  );
});

ScreenShareTile.displayName = 'ScreenShareTile';

export { ScreenShareTile };