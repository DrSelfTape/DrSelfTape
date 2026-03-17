// src/components/MeetingRoom/Hooks/useLocalStream.js
// ---------------------------------------------------------------
// Manages local media stream state and controls.
// Handles mute, camera, screen sharing, and stream versioning.
// ---------------------------------------------------------------

import { useState, useCallback, useEffect, useRef, startTransition } from 'react';

export const useLocalStream = ({
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
  initialCameraOff = false,
  initialMuted = false,
  sendScreenShare,
  stopScreenSharePeer,
  broadcastMediaState,
  currentCallRef,  // ADD THIS - need access to peer connection
  activeCallsRef,  // ADD THIS - need access to all calls
}) => {
  // Handle refs for screen share functions
  const sendScreenShareFn = typeof sendScreenShare === 'object' && sendScreenShare?.current ? sendScreenShare.current : sendScreenShare;
  const stopScreenSharePeerFn = typeof stopScreenSharePeer === 'object' && stopScreenSharePeer?.current ? stopScreenSharePeer.current : stopScreenSharePeer;
  const broadcastMediaStateFn = typeof broadcastMediaState === 'object' && broadcastMediaState?.current ? broadcastMediaState.current : broadcastMediaState;
  // -------------------------------------------------------------
  // State
  // -------------------------------------------------------------
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isCameraOff, setIsCameraOff] = useState(initialCameraOff);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isScreenShareCollapsed, setIsScreenShareCollapsed] = useState(false);
  const [isScreenShareFullscreen, setIsScreenShareFullscreen] = useState(false);
  const [localStreamVersion, setLocalStreamVersion] = useState(0);
  const [remoteStreamVersion, setRemoteStreamVersion] = useState(0);
  
  // Use refs to track mute state - prevents re-renders from affecting WebRTC
  const muteStateRef = useRef(isMuted);
  const cameraStateRef = useRef(isCameraOff);
  
  // Sync refs with state (one-way: state -> ref, never ref -> state during screen share)
  useEffect(() => {
    muteStateRef.current = isMuted;
  }, [isMuted]);
  
  useEffect(() => {
    cameraStateRef.current = isCameraOff;
  }, [isCameraOff]);

  // -------------------------------------------------------------
  // Toggle mute - PURE WebRTC operation, NO React state updates
  // -------------------------------------------------------------
  const handleToggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    
    const audioTracks = localStreamRef.current.getAudioTracks();
    if (audioTracks.length === 0) return;
    
    // Find ALL microphone tracks (exclude screen share audio)
    const micTracks = audioTracks.filter((track) => {
      if (track.readyState !== 'live') return false;
      const label = track.label?.toLowerCase() || '';
      return !label.includes('screen') && 
             !label.includes('display') && 
             !label.includes('desktop') &&
             !label.includes('monitor');
    });
    
    if (micTracks.length === 0) {
      // Fallback: use first live track if no mic track found
      const firstTrack = audioTracks.find(t => t.readyState === 'live');
      if (!firstTrack) return;
      micTracks.push(firstTrack);
    }
    
    // Get current mute state from first track
    // enabled = true means unmuted, enabled = false means muted
    const currentMuted = micTracks[0]?.enabled === false;
    const newMuted = !currentMuted;
    
    // CRITICAL: Update ALL microphone tracks - ensure system microphone is actually muted
    // This directly controls the system microphone at the OS level
    micTracks.forEach((track) => {
      const oldState = track.enabled;
      track.enabled = !newMuted; // false = muted, true = unmuted
      console.log(`🎤 Track ${track.label}: enabled changed from ${oldState} to ${track.enabled} (muted: ${newMuted})`);
    });
    
    muteStateRef.current = newMuted;
    
    // INSTANT UI update
    setIsMuted(newMuted);
    
    // INSTANT sender track updates - update ALL audio senders
    if (hasJoined) {
      const micTrackIds = new Set(micTracks.map(t => t.id));
      const allCalls = new Set();
      if (currentCallRef?.current) allCalls.add(currentCallRef.current);
      if (activeCallsRef?.current) {
        activeCallsRef.current.forEach(call => {
          if (call?.peerConnection?.connectionState === 'connected') {
            allCalls.add(call);
          }
        });
      }
      
      allCalls.forEach((call) => {
        const peerConnection = call?.peerConnection;
        if (!peerConnection || peerConnection.connectionState !== 'connected') return;
        
        const senders = peerConnection.getSenders();
        senders?.forEach((sender) => {
          if (sender?.track?.kind === 'audio' && sender.track.readyState === 'live') {
            const senderTrackLabel = sender.track.label?.toLowerCase() || '';
            const isScreenShare = senderTrackLabel.includes('screen') || 
                                 senderTrackLabel.includes('display') || 
                                 senderTrackLabel.includes('desktop') ||
                                 senderTrackLabel.includes('monitor');
            
            // Update ALL non-screen-share audio tracks
            if (!isScreenShare) {
              sender.track.enabled = !newMuted; // false = muted, true = unmuted
            }
          }
        });
      });
    }
    
    // Broadcast immediately
    if (broadcastMediaStateFn) {
      try {
        broadcastMediaStateFn({ muted: newMuted });
      } catch (err) {
        // Silent fail
      }
    }
  }, [localStreamRef, hasJoined, broadcastMediaStateFn, currentCallRef, activeCallsRef]);

  // -------------------------------------------------------------
  // Toggle camera - INSTANT like Google Meet (same logic as mute)
  // -------------------------------------------------------------
  const handleToggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    
    const videoTracks = localStreamRef.current.getVideoTracks();
    if (videoTracks.length === 0) return;
    
    // Find ALL camera tracks (exclude screen share)
    const cameraTracks = videoTracks.filter((track) => {
      if (track.readyState !== 'live') return false;
      const label = track.label?.toLowerCase() || '';
      return !label.includes('screen') && 
             !label.includes('display') && 
             !label.includes('desktop') &&
             !label.includes('monitor');
    });
    
    if (cameraTracks.length === 0) {
      // Fallback: use first live track if no camera track found
      const firstTrack = videoTracks.find(t => t.readyState === 'live');
      if (!firstTrack) return;
      cameraTracks.push(firstTrack);
    }
    
    // Get current camera state from first track
    // enabled = true means camera on, enabled = false means camera off
    const currentCameraOff = cameraTracks[0]?.enabled === false;
    const newCameraOff = !currentCameraOff;
    
    // CRITICAL: Update ALL camera tracks - ensure system camera is actually toggled
    // This directly controls the system camera at the OS level
    cameraTracks.forEach((track) => {
      const oldState = track.enabled;
      track.enabled = !newCameraOff; // false = camera off, true = camera on
      console.log(`📹 Track ${track.label}: enabled changed from ${oldState} to ${track.enabled} (camera off: ${newCameraOff})`);
    });
    
    cameraStateRef.current = newCameraOff;
    
    // INSTANT UI update
    setIsCameraOff(newCameraOff);
    
    // INSTANT sender track updates - update ALL non-screen-share video senders
    if (hasJoined) {
      const cameraTrackIds = new Set(cameraTracks.map(t => t.id));
      const allCalls = new Set();
      if (currentCallRef?.current) allCalls.add(currentCallRef.current);
      if (activeCallsRef?.current) {
        activeCallsRef.current.forEach(call => {
          if (call?.peerConnection?.connectionState === 'connected') {
            allCalls.add(call);
          }
        });
      }
      
      allCalls.forEach((call) => {
        const peerConnection = call?.peerConnection;
        if (!peerConnection || peerConnection.connectionState !== 'connected') return;
        
        const senders = peerConnection.getSenders();
        senders?.forEach((sender) => {
          if (sender?.track?.kind === 'video' && sender.track.readyState === 'live') {
            const senderTrackLabel = sender.track.label?.toLowerCase() || '';
            const isScreenShare = senderTrackLabel.includes('screen') || 
                                 senderTrackLabel.includes('display') || 
                                 senderTrackLabel.includes('desktop') ||
                                 senderTrackLabel.includes('monitor');
            
            // Update ALL non-screen-share video tracks
            if (!isScreenShare) {
              sender.track.enabled = !newCameraOff; // false = camera off, true = camera on
            }
          }
        });
      });
    }
    
    // Broadcast immediately
    if (broadcastMediaStateFn) {
      try {
        broadcastMediaStateFn({ cameraOff: newCameraOff });
      } catch (err) {
        // Silent fail
      }
    }
  }, [localStreamRef, hasJoined, broadcastMediaStateFn, currentCallRef, activeCallsRef]);

  // -------------------------------------------------------------
  // Screen sharing
  // -------------------------------------------------------------
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      screenStreamRef.current = stream;
      setIsScreenSharing(true);

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }

      // Notify remote participants immediately via data channel
      if (broadcastMediaStateFn) {
        console.log('📢 Calling broadcastMediaStateFn with screenSharing: true');
        broadcastMediaStateFn({ screenSharing: true });
        console.log('📢 Broadcasted screen share start notification');
        
        // Retry sending the notification after a delay in case connections weren't ready
        setTimeout(() => {
          console.log('📢 Retrying screen share notification...');
          broadcastMediaStateFn({ screenSharing: true });
        }, 500);
        setTimeout(() => {
          console.log('📢 Retrying screen share notification again...');
          broadcastMediaStateFn({ screenSharing: true });
        }, 1500);
      } else {
        console.error('❌ broadcastMediaStateFn is not available!');
      }

      // Send screen share to remote participants
      if (sendScreenShareFn) {
        // Small delay to ensure stream is ready
        setTimeout(() => {
          sendScreenShareFn(stream);
        }, 100);
      }

      // Handle stop via browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error('Screen share failed:', err);
    }
  }, [screenStreamRef, screenVideoRef, sendScreenShareFn, broadcastMediaStateFn]);

  const stopScreenShare = useCallback(() => {
    // Notify remote participants immediately via data channel
    if (broadcastMediaStateFn) {
      broadcastMediaStateFn({ screenSharing: false });
      console.log('📢 Broadcasting screen share stop notification');
      
      // Retry sending the notification
      setTimeout(() => {
        broadcastMediaStateFn({ screenSharing: false });
      }, 500);
    }

    // Stop screen share in peer connection first
    if (stopScreenSharePeerFn) {
      stopScreenSharePeerFn();
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
    setIsScreenShareCollapsed(false);
    setIsScreenShareFullscreen(false);
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }
    
    // Note: Mute state is already synced via the ref, so no need to sync here
    // The mute toggle function handles state updates independently
  }, [screenStreamRef, screenVideoRef, setIsScreenSharing, setIsScreenShareCollapsed, setIsScreenShareFullscreen, stopScreenSharePeerFn, broadcastMediaStateFn, isMuted]);

  // -------------------------------------------------------------
  // Replace video track (for camera switching) - uses replaceTrack on senders
  // CRITICAL: This uses replaceTrack on RTCRtpSenders, NOT removeTrack/addTrack
  // This prevents stream recreation and maintains stable connection
  // -------------------------------------------------------------
  const replaceVideoTrack = useCallback(async (newTrack) => {
    if (!localStreamRef.current || !newTrack) return;

    const oldTrack = localStreamRef.current.getVideoTracks()[0];
    if (!oldTrack) {
      // No old track, just add the new one
      localStreamRef.current.addTrack(newTrack);
      previousCameraTrackRef.current = newTrack;
      setLocalStreamVersion((v) => v + 1);
      return;
    }

    // CRITICAL: Use replaceTrack on senders instead of removeTrack/addTrack
    // This maintains the connection without renegotiation
    try {
      const allCalls = new Set();
      if (currentCallRef?.current) allCalls.add(currentCallRef.current);
      if (activeCallsRef?.current) {
        activeCallsRef.current.forEach(call => {
          if (call?.peerConnection?.connectionState === 'connected') {
            allCalls.add(call);
          }
        });
      }

      let replaced = false;
      allCalls.forEach((call) => {
        try {
          const peerConnection = call?.peerConnection;
          if (!peerConnection || peerConnection.connectionState !== 'connected') return;

          const senders = peerConnection.getSenders();
          senders?.forEach((sender) => {
            if (sender?.track?.kind === 'video' && sender.track.id === oldTrack.id) {
              sender.replaceTrack(newTrack).then(() => {
                replaced = true;
                console.log('✅ Video track replaced on sender using replaceTrack');
              }).catch((err) => {
                console.error('Failed to replace video track on sender:', err);
              });
            }
          });
        } catch (err) {
          console.error('Error replacing track on call:', err);
        }
      });

      // Update local stream reference
      if (replaced) {
        // Replace track in local stream (for local preview)
        localStreamRef.current.removeTrack(oldTrack);
        localStreamRef.current.addTrack(newTrack);
        previousCameraTrackRef.current = newTrack;
        setLocalStreamVersion((v) => v + 1);
      } else {
        // Fallback: if no senders found, use old method but log warning
        console.warn('⚠️ No senders found, using fallback replaceTrack method');
        localStreamRef.current.removeTrack(oldTrack);
        localStreamRef.current.addTrack(newTrack);
        previousCameraTrackRef.current = newTrack;
        setLocalStreamVersion((v) => v + 1);
      }
    } catch (err) {
      console.error('Error in replaceVideoTrack:', err);
      // Fallback to old method
      localStreamRef.current.removeTrack(oldTrack);
    localStreamRef.current.addTrack(newTrack);
    previousCameraTrackRef.current = newTrack;
    setLocalStreamVersion((v) => v + 1);
    }
  }, [localStreamRef, previousCameraTrackRef, currentCallRef, activeCallsRef]);

  // -------------------------------------------------------------
  // Setup audio analyser for local stream when it changes
  // -------------------------------------------------------------
  useEffect(() => {
    if (hasJoined && localStreamRef.current && setupAudioAnalyser) {
      setupAudioAnalyser(localStreamRef.current, 'local');
    }
  }, [hasJoined, localStreamRef, setupAudioAnalyser, localStreamVersion]);

  // -------------------------------------------------------------
  // Setup audio analyser for remote stream when it changes
  // -------------------------------------------------------------
  useEffect(() => {
    if (hasJoined && remoteStreamRef.current && setupAudioAnalyser) {
      setupAudioAnalyser(remoteStreamRef.current, 'remote');
    }
  }, [hasJoined, remoteStreamRef, setupAudioAnalyser, remoteStreamVersion]);

  // -------------------------------------------------------------
  // Return
  // -------------------------------------------------------------
  return {
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
  };
};
