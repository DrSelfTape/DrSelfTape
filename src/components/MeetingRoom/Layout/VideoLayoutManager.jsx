// src/components/Layout/VideoLayoutManager.jsx
// ---------------------------------------------------------------
// Renders the video grid / pinned layout.
// Supports screen share, multiple remote participants and avatars.
// ---------------------------------------------------------------

import { useCallback, useMemo, useEffect } from 'react';
import { LocalVideoTile } from '../VideoTiles/LocalVedioTile';
import { RemoteVideoTile } from '../VideoTiles/RemoteVideoTile';
import { ScreenShareTile } from '../VideoTiles/ScreenShareTile';

const VideoLayoutManager = ({
  participants,               // array of {id, stream, name, role, audioLevel}
  localStreamRef,
  remoteStreamRef,
  screenStreamRef,
  isScreenSharing,
  isRemoteScreenSharing = false,
  isScreenShareCollapsed,
  isScreenShareFullscreen,
  setIsScreenShareCollapsed,
  setIsScreenShareFullscreen,
  remoteConnected,
  localStreamVersion,
  remoteStreamVersion,
  pinnedTile,
  setPinnedTile,
  isCameraOff,
  isRemoteCameraOff,
  isMuted,
  isRemoteMuted,
  localAudioLevel,
  remoteAudioLevel,
  localLabel,
  remoteDisplayName,
  remoteRole,
  getInitials,
  handleLocalVideoRef,
  handleRemoteVideoRef,
  handleScreenVideoRef,
  stopScreenShare,
  waitingMessage,
}) => {
  // -----------------------------------------------------------------
  // Helper: decide which tile is primary (pinned) and build layout
  // -----------------------------------------------------------------
  const effectivePinned = useMemo(() => {
    const hasScreenShare = isScreenSharing || isRemoteScreenSharing;
    if (pinnedTile === 'screen' && (!hasScreenShare || isScreenShareCollapsed)) return null;
    if (pinnedTile === 'remote' && !remoteConnected) return null;
    if (pinnedTile === 'local' && !localStreamRef.current) return null;
    return pinnedTile;
  }, [pinnedTile, isScreenSharing, isRemoteScreenSharing, isScreenShareCollapsed, remoteConnected, localStreamRef]);
  
  // Debug log for screen share state (only log when state changes)
  useEffect(() => {
    const hasScreenShare = isScreenSharing || isRemoteScreenSharing;
    const remoteStream = remoteStreamRef?.current;
    const screenStream = screenStreamRef?.current;
    console.log('📺 VideoLayoutManager - Screen share state:', {
      isScreenSharing,
      isRemoteScreenSharing,
      hasScreenShare,
      willRenderScreenTile: hasScreenShare && !isScreenShareCollapsed,
      remoteStreamRef: remoteStream ? 'has stream' : 'no stream',
      screenStreamRef: screenStream ? 'has stream' : 'no stream',
      remoteStreamTracks: remoteStream?.getVideoTracks()?.length || 0,
      screenStreamTracks: screenStream?.getVideoTracks()?.length || 0,
      effectivePinned
    });
  }, [isScreenSharing, isRemoteScreenSharing, isScreenShareCollapsed, remoteStreamRef, screenStreamRef, effectivePinned]);

  const handleTileSelect = useCallback(
    (type) => {
      setPinnedTile((cur) => (cur === type ? null : type));
    },
    [setPinnedTile]
  );

  // -----------------------------------------------------------------
  // Render a single tile (local / remote / screen)
  // -----------------------------------------------------------------
  const renderTile = (type, opts = {}) => {
    const common = {
      onSelect: () => handleTileSelect(type),
      isPinned: effectivePinned === type,
    };
    switch (type) {
      case 'local':
        return (
          <LocalVideoTile
            {...common}
            {...opts}
            handleLocalVideoRef={handleLocalVideoRef}
            localStreamRef={localStreamRef}
            isCameraOff={isCameraOff}
            isMuted={isMuted}
            localAudioLevel={localAudioLevel}
            localLabel={localLabel}
            getInitials={getInitials}
            localStreamVersion={localStreamVersion}
          />
        );
      case 'remote':
        return (
          <RemoteVideoTile
            {...common}
            {...opts}
            handleRemoteVideoRef={handleRemoteVideoRef}
            remoteStreamRef={remoteStreamRef}
            isRemoteCameraOff={isRemoteCameraOff}
            isRemoteMuted={isRemoteMuted}
            remoteAudioLevel={remoteAudioLevel}
            remoteLabel={remoteDisplayName}
            remoteRole={remoteRole}
            getInitials={getInitials}
            waitingMessage={waitingMessage}
            remoteConnected={remoteConnected}
            remoteStreamVersion={remoteStreamVersion}
          />
        );
      case 'screen':
        // Use remoteStreamRef if it's remote screen sharing, otherwise use screenStreamRef
        const screenStream = isRemoteScreenSharing ? remoteStreamRef : screenStreamRef;
        console.log('🎬 Rendering screen share tile:', {
          isRemoteScreenSharing,
          hasScreenStream: !!screenStream?.current,
          screenStreamTracks: screenStream?.current?.getVideoTracks()?.length || 0
        });
        // Map containerClassName to className for ScreenShareTile
        const { containerClassName, ...restOpts } = opts;
        return (
          <ScreenShareTile
            {...common}
            {...restOpts}
            className={containerClassName || opts.className || ''}
            handleScreenVideoRef={isRemoteScreenSharing ? handleRemoteVideoRef : handleScreenVideoRef}
            screenStreamRef={screenStream}
            isScreenShareCollapsed={isScreenShareCollapsed}
            setIsScreenShareCollapsed={setIsScreenShareCollapsed}
            isScreenShareFullscreen={isScreenShareFullscreen}
            setIsScreenShareFullscreen={setIsScreenShareFullscreen}
            stopScreenShare={isRemoteScreenSharing ? null : stopScreenShare}
            isRemote={isRemoteScreenSharing}
            remoteDisplayName={remoteDisplayName}
          />
        );
      default:
        return null;
    }
  };

  // -----------------------------------------------------------------
  // Primary layout logic (same as original)
  // -----------------------------------------------------------------
  const primaryContent = (() => {
    const hasScreenShare = isScreenSharing || isRemoteScreenSharing;
    if (hasScreenShare && !isScreenShareCollapsed) {
      if (effectivePinned === 'screen') {
        return (
          <div className="relative flex-1 h-[calc(100vh-120px)] min-h-[360px] w-full">
            {renderTile('screen', { containerClassName: 'absolute inset-0 w-full h-full' })}
            <div className="absolute bottom-[10px] left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-[10px] px-4">
              {/* When remote is sharing, show remote video separately */}
              {isRemoteScreenSharing ? (
                <>
                  {renderTile('remote', { variant: 'compact' })}
                  {renderTile('local', { variant: 'compact' })}
                </>
              ) : (
                <>
                  {renderTile('remote', { variant: 'compact' })}
                  {renderTile('local', { variant: 'compact' })}
                </>
              )}
            </div>
          </div>
        );
      }
      // side-by-side screen + participants
      // When remote is sharing, show screen share separately from remote video
      const primary = effectivePinned ?? 'screen';
      const others = isRemoteScreenSharing 
        ? ['remote', 'local'].filter((t) => t !== primary) // Don't include 'screen' in others when remote sharing
        : ['screen', 'remote', 'local'].filter((t) => t !== primary);
      
      return (
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-[10px] flex-1 h-[calc(100vh-120px)] min-h-[360px]">
          <div className="relative w-full h-full">
            {renderTile(primary, { containerClassName: 'w-full h-full' })}
          </div>
          <div className="flex flex-col gap-[10px] h-full">
            {others.map((t) => (
              <div key={t} className="flex-1 min-h-0 w-full">{renderTile(t, { containerClassName: 'w-full h-full' })}</div>
            ))}
            {/* When remote is sharing, show screen share as separate tile */}
            {isRemoteScreenSharing && primary !== 'screen' && (
              <div className="flex-1 min-h-0 w-full">{renderTile('screen', { containerClassName: 'w-full h-full' })}</div>
            )}
          </div>
        </div>
      );
    }

    // Screen share is collapsed - show it as a floating window
    if (hasScreenShare && isScreenShareCollapsed) {
      return (
        <div className="relative flex-1 h-[calc(100vh-120px)] min-h-[360px]">
          {/* Main content - pinned participant or simple 2-tile */}
          {effectivePinned ? (
            <>
              <div className="absolute inset-0 w-full h-full">
                {renderTile(effectivePinned, { containerClassName: 'w-full h-full' })}
              </div>
              <div className="absolute bottom-[10px] right-[10px] flex gap-[10px]">
                {renderTile(effectivePinned === 'remote' ? 'local' : 'remote', { variant: 'compact' })}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px] h-full w-full">
              <div className="w-full h-full">{renderTile('local', { containerClassName: 'w-full h-full' })}</div>
              <div className="w-full h-full">{renderTile('remote', { containerClassName: 'w-full h-full' })}</div>
            </div>
          )}
          
          {/* Floating screen share window */}
          <div className="absolute bottom-[10px] right-[10px] w-[320px] h-[180px] z-50 shadow-2xl rounded-lg overflow-hidden">
            {renderTile('screen', { 
              containerClassName: 'w-full h-full',
              isFloating: true 
            })}
          </div>
        </div>
      );
    }

    // No screen share – pinned participant or simple 2-tile
    if (effectivePinned) {
      const secondary = effectivePinned === 'remote' ? 'local' : 'remote';
      return (
        <div className="relative flex-1 h-[calc(100vh-120px)] min-h-[360px] w-full">
          <div className="absolute inset-0 w-full h-full">
            {renderTile(effectivePinned, { containerClassName: 'w-full h-full' })}
          </div>
          <div className="absolute bottom-[10px] right-[10px] flex gap-[10px]">
            {renderTile(secondary, { variant: 'compact' })}
          </div>
        </div>
      );
    }

    // Default 2-tile grid
    return (
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-[10px] flex-1 w-full"
           style={{ height: 'calc(100vh - 120px)', minHeight: '360px' }}>
        <div className="flex-1 min-h-0 w-full">{renderTile('local', { containerClassName: 'w-full h-full' })}</div>
        <div className="flex-1 min-h-0 w-full">{renderTile('remote', { containerClassName: 'w-full h-full' })}</div>
      </div>
    );
  })();

  return <div className="flex-1 flex flex-col p-[10px] min-h-0">{primaryContent}</div>;
};

export { VideoLayoutManager };