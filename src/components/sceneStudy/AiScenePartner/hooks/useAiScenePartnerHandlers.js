// Library imports
import { useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setUserItem, removeUserItem, getCurrentUserId } from '../../../../utils/userStorage';

// Redux
import {
  startRehearsalSession,
  completeRehearsalSession,
} from '../../../../redux/features/sceneStudyScripts/sceneStudyScriptsSlice';

// Hooks
import { useSnackbar } from '../../../../hooks/useSnackbar';

/**
 * Custom hook for AI Scene Partner handlers
 * Contains all event handlers and business logic functions
 */
export const useAiScenePartnerHandlers = ({
  state,
  recording,
  audioPlayer,
  helpers,
  scriptAnalysis,
  versionId,
}) => {
  const dispatch = useDispatch();
  const { toast } = useSnackbar();
  const pendingNavigationRef = useRef(null); // Track pending navigation to handle async operations
  
  const {
    selectedCharacter,
    scriptLines,
    tone,
    sessionStarted,
    setSessionStarted,
    setSessionId,
    setReviewMode,
    setCurrentLineIndex,
    setAudioValidationModal,
    setEndSessionModal,
    setRecordings,
    setCompletedLines,
    recordings,
    completedLines,
    setPendingSession,
    previewAudioRefs,
    setIsPlayingIndex,
    setPlaybackInfo,
    reviewStartIndexRef,
    teleprompterMode,
    scriptData,
  } = state;

  const {
    isRecording,
    recordTimer,
    mediaRecorderRef,
    chunksRef,
    ensureRecorder,
    stopRecording,
    startTimer,
    stopTimer,
    setIsRecording,
    cleanup: cleanupRecording,
  } = recording;

  const {
    checkIsUserLine,
    getLineAudio,
    findNextLineWithAudio,
    getLastCompletedLineIndex,
    findNextCompletedLine,
    findPreviousCompletedLine,
    scrollToLine,
  } = helpers;

  // Validate partner audios
  const validatePartnerAudios = useCallback(() => {
    if (!scriptLines || scriptLines.length === 0) return { isValid: true, missingLines: [] };
    
    const missingLines = [];
    scriptLines.forEach((line, index) => {
      if (!checkIsUserLine(line)) {
        const audioSrc = getLineAudio(line);
        if (!audioSrc) {
          missingLines.push({ index: index + 1, line: line.line || 'N/A', character: line.character });
        }
      }
    });
    
    return {
      isValid: missingLines.length === 0,
      missingLines,
    };
  }, [scriptLines, checkIsUserLine, getLineAudio]);

  // Stop all playback
  const stopAllPlayback = useCallback(() => {
    if (audioPlayer) {
      audioPlayer.stopPlayback();
    }
    Object.values(state.partnerAudioRefs.current).forEach((audio) => {
      if (audio && !audio.paused) audio.pause();
    });

    Object.values(state.recordingPlayRefs.current).forEach((audio) => {
      if (audio && !audio.paused) audio.pause();
    });

    Object.values(previewAudioRefs.current).forEach((audio) => {
      if (audio && !audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    
    setIsPlayingIndex(null);
    setPlaybackInfo({ index: null, elapsed: 0, duration: 0 });
  }, [audioPlayer, state.partnerAudioRefs, state.recordingPlayRefs, previewAudioRefs, setIsPlayingIndex, setPlaybackInfo]);

  // Extract API call logic to be reusable
  const startRehearsalSessionAPI = useCallback(() => {
    if (!selectedCharacter) return;

    // Clear any existing pending session from localStorage and state to stop polling
    setPendingSession({ sessionId: null, versionId: null });
    // Clear previous analysis data for clean state
    state.setPerformanceAnalysis(null);
    state.setPerformanceAnalysisError(null);
    state.setLoadingPreviousAnalysis(false);
    
    // Clear localStorage data for current script when starting new rehearsal.
    // Per-user namespaced — see useAiScenePartnerEffects.js for the matching read.
    if (versionId) {
      const storageKey = `rehearsal_session_${versionId}`;
      removeUserItem(getCurrentUserId(), storageKey);
    }

    const sceneId =
      scriptAnalysis?.scenes && scriptAnalysis.scenes.length > 0
        ? scriptAnalysis.scenes[0]?.id || null
        : null;

    const payload = {
      version_id: versionId || null,
      scene_id: sceneId,
      character_id: selectedCharacter?.value || null,
      preset_name: 'Default',
      tone,
    };

    dispatch(startRehearsalSession(payload))
      .unwrap()
      .then((res) => {
        const sid = res?.session_id || res?.id || null;
        if (!sid) {
          toast.error('Failed to start session: No session ID received');
          return;
        }
        setSessionId(sid);
        setSessionStarted(true);
        setCompletedLines(new Set());
        // Clear error state when starting new session
        state.setPerformanceAnalysisError(null);
        toast.success('Rehearsal session started successfully');
      })
      .catch((err) => {
        const errorMessage = typeof err === 'string' ? err : 'Failed to start rehearsal session';
        toast.error(errorMessage);
        console.error('Start session error', err);
      });
  }, [
    selectedCharacter,
    scriptAnalysis,
    versionId,
    tone,
    setSessionId,
    setSessionStarted,
    setCompletedLines,
    setPendingSession,
    state,
    dispatch,
    toast,
  ]);

  // Handle start session
  const handleStartSession = useCallback(() => {
    if (!selectedCharacter) return;

    stopAllPlayback();
    setReviewMode(false);

    const validation = validatePartnerAudios();
    if (!validation.isValid) {
      setAudioValidationModal({
        open: true,
        missingLines: validation.missingLines,
      });
      return;
    }

    // If validation passes, call API
    startRehearsalSessionAPI();
  }, [
    selectedCharacter,
    stopAllPlayback,
    setReviewMode,
    validatePartnerAudios,
    setAudioValidationModal,
    startRehearsalSessionAPI,
  ]);

  // Handle end session
  const handleEndSession = useCallback(() => {
    // Stop all audio playback immediately when opening end session modal
    console.log('[handleEndSession] Stopping all audio and operations');
    if (audioPlayer) {
      audioPlayer.stopPlayback();
    }
    stopAllPlayback();
    
    // Stop any ongoing recording
    stopRecording();
    
    // Clear playing index to ensure UI updates
    setIsPlayingIndex(null);
    setPlaybackInfo({ index: null, elapsed: 0, duration: 0 });
    
    // Open the modal
    setEndSessionModal({ open: true });
  }, [setEndSessionModal, audioPlayer, stopAllPlayback, stopRecording, setIsPlayingIndex, setPlaybackInfo]);

  // Confirm end session
  const confirmEndSession = useCallback(() => {
    stopRecording();
    stopAllPlayback();
    
    // Filter to only include recordings for USER lines (not partner lines)
    // Sort by index to maintain script order
    const userRecordings = recordings
      .filter((r) => {
        const line = scriptData.scriptLines[r.index];
        return line && checkIsUserLine(line) && r.blob;
      })
      .sort((a, b) => a.index - b.index);

    if (userRecordings.length === 0) {
      toast.warning('No user recordings to upload');
      setSessionStarted(false);
      setReviewMode(false);
      setEndSessionModal({ open: false });
      setCompletedLines(new Set());
      return;
    }

    // Prepare audio data for upload
    const audios = userRecordings.map((r) => {
      const line = scriptData.scriptLines[r.index];
      
      if (!line) {
        console.error('[confirmEndSession] No line found at index:', r.index);
        return null;
      }
      
      // Always try to get order_index from original scriptAnalysis first (most reliable)
      // Search through scriptAnalysis to find the line by ID and get its order_index
      let orderIndex = null;
      if (scriptAnalysis && line?.lineId) {
        scriptAnalysis?.scenes?.forEach((scene) => {
          scene?.lines?.forEach((apiLine) => {
            if (apiLine?.id === line?.lineId) {
              // Prefer order_index, fallback to line_index if order_index not available
              if (apiLine?.order_index !== undefined && apiLine?.order_index !== null) {
                orderIndex = apiLine.order_index;
              } else if (apiLine?.line_index !== undefined && apiLine?.line_index !== null) {
                orderIndex = apiLine.line_index;
              }
            }
          });
        });
      }
      
      // If not found in scriptAnalysis, try from stored line object
      if (orderIndex === null && line?.order_index !== null && line?.order_index !== undefined) {
        orderIndex = line.order_index;
      }
      
      // Final fallback: use array index + 1
      if (orderIndex === null) {
        orderIndex = r.index + 1;
      }
      
      console.log('[confirmEndSession] Line data:', {
        arrayIndex: r.index,
        lineId: line?.lineId,
        order_index_from_scriptAnalysis: orderIndex !== (r.index + 1) ? orderIndex : 'not found',
        order_index_from_stored_line: line?.order_index,
        order_index_final: orderIndex,
        lineText: line?.line?.substring(0, 50)
      });
      
      return {
        line_id: line?.lineId || null,
        order_index: orderIndex,
        tone: r.tone || tone,
        file: r.blob,
      };
    }).filter((a) => a !== null && a.line_id !== null); // Ensure line_id exists and filter out nulls

    if (audios.length === 0) {
      toast.warning('No valid recordings with line ID to upload');
      setSessionStarted(false);
      setReviewMode(false);
      setEndSessionModal({ open: false });
      setCompletedLines(new Set());
      return;
    }

    const fd = new FormData();
    fd.append('session_id', String(state.sessionId || ''));
    fd.append('version_id', String(versionId || ''));

    audios.forEach((a, i) => {
      fd.append(`audios[${i}].line_id`, String(a.line_id));
      fd.append(`audios[${i}].order_index`, String(a.order_index));
      fd.append(`audios[${i}].tone`, a.tone);
      // Append file with filename - browsers need filename for proper multipart encoding
      // Postman adds filename automatically, but browser FormData needs it explicitly
      const fileName = `audio_${a.line_id}_${Date.now()}.webm`;
      fd.append(`audios[${i}].file`, a.file, fileName);
    });

    dispatch(completeRehearsalSession(fd))
      .unwrap()
      .then((res) => {
        setSessionStarted(false);
        setReviewMode(false);
        setEndSessionModal({ open: false });
        setCompletedLines(new Set());
        
        // Get response data
        const statusData = res?.data || res;
        const status = statusData?.status;
        const responseSessionId = statusData?.session_id || res?.session_id;
        
        // Always store session_id and version_id in localStorage for this script
        // This allows us to show the last analysis when user returns to the page
        if (responseSessionId && versionId) {
          const storageKey = `rehearsal_session_${versionId}`;
          const sessionData = {
            sessionId: responseSessionId,
            versionId: versionId,
            timestamp: Date.now(),
          };
          setUserItem(getCurrentUserId(), storageKey, JSON.stringify(sessionData));
        }
        
        if (status === 'running' && responseSessionId) {
          // Store both sessionId and versionId for polling
          setPendingSession({ sessionId: responseSessionId, versionId });
          toast.success('Rehearsal session submitted. Processing in progress...');
        } else {
          // If analysis is already available, store it
          if (statusData && (statusData.memorization_percent !== undefined || statusData.coaching_tips)) {
            state.setPerformanceAnalysis(statusData);
            state.setPerformanceAnalysisError(null);
          }
          toast.success('Rehearsal session completed successfully');
        }
      })
      .catch((err) => {
        const errorMessage = typeof err === 'string' ? err : 'Failed to complete rehearsal session';
        toast.error(errorMessage);
        console.error('Complete session error', err);
        setEndSessionModal({ open: false });
      });
  }, [
    stopRecording,
    stopAllPlayback,
    recordings,
    scriptData,
    checkIsUserLine, // Add checkIsUserLine to dependencies
    tone,
    state.sessionId,
    versionId,
    setSessionStarted,
    setReviewMode,
    setEndSessionModal,
    setCompletedLines,
    dispatch,
    toast,
  ]);

  // Handle tone change
  const handleToneChange = useCallback((value) => {
    if (sessionStarted) return;
    state.setTone(value);
  }, [sessionStarted, state]);

  // Handle play non-user line
  const handlePlayNonUserLine = useCallback((index, callOptions = {}) => {
    console.log('=== [handlePlayNonUserLine] START ===');
    console.log('[handlePlayNonUserLine] Called with index:', index);
    console.log('[handlePlayNonUserLine] callOptions:', callOptions);
    console.log('[handlePlayNonUserLine] teleprompterMode:', teleprompterMode);
    console.log('[handlePlayNonUserLine] hasAudioPlayer:', !!audioPlayer);
    console.log('[handlePlayNonUserLine] audioPlayer.isPlaying:', audioPlayer?.isPlaying);
    console.log('[handlePlayNonUserLine] audioPlayer.currentLineIndex:', audioPlayer?.currentLineIndex);
    
    if (!audioPlayer) {
      console.log('[handlePlayNonUserLine] ERROR: No audioPlayer available');
      console.log('=== [handlePlayNonUserLine] END (no audioPlayer) ===');
      return;
    }
    
    // If forcePlay is true (e.g., from playNextPartnerAfter), always play fresh
    // Skip pause/resume logic and go straight to playing
    if (!callOptions.forcePlay) {
      // WhatsApp-like play/pause/resume behavior:
      // 1. If the same line is currently playing, pause it
      // 2. If the same line is paused, resume it
      // 3. If a different line is clicked, stop current and play new line
      
      const isSameLine = audioPlayer.currentLineIndex === index;
      const isCurrentlyPlaying = audioPlayer.isPlaying && isSameLine;
      // Check if paused: same line, not playing, and has active audio ref that is paused
      const activeAudio = audioPlayer.activeAudioRef?.current;
      const isCurrentlyPaused = !audioPlayer.isPlaying && isSameLine && activeAudio && activeAudio.paused;
      
      console.log('[handlePlayNonUserLine] isSameLine:', isSameLine);
      console.log('[handlePlayNonUserLine] isCurrentlyPlaying:', isCurrentlyPlaying);
      console.log('[handlePlayNonUserLine] isCurrentlyPaused:', isCurrentlyPaused);
      console.log('[handlePlayNonUserLine] activeAudio exists:', !!activeAudio);
      console.log('[handlePlayNonUserLine] activeAudio paused:', activeAudio?.paused);
      console.log('[handlePlayNonUserLine] activeAudio currentTime:', activeAudio?.currentTime);
      
      // Case 1: Same line is playing - pause it
      if (isCurrentlyPlaying) {
        console.log('[handlePlayNonUserLine] Same line is playing - pausing');
        audioPlayer.pausePlayback();
        console.log('=== [handlePlayNonUserLine] END (paused) ===');
        return;
      }
      
      // Case 2: Same line is paused - resume it (only if we have an active audio element)
      if (isCurrentlyPaused) {
        console.log('[handlePlayNonUserLine] Same line is paused - attempting to resume');
        console.log('[handlePlayNonUserLine] activeAudioRef exists:', !!audioPlayer.activeAudioRef?.current);
        console.log('[handlePlayNonUserLine] activeAudioRef paused:', audioPlayer.activeAudioRef?.current?.paused);
        console.log('[handlePlayNonUserLine] activeAudioRef currentTime:', audioPlayer.activeAudioRef?.current?.currentTime);
        console.log('[handlePlayNonUserLine] activeAudioRef src:', audioPlayer.activeAudioRef?.current?.src);
        
        const activeAudio = audioPlayer.activeAudioRef?.current;
        if (activeAudio && activeAudio.paused) {
          // Verify the audio element still has the correct src and is ready
          const expectedAudioUrl = getLineAudio && getLineAudio(line);
          if (activeAudio.src && (activeAudio.src === expectedAudioUrl || activeAudio.src.includes(expectedAudioUrl?.split('?')[0]))) {
            console.log('[handlePlayNonUserLine] Audio element is valid, resuming from currentTime:', activeAudio.currentTime);
            audioPlayer.resumePlayback();
            console.log('=== [handlePlayNonUserLine] END (resumed) ===');
            return;
          } else {
            console.log('[handlePlayNonUserLine] Audio element src mismatch, will play from start');
            console.log('[handlePlayNonUserLine] Expected:', expectedAudioUrl);
            console.log('[handlePlayNonUserLine] Actual:', activeAudio.src);
          }
        } else {
          console.log('[handlePlayNonUserLine] No valid activeAudioRef or not paused, will play from start');
        }
      }
    } else {
      console.log('[handlePlayNonUserLine] forcePlay is true - skipping pause/resume, playing fresh');
    }
    
    // Case 3: Different line or no line playing - stop current (if any) and play new line
    // Check if line exists and has audio (same as main screen logic)
    const line = scriptLines[index];
    console.log('[handlePlayNonUserLine] Line exists:', !!line, 'line text:', line?.line?.substring(0, 50));
    if (!line) {
      console.log('[handlePlayNonUserLine] ERROR: No line found at index:', index);
      console.log('=== [handlePlayNonUserLine] END (no line) ===');
      return;
    }
    
    const audioUrl = getLineAudio && getLineAudio(line);
    console.log('[handlePlayNonUserLine] Audio URL exists:', !!audioUrl, 'URL:', audioUrl);
    if (!audioUrl) {
      console.log('[handlePlayNonUserLine] ERROR: No audio URL for this line');
      console.log('=== [handlePlayNonUserLine] END (no audio URL) ===');
      return;
    }
    
    // Stop any currently playing audio before starting new playback
    if (audioPlayer.isPlaying) {
      console.log('[handlePlayNonUserLine] Stopping current playback before playing new line');
      audioPlayer.stopPlayback();
    }
    
    // In teleprompter mode, playbackMode is 'teleprompter' which checks for completed lines
    // We need to force 'rehearsal' mode to bypass this check (same behavior as main screen)
    // Main screen uses 'rehearsal' mode, so partner lines play without completion check
    const options = teleprompterMode 
      ? { skipIfNoAudio: true, forceMode: 'rehearsal' }
      : { skipIfNoAudio: true };
    console.log('[handlePlayNonUserLine] Calling playLine with options:', JSON.stringify(options));
    console.log('[handlePlayNonUserLine] audioPlayer mode (if available):', audioPlayer?.mode);
    
    // playLine returns a Promise - call it directly like main screen does
    const playResult = audioPlayer.playLine(index, options);
    console.log('[handlePlayNonUserLine] playLine returned:', playResult);
    if (playResult && typeof playResult.then === 'function') {
      playResult.then((result) => {
        console.log('[handlePlayNonUserLine] playLine promise resolved with:', result);
        if (result === false) {
          console.error('[handlePlayNonUserLine] ERROR: playLine returned false - audio did not play');
        } else {
          console.log('[handlePlayNonUserLine] SUCCESS: playLine returned true - audio should be playing');
        }
        console.log('=== [handlePlayNonUserLine] END (promise resolved) ===');
      }).catch((error) => {
        console.error('[handlePlayNonUserLine] ERROR: playLine promise rejected:', error);
        console.log('=== [handlePlayNonUserLine] END (promise rejected) ===');
      });
    } else {
      console.log('[handlePlayNonUserLine] playLine did not return a promise, result:', playResult);
      console.log('=== [handlePlayNonUserLine] END (no promise) ===');
    }
  }, [audioPlayer, teleprompterMode, scriptLines, getLineAudio]);

  // Play next partner after recording completes
  const playNextPartnerAfter = useCallback((fromIndex) => {
    console.log('=== [playNextPartnerAfter] START ===');
    console.log('[playNextPartnerAfter] Called with fromIndex:', fromIndex);
    console.log('[playNextPartnerAfter] teleprompterMode:', teleprompterMode);
    console.log('[playNextPartnerAfter] hasAudioPlayer:', !!audioPlayer);
    
    // Don't auto-advance if end session modal is open
    if (state.endSessionModal?.open) {
      console.log('[playNextPartnerAfter] End session modal is open, skipping auto-advance');
      return;
    }
    
    // Find next line (user line always returns, partner line only if has audio)
    const next = findNextLineWithAudio(fromIndex);
    console.log('[playNextPartnerAfter] findNextLineWithAudio returned:', next);

    if (next < 0 || next >= scriptLines.length) {
      console.log('[playNextPartnerAfter] ERROR: Invalid next index, returning');
      console.log('=== [playNextPartnerAfter] END (invalid index) ===');
      return;
    }

    const nextLine = scriptLines[next];
    console.log('[playNextPartnerAfter] Next line exists:', !!nextLine);
    if (!nextLine) {
      console.log('[playNextPartnerAfter] ERROR: No next line found, returning');
      console.log('=== [playNextPartnerAfter] END (no line) ===');
      return;
    }
    
    const isUserLine = checkIsUserLine(nextLine);
    console.log('[playNextPartnerAfter] Next line is user line:', isUserLine, 'line text:', nextLine?.line?.substring(0, 50));
    
    // Always move to next line first - this makes it accessible
    // Update state - this will trigger re-render and make line active
    console.log('[playNextPartnerAfter] Setting currentLineIndex to:', next);
    setCurrentLineIndex(next);
    
    // Scroll immediately (state update will happen asynchronously)
    // Scroll to line if not in teleprompter mode
    if (!teleprompterMode) {
      console.log('[playNextPartnerAfter] Not teleprompter mode, scheduling scroll');
      setTimeout(() => {
        scrollToLine(next, audioPlayer);
      }, 50);
    } else {
      console.log('[playNextPartnerAfter] Teleprompter mode, skipping scroll');
    }
    
    // If it's a partner line, try to play it automatically after state update
    if (!isUserLine) {
      const lineAudio = getLineAudio(nextLine);
      if (lineAudio && audioPlayer) {
        console.log('[playNextPartnerAfter] Next line is partner line WITH audio, scheduling playback in 150ms');
        setTimeout(() => {
          console.log('[playNextPartnerAfter] Executing handlePlayNonUserLine after timeout');
          handlePlayNonUserLine(next, { forcePlay: true });
        }, 150);
      } else {
        // Partner line without audio — still navigated to it above, now auto-advance past it
        console.log('[playNextPartnerAfter] Partner line has no audio, auto-advancing past it');
        setTimeout(() => {
          playNextPartnerAfter(next);
        }, 300);
      }
    } else {
      console.log('[playNextPartnerAfter] Next line is user line - waiting for recording');
      console.log('=== [playNextPartnerAfter] END (no playback) ===');
    }
  }, [scriptLines, checkIsUserLine, audioPlayer, teleprompterMode, findNextLineWithAudio, setCurrentLineIndex, scrollToLine, handlePlayNonUserLine, getLineAudio, state.endSessionModal]);

  // Handle record toggle
  const handleRecordToggle = useCallback(async (index) => {
    console.log('[handleRecordToggle] Record button clicked, index:', index);
    console.log('[handleRecordToggle] reviewMode:', state.reviewMode);
    if (!sessionStarted) return;

    // Stop all audio playback when starting/stopping recording (especially in review mode)
    if (audioPlayer) {
      audioPlayer.stopPlayback();
    }
    stopAllPlayback();

    const recorder = mediaRecorderRef.current;

    // If currently recording, stop and move to next line
    if (recorder && recorder.state === 'recording') {
      const currentIndex = index;
      const currentTimer = recordTimer;

      recorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);

          setRecordings((prevRecs) => {
            prevRecs
              .filter((r) => r.index === currentIndex && r.url)
              .forEach((r) => URL.revokeObjectURL(r.url));
            const filtered = prevRecs.filter((r) => r.index !== currentIndex);
            return [...filtered, { index: currentIndex, tone, url, blob, duration: currentTimer }];
          });

          setCompletedLines((prev) => new Set([...prev, currentIndex]));
        }

        chunksRef.current = [];

        // Continue after recording stops - move to next line
        // This applies to both review mode and normal mode
        // Do NOT call stopAllPlayback() here — it resets activeLineIndexRef in the
        // audio player, which breaks the guard in handleAudioEnded and prevents
        // the script from advancing past the first partner line after recording.
        // playNextPartnerAfter handles playback correctly on its own.
        setTimeout(() => {
          playNextPartnerAfter(currentIndex);
        }, 100);
      };

      recorder.stop();
      setIsRecording(false);
      stopTimer();

      return;
    }

    // Starting a new recording
    const ready = await ensureRecorder();
    if (!ready) return;

    const rec = mediaRecorderRef.current;
    if (!rec) return;

    chunksRef.current = [];
    rec.onstop = () => {
      if (chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);

        setRecordings((prevRecs) => {
          prevRecs
            .filter((r) => r.index === index && r.url)
            .forEach((r) => URL.revokeObjectURL(r.url));
          const filtered = prevRecs.filter((r) => r.index !== index);
          return [...filtered, { 
            index, 
            tone, 
            url, 
            blob, 
            duration: recordTimer
          }];
        });

        setCompletedLines((prev) => new Set([...prev, index]));
      }

      chunksRef.current = [];
    };

    try {
      if (rec.state !== 'inactive') return;
      
      rec.start();
      setIsRecording(true);
      startTimer();
      setCurrentLineIndex(index);
      scrollToLine(index, audioPlayer);
    } catch (err) {
      console.error('MediaRecorder start error', err);
      alert('Unable to start recording. Please try again or switch browser.');
      setIsRecording(false);
      stopTimer();
      cleanupRecording();
    }
  }, [
    sessionStarted,
    mediaRecorderRef,
    recordTimer,
    chunksRef,
    setRecordings,
    setCompletedLines,
    tone,
    setIsRecording,
    stopTimer,
    stopAllPlayback,
    playNextPartnerAfter,
    ensureRecorder,
    setCurrentLineIndex,
    scrollToLine,
    audioPlayer,
    startTimer,
    cleanupRecording,
    state.reviewMode,
  ]);

  // Handle restart line
  const handleRestartLine = useCallback((index) => {
    console.log('[handleRestartLine] Remove recording clicked, index:', index);
    // Stop all audio playback when removing recording
    if (audioPlayer) {
      audioPlayer.stopPlayback();
    }
    stopAllPlayback();
    
    const rec = recordings.find((r) => r.index === index && r.url);

    if (rec?.url) URL.revokeObjectURL(rec.url);
    
    const ref1 = previewAudioRefs.current[index];
    const ref2 = previewAudioRefs.current[`rec-${index}`];
    if (ref1) {
      ref1.pause();
      ref1.currentTime = 0;
      ref1.src = '';
    }
    if (ref2 && ref2 !== ref1) {
      ref2.pause();
      ref2.currentTime = 0;
      ref2.src = '';
    }
    
    delete previewAudioRefs.current[index];
    delete previewAudioRefs.current[`rec-${index}`];
    
    if (state.isPlayingIndex === index) {
      setIsPlayingIndex(null);
      setPlaybackInfo({ index: null, elapsed: 0, duration: 0 });
    }
    
    setRecordings((prev) => prev.filter((r) => r.index !== index));
    setCompletedLines((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, [recordings, previewAudioRefs, state.isPlayingIndex, setIsPlayingIndex, setPlaybackInfo, setRecordings, setCompletedLines, audioPlayer, stopAllPlayback]);

  // Play recording for index
  const playRecordingForIndex = useCallback((index) => {
    console.log('[playRecordingForIndex] Called, index:', index);
    const rec = recordings.find((r) => r.index === index && r.url);
    if (!rec?.url) {
      console.log('[playRecordingForIndex] No recording found for index:', index);
      return;
    }

    // Get audio ref - check both possible keys
    // RecordingPreview component may have created the ref, or we need to create it
    let ref = previewAudioRefs.current[`rec-${index}`] || previewAudioRefs.current[index];

    // If ref doesn't exist or is invalid, create a new one
    if (!ref || !(ref instanceof HTMLAudioElement)) {
      console.log('[playRecordingForIndex] Creating new audio element');
      // Clean up old ref if it exists but is invalid
      if (ref && !(ref instanceof HTMLAudioElement)) {
        try {
          if (ref.pause) ref.pause();
          if (ref.src) ref.src = '';
        } catch (e) {
          console.warn('[playRecordingForIndex] Error cleaning up invalid ref:', e);
        }
      }
      ref = new Audio();
      previewAudioRefs.current[`rec-${index}`] = ref;
      previewAudioRefs.current[index] = ref;
    }
    
    // Check current state BEFORE stopping other audio
    // This allows us to detect if we're clicking the same recording
    const refSrc = ref.src || '';
    const recUrl = rec.url || '';
    const normalizeUrl = (url) => {
      if (!url) return '';
      try {
        const urlObj = new URL(url);
        return urlObj.pathname + urlObj.search;
      } catch {
        return url.split('#')[0].trim();
      }
    };
    const refSrcNormalized = normalizeUrl(refSrc);
    const recUrlNormalized = normalizeUrl(recUrl);
    const hasCorrectSrc = refSrcNormalized === recUrlNormalized || refSrc === recUrl || refSrc.includes(recUrl) || recUrl.includes(refSrc);
    
    // Check if this is the currently active recording
    const isActiveRecording = state.isPlayingIndex === index;
    const isActuallyPlaying = isActiveRecording && ref && !ref.paused;
    const isActuallyPaused = isActiveRecording && ref && ref.paused;
    
    console.log('[playRecordingForIndex] ref exists:', !!ref);
    console.log('[playRecordingForIndex] ref.src:', refSrc);
    console.log('[playRecordingForIndex] rec.url:', recUrl);
    console.log('[playRecordingForIndex] hasCorrectSrc:', hasCorrectSrc);
    console.log('[playRecordingForIndex] isActiveRecording:', isActiveRecording);
    console.log('[playRecordingForIndex] isActuallyPlaying:', isActuallyPlaying);
    console.log('[playRecordingForIndex] isActuallyPaused:', isActuallyPaused);
    console.log('[playRecordingForIndex] ref.paused:', ref.paused);
    console.log('[playRecordingForIndex] ref.readyState:', ref.readyState);
    
    // If currently playing (same recording), pause it
    if (isActuallyPlaying) {
      console.log('[playRecordingForIndex] Pausing recording');
      ref.pause();
      // Keep isPlayingIndex set for resume functionality
      setIsPlayingIndex(index);
      return;
    }
    
    // If currently paused (same recording), resume it
    if (isActuallyPaused) {
      console.log('[playRecordingForIndex] Resuming recording');
      ref.play().catch((err) => {
        console.error('[playRecordingForIndex] Resume error:', err);
        setIsPlayingIndex(null);
        setPlaybackInfo({ index: null, elapsed: 0, duration: 0 });
      });
      return;
    }
    
    // If different recording or no recording playing, stop all and play this one
    console.log('[playRecordingForIndex] Playing recording from start (new or different recording)');
    
    // Always stop all other audio first
    if (audioPlayer) {
      audioPlayer.stopPlayback();
    }
    stopAllPlayback();
    
    // Stop and reset any other playing recordings
    Object.keys(previewAudioRefs.current).forEach((key) => {
      const otherRef = previewAudioRefs.current[key];
      if (otherRef && otherRef !== ref && otherRef instanceof HTMLAudioElement) {
        if (!otherRef.paused) {
          console.log('[playRecordingForIndex] Stopping other recording at key:', key);
          otherRef.pause();
        }
      }
    });
    
    // Clear previous playing index to ensure clean state
    if (state.isPlayingIndex !== null && state.isPlayingIndex !== index) {
      console.log('[playRecordingForIndex] Clearing previous playing index:', state.isPlayingIndex);
      setIsPlayingIndex(null);
    }
    
    // Set up event handlers - always set them up fresh to ensure consistency
    const handleTimeUpdate = () => {
      const currentTime = ref.currentTime;
      setPlaybackInfo({
        index,
        elapsed: currentTime || 0,
        duration: ref.duration || 0,
      });
    };
    
    const handlePlay = () => {
      console.log('[playRecordingForIndex] Audio started playing');
      setIsPlayingIndex(index);
      setCurrentLineIndex(index);
    };
    
    const handlePause = () => {
      console.log('[playRecordingForIndex] Audio paused');
      // Keep isPlayingIndex set when paused (for resume functionality)
      // Force state update to ensure UI reflects pause state immediately
      setIsPlayingIndex(index);
    };
    
    const handleEnded = () => {
      console.log('[playRecordingForIndex] Audio ended');
      setIsPlayingIndex(null);
      setPlaybackInfo({ index: null, elapsed: 0, duration: 0 });
    };
    
    const handleError = (e) => {
      console.error('[playRecordingForIndex] Audio error:', e, 'src:', ref.src);
      setIsPlayingIndex(null);
      setPlaybackInfo({ index: null, elapsed: 0, duration: 0 });
    };
    
    const handleLoadedMetadata = () => {
      console.log('[playRecordingForIndex] Audio metadata loaded, duration:', ref.duration);
      setPlaybackInfo({
        index,
        elapsed: ref.currentTime || 0,
        duration: ref.duration || 0,
      });
    };
    
    // Clear all existing handlers first
    ref.ontimeupdate = null;
    ref.onplay = null;
    ref.onpause = null;
    ref.onended = null;
    ref.onerror = null;
    ref.onloadedmetadata = null;
    
    // Set up new handlers using direct assignment (more reliable)
    ref.ontimeupdate = handleTimeUpdate;
    ref.onplay = handlePlay;
    ref.onpause = handlePause;
    ref.onended = handleEnded;
    ref.onerror = handleError;
    ref.onloadedmetadata = handleLoadedMetadata;
    
    // Also add event listeners as backup
    ref.addEventListener('timeupdate', handleTimeUpdate);
    ref.addEventListener('play', handlePlay);
    ref.addEventListener('pause', handlePause);
    ref.addEventListener('ended', handleEnded);
    ref.addEventListener('error', handleError);
    ref.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    // Always ensure src is set correctly
    if (!hasCorrectSrc) {
      console.log('[playRecordingForIndex] Setting new src and loading:', recUrl);
      ref.src = recUrl;
      ref.currentTime = 0;
      ref.load();
    } else {
      console.log('[playRecordingForIndex] Ref already has correct src');
      // Only reset to start if this is a different recording (not resuming)
      // If it's the same recording, we want to preserve currentTime for resume
      if (state.isPlayingIndex !== index) {
        ref.currentTime = 0;
      }
    }
    
    // Set state optimistically
    setCurrentLineIndex(index);
    setPlaybackInfo({ index, elapsed: ref.currentTime || 0, duration: ref.duration || 0 });
    
    // Play the audio - simplified logic that always works
    const playAudio = () => {
      console.log('[playRecordingForIndex] Attempting to play audio, readyState:', ref.readyState, 'paused:', ref.paused);
      
      // Ensure audio is loaded
      if (ref.readyState === 0 || ref.networkState === HTMLMediaElement.NETWORK_EMPTY) {
        console.log('[playRecordingForIndex] Audio not loaded, loading first');
        ref.load();
        // Wait for load
        const playAfterLoad = () => {
          console.log('[playRecordingForIndex] Audio loaded, readyState:', ref.readyState);
          ref.play().catch((err) => {
            console.error('[playRecordingForIndex] Play error after load:', err);
            setIsPlayingIndex(null);
            setPlaybackInfo({ index: null, elapsed: 0, duration: 0 });
          });
        };
        ref.addEventListener('canplay', playAfterLoad, { once: true });
        ref.addEventListener('loadeddata', playAfterLoad, { once: true });
        return;
      }
      
      // Audio is ready, play it
      const playPromise = ref.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[playRecordingForIndex] Audio play started successfully');
          })
          .catch((err) => {
            console.error('[playRecordingForIndex] Play error:', err);
            // Retry once after a short delay if it fails
            setTimeout(() => {
              console.log('[playRecordingForIndex] Retrying play after error');
              ref.play().catch((retryErr) => {
                console.error('[playRecordingForIndex] Retry also failed:', retryErr);
                setIsPlayingIndex(null);
                setPlaybackInfo({ index: null, elapsed: 0, duration: 0 });
              });
            }, 100);
          });
      }
    };
    
    // Play immediately or wait for load
    if (!hasCorrectSrc) {
      // Wait for audio to be ready
      if (ref.readyState >= HTMLMediaElement.HAVE_METADATA) {
        // Already has metadata, can try to play
        setTimeout(playAudio, 50);
      } else {
        // Wait for load events
        const playWhenReady = () => {
          console.log('[playRecordingForIndex] Audio ready to play, readyState:', ref.readyState);
          playAudio();
        };
        ref.addEventListener('canplay', playWhenReady, { once: true });
        ref.addEventListener('canplaythrough', playWhenReady, { once: true });
        ref.addEventListener('loadeddata', playWhenReady, { once: true });
      }
    } else {
      // Already has correct src, play immediately
      setTimeout(playAudio, 50);
    }
  }, [recordings, previewAudioRefs, state.isPlayingIndex, stopAllPlayback, audioPlayer, setIsPlayingIndex, setCurrentLineIndex, setPlaybackInfo]);

  // Handle previous
  const handlePrev = useCallback(() => {
    console.log('=== [handlePrev] START ===');
    console.log('[handlePrev] Button clicked');
    console.log('[handlePrev] teleprompterMode:', teleprompterMode);
    console.log('[handlePrev] reviewMode:', state.reviewMode);
    console.log('[handlePrev] hasAudioPlayer:', !!audioPlayer);
    
    // Stop any ongoing playback/recording first
    console.log('[handlePrev] Stopping playback/recording');
    if (audioPlayer) {
      audioPlayer.stopPlayback();
    }
    stopAllPlayback();
    stopRecording();
    
    const isReviewMode = state.reviewMode;
    const isTeleprompter = teleprompterMode;
    
    // Use functional update to get the latest currentIndex and calculate newIndex
    setCurrentLineIndex((currentIndex) => {
      console.log('[handlePrev] Functional update - currentIndex:', currentIndex);
      let newIndex = currentIndex;
      
      // Same logic for both main view and teleprompter mode
      // Only difference: teleprompter mode skips scrolling
      if (isReviewMode) {
        const prevCompleted = findPreviousCompletedLine(currentIndex);
        console.log('[handlePrev] Review mode - prevCompleted:', prevCompleted);
        if (prevCompleted >= 0) {
          newIndex = prevCompleted;
        }
      } else {
        newIndex = Math.max(0, currentIndex - 1);
        console.log('[handlePrev] Regular mode - newIndex:', newIndex);
      }
      
      console.log('[handlePrev] Calculated newIndex:', newIndex, 'will update:', newIndex !== currentIndex);
      
      // Store for async operations
      if (newIndex !== currentIndex) {
        pendingNavigationRef.current = { index: newIndex, isReviewMode, isTeleprompter };
        console.log('[handlePrev] Stored pending navigation:', pendingNavigationRef.current);
        
        // Schedule async operations after state update
        setTimeout(() => {
          console.log('[handlePrev] Executing pending navigation after timeout');
          const pending = pendingNavigationRef.current;
          if (pending && pending.index === newIndex) {
            console.log('[handlePrev] Pending navigation matches, index:', pending.index);
            
            if (!pending.isTeleprompter && audioPlayer) {
              console.log('[handlePrev] Not teleprompter mode, scrolling to line:', pending.index);
              scrollToLine(pending.index, audioPlayer);
            } else {
              console.log('[handlePrev] Teleprompter mode, skipping scroll');
            }
            
            // Optionally play if audioPlayer exists - same logic as main screen
            if (audioPlayer && pending.index < scriptLines.length) {
              const prevLine = scriptLines[pending.index];
              console.log('[handlePrev] Prev line exists:', !!prevLine);
              if (!prevLine) {
                console.log('[handlePrev] ERROR: No line found at index:', pending.index);
                pendingNavigationRef.current = null;
                return;
              }
              
              const isUserLine = checkIsUserLine(prevLine);
              console.log('[handlePrev] Prev line is user line:', isUserLine);
              
              if (pending.isReviewMode) {
                console.log('[handlePrev] Review mode - calling playLine directly');
                audioPlayer.playLine(pending.index);
              } else {
                if (!isUserLine) {
                  console.log('[handlePrev] Not user line - calling handlePlayNonUserLine');
                  handlePlayNonUserLine(pending.index);
                } else {
                  console.log('[handlePrev] User line - not playing audio');
                }
              }
            } else {
              console.log('[handlePrev] No audioPlayer or index out of range, audioPlayer:', !!audioPlayer, 'index:', pending.index, 'scriptLines.length:', scriptLines.length);
            }
            pendingNavigationRef.current = null;
          } else {
            console.log('[handlePrev] Pending navigation mismatch or cleared');
          }
          console.log('=== [handlePrev] END ===');
        }, 50);
      } else {
        console.log('[handlePrev] No index change, skipping navigation');
        console.log('=== [handlePrev] END (no change) ===');
      }
      
      return newIndex;
    });
  }, [audioPlayer, stopAllPlayback, stopRecording, state.reviewMode, findPreviousCompletedLine, teleprompterMode, setCurrentLineIndex, scrollToLine, scriptLines, checkIsUserLine, handlePlayNonUserLine]);

  // Handle next
  const handleNext = useCallback((fromIndex) => {
    console.log('=== [handleNext] START ===');
    console.log('[handleNext] Button clicked, fromIndex:', fromIndex);
    console.log('[handleNext] teleprompterMode:', teleprompterMode);
    console.log('[handleNext] reviewMode:', state.reviewMode);
    console.log('[handleNext] hasAudioPlayer:', !!audioPlayer);
    
    // Stop any ongoing playback/recording first
    console.log('[handleNext] Stopping playback/recording');
    if (audioPlayer) {
      audioPlayer.stopPlayback();
    }
    stopAllPlayback();
    stopRecording();
    setIsRecording(false);
    
    const isReviewMode = state.reviewMode;
    const isTeleprompter = teleprompterMode;
    
    // Use functional update to get the latest currentIndex
    setCurrentLineIndex((currentIndex) => {
      const base = typeof fromIndex === 'number' ? fromIndex : currentIndex;
      console.log('[handleNext] Functional update - currentIndex:', currentIndex, 'base:', base);
      let newIndex = currentIndex;
      
      // Same logic for both main view and teleprompter mode
      // Only difference: teleprompter mode skips scrolling
      if (isReviewMode) {
        const isCurrentLineCompleted = completedLines.has(base);
        const nextCompleted = audioPlayer 
          ? audioPlayer.findNextCompletedLine(base)
          : findNextCompletedLine(base);
        console.log('[handleNext] Review mode - isCurrentCompleted:', isCurrentLineCompleted, 'nextCompleted:', nextCompleted);
        
        if (nextCompleted >= 0) {
          newIndex = nextCompleted;
        } else if (isCurrentLineCompleted && base < scriptLines.length - 1) {
          newIndex = base + 1;
        }
      } else {
        const next = findNextLineWithAudio(base);
        console.log('[handleNext] Regular mode - findNextLineWithAudio returned:', next);
        if (next >= 0) {
          newIndex = next;
        }
      }
      
      console.log('[handleNext] Calculated newIndex:', newIndex, 'will update:', newIndex !== currentIndex);
      
      // Store for async operations
      if (newIndex !== currentIndex) {
        const targetIndex = newIndex;
        pendingNavigationRef.current = { index: targetIndex, isReviewMode, isTeleprompter, fromIndex };
        console.log('[handleNext] Stored pending navigation:', pendingNavigationRef.current);
        
        // Schedule async operations after state update
        setTimeout(() => {
          console.log('[handleNext] Executing pending navigation after timeout');
          const pending = pendingNavigationRef.current;
          // Verify this is still the correct pending navigation
          if (pending && pending.index === targetIndex) {
            console.log('[handleNext] Pending navigation matches, index:', pending.index);
            const targetLine = scriptLines[pending.index];
            console.log('[handleNext] Target line exists:', !!targetLine);
            if (!targetLine) {
              console.log('[handleNext] ERROR: No line found at index:', pending.index);
              pendingNavigationRef.current = null;
              return;
            }
            
            const isUserLine = checkIsUserLine(targetLine);
            console.log('[handleNext] Target line is user line:', isUserLine, 'line text:', targetLine?.line?.substring(0, 50));
            
            // Only scroll if not in teleprompter mode
            if (!pending.isTeleprompter && audioPlayer) {
              console.log('[handleNext] Not teleprompter mode, scrolling to line:', pending.index);
              scrollToLine(pending.index, audioPlayer);
            } else {
              console.log('[handleNext] Teleprompter mode, skipping scroll');
            }
            
            // Handle playback after state update - same logic as main screen
            if (audioPlayer && pending.index < scriptLines.length) {
              if (pending.isReviewMode) {
                console.log('[handleNext] Review mode - calling playLine directly');
                audioPlayer.playLine(pending.index);
              } else {
                // In regular mode, only play partner lines (same as main screen)
                // Always play from start when navigating (forcePlay: true)
                if (!isUserLine) {
                  console.log('[handleNext] Not user line - calling handlePlayNonUserLine with forcePlay');
                  handlePlayNonUserLine(pending.index, { forcePlay: true });
                } else {
                  console.log('[handleNext] User line - not playing audio');
                }
              }
            } else if (!audioPlayer && pending.index < scriptLines.length) {
              console.log('[handleNext] No audioPlayer, but line exists');
              if (!isUserLine) {
                console.log('[handleNext] Not user line - calling handlePlayNonUserLine with forcePlay (no audioPlayer)');
                handlePlayNonUserLine(pending.index, { forcePlay: true });
              }
            } else {
              console.log('[handleNext] No audioPlayer or index out of range, audioPlayer:', !!audioPlayer, 'index:', pending.index, 'scriptLines.length:', scriptLines.length);
            }
            pendingNavigationRef.current = null;
          } else {
            console.log('[handleNext] Pending navigation mismatch or cleared');
          }
          console.log('=== [handleNext] END ===');
        }, 100);
      } else {
        console.log('[handleNext] No index change, skipping navigation');
        console.log('=== [handleNext] END (no change) ===');
      }
      
      return newIndex;
    });
  }, [audioPlayer, stopAllPlayback, stopRecording, setIsRecording, state.reviewMode, completedLines, scriptLines, findNextCompletedLine, findNextLineWithAudio, teleprompterMode, setCurrentLineIndex, scrollToLine, checkIsUserLine, handlePlayNonUserLine]);

  // Helper functions for recordings
  const hasRecording = useCallback((index) => {
    return recordings.some((r) => r.index === index);
  }, [recordings]);

  const getRecordingForIndex = useCallback((index) => {
    return recordings.find((r) => r.index === index && r.url);
  }, [recordings]);

  // Restart the scene from the beginning without ending the session
  const handleRestartScene = useCallback(() => {
    stopAllPlayback();
    if (stopRecording) stopRecording();
    setCurrentLineIndex(0);
    setCompletedLines(new Set());
    setRecordings([]);
    setReviewMode(false);
    scrollToLine(0, audioPlayer);
  }, [stopAllPlayback, stopRecording, setCurrentLineIndex, setCompletedLines, setRecordings, setReviewMode, scrollToLine, audioPlayer]);

  return {
    validatePartnerAudios,
    handleStartSession,
    handleEndSession,
    confirmEndSession,
    startRehearsalSessionAPI, // Export this so modal can use it
    handleToneChange,
    handlePrev,
    handleNext,
    handlePlayNonUserLine,
    playNextPartnerAfter,
    handleRecordToggle,
    handleRestartLine,
    handleRestartScene, // Start Again — resets line index, recordings, completedLines; keeps session alive
    playRecordingForIndex,
    stopAllPlayback,
    getLastCompletedLineIndex,
    findNextCompletedLine,
    findPreviousCompletedLine,
    hasRecording,
    getRecordingForIndex,
    scrollToLine: (index) => scrollToLine(index, audioPlayer),
  };
};
