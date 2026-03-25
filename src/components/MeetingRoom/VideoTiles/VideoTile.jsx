// components/MeetingRoom/video-tiles/VideoTile.jsx
import React, { memo } from 'react';
import { CircularProgress } from '@mui/material';

/**
 * Base Video Tile Component - Foundation for all video tiles
 * Provides common layout, loading states, and interaction handling
 *
 * @param {Object} props
 * @param {React.Ref} props.videoRef - Reference to video element
 * @param {MediaStream} props.stream - Media stream to display
 * @param {string} props.label - Display label for the tile
 * @param {boolean} props.isPinned - Whether tile is currently pinned/focused
 * @param {boolean} props.isLoading - Show loading state
 * @param {boolean} props.showAvatar - Show avatar instead of video
 * @param {ReactNode} props.avatarContent - Custom avatar component
 * @param {number} props.audioLevel - Audio level for visual feedback (0-1)
 * @param {string} props.variant - Size variant: 'default' | 'compact' | 'preview'
 * @param {string} props.role - User role: 'host' | 'participant'
 * @param {Function} props.onTileSelect - Callback when tile is clicked for pinning
 * @param {ReactNode} props.children - Additional content to render in tile
 * @param {string} props.className - Additional CSS classes
 */
const VideoTile = ({
  videoRef,
  stream,
  label,
  isPinned = false,
  isLoading = false,
  showAvatar = false,
  avatarContent,
  audioLevel = 0,
  variant = 'default',
  role,
  onTileSelect,
  children,
  className = '',
}) => {
  // Determine size classes based on variant
  const isCompact = variant === 'compact';
  const containerClasses = getContainerClasses(
    isCompact,
    isPinned,
    onTileSelect,
    className
  );
  const labelClasses = getLabelClasses(isCompact);

  /**
   * Handle click event for tile selection/pinning
   */
  const handleTileClick = () => {
    if (onTileSelect && typeof onTileSelect === 'function') {
      onTileSelect();
    }
  };

  /**
   * Handle keyboard events for accessibility
   */
  const handleKeyDown = (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && onTileSelect) {
      event.preventDefault();
      onTileSelect();
    }
  };

  // Props for interactive tiles
  const interactiveProps = onTileSelect
    ? {
        onClick: handleTileClick,
        onKeyDown: handleKeyDown,
        role: 'button',
        tabIndex: 0,
        'aria-pressed': isPinned,
        'aria-label': `Focus on ${label}'s video`,
      }
    : {};

  return (
    <div className={containerClasses} {...interactiveProps}>
      {/* Video Element - Shows actual media stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={variant !== 'remote'} // Remote video should not be muted
        className={`w-full h-full object-cover transition-opacity duration-150 ${
          showAvatar ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Loading State - Shows spinner when connecting */}
      {isLoading && (
        <div
          className='absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70 bg-black/60'
          aria-live='polite'
        >
          <CircularProgress size={32} />
          <p>Connecting...</p>
        </div>
      )}

      {/* Avatar Overlay - Shows when video is unavailable */}
      {showAvatar && avatarContent}

      {/* Pinned Badge - Indicates focused tile */}
      {isPinned && (
        <div
          className='absolute top-4 right-4 bg-sky-500/90 text-black px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide shadow'
          aria-label='This video is pinned'
        >
          Pinned
        </div>
      )}

      {/* Host Badge - Shows for meeting host */}
      {role === 'host' && (
        <div
          className='absolute top-4 right-4 bg-amber-500/80 text-black px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide'
          aria-label='Meeting host'
        >
          Host
        </div>
      )}

      {/* User Label - Shows name at bottom of tile */}
      {label && <div className={labelClasses}>{label}</div>}

      {/* Custom Content - For additional controls/overlays */}
      {children}
    </div>
  );
};

/**
 * Get CSS classes for the tile container based on state
 */
const getContainerClasses = (isCompact, isPinned, isInteractive, className) => {
  const baseClasses = `
    relative bg-black rounded-2xl overflow-hidden shadow-xl 
    flex items-center justify-center
  `;

  const sizeClasses = isCompact
    ? 'aspect-video w-[40vw] min-w-[140px] max-w-[280px]'
    : '';

  const interactiveClasses = isInteractive
    ? 'cursor-pointer hover:scale-[1.01] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70'
    : '';

  const pinnedClasses = isPinned ? 'ring-2 ring-sky-400/70' : '';

  return `${baseClasses} ${sizeClasses} ${interactiveClasses} ${pinnedClasses} ${className}`.trim();
};

/**
 * Get CSS classes for the label based on tile size
 */
const getLabelClasses = (isCompact) => {
  return isCompact
    ? 'absolute bottom-3 left-3 bg-white/15 backdrop-blur px-3 py-1 rounded-full text-xs font-medium tracking-tight'
    : 'absolute top-4 left-4 bg-white/10 rounded-full px-4 py-1 text-sm';
};

// Memoize to prevent unnecessary re-renders that could interrupt WebRTC
const MemoizedVideoTile = memo(VideoTile, (prevProps, nextProps) => {
  // Only re-render if these critical props change
  return (
    prevProps.stream === nextProps.stream &&
    prevProps.label === nextProps.label &&
    prevProps.isPinned === nextProps.isPinned &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.showAvatar === nextProps.showAvatar &&
    prevProps.audioLevel === nextProps.audioLevel &&
    prevProps.variant === nextProps.variant &&
    prevProps.role === nextProps.role &&
    prevProps.videoRef === nextProps.videoRef
  );
});

MemoizedVideoTile.displayName = 'VideoTile';

export default MemoizedVideoTile;
