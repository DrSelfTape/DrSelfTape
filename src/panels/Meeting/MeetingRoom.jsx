import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ContentCopy, CallEnd } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';

import { VideoLayoutManager } from '../../components/MeetingRoom/Layout/VideoLayoutManager';
import { MeetingControls } from '../../components/MeetingRoom/Controls/MeetingControls';
import { LeaveMeetingModal } from '../../components/MeetingRoom/Controls/LeaveMeetingModal';

import { useAudioAnalyser } from '../../components/MeetingRoom/Hooks/useAudioAnalyser';
import { useLocalStream } from '../../components/MeetingRoom/Hooks/useLocalStream';
import { useMediaDevices } from '../../components/MeetingRoom/Hooks/useMediaDevices';
import { usePeerConnection } from '../../components/MeetingRoom/Hooks/usePeerConnection';

import { isMeetingHost, meetingUrlForId } from '../../utils/meeting';
import { PreJoinScreen } from '../../components/MeetingRoom/PreJoin/PreJoinScreen';

const Meeting = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state?.auth?.user);

  const peerRef = useRef(null);
  const currentCallRef = useRef(null);
  const activeCallsRef = useRef(new Set()); // Track all active calls for screen sharing
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const previousCameraTrackRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const preJoinVideoRef = useRef(null);
  const localAudioContextRef = useRef(null);
  const remoteAudioContextRef = useRef(null);
  const audioLevelAnimationRef = useRef({ local: null, remote: null });
  const dataConnectionsRef = useRef(new Set());
  const displayNameRef = useRef(user?.first_name || '');

  const [isHost, setIsHost] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [displayName, setDisplayName] = useState(user?.first_name || '');
  const [meetingError, setMeetingError] = useState('');
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [copyState, setCopyState] = useState('Copy Link');
  const [remoteDisplayName, setRemoteDisplayName] = useState('');
  const [remoteRole, setRemoteRole] = useState('');
  const [pinnedTile, setPinnedTile] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [participants, setParticipants] = useState([]); // <-- many participants
  const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false);
  const isRemoteScreenSharingFromDataChannelRef = useRef(false); // Track if set via data channel
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);

  // Debug: Log when isRemoteScreenSharing changes
  useEffect(() => {
    console.log('🔄 isRemoteScreenSharing state changed to:', isRemoteScreenSharing);
  }, [isRemoteScreenSharing]);
  const initialMediaStateRef = useRef({ cameraOff: false, muted: false });
  const sendScreenShareRef = useRef(null);
  const stopScreenSharePeerRef = useRef(null);
  const broadcastMediaStateRef = useRef(null);

  const meetingUrl = useMemo(() => meetingUrlForId(meetingId), [meetingId]);

  const { localAudioLevel, remoteAudioLevel, setupAudioAnalyser, setRemoteAudioLevel } = useAudioAnalyser();

  // State for remote camera (needed by hooks)
  const [isRemoteCameraOff, setIsRemoteCameraOff] = useState(false);

  const {
    availableCameras,
    availableMicrophones,
    selectedCameraId,
    setSelectedCameraId,
    selectedMicrophoneId,
    setSelectedMicrophoneId,
  } = useMediaDevices();

  const {
    isMuted,
    setIsMuted,
    isCameraOff,
    setIsCameraOff,
    isScreenSharing,
    setIsScreenSharing,
    isScreenShareCollapsed,
    setIsScreenShareCollapsed,
    isScreenShareFullscreen,
    setIsScreenShareFullscreen,
    localStreamVersion,
    setLocalStreamVersion,
    remoteStreamVersion,
    setRemoteStreamVersion,
    handleToggleMute,
    handleToggleCamera,
    startScreenShare,
    stopScreenShare,
    replaceVideoTrack,
  } = useLocalStream({
    hasJoined,
    localStreamRef,
    remoteStreamRef,
    screenStreamRef,
    previousCameraTrackRef,
    screenVideoRef,
    setupAudioAnalyser,
    setIsRemoteCameraOff,
    remoteAudioContextRef,
    audioLevelAnimationRef,
    remoteVideoRef,
    initialCameraOff: initialMediaStateRef.current.cameraOff,
    initialMuted: initialMediaStateRef.current.muted,
    sendScreenShare: sendScreenShareRef,
    stopScreenSharePeer: stopScreenSharePeerRef,
    broadcastMediaState: broadcastMediaStateRef,
    currentCallRef,
    activeCallsRef,
  });

  const {
    cleanupConnections,
    broadcastMediaState,
    sendScreenShare,
    stopScreenShare: stopScreenSharePeer,
  } = usePeerConnection({
    meetingId,
    isHost,
    hasJoined,
    displayNameRef,
    localStreamRef,
    remoteStreamRef,
    screenVideoRef,
    setRemoteConnected,
    setRemoteDisplayName,
    setRemoteRole,
    setRemoteStreamVersion,
    setMeetingError,
    setIsRemoteCameraOff,
    setRemoteAudioLevel,
    setupAudioAnalyser,
    remoteAudioContextRef,
    audioLevelAnimationRef,
    dataConnectionsRef,
    currentCallRef,
    activeCallsRef,
    peerRef,
    localAudioContextRef,
    localVideoRef,
    remoteVideoRef,
    isCameraOff,
    setLocalStreamVersion,
    localStreamVersion,
    remoteStreamVersion,
    screenStreamRef,
    previousCameraTrackRef,
    setIsScreenSharing,
    setIsScreenShareCollapsed,
    setIsScreenShareFullscreen,
    replaceVideoTrack,
    setParticipants,               // <-- expose participant list
    selectedCameraId,
    selectedMicrophoneId,
    isMuted,
    setIsRemoteScreenSharing: (value) => {
      isRemoteScreenSharingFromDataChannelRef.current = value;
      setIsRemoteScreenSharing(value);
      console.log('🔐 isRemoteScreenSharing set via data channel to:', value);
    },
    setIsRemoteMuted,
  });

  // Store screen share functions in refs for useLocalStream
  useEffect(() => {
    sendScreenShareRef.current = sendScreenShare;
    stopScreenSharePeerRef.current = stopScreenSharePeer;
    broadcastMediaStateRef.current = broadcastMediaState;
  }, [sendScreenShare, stopScreenSharePeer, broadcastMediaState]);

  useEffect(() => {
    setIsHost(isMeetingHost(meetingId));
  }, [meetingId]);

  useEffect(() => {
    displayNameRef.current = displayName;
  }, [displayName]);

  useEffect(() => {
    if (hasJoined && initialMediaStateRef.current) {
      if (initialMediaStateRef.current.cameraOff !== undefined) {
        setIsCameraOff(initialMediaStateRef.current.cameraOff);
      }
      if (initialMediaStateRef.current.muted !== undefined) {
        setIsMuted(initialMediaStateRef.current.muted);
      }
    }
  }, [hasJoined, setIsCameraOff, setIsMuted]);

  useEffect(() => {
    if (!hasJoined) return;
    const timeoutId = setTimeout(() => {
      broadcastMediaState({ cameraOff: isCameraOff, muted: isMuted });
    }, 500); // Small delay to ensure connection is ready
    return () => clearTimeout(timeoutId);
  }, [broadcastMediaState, hasJoined]); // Removed isCameraOff and isMuted from dependencies

  useEffect(() => {
    if (!hasJoined) return;
    const unload = () => cleanupConnections();
    window.addEventListener('beforeunload', unload);
    return () => window.removeEventListener('beforeunload', unload);
  }, [cleanupConnections, hasJoined]);

  useEffect(() => {
    if (!isScreenSharing) setPinnedTile((p) => (p === 'screen' ? null : p));
  }, [isScreenSharing]);

  useEffect(() => {
    if (!remoteConnected) setPinnedTile((p) => (p === 'remote' ? null : p));
  }, [remoteConnected]);

  useEffect(() => {
    if (!localStreamRef.current) setPinnedTile((p) => (p === 'local' ? null : p));
  }, [localStreamVersion]);

  useEffect(() => {
    if (!remoteStreamRef.current || !remoteConnected) {
      // Only clear if not set via data channel
      if (isRemoteScreenSharing && !isRemoteScreenSharingFromDataChannelRef.current) {
        setIsRemoteScreenSharing(false);
        isRemoteScreenSharingFromDataChannelRef.current = false;
      }
      return;
    }

    const checkRemoteScreenShare = () => {
      // Don't override data channel messages
      if (isRemoteScreenSharingFromDataChannelRef.current) {
        console.log('⏭️ Skipping track detection - using data channel state');
        return;
      }

      const stream = remoteStreamRef.current;
      if (!stream || typeof stream.getVideoTracks !== 'function') return;

      const videoTracks = stream.getVideoTracks();
      if (videoTracks && videoTracks.length > 0) {
        const track = videoTracks[0];
        const trackLabel = track.label || '';
        const labelLower = trackLabel.toLowerCase();

        // Multiple ways to detect screen share
        const isScreenShare =
          labelLower.includes('screen') ||
          labelLower.includes('display') ||
          labelLower.includes('web-contents') ||
          labelLower.includes('monitor') ||
          labelLower.includes('window') ||
          labelLower.includes('desktop') ||
          (track.contentHint === 'detail' || track.contentHint === 'text');

        if (isScreenShare !== isRemoteScreenSharing) {
          setIsRemoteScreenSharing(isScreenShare);
          console.log('🔍 Remote screen share state updated via useEffect (fallback):', {
            isScreenShare,
            trackLabel,
            trackId: track.id,
            contentHint: track.contentHint,
            enabled: track.enabled,
            muted: track.muted
          });
        }
      } else {
        // No video tracks means no screen share (only if not set via data channel)
        if (isRemoteScreenSharing && !isRemoteScreenSharingFromDataChannelRef.current) {
          setIsRemoteScreenSharing(false);
          isRemoteScreenSharingFromDataChannelRef.current = false;
        }
      }
    };

    // Check immediately
    checkRemoteScreenShare();

    // Check periodically (but less frequently since data channel is primary)
    const interval = setInterval(checkRemoteScreenShare, 2000);
    return () => clearInterval(interval);
  }, [remoteStreamRef, remoteConnected, remoteStreamVersion, isRemoteScreenSharing, setIsRemoteScreenSharing]);

  const handleLocalVideoRef = useCallback(
    (node) => {
      localVideoRef.current = node;
      if (node && localStreamRef.current) {
        node.srcObject = localStreamRef.current;
      }
    },
    [localStreamRef, localStreamVersion]
  );

  const handleRemoteVideoRef = useCallback(
    (node) => {
      remoteVideoRef.current = node;
      if (node && remoteStreamRef.current) {
        node.srcObject = remoteStreamRef.current;
      }
    },
    [remoteStreamRef, remoteStreamVersion]
  );

  const handleScreenVideoRef = useCallback(
    (node) => {
      screenVideoRef.current = node;
      if (node && screenStreamRef.current) {
        node.srcObject = screenStreamRef.current;
      }
    },
    [screenStreamRef]
  );

  useEffect(() => {
    const videoEl = localVideoRef.current;
    if (videoEl && localStreamRef.current) {
      // Only update if srcObject is different to avoid unnecessary updates
      if (videoEl.srcObject !== localStreamRef.current) {
        videoEl.srcObject = localStreamRef.current;
      }
    }
  }, [localStreamVersion, localStreamRef]);

  useEffect(() => {
    if (hasJoined && localVideoRef.current && localStreamRef.current) {
      const videoEl = localVideoRef.current;
      const stream = localStreamRef.current;
      // Force update srcObject to ensure video feed is displayed
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
      // Also ensure video tracks are enabled if camera is on
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0 && !isCameraOff) {
        videoTracks.forEach(track => {
          if (!track.enabled) {
            track.enabled = true;
          }
        });
      }
    }
  }, [hasJoined, localStreamVersion, localStreamRef, isCameraOff]);

  useEffect(() => {
    const videoEl = remoteVideoRef.current;
    if (videoEl && remoteStreamRef.current) {
      // Only update if srcObject is different to avoid unnecessary updates
      if (videoEl.srcObject !== remoteStreamRef.current) {
        videoEl.srcObject = remoteStreamRef.current;
      }
    }
  }, [remoteStreamVersion, remoteStreamRef]);

  useEffect(() => {
    const videoEl = screenVideoRef.current;
    if (videoEl && screenStreamRef.current) {
      // Only update if srcObject is different to avoid unnecessary updates
      if (videoEl.srcObject !== screenStreamRef.current) {
        videoEl.srcObject = screenStreamRef.current;
        console.log('🖥️ Screen video element srcObject updated');
      }
    } else if (videoEl && !screenStreamRef.current && isScreenSharing) {
      // If screen sharing is active but stream is missing, log warning
      console.warn('⚠️ Screen sharing is active but screenStreamRef is null');
    }
  }, [isScreenSharing, screenStreamRef]);

  useEffect(() => {
    const videoEl = screenVideoRef.current;
    if (!videoEl) return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement === videoEl ||
        document.webkitFullscreenElement === videoEl ||
        document.mozFullScreenElement === videoEl ||
        document.msFullscreenElement === videoEl
      );

      // Sync state with actual fullscreen status
      if (!isCurrentlyFullscreen && isScreenShareFullscreen) {
        setIsScreenShareFullscreen(false);
      }
    };

    // Listen for fullscreen changes (user might exit via ESC key)
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    if (isScreenShareFullscreen) {
      // Request fullscreen
      const requestFullscreen =
        videoEl.requestFullscreen ||
        videoEl.webkitRequestFullscreen ||
        videoEl.mozRequestFullScreen ||
        videoEl.msRequestFullscreen;

      if (requestFullscreen) {
        requestFullscreen.call(videoEl).catch((err) => {
          console.error('Failed to enter fullscreen:', err);
          setIsScreenShareFullscreen(false);
        });
      }
    } else {
      // Exit fullscreen if currently in fullscreen
      if (
        document.fullscreenElement === videoEl ||
        document.webkitFullscreenElement === videoEl ||
        document.mozFullScreenElement === videoEl ||
        document.msFullscreenElement === videoEl
      ) {
        const exitFullscreen =
          document.exitFullscreen ||
          document.webkitExitFullscreen ||
          document.mozCancelFullScreen ||
          document.msExitFullscreen;

        if (exitFullscreen) {
          exitFullscreen.call(document).catch((err) => {
            console.error('Failed to exit fullscreen:', err);
          });
        }
      }
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [isScreenShareFullscreen, setIsScreenShareFullscreen]);

  const handleLeaveMeeting = useCallback(() => {
    cleanupConnections();
    navigate('/dashboard');
  }, [cleanupConnections, navigate]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(meetingUrl);
      setCopyState('Copied!');
      setTimeout(() => setCopyState('Copy Link'), 2500);
    } catch {
      window.prompt('Copy this meeting link:', meetingUrl);
    }
  }, [meetingUrl]);

  const getInitials = (value) => {
    if (!value) return '•';
    const trimmed = value.trim();
    if (!trimmed) return '•';
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const localLabel = displayName || 'You';
  const waitingMessage = isHost
    ? 'Waiting for participants to join…'
    : 'Connecting to the host…';
  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col overflow-hidden">
      <main className={`flex-1 flex flex-col overflow-y-auto px-[10px] pt-[10px] ${meetingError ? 'pb-[100px]' : 'pb-[80px]'}`}>
        <VideoLayoutManager
          participants={participants}                 // <-- many participants
          localStreamRef={localStreamRef}
          remoteStreamRef={remoteStreamRef}
          screenStreamRef={screenStreamRef}
          isScreenSharing={isScreenSharing}
          isRemoteScreenSharing={isRemoteScreenSharing}
          isScreenShareCollapsed={isScreenShareCollapsed}
          isScreenShareFullscreen={isScreenShareFullscreen}
          setIsScreenShareCollapsed={setIsScreenShareCollapsed}
          setIsScreenShareFullscreen={setIsScreenShareFullscreen}
          remoteConnected={remoteConnected}
          localStreamVersion={localStreamVersion}
          remoteStreamVersion={remoteStreamVersion}
          pinnedTile={pinnedTile}
          setPinnedTile={setPinnedTile}
          isCameraOff={isCameraOff}
          isRemoteCameraOff={isRemoteCameraOff}
          isMuted={isMuted}
          isRemoteMuted={isRemoteMuted}
          localAudioLevel={localAudioLevel}
          remoteAudioLevel={remoteAudioLevel}
          localLabel={localLabel}
          remoteDisplayName={remoteDisplayName}
          remoteRole={remoteRole}
          getInitials={getInitials}
          handleLocalVideoRef={handleLocalVideoRef}
          handleRemoteVideoRef={handleRemoteVideoRef}
          handleScreenVideoRef={handleScreenVideoRef}
          stopScreenShare={stopScreenShare}
          waitingMessage={waitingMessage}
        />
      </main>

      {/* ----- Fixed Professional Footer (Google Meet style) ----- */}
      <footer className={`fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-lg border-t border-white/5 ${meetingError ? 'pb-2' : ''}`}>
        <div className="px-4 md:px-6 py-3 max-w-[1920px] mx-auto">
          {/* Error message - positioned absolutely to not affect footer height */}
          {meetingError && (
            <div className="absolute -top-8 left-0 right-0 flex justify-center px-4">
              <div className="text-xs text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5 inline-block max-w-full shadow-lg">
                <p className="truncate max-w-[600px] mx-auto" title={meetingError}>
                  {meetingError}
                </p>
              </div>
            </div>
          )}

          {/* Main footer content - Google Meet style layout */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
            {/* Left side - Meeting info (hidden on mobile, shown on desktop) */}
            <div className="hidden md:flex items-center gap-3 md:gap-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></div>
                <div>
                  <p className="text-xs text-white/60 uppercase tracking-wider font-medium">Meeting ID</p>
                  <p className="text-sm font-semibold text-white">{meetingId}</p>
                </div>
              </div>
              {remoteDisplayName && (
                <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-white/10">
                  <p className="text-xs text-white/60">Participant:</p>
                  <p className="text-sm font-semibold text-white">{remoteDisplayName}</p>
                </div>
              )}
            </div>

            {/* Center - Controls (always visible, centered) */}
            <div className="flex-1 flex justify-center">
              <MeetingControls
                isMuted={isMuted}
                isCameraOff={isCameraOff}
                isScreenSharing={isScreenSharing}
                handleToggleMute={handleToggleMute}
                handleToggleCamera={handleToggleCamera}
                startScreenShare={startScreenShare}
                stopScreenShare={stopScreenShare}
              />
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isHost && (
                <Tooltip title={copyState} arrow placement="top">
                  <IconButton
                    onClick={handleCopyLink}
                    className="!rounded-full !bg-white/10 hover:!bg-white/20 !text-white !transition-all !duration-200"
                    sx={{
                      width: 40,
                      height: 40,
                      '&:hover': {
                        transform: 'scale(1.05)',
                      },
                      '&:active': {
                        transform: 'scale(0.95)',
                      },
                    }}
                  >
                    <ContentCopy sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Leave meeting" arrow placement="top">
                <IconButton
                  onClick={() => setIsLeaveConfirmOpen(true)}
                  className="!rounded-full !bg-red-500 hover:!bg-red-600 !text-white !transition-all !duration-200"
                  sx={{
                    width: 48,
                    height: 48,
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                    },
                    '&:active': {
                      transform: 'scale(0.95)',
                    },
                  }}
                >
                  <CallEnd sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            </div>
          </div>
        </div>
      </footer>

      {/* ----- Modals ----- */}
      <LeaveMeetingModal
        open={isLeaveConfirmOpen}
        onClose={() => setIsLeaveConfirmOpen(false)}
        onConfirm={handleLeaveMeeting}
      />

      <PreJoinScreen
        open={!hasJoined}
        isHost={isHost}
        displayName={displayName}
        setDisplayName={setDisplayName}
        selectedCameraId={selectedCameraId}
        setSelectedCameraId={setSelectedCameraId}
        selectedMicrophoneId={selectedMicrophoneId}
        setSelectedMicrophoneId={setSelectedMicrophoneId}
        availableCameras={availableCameras}
        availableMicrophones={availableMicrophones}
        preJoinVideoRef={preJoinVideoRef}
        localAudioLevel={localAudioLevel}
        getInitials={getInitials}
        onJoin={async ({ cameraEnabled, micEnabled, cameraId, microphoneId }) => {
          // Set selected devices
          if (cameraId) {
            setSelectedCameraId(cameraId);
          }
          if (microphoneId) {
            setSelectedMicrophoneId(microphoneId);
          }

          // Set initial media states
          const cameraOff = !cameraEnabled;
          const muted = !micEnabled;
          initialMediaStateRef.current.cameraOff = cameraOff;
          initialMediaStateRef.current.muted = muted;
          setIsCameraOff(cameraOff);
          setIsMuted(muted);
          setHasJoined(true);
        }}
        isInitializing={isInitializing}
        setIsInitializing={setIsInitializing}
        meetingError={meetingError}
        setMeetingError={setMeetingError}
        setupAudioAnalyser={setupAudioAnalyser}
        initialCameraState={true}
        initialMicState={true}
      />
    </div>
  );
};

export default Meeting;