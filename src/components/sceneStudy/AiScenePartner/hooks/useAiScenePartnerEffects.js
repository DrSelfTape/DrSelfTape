// Library imports
import { useEffect, useRef } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';

// Redux
import {
  getAudioComposition,
  getScriptAnalysis,
  completeRehearsalSession,
} from '../../../../redux/features/sceneStudyScripts/sceneStudyScriptsSlice';

/**
 * Custom hook for AI Scene Partner effects and data fetching
 * Handles all useEffect logic and data synchronization
 */
export const useAiScenePartnerEffects = ({
  state,
  scriptAnalysis,
  audioData,
  recording,
  audioPlayer,
  checkIsUserLine,
  getLineAudio,
  scrollToLine,
}) => {
  const { scriptId } = useParams();
  const location = useLocation();
  const dispatch = useDispatch();

  const {
    reviewMode,
    setReviewMode,
    setCurrentLineIndex,
    setIsPlayingIndex,
    setPlaybackInfo,
    setLinesWithAudioIssues,
    setScriptData,
    setSelectedCharacter,
    selectedCharacter,
    scriptLines,
    characterOptions,
    tone,
    sessionStarted,
    recordings,
    completedLines,
    isPlayingIndex,
    currentLineIndex,
    teleprompterMode,
    reviewStartIndexRef,
    reviewModeRef,
    setRecordings,
    setCompletedLines,
  } = state;

  const {
    isRecording,
    mediaStreamRef,
    setIsRecording,
  } = recording;

  // Keep reviewModeRef in sync
  useEffect(() => {
    reviewModeRef.current = reviewMode;
  }, [reviewMode, reviewModeRef]);

  // Sync currentLineIndex with audio player
  // CRITICAL: This sync works for BOTH main view and teleprompter mode
  // Both views share the same state.currentLineIndex from useAiScenePartnerState
  // This ensures state consistency when switching between views
  // Only sync from audio player if audioPlayer is actively playing (not when we're manually setting it)
  // This prevents conflicts when manually advancing after recording
  // Track previous audioPlayer currentLineIndex to detect changes even when isPlaying is false
  const prevAudioPlayerLineIndexRef = useRef(audioPlayer?.currentLineIndex);
  
  useEffect(() => {
    const audioPlayerLineIndex = audioPlayer?.currentLineIndex;
    const prevAudioPlayerLineIndex = prevAudioPlayerLineIndexRef.current;
    const lineIndexChanged = audioPlayerLineIndex !== undefined && 
      audioPlayerLineIndex !== null &&
      audioPlayerLineIndex !== prevAudioPlayerLineIndex;
    
    // Sync currentLineIndex from audioPlayer when:
    // 1. Not recording
    // 2. Either audio is playing OR the line index just changed (audio ended, activating user line)
    // This ensures consistent state between main view and teleprompter mode
    if (
      audioPlayerLineIndex !== undefined && 
      audioPlayerLineIndex !== null &&
      audioPlayerLineIndex !== currentLineIndex && 
      !isRecording &&
      (audioPlayer?.isPlaying || lineIndexChanged) // Allow sync when playing OR when index changed (audio just ended)
    ) {
      setCurrentLineIndex(audioPlayerLineIndex);
    }
    
    // Update ref to track changes (only update when value actually changes)
    if (audioPlayerLineIndex !== prevAudioPlayerLineIndexRef.current) {
      prevAudioPlayerLineIndexRef.current = audioPlayerLineIndex;
    }
  }, [audioPlayer?.currentLineIndex, audioPlayer?.isPlaying, currentLineIndex, isRecording, setCurrentLineIndex, teleprompterMode]);

  // Auto-scroll to active line whenever currentLineIndex changes during a live session
  // This ensures the script view tracks along as the AI advances through the scene
  useEffect(() => {
    if (!sessionStarted || teleprompterMode) return;
    scrollToLine(currentLineIndex, audioPlayer);
  }, [currentLineIndex, sessionStarted, teleprompterMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync playbackInfo with audio player
  useEffect(() => {
    if (audioPlayer?.playbackInfo) {
      setPlaybackInfo(audioPlayer.playbackInfo);
    }
  }, [audioPlayer?.playbackInfo, setPlaybackInfo]);

  // Stop preview audio playback when navigating
  useEffect(() => {
    if (audioPlayer?.currentLineIndex === currentLineIndex) return;
    
    if (isPlayingIndex !== null) {
      const currentPlayingRef = state.previewAudioRefs.current[isPlayingIndex] || 
                                 state.previewAudioRefs.current[`rec-${isPlayingIndex}`];
      
      if (currentPlayingRef && !currentPlayingRef.paused) {
        currentPlayingRef.pause();
        currentPlayingRef.currentTime = 0;
        setIsPlayingIndex(null);
        setPlaybackInfo({ index: null, elapsed: 0, duration: 0 });
      }
    }
  }, [currentLineIndex, audioPlayer?.currentLineIndex, isPlayingIndex, setIsPlayingIndex, setPlaybackInfo, state.previewAudioRefs]);

  // Sync isPlayingIndex
  // Keep isPlayingIndex set when paused on the same line (for resume functionality)
  // Only clear it when audio stops completely or moves to a different line
  useEffect(() => {
    const currentLine = audioPlayer?.currentLineIndex;
    const playing = audioPlayer?.isPlaying;
    
    // If there's a current line index (playing or paused)
    if (currentLine !== undefined && currentLine !== null) {
      // Set isPlayingIndex to currentLine when playing OR paused
      // This allows UI to show "Pause" when playing and "Resume" when paused
      setIsPlayingIndex(currentLine);
    } else {
      // No current line - clear isPlayingIndex
      setIsPlayingIndex(null);
    }
  }, [audioPlayer?.isPlaying, audioPlayer?.currentLineIndex, setIsPlayingIndex]);

  // Sync playbackInfo for preview audio
  useEffect(() => {
    if (isPlayingIndex === null) return;

    const ref = state.previewAudioRefs.current[isPlayingIndex] || 
                state.previewAudioRefs.current[`rec-${isPlayingIndex}`];
    if (!ref || ref.paused) return;

    const updateProgress = () => {
      if (ref && !ref.paused && ref.duration && !isNaN(ref.duration)) {
        setPlaybackInfo({
          index: isPlayingIndex,
          elapsed: ref.currentTime || 0,
          duration: ref.duration,
        });
      }
    };

    updateProgress();
    const interval = setInterval(updateProgress, 100);
    return () => clearInterval(interval);
  }, [isPlayingIndex, setPlaybackInfo, state.previewAudioRefs]);

  // Determine version id and fetch data
  const versionId =
    location.state?.script?.latest_version?.id ||
    location.state?.script?.id ||
    scriptId;

  // Use ref to track if we've already loaded for this versionId to prevent duplicate calls
  const lastProcessedVersionIdRef = useRef(null);

  useEffect(() => {
    if (!versionId) return;
    
    // Only process if this is a new versionId
    if (lastProcessedVersionIdRef.current === versionId) {
      return;
    }
    
    // Mark this versionId as processed
    lastProcessedVersionIdRef.current = versionId;
    
    dispatch(getScriptAnalysis(versionId));
    dispatch(getAudioComposition(versionId));
    
    // Always check localStorage for stored session data for this script on page load
    // If found, always call the complete API to get the last analysis
    const storageKey = `rehearsal_session_${versionId}`;
    try {
      const storedData = localStorage.getItem(storageKey);
      if (storedData) {
        const sessionData = JSON.parse(storedData);
        // Double-check: only load if versionId matches current script
        if (sessionData?.sessionId && sessionData?.versionId === versionId) {
          console.log('[useAiScenePartnerEffects] Found stored session data for current script, calling complete API:', sessionData);
          
          // Set loading state to show loading message (don't set pendingSession yet)
          state.setLoadingPreviousAnalysis(true);
          
          // Always call complete API to get the last analysis
          const fd = new FormData();
          fd.append('session_id', String(sessionData.sessionId));
          fd.append('version_id', String(sessionData.versionId));
          
          dispatch(completeRehearsalSession(fd))
            .unwrap()
            .then((res) => {
              const statusData = res?.data || res;
              const status = statusData?.status;
              
              // Clear loading state
              state.setLoadingPreviousAnalysis(false);
              
              // If analysis is available (status is not "running"), store it
              if (status !== 'running' && statusData && (statusData.memorization_percent !== undefined || statusData.coaching_tips)) {
                state.setPerformanceAnalysis(statusData);
                state.setPerformanceAnalysisError(null);
                // Don't set pendingSession for completed analysis
                state.setPendingSession({ sessionId: null, versionId: null });
                console.log('[useAiScenePartnerEffects] Loaded last analysis from stored session');
              } else if (status === 'running') {
                // Still processing, set pendingSession for polling
                state.setPendingSession({
                  sessionId: sessionData.sessionId,
                  versionId: sessionData.versionId,
                });
                console.log('[useAiScenePartnerEffects] Session still processing, polling will continue');
              }
            })
            .catch((err) => {
              console.error('[useAiScenePartnerEffects] Error loading stored session analysis:', err);
              // Clear loading state on error
              state.setLoadingPreviousAnalysis(false);
              // On error, clear the stored data if it's for a different script
              if (sessionData?.versionId !== versionId) {
                localStorage.removeItem(storageKey);
              }
              state.setPendingSession({ sessionId: null, versionId: null });
            });
        } else if (sessionData?.versionId && sessionData.versionId !== versionId) {
          // Stored data is for a different script, clear it
          console.log('[useAiScenePartnerEffects] Stored session data is for different script, clearing:', {
            storedVersionId: sessionData.versionId,
            currentVersionId: versionId
          });
          localStorage.removeItem(storageKey);
        }
      }
    } catch (err) {
      console.warn('[useAiScenePartnerEffects] Error reading from localStorage:', err);
      // If error parsing, clear the stored data
      try {
        localStorage.removeItem(storageKey);
      } catch (clearErr) {
        console.warn('[useAiScenePartnerEffects] Error clearing localStorage:', clearErr);
      }
    }
  }, [dispatch, versionId]);

  // Handle review mode initialization
  useEffect(() => {
    if (reviewMode && reviewStartIndexRef.current !== null && scriptLines.length > 0 && audioPlayer) {
      const startIdx = reviewStartIndexRef.current;
      reviewStartIndexRef.current = null;
      
      setTimeout(() => {
        if (reviewMode && audioPlayer?.playFromCompleted) {
          audioPlayer.playFromCompleted(startIdx);
        }
      }, 350);
    }
  }, [reviewMode, scriptLines.length, audioPlayer, reviewStartIndexRef]);

  // Build script data when analysis or audio arrives
  useEffect(() => {
    if (!scriptAnalysis) return;

    const allCharacterOptions =
      scriptAnalysis?.characters?.map((c) => ({
        label: c?.name,
        value: c?.id,
      })) || [];

    const lines = [];
    const charactersWithLines = new Set(); // Track which characters have lines
    
    scriptAnalysis?.scenes?.forEach((scene) => {
      scene?.lines?.forEach((line) => {
        if (line?.is_stage_direction) return;

        // Track character ID if this line has a character
        if (line?.character?.id) {
          charactersWithLines.add(line.character.id);
        }

        let toneMap = line?.audio_by_tone || {};
        let baseAudio = line?.audio_url || line?.baseAudio || null;
        
        if (!toneMap || Object.keys(toneMap).length === 0) {
          const clipsArray = audioData?.clips || audioData?.data?.clips || null;
          
          if (clipsArray && Array.isArray(clipsArray)) {
            const lineClips = clipsArray.filter(
              (clip) => 
                clip.line_id === line?.id && 
                clip.status === 'completed' && 
                clip.audio_url &&
                clip.audio_url.trim()
            );

            if (lineClips.length > 0) {
              const clipsByTone = {};
              lineClips.forEach((clip) => {
                if (clip.tone && clip.audio_url && clip.audio_url.trim()) {
                  clipsByTone[clip.tone] = {
                    audio_url: clip.audio_url,
                    status: clip.status,
                  };
                }
              });

              if (Object.keys(clipsByTone).length > 0) {
                toneMap = clipsByTone;
                if (!baseAudio) {
                  baseAudio = clipsByTone.neutral?.audio_url || 
                             clipsByTone[Object.keys(clipsByTone)[0]]?.audio_url || 
                             null;
                }
              }
            }
          }
        }
        
        // Store order_index from API - check both order_index and line_index as fallback
        // order_index is the correct field from API, but line_index might be used in some cases
        const orderIndex = line?.order_index !== undefined && line?.order_index !== null
          ? line.order_index
          : (line?.line_index !== undefined && line?.line_index !== null ? line.line_index : null);
        
        lines.push({
          lineId: line?.id,
          order_index: orderIndex, // Store order_index from API (preserve 0 if it's 0)
          character: line?.character?.name || 'Character',
          line: line?.text || '',
          audio_by_tone: toneMap,
          baseAudio,
        });
        
        // Debug log to verify order_index is being stored
        if (line?.id === 1877) {
          console.log('[useAiScenePartnerEffects] Storing line 1877:', {
            lineId: line?.id,
            order_index_from_api: line?.order_index,
            line_index_from_api: line?.line_index,
            order_index_stored: orderIndex,
            fullLineObject: line
          });
        }
      });
    });

    // Filter characterOptions to only include characters that have lines
    const characterOptions = allCharacterOptions.filter((char) => 
      charactersWithLines.has(char.value)
    );

    setScriptData((prev) => ({
      ...prev,
      title: scriptAnalysis?.script?.title || 'Rehearsal Script',
      scene: scriptAnalysis?.script?.description || '',
      scriptLines: lines,
      characterOptions,
    }));
  }, [scriptAnalysis, audioData, setScriptData]);

  // Pre-check partner lines for missing audio
  useEffect(() => {
    if (!scriptLines.length || !selectedCharacter) {
      setLinesWithAudioIssues(new Set());
      return;
    }
    
    const issues = new Set();
    scriptLines.forEach((line, index) => {
      const isUser = selectedCharacter && 
        line.character?.toLowerCase() === selectedCharacter.label?.toLowerCase();
      
      if (!isUser) {
        const audioSrc = getLineAudio(line, tone);
        if (!audioSrc || !audioSrc.trim()) {
          issues.add(index);
        } else {
          issues.delete(index);
        }
      }
    });

    setLinesWithAudioIssues(issues);
  }, [scriptLines, selectedCharacter, tone, getLineAudio, setLinesWithAudioIssues]);

  // Reset session when character changes
  useEffect(() => {
    if (!sessionStarted) {
      setReviewMode(false);
      setCurrentLineIndex(0);
      setRecordings([]);
      setIsRecording(false);
      setIsPlayingIndex(null);
      setCompletedLines(new Set());
    }
  }, [selectedCharacter, sessionStarted, setReviewMode, setCurrentLineIndex, setRecordings, setIsRecording, setIsPlayingIndex, setCompletedLines]);

  // Reset selectedCharacter when scriptId changes to prevent showing numbers
  useEffect(() => {
    setSelectedCharacter(null);
  }, [scriptId, setSelectedCharacter]);

  // Validate selectedCharacter when characterOptions change
  // If selectedCharacter doesn't match any option, reset it to null
  useEffect(() => {
    if (selectedCharacter && characterOptions.length > 0) {
      const isValid = characterOptions.some(
        (opt) => opt.value === (selectedCharacter?.value ?? selectedCharacter)
      );
      if (!isValid) {
        console.log('[useAiScenePartnerEffects] Selected character is invalid, resetting to null');
        setSelectedCharacter(null);
      }
    }
  }, [characterOptions, selectedCharacter, setSelectedCharacter]);

  // Auto-play partner lines in teleprompter mode
  // NOTE: This is disabled because auto-advance is already handled by handleAudioEnded in useScriptAudioPlayer
  // Re-enabling this causes infinite loops when partner audio ends and auto-advances
  // The auto-advance logic in handleAudioEnded already plays partner lines correctly
  // useEffect(() => {
  //   const current = scriptLines[currentLineIndex];
  //   if (!teleprompterMode || !sessionStarted || !current || reviewMode) return;
  //   if (!checkIsUserLine(current)) {
  //     const audioUrl = getLineAudio(current);
  //     if (audioUrl) {
  //       if (audioPlayer) {
  //         audioPlayer.playLine(currentLineIndex, { skipIfNoAudio: true });
  //       }
  //     } else {
  //       // Find next line with audio logic would go here if needed
  //     }
  //   }
  // }, [teleprompterMode, currentLineIndex, sessionStarted, scriptLines, checkIsUserLine, audioPlayer, reviewMode, getLineAudio]);

  // Poll rehearsal session status using the complete endpoint
  // Pattern similar to ScriptUploadAndListing.jsx
  const { pendingSession, setPendingSession } = state;

  useEffect(() => {
    // Check if we have a pending session AND it matches the current scriptId/versionId
    const hasPending = pendingSession?.sessionId && pendingSession?.versionId;
    const matchesCurrentScript = pendingSession?.versionId === versionId;
    
    // If we have a pending session but it's for a different script, clear it
    if (hasPending && !matchesCurrentScript) {
      console.log('[useAiScenePartnerEffects] Clearing pending session - different script:', {
        pendingVersionId: pendingSession?.versionId,
        currentVersionId: versionId,
      });
      setPendingSession({ sessionId: null, versionId: null });
      return;
    }
    
    if (!hasPending || !matchesCurrentScript) {
      return;
    }

    // Set up polling interval - only check every 5 seconds (no immediate call)
    const interval = setInterval(() => {
      // Use values from current pendingSession (captured in closure)
      const sessionId = pendingSession?.sessionId;
      const pendingVersionId = pendingSession?.versionId;
      
      // Double-check that the pending session still matches current script
      if (!sessionId || !pendingVersionId || pendingVersionId !== versionId) {
        // If values are cleared or script changed, stop polling
        setPendingSession({ sessionId: null, versionId: null });
        return;
      }

      // Check status by calling the complete endpoint (without audio files)
      const fd = new FormData();
      fd.append('session_id', String(sessionId));
      fd.append('version_id', String(pendingVersionId));
      // Don't append any audios - just checking status

      dispatch(completeRehearsalSession(fd))
        .unwrap()
        .then((res) => {
          const statusData = res?.data || res;
          const status = statusData?.status;
          
          // If status is no longer "running", stop polling and store analysis data
          if (status !== 'running') {
            // Store analysis data if available
            if (statusData && (statusData.memorization_percent !== undefined || statusData.coaching_tips)) {
              state.setPerformanceAnalysis(statusData);
              state.setPerformanceAnalysisError(null);
            }
            setPendingSession({ sessionId: null, versionId: null });
            
            // Keep the session data in localStorage even after polling stops
            // This allows showing the last analysis on next page load
            // (The data is already stored when completeRehearsalSession is first called)
          }
        })
        .catch((err) => {
          console.error('Error checking rehearsal status:', err);
          // On error, stop polling and set error state
          state.setPerformanceAnalysisError('Failed to load performance insights. Please try again.');
          setPendingSession({ sessionId: null, versionId: null });
        });
    }, 5000);

    // Cleanup: clear interval on unmount or when dependencies change
    return () => clearInterval(interval);
  }, [pendingSession, versionId, dispatch, setPendingSession, state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recording?.stopRecording) {
        recording.stopRecording();
      }
      // Stop all playback logic
      if (mediaStreamRef?.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      recordings.forEach((r) => {
        if (r.url) URL.revokeObjectURL(r.url);
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    versionId,
    scriptId,
  };
};

