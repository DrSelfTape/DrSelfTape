// Library imports
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';

// Utility imports
import { resolveLineAudio, extractToneValue } from '../utils/audioResolution';
import { createAudioError, createToneError, createPlaybackError } from '../utils/audioErrorHandler';
import { SCRIPT_MODES, SCRIPT_ANALYSIS_MODES, AUDIO_TIMING, DEFAULT_AUDIO_SETTINGS } from '../constants/audioPlayer';

/**
 * ============================================================================
 * UNIFIED SCRIPT AUDIO PLAYER HOOK
 * ============================================================================
 * 
 * Centralized hook for all script audio playback functionality across the app.
 * Used by:
 *   - AiScenePartnerSession (rehearsal mode with recordings)
 *   - ScriptAnalysis components (actor & coach - analysis mode)
 * 
 * ============================================================================
 * SUPPORTED MODES
 * ============================================================================
 * 
 * 1. REHEARSAL MODE ('rehearsal')
 *    - Auto-plays partner lines
 *    - Stops at user lines for recording
 *    - Supports user recordings playback
 *    - Used by: AiScenePartnerSession
 * 
 * 2. REVIEW MODE ('review')
 *    - Plays only completed lines sequentially
 *    - Auto-advances through completed lines
 *    - Used by: AiScenePartnerSession review feature
 * 
 * 3. TELEPROMPTER MODE ('teleprompter')
 *    - Preview completed lines without scrolling
 *    - Used by: AiScenePartnerSession teleprompter feature
 * 
 * 4. ANALYSIS MODE (default 'rehearsal' with autoAdvance=false)
 *    - Manual control for ScriptAnalysis
 *    - Supports tone/speed/volume controls
 *    - Used by: ScriptAnalysis components
 * 
 * ============================================================================
 * KEY FEATURES
 * ============================================================================
 * 
 * - Multiple audio sources: blob URLs (recordings), API URLs (partner audio)
 * - Reliable event handling with polling fallback for onended
 * - Automatic skipping of lines without audio
 * - Word highlighting synchronized with audio playback
 * - Optional auto-scroll to current line
 * - Error recovery and automatic line skipping
 * - Tone selection for partner audio
 * - Speed and volume controls (for ScriptAnalysis)
 * 
 * ============================================================================
 * PARAMETERS
 * ============================================================================
 * 
 * @param {Object} config - Configuration object
 * 
 * // Core Parameters (Required)
 * @param {Array} config.scriptLines - Array of script line objects
 * @param {string} config.mode - Playback mode: 'rehearsal' | 'review' | 'teleprompter'
 * 
 * // Audio Source Parameters
 * @param {Set<number>} config.completedLines - Set of completed line indices (for review/teleprompter)
 * @param {Array} config.recordings - Array of user recordings: [{index, url, blob, tone, duration}]
 * @param {string|Object} config.tone - Selected tone for partner audio (string or {value: string})
 * 
 * // Control Parameters
 * @param {boolean} config.autoAdvance - Auto-advance to next line (default: true)
 * @param {boolean} config.autoScroll - Auto-scroll to current line (default: true)
 * 
 * // Callback Functions
 * @param {Function} config.onLineComplete - Callback when a line finishes playing
 * @param {Function} config.onReviewComplete - Callback when review mode completes all lines
 * @param {Function} config.onError - Callback for audio errors: (error, lineIndex) => void
 * 
 * // Audio Resolution Functions
 * @param {Function} config.isUserLine - Determine if line is user line: (line) => boolean
 * @param {Function} config.getLineAudio - Get audio URL for partner line: (line, tone) => string
 * 
 * // ScriptAnalysis-specific Parameters (optional)
 * @param {Object} config.scriptData - ScriptAnalysis script data object (for ScriptAnalysis mode)
 * @param {Object} config.selectedCharacter - Selected character object (for ScriptAnalysis mode)
 * @param {Object} config.selectedTone - Tone object with {label, value} (for ScriptAnalysis mode)
 * @param {Function} config.setSelectedTone - Setter for tone (for ScriptAnalysis mode)
 * @param {Object} config.selectedAudioSpeed - Speed object with {label, value} (for ScriptAnalysis mode)
 * @param {Function} config.setSelectedAudioSpeed - Setter for speed (for ScriptAnalysis mode)
 * @param {number} config.selectedVolume - Volume 0-100 (for ScriptAnalysis mode)
 * @param {Function} config.setSelectedVolume - Setter for volume (for ScriptAnalysis mode)
 * 
 * ============================================================================
 * RETURN VALUES
 * ============================================================================
 * 
 * @returns {Object} Audio player state and controls
 * 
 * // State
 * @returns {boolean} isPlaying - Whether audio is currently playing
 * @returns {number} currentLineIndex - Currently active line index
 * @returns {number} highlightedWordIndex - Currently highlighted word index
 * @returns {Object} audioError - Error object if playback failed
 * @returns {Object} playbackInfo - {index, elapsed, duration} for progress tracking
 * 
 * // Core Actions
 * @returns {Function} playLine - Play a specific line: (lineIndex, options?) => Promise<boolean>
 * @returns {Function} stopPlayback - Stop all audio playback: () => void
 * @returns {Function} pausePlayback - Pause current playback: () => void
 * @returns {Function} resumePlayback - Resume paused playback: () => void
 * 
 * // Navigation Actions
 * @returns {Function} goToNextLine - Navigate to next line: () => void
 * @returns {Function} goToPreviousLine - Navigate to previous line: () => void
 * @returns {Function} playFromCompleted - Play from first completed line: (startIndex?) => boolean
 * 
 * // ScriptAnalysis-specific Actions (only returned when scriptData provided)
 * @returns {Function} handleLineClick - Click handler for ScriptAnalysis: (index) => void
 * @returns {Function} handlePreviousLine - Previous line handler: () => void
 * @returns {Function} handleNextLine - Next line handler: () => void
 * @returns {Function} handlePlayPause - Play/pause toggle: () => void
 * @returns {Function} handleReset - Reset to first line: () => void
 * @returns {Function} getAudioForLine - Get audio by lineId (for ScriptAnalysis): (lineId) => string
 * @returns {Function} playAudio - Alias for playLine (for ScriptAnalysis): (lineIndex) => void
 * @returns {Function} stopAudio - Alias for stopPlayback (for ScriptAnalysis): () => void
 * 
 * // Utilities
 * @returns {Function} getAudioUrlForLine - Get audio URL by index: (lineIndex) => string
 * @returns {Function} findNextCompletedLine - Find next completed line: (startIndex) => number
 * @returns {Function} getLastCompletedLineIndex - Get last completed line index: () => number
 * @returns {Function} scrollToLine - Scroll to line: (index) => void
 * 
 * ============================================================================
 */
export const useScriptAudioPlayer = ({
  // Core parameters
  scriptLines = [],
  mode = 'rehearsal',
  completedLines = new Set(),
  recordings = [],
  tone = 'neutral',
  autoAdvance = true,
  autoScroll = true,
  
  // Callbacks
  onLineComplete,
  onReviewComplete,
  onError,
  
  // Audio resolution functions
  isUserLine,
  getLineAudio,
  
  // ScriptAnalysis-specific parameters (optional)
  scriptData,
  selectedCharacter,
  selectedTone,
  setSelectedTone,
  selectedAudioSpeed,
  setSelectedAudioSpeed,
  selectedVolume,
  setSelectedVolume,
  scriptAnalysisMode, // 'actor' or 'coach' - used for conditional error messages
}) => {
  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
  const [audioError, setAudioError] = useState(null);
  const [hasAttemptedPlayback, setHasAttemptedPlayback] = useState(false); // Track if user has tried to play audio
  const [playbackInfo, setPlaybackInfo] = useState({
    index: null,
    elapsed: 0,
    duration: 0,
  });

  // Redux state for ScriptAnalysis mode (audioData from API)
  // Note: In future refactor, this should be passed as prop instead of Redux coupling
  const { audioData } = useSelector((state) => state.sceneStudyScripts);
  
  // Determine current script mode
  const currentScriptMode = scriptData && scriptData.scriptLines 
    ? SCRIPT_MODES.SCRIPT_ANALYSIS 
    : SCRIPT_MODES.AI_SCENE_PARTNER;

  // ==========================================================================
  // REFS FOR AUDIO ELEMENT MANAGEMENT
  // ==========================================================================
  
  const audioRefs = useRef({}); // Store audio elements by line index
  const activeAudioRef = useRef(null); // Currently playing audio element
  const activeLineIndexRef = useRef(null); // Currently playing line index
  const pollingIntervals = useRef({}); // Polling intervals for reliable onended detection
  const endedHandledFlags = useRef({}); // Track if onended was handled (prevent double-firing)
  const errorHandledFlags = useRef({}); // Track if onerror was handled (prevent double-firing and loops)
  const modeRef = useRef(mode); // Current mode (for callbacks)
  const completedLinesRef = useRef(completedLines); // Completed lines set (for callbacks)

  // ==========================================================================
  // SYNC REFS WITH STATE
  // ==========================================================================
  
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    completedLinesRef.current = completedLines;
  }, [completedLines]);

  // ==========================================================================
  // AUDIO URL RESOLUTION
  // ==========================================================================
  
  // ==========================================================================
  // SCRIPTANALYSIS MODE: AUTO-RESOLVE AUDIO FROM REDUX
  // ==========================================================================
  
  /**
   * ScriptAnalysis mode: Auto-create isUserLine function if scriptData provided
   * Used by: ScriptAnalysis components
   */
  const resolvedIsUserLine = useCallback((line) => {
    // Use provided isUserLine function if available
    if (isUserLine) {
      return isUserLine(line);
    }
    
    // Auto-resolve from scriptData and selectedCharacter
    if (scriptData && selectedCharacter?.character?.label && line?.character) {
      return line.character.toLowerCase() === selectedCharacter.character.label.toLowerCase();
    }
    
    return false;
  }, [isUserLine, scriptData, selectedCharacter]);

  /**
   * ScriptAnalysis mode: Auto-create getLineAudio function if scriptData provided
   * Uses centralized resolveLineAudio utility for consistency
   * Used by: ScriptAnalysis components
   */
  const resolvedGetLineAudio = useCallback((line, toneParam) => {
    // Use provided getLineAudio function if available (for backward compatibility)
    if (getLineAudio) {
      return getLineAudio(line, toneParam);
    }
    
    // Use centralized audio resolution utility
    const toneToUse = toneParam || selectedTone || DEFAULT_AUDIO_SETTINGS.TONE;
    return resolveLineAudio(line, toneToUse, audioData);
  }, [getLineAudio, selectedTone, audioData]);

  // Use resolved functions based on mode
  const effectiveIsUserLine = scriptData ? resolvedIsUserLine : isUserLine;
  const effectiveGetLineAudio = scriptData ? resolvedGetLineAudio : getLineAudio;
  
  // Extract tone value using utility function
  const effectiveTone = scriptData 
    ? extractToneValue(selectedTone, DEFAULT_AUDIO_SETTINGS.TONE)
    : extractToneValue(tone, DEFAULT_AUDIO_SETTINGS.TONE);
  
  const effectiveScriptLines = scriptData?.scriptLines || scriptLines;
  
  // In ScriptAnalysis mode, allow auto-advance but stop at lines with no audio (show error)
  // In AiScenePartner mode, auto-skip lines with no audio
  const effectiveAutoAdvance = autoAdvance; // Allow auto-play in both modes

  /**
   * Get audio URL for a line by index
   * Handles both user recordings and partner audio
   * 
   * Priority:
   * 1. User line with recording → return recording URL
   * 2. Partner line → use getLineAudio function or fallback to audio_by_tone
   * 3. Fallback to baseAudio
   * 
   * Used by: playLine function
   */
  const getAudioUrlForLine = useCallback((lineIndex) => {
    if (!effectiveScriptLines || lineIndex < 0 || lineIndex >= effectiveScriptLines.length) {
      return null;
    }

    const line = effectiveScriptLines[lineIndex];
    if (!line) {
      return null;
    }

    // Check if it's a user line and has a recording
    if (effectiveIsUserLine && effectiveIsUserLine(line)) {
      const recording = recordings.find((r) => r.index === lineIndex && r.url);
      return recording?.url || null;
    }

    // Partner line - use resolved getLineAudio function or centralized utility
    if (effectiveGetLineAudio) {
      const audioUrl = effectiveGetLineAudio(line, effectiveTone);
      if (audioUrl) return audioUrl;
    }

    // Fallback: Use centralized resolution utility directly
    // This ensures consistent behavior even if getLineAudio is not provided
    const audioUrl = resolveLineAudio(line, effectiveTone, audioData);
    if (audioUrl) return audioUrl;

    return null;
  }, [effectiveScriptLines, recordings, effectiveTone, effectiveIsUserLine, effectiveGetLineAudio]);

  /**
   * ScriptAnalysis-specific: Get audio URL by lineId (instead of index)
   * Used by: ScriptAnalysis components for line lookup
   */
  const getAudioForLine = useCallback((lineId) => {
    if (!effectiveScriptLines || !lineId) return null;
    const line = effectiveScriptLines.find((item) => item.lineId === lineId);
    if (!line) return null;
    
    // Use the same resolution logic as getAudioUrlForLine
    const lineIndex = effectiveScriptLines.findIndex((item) => item.lineId === lineId);
    return getAudioUrlForLine(lineIndex);
  }, [effectiveScriptLines, getAudioUrlForLine]);

  // ==========================================================================
  // HELPER FUNCTIONS FOR NAVIGATION
  // ==========================================================================
  
  /**
   * Find next completed line from current index
   * Used by: Review mode and teleprompter mode
   */
  const findNextCompletedLine = useCallback((startIndex, completedLinesSet = null) => {
    const lines = completedLinesSet || completedLinesRef.current;
    for (let i = startIndex + 1; i < effectiveScriptLines.length; i++) {
      if (lines.has(i)) {
        return i;
      }
    }
    return -1;
  }, [effectiveScriptLines]);

  /**
   * Get last completed line index
   * Used by: Review mode completion handling
   */
  const getLastCompletedLineIndex = useCallback(() => {
    const lines = completedLinesRef.current;
    if (lines.size === 0) return -1;
    return Math.max(...Array.from(lines));
  }, []);

  /**
   * Find next playable line (has audio or is user line)
   * Ensures auto-play never stops on lines without audio
   * 
   * @param {number} startIndex - Starting line index
   * @param {boolean} skipUserLines - If true, skip user lines (for auto-play mode)
   * 
   * Used by: Rehearsal mode auto-advance
   */
  const findNextPlayableLine = useCallback((startIndex, skipUserLines = false) => {
    for (let i = startIndex + 1; i < effectiveScriptLines.length; i++) {
      const line = effectiveScriptLines[i];
      if (!line) continue;
      
      const isUser = effectiveIsUserLine && effectiveIsUserLine(line);
      
      // Manual navigation: return user lines normally
      if (isUser && !skipUserLines) {
        return i;
      }
      
      // Auto-play: STOP at user lines (user needs to record)
      if (isUser && skipUserLines) {
        return i; // Return user line index - handleAudioEnded will stop auto-play
      }
      
      // For partner lines, check if audio is available
      const audioUrl = getAudioUrlForLine(i);
      if (audioUrl) {
        return i;
      }
      // If no audio, continue to next line (skip partner lines without audio)
    }
    return -1; // No playable line found
  }, [effectiveScriptLines, effectiveIsUserLine, getAudioUrlForLine]);

  /**
   * Scroll to a line (if autoScroll is enabled)
   * Used by: playLine function
   */
  const scrollToLine = useCallback((index) => {
    if (!autoScroll) return;
    
    setTimeout(() => {
      const element = document.getElementById(`line-${index}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  }, [autoScroll]);

  // ==========================================================================
  // AUDIO PLAYBACK CONTROL
  // ==========================================================================
  
  /**
   * Stop all audio playback
   * Used by: Navigation functions, reset, cleanup
   */
  const stopAllPlayback = useCallback(() => {
    // Clear all polling intervals FIRST to prevent auto-advance
    // This includes both setInterval timers and setTimeout timers (stored as advance-* keys)
    Object.keys(pollingIntervals.current).forEach((key) => {
      const interval = pollingIntervals.current[key];
      if (interval) {
        if (key.startsWith('advance-')) {
          clearTimeout(interval); // setTimeout IDs
        } else {
          clearInterval(interval); // setInterval IDs
        }
      }
    });
    pollingIntervals.current = {};

    // Stop all audio refs
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio && !audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    });

    // Reset state
    setIsPlaying(false);
    setHighlightedWordIndex(-1);
    setPlaybackInfo({ index: null, elapsed: 0, duration: 0 });
    activeAudioRef.current = null;
    activeLineIndexRef.current = null;
  }, []);

  /**
   * Clean up audio element for a specific line
   * Used by: playLine function before creating new audio
   */
  const cleanupAudio = useCallback((lineIndex) => {
    const audio = audioRefs.current[lineIndex];
    if (audio) {
      audio.pause();
      // DON'T clear src here - it can cause race conditions with audio.load()
      // Let the audio element be garbage collected naturally
      audio.onended = null;
      audio.onerror = null;
      audio.onplay = null;
      audio.onpause = null;
      audio.ontimeupdate = null;
      delete audioRefs.current[lineIndex];
    }

    // Clear polling interval
    if (pollingIntervals.current[lineIndex]) {
      clearInterval(pollingIntervals.current[lineIndex]);
      delete pollingIntervals.current[lineIndex];
    }

    delete endedHandledFlags.current[lineIndex];
    delete errorHandledFlags.current[lineIndex];
  }, []);

  /**
   * Play a specific line
   * Core playback function - handles all modes and error recovery
   * 
   * Used by: All playback actions (play/pause, navigation, auto-advance)
   */
  const playLine = useCallback(async (lineIndex, options = {}) => {
    const {
      forceMode = false,
      skipIfNoAudio = false,
    } = options;

    if (!effectiveScriptLines || lineIndex < 0 || lineIndex >= effectiveScriptLines.length) {
      return false;
    }

    const currentMode = forceMode || modeRef.current;
    
    // Only log for teleprompter mode (forceMode === 'rehearsal')
    const isTeleprompterCall = forceMode && forceMode === 'rehearsal';
    if (isTeleprompterCall) {
      console.log('[playLine] TELE - Start, lineIndex:', lineIndex, 'forceMode:', forceMode, 'currentMode:', currentMode);
    }

    // For review/teleprompter mode, only play completed lines
    // BUT: if forceMode is explicitly set to bypass (like 'rehearsal'), skip completion check
    // This is needed for teleprompter mode where we want to play partner lines even if not completed
    const shouldCheckCompletion = (currentMode === 'review' || currentMode === 'teleprompter') && 
                                   (!forceMode || forceMode === 'review' || forceMode === 'teleprompter');
    
    if (isTeleprompterCall) {
      console.log('[playLine] TELE - shouldCheckCompletion:', shouldCheckCompletion, 'lineCompleted:', completedLinesRef.current.has(lineIndex));
    }
    
    if (shouldCheckCompletion && !completedLinesRef.current.has(lineIndex)) {
      if (isTeleprompterCall) {
        console.log('[playLine] TELE - ERROR: Blocked by completion check (should not happen with forceMode!)');
      }
      const nextCompleted = findNextCompletedLine(lineIndex);
      if (nextCompleted >= 0) {
        return playLine(nextCompleted, options);
      }
      // No more completed lines
      if (onReviewComplete) {
        onReviewComplete();
      }
      return false;
    }

    const line = effectiveScriptLines[lineIndex];
    if (!line) {
      if (isTeleprompterCall) {
        console.log('[playLine] TELE - ERROR: No line found');
      }
      return false;
    }
    
    const audioUrl = getAudioUrlForLine(lineIndex);
    if (isTeleprompterCall) {
      console.log('[playLine] TELE - Audio URL exists:', !!audioUrl);
    }
    
    if (!audioUrl) {
      // Only show error if user has attempted playback (not on initial load)
      // Set error state for ScriptAnalysis mode (when scriptData with scriptLines is provided)
      // This ensures users see an error message when trying to play lines without audio
      if (scriptData && scriptData.scriptLines && hasAttemptedPlayback) {
        // Navigate to line and show error (don't skip in ScriptAnalysis mode)
        setCurrentLineIndex(lineIndex);
        scrollToLine(lineIndex);
        // Use centralized error handler
        setAudioError(createAudioError(currentScriptMode, scriptAnalysisMode, 'noAudio'));
        // Stop playback state (don't auto-skip in ScriptAnalysis)
        setIsPlaying(false);
        setHighlightedWordIndex(-1);
        setPlaybackInfo({ index: null, elapsed: 0, duration: 0 });
        return false;
      }
      
      // If no audio and user hasn't attempted playback yet, just navigate without showing error
      if (scriptData && scriptData.scriptLines && !hasAttemptedPlayback) {
        setCurrentLineIndex(lineIndex);
        scrollToLine(lineIndex);
        setIsPlaying(false);
        setHighlightedWordIndex(-1);
        setPlaybackInfo({ index: null, elapsed: 0, duration: 0 });
        return false;
      }
      
      // Auto-skip to next playable line if no audio (AiScenePartner mode)
      // Don't navigate to the current line - skip immediately
      if (skipIfNoAudio || effectiveAutoAdvance) {
        const currentMode = modeRef.current;
        
        if (currentMode === 'review' || currentMode === 'teleprompter') {
          const nextCompleted = findNextCompletedLine(lineIndex);
          if (nextCompleted >= 0) {
            setTimeout(() => playLine(nextCompleted, { ...options, skipIfNoAudio: true }), AUDIO_TIMING.ADVANCE_DELAY);
            return false;
          }
        } else {
          // Rehearsal mode - find next playable line (skip lines without audio)
          const nextPlayable = findNextPlayableLine(lineIndex, skipIfNoAudio);
          if (nextPlayable >= 0) {
            setTimeout(() => playLine(nextPlayable, { ...options, skipIfNoAudio: true }), AUDIO_TIMING.ADVANCE_DELAY);
            return false;
          }
        }
      }
      
      // If we reach here, no playable line found - navigate to current line and show error
      setCurrentLineIndex(lineIndex);
      scrollToLine(lineIndex);
      
      // Clear highlighting since no audio is present
      setHighlightedWordIndex(-1);
      setIsPlaying(false);
      
      // Call onError callback if provided
      if (onError) {
        onError(new Error('No audio available for this line'), lineIndex);
      }
      return false;
    }

    // Stop current playback (but exclude the line we're about to play)
    // This prevents race conditions where stopAllPlayback pauses the audio we just created
    // First, stop the active audio ref explicitly
    if (activeAudioRef.current && activeAudioRef.current !== audioRefs.current[lineIndex]) {
      if (!activeAudioRef.current.paused) {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      }
    }
    
    // Then stop all other audio refs
    Object.keys(audioRefs.current).forEach((key) => {
      const idx = parseInt(key);
      if (idx !== lineIndex) {
        const audio = audioRefs.current[key];
        if (audio && !audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
      }
    });
    
    // Reset playback state
    setIsPlaying(false);
    setHighlightedWordIndex(-1);

    // Check if there's an existing paused audio element for this line that we can resume
    const existingAudio = audioRefs.current[lineIndex];
    const activeAudio = activeAudioRef.current;
    
    // If we have an existing audio element for this line that is paused, resume it instead of creating new
    if (existingAudio && existingAudio.paused && activeLineIndexRef.current === lineIndex) {
      // Verify the audio element has the correct src
      const existingSrc = existingAudio.src;
      const expectedSrc = audioUrl;
      // Check if srcs match (accounting for query parameters in URLs)
      const existingSrcBase = existingSrc.split('?')[0];
      const expectedSrcBase = expectedSrc.split('?')[0];
      
      if (existingSrcBase === expectedSrcBase || existingSrc.includes(expectedSrcBase)) {
        console.log('[useScriptAudioPlayer] Resuming existing paused audio for line', lineIndex, 'from currentTime:', existingAudio.currentTime);
        // Resume the existing audio element
        activeAudioRef.current = existingAudio;
        activeLineIndexRef.current = lineIndex;
        setIsPlaying(true);
        
        // The polling interval should still be active if the audio was just paused
        // If it was cleared, it will be restarted when the audio plays
        
        existingAudio.play().catch((err) => {
          setIsPlaying(false);
          if (onError) {
            onError(err, lineIndex);
          }
        });
        setCurrentLineIndex(lineIndex);
        scrollToLine(lineIndex);
        return Promise.resolve(true);
      }
    }
    
    // Clean up previous audio for this line if exists
    // IMPORTANT: Always clean up, even if it's the current active audio ref.
    // Skipping cleanup when existingAudio === activeAudioRef was leaving orphaned
    // audio elements whose handleAudioEnded closures would fire unexpectedly,
    // breaking the auto-advance chain ("only reads a couple lines" bug).
    if (existingAudio) {
      // Pause the old audio and remove event listeners
      existingAudio.pause();
      existingAudio.onended = null;
      existingAudio.onerror = null;
      existingAudio.onplay = null;
      existingAudio.onpause = null;
      existingAudio.ontimeupdate = null;
      
      // Clear polling interval for this line
      if (pollingIntervals.current[lineIndex]) {
        clearInterval(pollingIntervals.current[lineIndex]);
        delete pollingIntervals.current[lineIndex];
      }
      // Also clear any pending advance timeout for this line
      if (pollingIntervals.current[`advance-${lineIndex}`]) {
        clearTimeout(pollingIntervals.current[`advance-${lineIndex}`]);
        delete pollingIntervals.current[`advance-${lineIndex}`];
      }
      delete endedHandledFlags.current[lineIndex];
      delete errorHandledFlags.current[lineIndex];
      
      // Clear active ref if it was pointing to the element we just cleaned up
      if (activeAudioRef.current === existingAudio) {
        activeAudioRef.current = null;
        activeLineIndexRef.current = null;
      }
      
      // Delete from refs (but DON'T clear src - clearing src can cause race conditions with audio.load())
      delete audioRefs.current[lineIndex];
    }

    // Create new audio element
    const audio = new Audio();
    
    // Set audio properties BEFORE adding to refs to avoid race conditions
    audio.src = audioUrl;
    audio.currentTime = 0;
    audio.preload = 'auto';
    
    // Apply speed and volume if provided (ScriptAnalysis mode)
    if (selectedAudioSpeed?.value) {
      audio.playbackRate = selectedAudioSpeed.value;
    }
    if (selectedVolume !== undefined && selectedVolume !== null) {
      audio.volume = selectedVolume / 100;
    }
    
    // IMPORTANT: Add to refs BEFORE calling load() to prevent cleanup from clearing src
    // This ensures the audio element is protected in refs before any async operations
    audioRefs.current[lineIndex] = audio;
    activeAudioRef.current = audio;
    activeLineIndexRef.current = lineIndex;
    
    // Explicitly load the audio to start loading process
    // This is important for teleprompter mode where we wait for audio to load
    audio.load();

    // Update current line index and scroll
    setCurrentLineIndex(lineIndex);
    scrollToLine(lineIndex);

    // Set up event handlers
    let checkInterval = null;
    let endedHandled = false;
    endedHandledFlags.current[lineIndex] = false;
    errorHandledFlags.current[lineIndex] = false;

    // Handler for when audio ends
    const handleAudioEnded = () => {
      if (endedHandled) return;
      endedHandled = true;
      endedHandledFlags.current[lineIndex] = true;

      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
        delete pollingIntervals.current[lineIndex];
      }

      setIsPlaying(false);
      setHighlightedWordIndex(-1);
      setPlaybackInfo({ index: null, elapsed: 0, duration: 0 });

      // Call onLineComplete callback
      if (onLineComplete) {
        onLineComplete(lineIndex);
      }

      // Auto-advance logic (disabled in ScriptAnalysis mode)
      if (effectiveAutoAdvance) {
        const currentMode = modeRef.current;
        
        if (currentMode === 'review' || currentMode === 'teleprompter') {
          // Find next completed line
          const nextCompleted = findNextCompletedLine(lineIndex);
          if (nextCompleted >= 0) {
            setTimeout(() => {
              if (modeRef.current === currentMode) {
                playLine(nextCompleted, options);
              }
            }, AUDIO_TIMING.ADVANCE_DELAY);
          } else {
            // Review complete
            if (onReviewComplete) {
              onReviewComplete();
            }
          }
        } else {
          // Rehearsal mode - advance to next line
          // In ScriptAnalysis mode: navigate to next line, if no audio show error and stop
          // In AiScenePartner mode: skip lines with no audio and continue
          const nextIndex = lineIndex + 1;
          
          if (nextIndex < effectiveScriptLines.length) {
            const nextLine = effectiveScriptLines[nextIndex];
            if (nextLine) {
              const isNextUserLine = effectiveIsUserLine && effectiveIsUserLine(nextLine);
              
              // Check if it's a user line - if so, navigate to it but don't play (stop auto-play)
              if (isNextUserLine) {
                // Navigate to user line but don't play it (user needs to record)
                setTimeout(() => {
                  if (modeRef.current === currentMode) {
                    setCurrentLineIndex(nextIndex);
                    scrollToLine(nextIndex);
                  }
                }, 0);
                return; // Stop auto-play here
              }
              
              // Next line is a partner line
              // In ScriptAnalysis mode: play next line (will show error if no audio and stop)
              // In AiScenePartner mode: play next partner line if it has audio, skip only if no audio
              if (scriptData && scriptData.scriptLines) {
                // ScriptAnalysis mode: play next line, will show error if no audio
                setTimeout(() => {
                  if (modeRef.current === currentMode) {
                    playLine(nextIndex, options); // Don't pass skipIfNoAudio - let it show error
                  }
                }, AUDIO_TIMING.ADVANCE_DELAY);
              } else {
                // AiScenePartner mode: check if immediate next partner line has audio
                const nextAudioUrl = getAudioUrlForLine(nextIndex);

                // Store timeout ID so it can be cleared if stopAllPlayback is called
                let timeoutId = null;

                if (nextAudioUrl) {
                  // Immediate next line has audio - play it directly (line by line progression)
                  timeoutId = setTimeout(() => {
                    // Only check mode hasn't changed — don't check activeLineIndexRef
                    // because playLine updates it immediately, making the old check stale
                    if (modeRef.current === currentMode) {
                      playLine(nextIndex, { ...options, skipIfNoAudio: true });
                    }
                  }, AUDIO_TIMING.ADVANCE_DELAY);
                } else {
                  // Immediate next line has no audio - find next playable line
                  const nextPlayable = findNextPlayableLine(lineIndex, true);

                  if (nextPlayable >= 0) {
                    const playableLine = effectiveScriptLines[nextPlayable];
                    const isPlayableUserLine = playableLine && effectiveIsUserLine && effectiveIsUserLine(playableLine);

                    // Check if nextPlayable is a user line (findNextPlayableLine returns user line to stop auto-play)
                    if (isPlayableUserLine) {
                      // It's a user line - activate it directly (don't call playLine)
                      setTimeout(() => {
                        if (modeRef.current === currentMode) {
                          setCurrentLineIndex(nextPlayable);
                          scrollToLine(nextPlayable);
                        }
                      }, 0);
                      return; // Stop auto-play - user line is now active
                    } else {
                      // It's a partner line with audio - play it
                      timeoutId = setTimeout(() => {
                        if (modeRef.current === currentMode) {
                          playLine(nextPlayable, { ...options, skipIfNoAudio: true });
                        }
                      }, AUDIO_TIMING.ADVANCE_DELAY);
                    }
                  } else {
                    // No playable line found — still advance to the immediate next line
                    // so the script doesn't get stuck
                    setTimeout(() => {
                      if (modeRef.current === currentMode) {
                        setCurrentLineIndex(nextIndex);
                        scrollToLine(nextIndex);
                      }
                    }, 0);
                  }
                }

                // Store timeout ID in polling intervals so it can be cleared on stopAllPlayback
                if (timeoutId) {
                  pollingIntervals.current[`advance-${lineIndex}`] = timeoutId;
                }
              }
            }
          }
        }
      }
    };

    // Set up polling as fallback for onended
    const startPolling = () => {
      if (checkInterval) return;

      checkInterval = setInterval(() => {
        if (endedHandled || endedHandledFlags.current[lineIndex]) {
          if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
            delete pollingIntervals.current[lineIndex];
          }
          return;
        }

        if (audio.ended || (audio.duration > 0 && audio.currentTime >= audio.duration - AUDIO_TIMING.ENDED_THRESHOLD)) {
          handleAudioEnded();
        }
      }, AUDIO_TIMING.POLLING_INTERVAL);

      pollingIntervals.current[lineIndex] = checkInterval;
    };

    // Event handlers
    audio.onplay = () => {
      // Only update state if we're still on the same line (prevent updates from stale audio)
      if (activeLineIndexRef.current === lineIndex && activeAudioRef.current === audio) {
        setIsPlaying(true);
        setAudioError(null);
        setHasAttemptedPlayback(true); // Mark that user has attempted playback
        startPolling(); // Start polling when audio starts
      }
    };

    audio.onpause = () => {
      setIsPlaying(false);
      // Clear highlighting when audio is paused
      setHighlightedWordIndex(-1);
    };

    audio.onended = () => {
      handleAudioEnded();
    };

    audio.onerror = (e) => {
      // Prevent multiple error handlers from firing (prevent infinite loops)
      if (errorHandledFlags.current[lineIndex]) return;
      errorHandledFlags.current[lineIndex] = true;
      
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
        delete pollingIntervals.current[lineIndex];
      }

      setIsPlaying(false);
      setHighlightedWordIndex(-1);
      setPlaybackInfo({ index: null, elapsed: 0, duration: 0 });

      // Format error consistently using centralized error handler
      // Only show error if user has attempted playback
      if (hasAttemptedPlayback) {
        if (scriptData && scriptData.scriptLines) {
          setAudioError(createAudioError(currentScriptMode, scriptAnalysisMode, 'playbackError', audio.error));
        } else {
          const error = new Error(`Audio playback error: ${audio.error?.message || 'Unknown error'}`);
          setAudioError(createPlaybackError(currentScriptMode, scriptAnalysisMode, error));
        }
      }

      if (onError) {
        const error = new Error(`Audio playback error: ${audio.error?.message || 'Unknown error'}`);
        onError(error, lineIndex);
      }

      // Auto-skip on error - only in auto-advance mode, not ScriptAnalysis
      // In rehearsal mode (AiScenePartner), skip to next line automatically
      // IMPORTANT: Only auto-skip if we're still on the same line (no navigation occurred)
      // IMPORTANT: Don't auto-skip if error already handled to prevent infinite loops
      if (!(scriptData && scriptData.scriptLines)) {
        const currentMode = modeRef.current;
        // Check if we're still on the same line before auto-skipping
        const stillOnSameLine = activeLineIndexRef.current === lineIndex;
        
        if (effectiveAutoAdvance && (currentMode === 'rehearsal' || currentMode === 'teleprompter') && stillOnSameLine) {
          // For rehearsal mode, find next playable line (partner with audio or user line)
          const nextPlayable = findNextPlayableLine(lineIndex, true);
          if (nextPlayable >= 0 && nextPlayable !== lineIndex) {
            const playableLine = effectiveScriptLines[nextPlayable];
            const isPlayableUserLine = playableLine && effectiveIsUserLine && effectiveIsUserLine(playableLine);
            // Use setTimeout for ALL state updates to prevent infinite loops
            setTimeout(() => {
              // Double-check that we're still on the same line, mode hasn't changed, and error wasn't already handled
              if (modeRef.current === currentMode && activeLineIndexRef.current === lineIndex && !errorHandledFlags.current[nextPlayable]) {
                if (isPlayableUserLine) {
                  // Next is user line - activate it and stop auto-play
                  setCurrentLineIndex(nextPlayable);
                  scrollToLine(nextPlayable);
                } else {
                  // Next is partner line - play it (but only if next line error wasn't already handled)
                  playLine(nextPlayable, { ...options, skipIfNoAudio: true });
                }
              }
            }, AUDIO_TIMING.ADVANCE_DELAY);
          }
        } else if (currentMode === 'review' && stillOnSameLine) {
          // Review mode - find next completed line
          const nextCompleted = findNextCompletedLine(lineIndex);
          if (nextCompleted >= 0 && nextCompleted !== lineIndex) {
            setTimeout(() => {
              if (modeRef.current === currentMode && activeLineIndexRef.current === lineIndex) {
                playLine(nextCompleted, options);
              }
            }, AUDIO_TIMING.ADVANCE_DELAY);
          }
        }
      }
    };

    audio.ontimeupdate = () => {
      // Only update highlighting if audio is actually playing and has valid duration
      // This ensures highlighting is never called when audio is not present or paused
      if (!audio.duration || !line?.line || audio.paused || audio.ended) {
        // Clear highlighting if audio is paused or ended
        if (audio.paused || audio.ended) {
          setHighlightedWordIndex(-1);
        }
        return;
      }

      // Only proceed with highlighting if audio is actively playing
      const progress = audio.currentTime / audio.duration;
      const words = line.line.split(' ');
      const wordIndex = Math.floor(progress * words.length);

      if (wordIndex >= 0 && wordIndex < words.length) {
        setHighlightedWordIndex(wordIndex);
      }

      setPlaybackInfo({
        index: lineIndex,
        elapsed: audio.currentTime,
        duration: audio.duration,
      });
    };

    // Wait for audio to load before playing (especially important for teleprompter mode)
    const waitForAudioLoad = () => {
      return new Promise((resolve, reject) => {
        // Check if audio src is set (must be set before waiting)
        if (!audio.src || audio.src === '') {
          reject(new Error('Audio src is empty - cannot load'));
          return;
        }
        
        // If audio is already loaded enough to play, resolve immediately
        if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
          resolve();
          return;
        }
        
        // Check if audio already has an error
        if (audio.error) {
          const errorMsg = audio.error.message || 'Unknown error';
          // Don't treat MEDIA_ELEMENT_ERROR: Empty src attribute as a real error if src is actually set
          // This can happen during cleanup race conditions
          if (errorMsg.includes('Empty src') && audio.src && audio.src !== '') {
            // Wait a bit and check again - might be a race condition
            setTimeout(() => {
              if (audio.readyState >= 2) {
                resolve();
              } else if (audio.error && !audio.error.message.includes('Empty src')) {
                reject(new Error(`Audio error: ${audio.error.message}`));
              } else {
                reject(new Error('Audio failed to load'));
              }
            }, 100);
            return;
          }
          reject(new Error(`Audio error: ${errorMsg}`));
          return;
        }
        
        let resolved = false;
        
        // Wait for canplay or loadeddata event (canplay fires earlier)
        const onCanPlay = () => {
          if (resolved) return;
          resolved = true;
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('loadeddata', onLoadedData);
          audio.removeEventListener('error', onError);
          resolve();
        };
        
        const onLoadedData = () => {
          if (resolved) return;
          resolved = true;
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('loadeddata', onLoadedData);
          audio.removeEventListener('error', onError);
          resolve();
        };
        
        const onError = (e) => {
          if (resolved) return;
          resolved = true;
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('loadeddata', onLoadedData);
          audio.removeEventListener('error', onError);
          const errorMsg = audio.error ? `Audio error: ${audio.error.message || 'Unknown error'}` : 'Audio failed to load';
          reject(new Error(errorMsg));
        };
        
        audio.addEventListener('canplay', onCanPlay, { once: true });
        audio.addEventListener('loadeddata', onLoadedData, { once: true });
        audio.addEventListener('error', onError, { once: true });
        
        // Timeout after 5 seconds
        setTimeout(() => {
          if (resolved) return;
          resolved = true;
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('loadeddata', onLoadedData);
          audio.removeEventListener('error', onError);
          reject(new Error('Audio load timeout'));
        }, 5000);
      });
    };

    audio.onloadeddata = () => {
      setAudioError(null);
      // Start polling once duration is known
      if (audio.duration > 0) {
        startPolling();
      }
    };

    // Play the audio
    try {
      // Only log for teleprompter mode (forceMode === 'rehearsal')
      const isTeleprompterCall = forceMode && forceMode === 'rehearsal';
      if (isTeleprompterCall) {
        console.log('[playLine] TELEPROMPTER - Waiting for audio to load, readyState:', audio.readyState);
      }
      
      // Wait for audio to load before playing
      await waitForAudioLoad();
      
      // STALENESS CHECK: Verify this audio element is still the active one for this line.
      // Because playLine() is async, another playLine() call can start while this one is
      // waiting for the audio to load. That second call cleans up this audio element and
      // creates a new one. Without this check, the cleaned-up (stale) audio would still
      // call play() here after loading, causing:
      //   1. Double audio playback (same line heard twice), and
      //   2. Auto-advance failure (stale handleAudioEnded fires when activeLineIndexRef
      //      has already moved forward, failing its guard check, halting the script).
      if (audioRefs.current[lineIndex] !== audio || activeAudioRef.current !== audio) {
        // Ensure the superseded audio stays silent
        if (!audio.paused) {
          audio.pause();
        }
        if (isTeleprompterCall) {
          console.log('[playLine] TELEPROMPTER - Audio superseded during load, aborting play for line', lineIndex);
        }
        return false;
      }
      
      if (isTeleprompterCall) {
        console.log('[playLine] TELEPROMPTER - Audio loaded, readyState:', audio.readyState, 'attempting to play');
      }
      
      const playPromise = audio.play();
      await playPromise;
      if (isTeleprompterCall) {
        console.log('[playLine] TELEPROMPTER - Audio play SUCCESS, returning true');
      }
      return true;
    } catch (error) {
      // Only log for teleprompter mode
      const isTeleprompterCall = forceMode && forceMode === 'rehearsal';
      if (isTeleprompterCall) {
        console.log('[playLine] TELEPROMPTER - Audio play ERROR:', error.name, error.message);
      }
      // Don't treat AbortError as a real error - it's just a race condition
      if (error.name === 'AbortError') {
        if (isTeleprompterCall) {
          console.log('[playLine] TELEPROMPTER - AbortError, returning false');
        }
        return false;
      }
      
      // Ensure we're on the correct line (navigation should already be done, but ensure it)
      setCurrentLineIndex(lineIndex);
      scrollToLine(lineIndex);
      
      // Format error consistently using centralized error handler
      // Only show error if user has attempted playback
      if (hasAttemptedPlayback) {
        if (scriptData && scriptData.scriptLines) {
          setAudioError(createAudioError(currentScriptMode, scriptAnalysisMode, 'playbackError', audio.error));
        } else {
          setAudioError(createPlaybackError(currentScriptMode, scriptAnalysisMode, error));
        }
      }
      
      if (onError) {
        onError(error, lineIndex);
      }
      
      // Auto-skip on play failure - only in auto-advance mode, not ScriptAnalysis
      if (!(scriptData && scriptData.scriptLines)) {
        const currentMode = modeRef.current;
        if (currentMode === 'review' || currentMode === 'teleprompter') {
          const nextCompleted = findNextCompletedLine(lineIndex);
          if (nextCompleted >= 0) {
            setTimeout(() => playLine(nextCompleted, options), AUDIO_TIMING.ADVANCE_DELAY);
          }
        } else if (effectiveAutoAdvance) {
          // In ScriptAnalysis mode: navigate to next line, if no audio show error and stop
          // In AiScenePartner mode: skip lines with no audio
          if (scriptData && scriptData.scriptLines) {
            // ScriptAnalysis mode: play next line (will show error if no audio)
            const nextIndex = lineIndex + 1;
            if (nextIndex < effectiveScriptLines.length) {
              setTimeout(() => playLine(nextIndex, options), AUDIO_TIMING.ADVANCE_DELAY);
            }
          } else {
            // AiScenePartner mode: skip lines with no audio
            const nextPlayable = findNextPlayableLine(lineIndex, true);
            if (nextPlayable >= 0) {
              setTimeout(() => playLine(nextPlayable, { ...options, skipIfNoAudio: true }), AUDIO_TIMING.ADVANCE_DELAY);
            }
          }
        }
      }
      return false;
    }
  }, [
    effectiveScriptLines,
    getAudioUrlForLine,
    findNextCompletedLine,
    findNextPlayableLine,
    stopAllPlayback,
    cleanupAudio,
    scrollToLine,
    effectiveAutoAdvance,
    onLineComplete,
    onReviewComplete,
    onError,
    selectedAudioSpeed,
    selectedVolume,
    effectiveIsUserLine,
    scriptData,
    currentScriptMode,
    scriptAnalysisMode,
    hasAttemptedPlayback,
  ]);

  // ==========================================================================
  // NAVIGATION FUNCTIONS
  // ==========================================================================
  
  /**
   * Play from first completed line (for review/teleprompter mode)
   * Used by: Review mode start
   */
  const playFromCompleted = useCallback((startIndex = null) => {
    const lines = completedLinesRef.current;
    if (lines.size === 0) {
      if (onError) {
        onError(new Error('No completed lines to play'), null);
      }
      return false;
    }

    const start = startIndex !== null 
      ? startIndex 
      : Math.min(...Array.from(lines));

    return playLine(start, { skipIfNoAudio: true });
  }, [playLine, onError]);

  /**
   * Pause current playback
   * Used by: Play/pause controls
   */
  const pausePlayback = useCallback(() => {
    if (activeAudioRef.current && !activeAudioRef.current.paused) {
      activeAudioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  /**
   * Resume current playback
   * Used by: Play/pause controls
   */
  const resumePlayback = useCallback(() => {
    if (activeAudioRef.current && activeAudioRef.current.paused) {
      // Ensure isPlaying state is set when resuming
      setIsPlaying(true);
      activeAudioRef.current.play().catch((err) => {
        setIsPlaying(false);
        if (onError) {
          onError(err, activeLineIndexRef.current);
        }
      });
    }
  }, [onError]);

  /**
   * Go to next line
   * Used by: Next button, navigation controls
   * Stops current playback before navigating to ensure clean transition
   */
  const goToNextLine = useCallback(() => {
    // Stop current playback before navigating
    stopAllPlayback();
    // Clear error when navigating (will show again if user tries to play and no audio)
    setAudioError(null);
    
    const currentMode = modeRef.current;
    
    if (currentMode === 'review' || currentMode === 'teleprompter') {
      const nextCompleted = findNextCompletedLine(currentLineIndex);
      if (nextCompleted >= 0) {
        playLine(nextCompleted);
      }
    } else {
      if (currentLineIndex < effectiveScriptLines.length - 1) {
        playLine(currentLineIndex + 1);
      }
    }
  }, [currentLineIndex, effectiveScriptLines, findNextCompletedLine, playLine, stopAllPlayback]);

  /**
   * Go to previous line
   * Used by: Previous button, navigation controls
   * Stops current playback before navigating to ensure clean transition
   */
  const goToPreviousLine = useCallback(() => {
    // Stop current playback before navigating
    stopAllPlayback();
    // Clear error when navigating (will show again if user tries to play and no audio)
    setAudioError(null);
    
    const currentMode = modeRef.current;
    
    if (currentMode === 'review' || currentMode === 'teleprompter') {
      // Find previous completed line
      const lines = completedLinesRef.current;
      for (let i = currentLineIndex - 1; i >= 0; i--) {
        if (lines.has(i)) {
          playLine(i);
          return;
        }
      }
    } else {
      if (currentLineIndex > 0) {
        playLine(currentLineIndex - 1);
      }
    }
  }, [currentLineIndex, playLine, stopAllPlayback]);

  // ==========================================================================
  // SCRIPTANALYSIS-SPECIFIC FUNCTIONS
  // ==========================================================================
  
  /**
   * ScriptAnalysis: Handle line click
   * Resets tone and navigates to clicked line
   * Used by: ScriptAnalysis ScriptLineCard onClick
   */
  const handleLineClick = useCallback((index) => {
    if (!effectiveScriptLines || index < 0 || index >= effectiveScriptLines.length) {
      return;
    }

    // Reset tone to neutral
    if (setSelectedTone) {
      setSelectedTone({
        label: 'Neutral',
        value: 'neutral',
      });
    }

    // Stop current playback
    stopAllPlayback();
    // Mark that user has attempted playback (clicking a line counts as attempt)
    setHasAttemptedPlayback(true);
    // Clear error before playing new line - playLine will set it again if no audio
    setAudioError(null);
    playLine(index);
  }, [effectiveScriptLines, setSelectedTone, stopAllPlayback, playLine, setAudioError]);

  /**
   * ScriptAnalysis: Handle previous line
   * Resets tone and navigates to previous line
   * Used by: ScriptAnalysis playback controls
   * Stops current playback before navigating
   */
  const handlePreviousLine = useCallback(() => {
    // Stop current playback before navigating
    stopAllPlayback();
    // Clear error when navigating
    setAudioError(null);
    
    if (setSelectedTone) {
      setSelectedTone({
        label: 'Neutral',
        value: 'neutral',
      });
    }
    goToPreviousLine();
  }, [setSelectedTone, goToPreviousLine, stopAllPlayback]);

  /**
   * ScriptAnalysis: Handle next line
   * Resets tone and navigates to next line
   * Used by: ScriptAnalysis playback controls
   * Stops current playback before navigating
   */
  const handleNextLine = useCallback(() => {
    // Stop current playback before navigating
    stopAllPlayback();
    // Clear error when navigating
    setAudioError(null);
    
    if (setSelectedTone) {
      setSelectedTone({
        label: 'Neutral',
        value: 'neutral',
      });
    }
    goToNextLine();
  }, [setSelectedTone, goToNextLine, stopAllPlayback]);

  /**
   * ScriptAnalysis: Handle play/pause toggle
   * Used by: ScriptAnalysis playback controls
   */
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pausePlayback();
    } else {
      // Mark that user has attempted playback
      setHasAttemptedPlayback(true);
      playLine(currentLineIndex);
    }
  }, [isPlaying, pausePlayback, playLine, currentLineIndex]);

  /**
   * ScriptAnalysis: Handle reset
   * Resets tone, speed, and navigates to first line
   * Used by: ScriptAnalysis playback controls
   */
  const handleReset = useCallback(() => {
    setAudioError(null);
    if (setSelectedTone) {
      setSelectedTone({
        label: 'Neutral',
        value: 'neutral',
      });
    }
    if (setSelectedAudioSpeed) {
      setSelectedAudioSpeed({
        label: '1x',
        value: 1.0,
      });
    }
    stopAllPlayback();
    playLine(0);
  }, [setSelectedTone, setSelectedAudioSpeed, stopAllPlayback, playLine]);

  /**
   * ScriptAnalysis: Alias for playLine (for compatibility)
   * Used by: ScriptAnalysis components
   */
  const playAudio = useCallback((lineIndex) => {
    playLine(lineIndex);
  }, [playLine]);

  /**
   * ScriptAnalysis: Alias for stopPlayback (for compatibility)
   * Used by: ScriptAnalysis components
   */
  const stopAudio = useCallback(() => {
    stopAllPlayback();
  }, [stopAllPlayback]);


  // ==========================================================================
  // SCRIPTANALYSIS MODE: TONE CHANGE HANDLING
  // ==========================================================================
  
  /**
   * ScriptAnalysis mode: Replay audio when tone changes
   * Used by: ScriptAnalysis tone selector
   */
  useEffect(() => {
    if (!(scriptData && scriptData.scriptLines) || !selectedTone?.value) return;
    
    const currentIndex = currentLineIndex;
    if (currentIndex >= 0 && effectiveScriptLines) {
      const line = effectiveScriptLines[currentIndex];
      if (line) {
        const audioUrl = effectiveGetLineAudio(line, selectedTone);
        if (audioUrl && isPlaying) {
          // Stop and replay with new tone
          stopAllPlayback();
          setTimeout(() => {
            playLine(currentIndex);
          }, 100);
        } else if (!audioUrl && hasAttemptedPlayback) {
          // Only show error if user has attempted playback
          setAudioError(createToneError(currentScriptMode, scriptAnalysisMode));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTone?.value, scriptData]);

  // ==========================================================================
  // SCRIPTANALYSIS MODE: SPEED/VOLUME HANDLING
  // ==========================================================================
  
  /**
   * ScriptAnalysis mode: Update audio speed when selectedAudioSpeed changes
   * Applied to currently playing audio element
   */
  useEffect(() => {
    if (selectedAudioSpeed?.value && activeAudioRef.current && !activeAudioRef.current.paused) {
      activeAudioRef.current.playbackRate = selectedAudioSpeed.value;
    }
  }, [selectedAudioSpeed, isPlaying]);

  /**
   * ScriptAnalysis mode: Update audio volume when selectedVolume changes
   * Applied to all audio elements
   */
  useEffect(() => {
    if (selectedVolume !== undefined && selectedVolume !== null) {
      Object.values(audioRefs.current).forEach((audio) => {
        if (audio) {
          audio.volume = selectedVolume / 100;
        }
      });
    }
  }, [selectedVolume]);

  // ==========================================================================
  // CLEANUP ON UNMOUNT
  // ==========================================================================
  
  useEffect(() => {
    return () => {
      stopAllPlayback();
      // Cleanup all audio refs
      Object.keys(audioRefs.current).forEach((key) => {
        cleanupAudio(parseInt(key));
      });
    };
  }, [stopAllPlayback, cleanupAudio]);

  // ==========================================================================
  // RETURN VALUES
  // ==========================================================================
  
  const baseReturn = {
    // State
    isPlaying,
    currentLineIndex,
    highlightedWordIndex,
    audioError,
    playbackInfo,

    // Core Actions
    playLine,
    playFromCompleted,
    stopPlayback: stopAllPlayback,
    pausePlayback,
    resumePlayback,
    goToNextLine,
    goToPreviousLine,

    // Utilities
    getAudioUrlForLine,
    findNextCompletedLine,
    getLastCompletedLineIndex,
    scrollToLine,
  };

  // Add ScriptAnalysis-specific functions if scriptData with scriptLines provided
  if (scriptData && scriptData.scriptLines) {
    return {
      ...baseReturn,
      handleLineClick,
      handlePreviousLine,
      handleNextLine,
      handlePlayPause,
      handleReset,
      getAudioForLine,
      playAudio,
      stopAudio,
      autoScrollEnabled: autoScroll,
    };
  }

  return baseReturn;
};

// Export alias for ScriptAnalysis backward compatibility
export const useScriptAnalysisAudioPlayer = useScriptAudioPlayer;
export const useAudioPlayer = useScriptAudioPlayer;
