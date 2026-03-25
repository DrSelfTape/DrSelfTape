// src/components/MeetingRoom/Hooks/usePeerConnection.js
// ---------------------------------------------------------------
// PeerJS wrapper – creates peer, handles calls & data channels.
// Designed so the signalling server can be swapped later.
// ---------------------------------------------------------------

import Peer from 'peerjs';
import { useCallback, useEffect, useRef } from 'react';
import { clearMeetingHostFlag } from '../../../utils/meeting';

export const usePeerConnection = ({
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
  setIsRemoteMuted,         // <-- For remote mute state
  setRemoteAudioLevel,          // <-- RECEIVED FROM useAudioAnalyser
  setupAudioAnalyser,
  remoteAudioContextRef,
  audioLevelAnimationRef,
  dataConnectionsRef,
  currentCallRef,
  activeCallsRef,  // Track all active calls for screen sharing
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
  setParticipants,              // <-- For multi-user support
  selectedCameraId,             // <-- From useMediaDevices
  selectedMicrophoneId,         // <-- From useMediaDevices
  isMuted,                      // <-- From useLocalStream
  setIsRemoteScreenSharing,     // <-- For remote screen share detection
}) => {
  // -------------------------------------------------------------
  // Cleanup everything (streams, peer, fullscreen, etc.)
  // -------------------------------------------------------------
  const cleanupConnections = useCallback(
    (opts = { keepStreams: false }) => {
      currentCallRef.current?.close();
      currentCallRef.current = null;
      if (activeCallsRef.current) {
        activeCallsRef.current.forEach(call => call.close());
        activeCallsRef.current.clear();
      }

      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }

      if (!opts.keepStreams) {
        [localStreamRef, remoteStreamRef, screenStreamRef].forEach((ref) => {
          ref.current?.getTracks().forEach((t) => t.stop());
          ref.current = null;
        });
      }

      // Exit fullscreen if screen share was active
      if (document.fullscreenElement && document.fullscreenElement === screenVideoRef.current) {
        try {
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {
              // Ignore errors if document is not active or already exited
            });
          }
        } catch (err) {
          // Ignore errors if document is not active
        }
      }

      setRemoteConnected(false);
      setRemoteDisplayName('');
      setRemoteRole('');
      setIsRemoteCameraOff(false);
      if (setIsRemoteMuted) setIsRemoteMuted(false);
      setRemoteAudioLevel(0); // Reset audio level
      dataConnectionsRef.current.forEach((c) => c.close());
      dataConnectionsRef.current.clear();

      if (isHost) clearMeetingHostFlag(meetingId);
      setParticipants([]); // Clear participant list
    },
    [
      isHost,
      meetingId,
      screenVideoRef,
      setRemoteConnected,
      setRemoteDisplayName,
      setRemoteRole,
      setIsRemoteCameraOff,
      setRemoteAudioLevel,
      setParticipants,
    ]
  );

  // -------------------------------------------------------------
  // Connect to host (participant side)
  // -------------------------------------------------------------
  const connectToHost = useCallback(
    (stream, peer) => {
      const call = peer.call(meetingId, stream, {
        metadata: { displayName: displayNameRef.current, role: 'participant' },
      });
      currentCallRef.current = call;
      if (activeCallsRef.current) {
        activeCallsRef.current.add(call);
      }
      // Don't reset remoteConnected here - it might already be true from a previous connection
      // Only reset if we truly don't have a stream
      if (!remoteStreamRef.current) {
      setRemoteConnected(false);
      }

      call.on('stream', (remote) => {
        remoteStreamRef.current = remote;
        setRemoteStreamVersion((v) => v + 1);
        setRemoteConnected(true);
        const videoEl = remoteVideoRef.current;
        if (videoEl) {
          videoEl.srcObject = remote;
        }
        
        // Monitor stream tracks directly to detect replacements (ontrack doesn't fire on replace)
        let lastTrackId = remote.getVideoTracks()[0]?.id;
        let lastTrackLabel = remote.getVideoTracks()[0]?.label || '';
        
        // Only update stream version when tracks actually end (not when disabled)
        remote.getVideoTracks().forEach((track) => {
          track.onended = () => {
            // Only update if track actually ended (not just disabled)
            if (track.readyState === 'ended') {
              setRemoteStreamVersion((v) => v + 1);
            }
          };
        });
        
        remote.onaddtrack = (event) => {
          if (event.track.kind === 'video') {
            event.track.onended = () => {
              // Only update if track actually ended (not just disabled)
              if (event.track.readyState === 'ended') {
                setRemoteStreamVersion((v) => v + 1);
              }
            };
          }
        };
        remote.onremovetrack = (event) => {
          if (event.track.kind === 'video') {
            // Track was removed, update version
            setRemoteStreamVersion((v) => v + 1);
          }
        };
        
        // Function to check for track changes
        const checkTrackChange = (forceCheck = false) => {
          const currentTrack = remote.getVideoTracks()[0];
          if (currentTrack) {
            const currentTrackId = currentTrack.id;
            const currentTrackLabel = currentTrack.label || '';
            
            // Check if track ID or label changed (label changes for screen share) or force check
            if (forceCheck || currentTrackId !== lastTrackId || currentTrackLabel !== lastTrackLabel) {
              const wasScreenShare = lastTrackLabel.toLowerCase().includes('screen') || 
                                    lastTrackLabel.toLowerCase().includes('display') ||
                                    lastTrackLabel.toLowerCase().includes('web-contents');
              
              lastTrackId = currentTrackId;
              lastTrackLabel = currentTrackLabel;
              
              // Update remote stream ref and video element
              // Always maintain the stream reference - don't clear it when tracks are toggled
              if (remoteStreamRef.current !== remote) {
                remoteStreamRef.current = remote;
              }
              if (videoEl && videoEl.srcObject !== remote) {
                videoEl.srcObject = remote;
              }
              // Only update stream version if track actually changed (ID or label)
              // Don't update on every check - this prevents flickering during mute/camera toggles
              if (forceCheck || currentTrackId !== lastTrackId || currentTrackLabel !== lastTrackLabel) {
                setRemoteStreamVersion((v) => v + 1);
              }
              
              // Detect if this is a screen share track - check multiple indicators
              const labelLower = currentTrackLabel.toLowerCase();
              const isScreenShare = 
                labelLower.includes('screen') || 
                labelLower.includes('display') ||
                labelLower.includes('web-contents') ||
                labelLower.includes('monitor') ||
                labelLower.includes('window') ||
                labelLower.includes('desktop') ||
                // Check track settings/contentHint (if available)
                (currentTrack.contentHint === 'detail' || currentTrack.contentHint === 'text');
              
              // Always update on force check, or if state changed
              if (forceCheck || isScreenShare !== wasScreenShare) {
                if (setIsRemoteScreenSharing) {
                  setIsRemoteScreenSharing(isScreenShare);
                  console.log('🔍 Remote screen share state updated:', {
                    isScreenShare,
                    trackLabel: currentTrackLabel,
                    trackId: currentTrackId,
                    contentHint: currentTrack.contentHint,
                    forceCheck
                  });
                }
              }
              
              console.log('Remote track changed detected:', {
                id: currentTrackId,
                label: currentTrackLabel,
                isScreenShare
              });
            }
          }
        };
        
        // Check immediately on stream receipt
        checkTrackChange(true);
        
        // Also listen to peer connection for new tracks
        const pc = call.peerConnection;
        if (pc) {
          pc.ontrack = (event) => {
            if (event.track.kind === 'video' && event.streams && event.streams.length > 0) {
              const stream = event.streams[0];
              if (stream === remote || (remoteStreamRef.current && stream.id === remoteStreamRef.current.id)) {
                // Only check if this is a new track (different ID), not just enable/disable
                checkTrackChange(true); // Force check for new tracks only
              }
            }
          };
        }
        
        // Monitor track changes periodically (for track replacements)
        // Use longer interval to avoid unnecessary checks when camera/mic toggles
        // Only check for actual track changes (ID/label), not enable/disable state
        const trackMonitor = setInterval(() => {
          checkTrackChange(false); // Don't force check - only update if track actually changed
        }, 2000); // Increased interval to reduce checks and prevent flickering
        
        // Store monitor for cleanup
        call._trackMonitor = trackMonitor;
      });

      call.on('close', () => {
        if (activeCallsRef.current) {
          activeCallsRef.current.delete(call);
        }
        if (currentCallRef.current === call) {
          currentCallRef.current = null;
        }
        // Clean up track monitor
        if (call._trackMonitor) {
          clearInterval(call._trackMonitor);
        }
        // Only clear stream and connection state if this was the last/only call
        // Don't clear if there are other active calls - this prevents loading during track toggles
        const hasOtherCalls = activeCallsRef.current && activeCallsRef.current.size > 0;
        const isLastCall = !hasOtherCalls && currentCallRef.current === null;
        
        if (isLastCall) {
          // Only clear if we truly lost connection (no stream or no tracks)
          // Don't clear if stream still exists (might just be tracks disabled)
          const hasStream = remoteStreamRef.current;
          const hasTracks = hasStream && (
            remoteStreamRef.current.getVideoTracks().length > 0 ||
            remoteStreamRef.current.getAudioTracks().length > 0
          );
          
          // Only clear if stream is completely gone
          if (!hasStream || !hasTracks) {
        remoteStreamRef.current = null;
        setRemoteStreamVersion((v) => v + 1);
        setRemoteConnected(false);
          }
        }
        setRemoteAudioLevel(0);
        if (setIsRemoteScreenSharing) {
          setIsRemoteScreenSharing(false);
        }
      });

      call.on('error', (err) => setMeetingError(err?.message || 'Call error'));
    },
    [
      meetingId,
      displayNameRef,
      setRemoteStreamVersion,
      setRemoteConnected,
      setRemoteAudioLevel,
      setMeetingError,
      remoteVideoRef,
    ]
  );

  // -------------------------------------------------------------
  // Data channel helpers
  // -------------------------------------------------------------
  const broadcastMessage = useCallback((msg) => {
    const connections = Array.from(dataConnectionsRef.current);
    console.log('📤 Broadcasting message:', msg, 'to', connections.length, 'connections');
    let sentCount = 0;
    connections.forEach((c) => {
      if (c && c.open) {
        try {
          c.send(msg);
          sentCount++;
          console.log('✅ Message sent to connection:', c.peer);
        } catch (err) {
          console.error('❌ Failed to send message to connection:', err);
        }
      } else {
        console.warn('⚠️ Connection not open:', c?.peer, 'open:', c?.open);
      }
    });
    console.log(`📤 Sent message to ${sentCount}/${connections.length} connections`);
  }, []);

  const broadcastMediaState = useCallback(
    (state) => broadcastMessage({ type: 'media-state', ...state }),
    [broadcastMessage]
  );

  // -------------------------------------------------------------
  // Send screen share stream to remote participants
  // -------------------------------------------------------------
  const sendScreenShare = useCallback((screenStream) => {
    if (!screenStream) {
      console.warn('Cannot send screen share: no stream');
      return;
    }
    
    const screenVideoTrack = screenStream.getVideoTracks()[0];
    const screenAudioTrack = screenStream.getAudioTracks()[0];
    
    if (!screenVideoTrack) {
      console.warn('No screen video track available');
      return;
    }

    // Replace tracks on all active calls
    const allCalls = new Set();
    if (currentCallRef.current) {
      allCalls.add(currentCallRef.current);
    }
    if (activeCallsRef.current) {
      activeCallsRef.current.forEach(call => allCalls.add(call));
    }

    if (allCalls.size === 0) {
      console.warn('No active calls to send screen share to, waiting...');
      setTimeout(() => {
        sendScreenShare(screenStream);
      }, 500);
      return;
    }

    let totalReplaced = 0;
    allCalls.forEach((call) => {
      const peerConnection = call.peerConnection;
      if (!peerConnection) {
        console.warn('No peer connection for call');
        return;
      }

      // Wait for connection to be stable
      if (peerConnection.connectionState !== 'connected' && peerConnection.connectionState !== 'connecting') {
        console.warn('Peer connection not ready, state:', peerConnection.connectionState);
        return;
      }

      // Find video and audio senders and replace tracks
      const senders = peerConnection.getSenders();
      if (!senders || senders.length === 0) {
        console.warn('No senders available for call');
        return;
      }
      
      let videoReplaced = false;
      let audioReplaced = false;
      
      senders.forEach((sender) => {
        if (sender.track && sender.track.kind === 'video' && !videoReplaced) {
          sender.replaceTrack(screenVideoTrack).then(() => {
            videoReplaced = true;
            totalReplaced++;
            console.log('Screen video track replaced successfully on call. Track label:', screenVideoTrack.label);
            // Verify the replacement
            setTimeout(() => {
              const currentTrack = sender.track;
              if (currentTrack && currentTrack.id === screenVideoTrack.id) {
                console.log('Track replacement verified');
              } else {
                console.warn('Track replacement may not have worked. Current track:', currentTrack?.label);
              }
            }, 100);
          }).catch((err) => {
            console.error('Failed to replace video track with screen:', err);
          });
        } else if (sender.track && sender.track.kind === 'audio' && screenAudioTrack && !audioReplaced) {
          sender.replaceTrack(screenAudioTrack).then(() => {
            audioReplaced = true;
            console.log('Screen audio track replaced successfully on call');
          }).catch((err) => {
            console.error('Failed to replace audio track with screen audio:', err);
          });
        }
      });
    });
    
    if (totalReplaced === 0) {
      console.warn('Could not replace video track on any call. Retrying...');
      setTimeout(() => {
        sendScreenShare(screenStream);
      }, 500);
    } else {
      console.log(`Screen share track replaced on ${totalReplaced} call(s)`);
      // Notify remote participants via data channel
      broadcastMessage({ type: 'screen-share', isSharing: true });
    }
  }, [currentCallRef, activeCallsRef, broadcastMessage]);

  // -------------------------------------------------------------
  // Stop screen share and restore camera
  // -------------------------------------------------------------
  const stopScreenShare = useCallback(() => {
    if (!localStreamRef.current) {
      console.warn('Cannot stop screen share: no local stream');
      return;
    }
    
    const localVideoTrack = localStreamRef.current.getVideoTracks()[0];
    const localAudioTrack = localStreamRef.current.getAudioTracks()[0];
    
    if (!localVideoTrack) {
      console.warn('No local video track to restore');
      return;
    }

    // Restore tracks on all active calls
    const allCalls = new Set();
    if (currentCallRef.current) {
      allCalls.add(currentCallRef.current);
    }
    if (activeCallsRef.current) {
      activeCallsRef.current.forEach(call => allCalls.add(call));
    }

    if (allCalls.size === 0) {
      console.warn('No active calls to restore tracks on');
      return;
    }

    let totalRestored = 0;
    allCalls.forEach((call) => {
      const peerConnection = call.peerConnection;
      if (!peerConnection) {
        return;
      }

      // Restore original video and audio tracks
      const senders = peerConnection.getSenders();
      let videoRestored = false;
      let audioRestored = false;
      
      senders.forEach((sender) => {
        if (sender.track && sender.track.kind === 'video' && !videoRestored) {
          sender.replaceTrack(localVideoTrack).then(() => {
            videoRestored = true;
            totalRestored++;
            console.log('Camera video track restored successfully on call');
          }).catch((err) => {
            console.error('Failed to restore video track:', err);
          });
        } else if (sender.track && sender.track.kind === 'audio' && localAudioTrack && !audioRestored) {
          sender.replaceTrack(localAudioTrack).then(() => {
            audioRestored = true;
            console.log('Camera audio track restored successfully on call');
          }).catch((err) => {
            console.error('Failed to restore audio track:', err);
          });
        }
      });
    });
    
    if (totalRestored === 0) {
      console.warn('Could not restore video track on any call');
    } else {
      console.log(`Camera track restored on ${totalRestored} call(s)`);
      // Notify remote participants via data channel
      broadcastMessage({ type: 'screen-share', isSharing: false });
    }
  }, [localStreamRef, currentCallRef, activeCallsRef, broadcastMessage]);

  const applyRemoteIdentity = useCallback(
    (payload) => {
      if (payload.name) setRemoteDisplayName(payload.name);
      if (payload.role) setRemoteRole(payload.role);
    },
    [setRemoteDisplayName, setRemoteRole]
  );

  const handleIncomingData = useCallback(
    (data, conn) => {
      console.log('📥 Received data:', data, 'from:', conn?.peer);
      if (!data?.type) {
        console.warn('⚠️ Received data without type:', data);
        return;
      }
      switch (data.type) {
        case 'identity':
          applyRemoteIdentity(data);
          break;
        case 'identity-request':
          conn.send({
            type: 'identity',
            name: displayNameRef.current,
            role: isHost ? 'host' : 'participant',
          });
          break;
        case 'media-state':
          console.log('📥 Processing media-state:', data);
          // Update state immediately but batch in next frame to prevent blinking
          // This ensures smooth updates without causing re-render cascades
          if (data.cameraOff !== undefined) {
            requestAnimationFrame(() => {
              setIsRemoteCameraOff(!!data.cameraOff);
            });
          }
          if (data.muted !== undefined && setIsRemoteMuted) {
            requestAnimationFrame(() => {
              setIsRemoteMuted(!!data.muted);
              console.log('📥 Remote mute state updated to:', !!data.muted);
            });
          }
          if (data.screenSharing !== undefined) {
            console.log('📥 Setting isRemoteScreenSharing to:', !!data.screenSharing, '(from data channel)');
            if (setIsRemoteScreenSharing) {
              setIsRemoteScreenSharing(!!data.screenSharing);
              console.log('✅ isRemoteScreenSharing updated to:', !!data.screenSharing);
              // Mark that this was set via data channel (if we have access to a ref)
              // We'll handle this in MeetingRoom.jsx
            } else {
              console.error('❌ setIsRemoteScreenSharing is not available!');
            }
          }
          break;
        case 'screen-share':
          console.log('📥 Processing screen-share:', data);
          if (setIsRemoteScreenSharing && data.isSharing !== undefined) {
            console.log('📥 Setting isRemoteScreenSharing to:', !!data.isSharing);
            setIsRemoteScreenSharing(!!data.isSharing);
            console.log('✅ isRemoteScreenSharing updated to:', !!data.isSharing);
          } else {
            console.error('❌ Cannot set isRemoteScreenSharing:', {
              hasSetIsRemoteScreenSharing: !!setIsRemoteScreenSharing,
              hasIsSharing: data.isSharing !== undefined
            });
          }
          break;
        default:
          console.log('📥 Unknown message type:', data.type);
          break;
      }
    },
    [applyRemoteIdentity, displayNameRef, isHost, setIsRemoteCameraOff, setIsRemoteMuted, setIsRemoteScreenSharing]
  );

  const registerDataConnection = useCallback(
    (conn) => {
      if (!conn) return;
      dataConnectionsRef.current.add(conn);
      if (conn.metadata) applyRemoteIdentity(conn.metadata);

      conn.on('data', (d) => handleIncomingData(d, conn));
      conn.on('open', () => {
        conn.send({
          type: 'identity',
          name: displayNameRef.current,
          role: isHost ? 'host' : 'participant',
        });
        conn.send({ type: 'identity-request' });
        broadcastMediaState({ cameraOff: isCameraOff, muted: isMuted });
      });
      conn.on('close', () => {
        dataConnectionsRef.current.delete(conn);
        if (dataConnectionsRef.current.size === 0) {
          setRemoteDisplayName('');
          setRemoteRole('');
          setRemoteAudioLevel(0);
        }
      });
    },
    [
      applyRemoteIdentity,
      displayNameRef,
      isHost,
      isCameraOff,
      isMuted,
      broadcastMediaState,
      setRemoteDisplayName,
      setRemoteRole,
      setRemoteAudioLevel,
    ]
  );

  // -------------------------------------------------------------
  // Track initialization state (outside useEffect so callbacks can access it)
  // -------------------------------------------------------------
  const hasInitializedRef = useRef(false);

  // Helper to set up call handlers (extracted to avoid duplication)
  // MUST be defined BEFORE setupPeerHandlersInline since it's used there
  const setupCallHandlers = useCallback((call, stream) => {
    call.on('stream', (remote) => {
      remoteStreamRef.current = remote;
      setRemoteStreamVersion((v) => v + 1);
      setRemoteConnected(true);
      const videoEl = remoteVideoRef.current;
      if (videoEl) {
        videoEl.srcObject = remote;
      }
      
      // Monitor stream tracks
      let lastTrackId = remote.getVideoTracks()[0]?.id;
      let lastTrackLabel = remote.getVideoTracks()[0]?.label || '';
      
      remote.getVideoTracks().forEach((track) => {
        track.onended = () => {
          if (track.readyState === 'ended') {
            setRemoteStreamVersion((v) => v + 1);
          }
        };
      });
      
      remote.onaddtrack = (event) => {
        if (event.track.kind === 'video') {
          event.track.onended = () => {
            if (event.track.readyState === 'ended') {
              setRemoteStreamVersion((v) => v + 1);
            }
          };
        }
      };
      
      remote.onremovetrack = (event) => {
        if (event.track.kind === 'video') {
          setRemoteStreamVersion((v) => v + 1);
        }
      };
      
      // Check for track changes
      const checkTrackChange = (forceCheck = false) => {
        const currentTrack = remote.getVideoTracks()[0];
        if (currentTrack) {
          const currentTrackId = currentTrack.id;
          const currentTrackLabel = currentTrack.label || '';
          
          if (forceCheck || currentTrackId !== lastTrackId || currentTrackLabel !== lastTrackLabel) {
            lastTrackId = currentTrackId;
            lastTrackLabel = currentTrackLabel;
            remoteStreamRef.current = remote;
            if (videoEl && videoEl.srcObject !== remote) {
              videoEl.srcObject = remote;
            }
            setRemoteStreamVersion((v) => v + 1);
            
            const isScreenShare = currentTrackLabel.toLowerCase().includes('screen') || 
                                 currentTrackLabel.toLowerCase().includes('display') ||
                                 currentTrackLabel.toLowerCase().includes('web-contents');
            
            if (setIsRemoteScreenSharing) {
              setIsRemoteScreenSharing(isScreenShare);
            }
          }
        }
      };
      
      checkTrackChange(true);
      
      const pc = call.peerConnection;
      if (pc) {
        pc.ontrack = (event) => {
          if (event.track.kind === 'video' && event.streams && event.streams.length > 0) {
            const stream = event.streams[0];
            if (stream === remote || (remoteStreamRef.current && stream.id === remoteStreamRef.current.id)) {
              checkTrackChange(true);
            }
          }
        };
      }
      
      const trackMonitor = setInterval(() => {
        checkTrackChange(false);
      }, 2000);
      
      call._trackMonitor = trackMonitor;
      
      call.on('close', () => {
        if (call._trackMonitor) {
          clearInterval(call._trackMonitor);
        }
        if (activeCallsRef.current) {
          activeCallsRef.current.delete(call);
        }
        if (currentCallRef.current === call) {
          currentCallRef.current = null;
        }
        remoteStreamRef.current = null;
        setRemoteStreamVersion((v) => v + 1);
        setRemoteConnected(false);
        setRemoteAudioLevel(0);
      });
    });
  }, [remoteStreamRef, setRemoteStreamVersion, setRemoteConnected, remoteVideoRef, setIsRemoteScreenSharing, currentCallRef, activeCallsRef, setRemoteAudioLevel]);

  // -------------------------------------------------------------
  // Helper function to set up peer event handlers (extracted to avoid duplication)
  // MUST be defined AFTER setupCallHandlers since it uses it
  // -------------------------------------------------------------
  const setupPeerHandlersInline = useCallback((peer, stream) => {
    peer.on('open', () => {
      console.log('✅ Peer connection opened, peer ID:', peer.id);
      
      if (!isHost) {
        connectToHost(stream, peer);
        const dc = peer.connect(meetingId, {
          metadata: { displayName: displayNameRef.current, role: 'participant' },
        });
        registerDataConnection(dc);
      }
    });

    peer.on('connection', (conn) => {
      registerDataConnection(conn);
      // If host receives a connection, also call the participant back
      if (isHost && conn.peer !== peer.id) {
        const call = peer.call(conn.peer, stream, {
          metadata: { displayName: displayNameRef.current, role: 'host' },
        });
        if (call) {
          if (activeCallsRef.current) {
            activeCallsRef.current.add(call);
          }
          setupCallHandlers(call, stream);
        }
      }
    });

    peer.on('call', (call) => {
      currentCallRef.current = call;
      if (activeCallsRef.current) {
        activeCallsRef.current.add(call);
      }
      applyRemoteIdentity(call.metadata || {});
      call.answer(stream);
      setupCallHandlers(call, stream);
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      setMeetingError(err.message || 'Peer connection error');
    });
  }, [isHost, meetingId, displayNameRef, connectToHost, registerDataConnection, applyRemoteIdentity, currentCallRef, activeCallsRef, setMeetingError, setupCallHandlers]);

  // -------------------------------------------------------------
  // Peer initialization (runs ONCE after join)
  // CRITICAL: This effect must NEVER recreate peerConnection or streams
  // Guard against multiple initializations
  // -------------------------------------------------------------
  useEffect(() => {
    if (!hasJoined) {
      // Reset initialization flag when leaving meeting
      hasInitializedRef.current = false;
      return;
    }
    
    // CRITICAL: Prevent multiple initializations
    // If peer already exists and is open, don't recreate it
    if (hasInitializedRef.current && peerRef.current && peerRef.current.open) {
      console.log('⚠️ Peer already initialized and open, skipping re-initialization');
      return;
    }
    
    let cancelled = false;
    hasInitializedRef.current = true;

    const init = async () => {
      try {
        // CRITICAL: If stream already exists, reuse it - don't recreate
        if (localStreamRef.current) {
          console.log('⚠️ Local stream already exists, reusing it');
          // Still need to create peer if it doesn't exist
          if (!peerRef.current) {
            const peer = new Peer(isHost ? meetingId : undefined, {
              host: "peer.testerp.co",
              path: "/myapp",
              secure: true,
              port: 443,
            });
            peerRef.current = peer;
            
            // Set up peer event handlers (inline to access closure variables)
            setupPeerHandlersInline(peer, localStreamRef.current);
          }
          return;
        }
        
        // ---- Get local media ----
        const cam = selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } };
        const mic = selectedMicrophoneId ? { deviceId: { exact: selectedMicrophoneId } } : true;
        const stream = await navigator.mediaDevices.getUserMedia({ video: cam, audio: mic });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;

        const videoTrack = stream.getVideoTracks()[0];
        previousCameraTrackRef.current = videoTrack;
        if (videoTrack) {
          videoTrack.enabled = !isCameraOff;
        }

        const audioTracks = stream.getAudioTracks();
        audioTracks.forEach((t) => {
          t.enabled = !isMuted;
        });
        
        // Update video element immediately
        const videoEl = localVideoRef.current;
        if (videoEl) {
          videoEl.srcObject = stream;
        }
        
        setLocalStreamVersion((v) => v + 1);

        // ---- Create PeerJS instance (ONLY if it doesn't exist) ----
        if (!peerRef.current) {
          const peer = new Peer(isHost ? meetingId : undefined, {
            host: "peer.testerp.co",
            path: "/myapp",
            secure: true,
            port: 443,
          });
          peerRef.current = peer;
          
          // Set up peer event handlers using helper function
          setupPeerHandlersInline(peer, stream);
        } else {
          console.log('⚠️ Peer already exists, reusing existing peer');
        }
      } catch (err) {
        console.error('Failed to initialize peer:', err);
        setMeetingError('Failed to start meeting. Please try again.');
        hasInitializedRef.current = false; // Reset on error
      }
    };

    init();

    return () => {
      cancelled = true;
      // Don't reset hasInitializedRef here - we want to prevent re-initialization
      // Only cleanup on unmount, not on dependency changes
    };
  }, [hasJoined, isHost, meetingId, selectedCameraId, selectedMicrophoneId, isCameraOff, isMuted, displayNameRef, localStreamRef, previousCameraTrackRef, localVideoRef, setLocalStreamVersion, connectToHost, registerDataConnection, setMeetingError, applyRemoteIdentity, currentCallRef, activeCallsRef, remoteStreamRef, setRemoteStreamVersion, setRemoteConnected, remoteVideoRef, setIsRemoteScreenSharing, setRemoteAudioLevel]);

  // -------------------------------------------------------------
  // Return all needed functions and setters
  // -------------------------------------------------------------
  return {
    cleanupConnections,
    connectToHost,
    broadcastMediaState,
    registerDataConnection,
    applyRemoteIdentity,
    handleIncomingData,
    setRemoteAudioLevel,    // <-- NOW RETURNED
    sendScreenShare,         // <-- For screen sharing
    stopScreenShare,        // <-- For stopping screen share
  };
};