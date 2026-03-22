// Library imports
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

// Redux
import {
  getAudioComposition,
  getScriptAnalysis,
} from '../../../../redux/features/sceneStudyScripts/sceneStudyScriptsSlice';

// Hooks
import { useScriptAudioPlayer } from '../../../../hooks/useScriptAudioPlayer';
import { resolveLineAudio } from '../../../../utils/audioResolution';
import { AUDIO_TIMING } from '../../../../constants/audioPlayer';
import { useRecording } from './useRecording';

/**
 * Custom hook for AI Scene Partner logic
 * Handles all state management, data fetching, and business logic
 */
export const useAiScenePartnerLogic = () => {
  const { scriptId } = useParams();
  const location = useLocation();
  const dispatch = useDispatch();

  const {
    scriptAnalysis,
    audioData,
    rehearsalStartLoading,
    rehearsalCompleteLoading,
  } = useSelector((state) => state.sceneStudyScripts);

  const [tone, setTone] = useState('neutral');
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isPlayingIndex, setIsPlayingIndex] = useState(null);
  const [teleprompterMode, setTeleprompterMode] = useState(false);
  const [playbackInfo, setPlaybackInfo] = useState({
    index: null,
    elapsed: 0,
    duration: 0,
  });
  const [reviewMode, setReviewMode] = useState(false);
  const [linesWithAudioIssues, setLinesWithAudioIssues] = useState(new Set());

  const [scriptData, setScriptData] = useState({
    title: 'Rehearsal Script',
    scene: '',
    scriptLines: [],
    characterOptions: [],
    toneOptions: [
      { label: 'Neutral', value: 'neutral' },
      { label: 'Emotional', value: 'emotional' },
      { label: 'Calm', value: 'calm' },
      { label: 'Energetic', value: 'energetic' },
    ],
  });

  const partnerAudioRefs = useRef({});
  const previewAudioRefs = useRef({});
  const recordingPlayRefs = useRef({});
  const reviewStartIndexRef = useRef(null);
  const reviewModeRef = useRef(false);
  const { title, scene, scriptLines, characterOptions, toneOptions } = scriptData;

  // Use recording hook
  const recording = useRecording();
  const {
    isRecording,
    recordTimer,
    mediaRecorderRef,
    mediaStreamRef,
    chunksRef,
    ensureRecorder: ensureRecorderFromHook,
    stopRecording: stopRecordingFromHook,
    startTimer: startTimerFromHook,
    stopTimer: stopTimerFromHook,
    setIsRecording,
    cleanup: cleanupRecording,
  } = recording;

  const ensureRecorder = ensureRecorderFromHook;
  const stopRecording = stopRecordingFromHook;
  const startTimer = startTimerFromHook;
  const stopTimer = stopTimerFromHook;

  // Session management state
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [completedLines, setCompletedLines] = useState(new Set());
  const [audioValidationModal, setAudioValidationModal] = useState({
    open: false,
    missingLines: [],
  });
  const [endSessionModal, setEndSessionModal] = useState({ open: false });

  // Keep reviewModeRef in sync
  useEffect(() => {
    reviewModeRef.current = reviewMode;
  }, [reviewMode]);

  // Determine current playback mode
  const playbackMode = useMemo(() => {
    if (reviewMode) return 'review';
    if (teleprompterMode) return 'teleprompter';
    return 'rehearsal';
  }, [reviewMode, teleprompterMode]);

  // Helper function to check if line is user's line
  const checkIsUserLine = useCallback((line) => {
    return selectedCharacter &&
      line?.character?.toLowerCase() === selectedCharacter.label?.toLowerCase();
  }, [selectedCharacter]);

  // Helper function to get audio URL for a partner line
  const getLineAudio = useCallback((line, currentTone = tone) => {
    return resolveLineAudio(line, currentTone, audioData);
  }, [tone, audioData]);

  // Helper function to find next line with audio
  const findNextLineWithAudio = useCallback((startIndex) => {
    for (let i = startIndex + 1; i < scriptLines.length; i++) {
      const line = scriptLines[i];
      if (!line) continue;
      
      if (checkIsUserLine(line)) {
        return i;
      }
      
      const audioUrl = getLineAudio(line);
      if (audioUrl) {
        return i;
      }
    }
    return -1;
  }, [scriptLines, checkIsUserLine, getLineAudio]);

  // Unified audio player hook
  const audioPlayer = useScriptAudioPlayer({
    scriptLines,
    mode: playbackMode,
    completedLines,
    recordings,
    tone,
    autoAdvance: true,
    autoScroll: !teleprompterMode,
    isUserLine: checkIsUserLine,
    getLineAudio: getLineAudio,
    onLineComplete: (lineIndex) => {
      if (!completedLines.has(lineIndex)) {
        setCompletedLines((prev) => new Set([...prev, lineIndex]));
      }
    },
    onReviewComplete: () => {
      setReviewMode(false);
      let lastCompletedIndex = -1;
      if (audioPlayer) {
        lastCompletedIndex = audioPlayer.getLastCompletedLineIndex();
      } else if (completedLines.size > 0) {
        lastCompletedIndex = Math.max(...Array.from(completedLines));
      }
      if (lastCompletedIndex >= 0) {
        setCurrentLineIndex(lastCompletedIndex);
      }
    },
    onError: (error, lineIndex) => {
      if (lineIndex !== undefined) {
        const nextLine = findNextLineWithAudio(lineIndex);
        if (nextLine >= 0) {
          setTimeout(() => {
            audioPlayer?.playLine(nextLine, { skipIfNoAudio: true });
          }, AUDIO_TIMING.ADVANCE_DELAY);
        }
      }
    },
  });

  // Determine version id and fetch data
  const versionId =
    location.state?.script?.latest_version?.id ||
    location.state?.script?.id ||
    scriptId;

  useEffect(() => {
    if (versionId) {
      dispatch(getScriptAnalysis(versionId));
      dispatch(getAudioComposition(versionId));
    }
  }, [dispatch, versionId]);

  // Build script data when analysis or audio arrives
  useEffect(() => {
    if (!scriptAnalysis) return;

    const characterOptions =
      scriptAnalysis?.characters?.map((c) => ({
        label: c?.name,
        value: c?.id,
      })) || [];

    const lines = [];
    
    scriptAnalysis?.scenes?.forEach((scene) => {
      scene?.lines?.forEach((line) => {
        if (line?.is_stage_direction) return;

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
        
        lines.push({
          lineId: line?.id,
          character: line?.character?.name || 'Character',
          line: line?.text || '',
          audio_by_tone: toneMap,
          baseAudio,
        });
      });
    });

    setScriptData((prev) => ({
      ...prev,
      title: scriptAnalysis?.script?.title || 'Rehearsal Script',
      scene: scriptAnalysis?.script?.description || '',
      scriptLines: lines,
      characterOptions,
    }));
  }, [scriptAnalysis, audioData]);

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
  }, [scriptLines, selectedCharacter, tone, getLineAudio]);

  // Auto-select first character
  useEffect(() => {
    if (!selectedCharacter && characterOptions?.length > 0) {
      setSelectedCharacter(characterOptions[0]);
    }
  }, [characterOptions, selectedCharacter]);

  const scrollToLine = useCallback((index) => {
    if (audioPlayer?.scrollToLine) {
      audioPlayer.scrollToLine(index);
    } else {
      setTimeout(() => {
        const el = document.getElementById(`line-${index}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }, [audioPlayer]);

  return {
    // State
    tone,
    setTone,
    selectedCharacter,
    setSelectedCharacter,
    currentLineIndex,
    setCurrentLineIndex,
    isPlayingIndex,
    setIsPlayingIndex,
    teleprompterMode,
    setTeleprompterMode,
    playbackInfo,
    setPlaybackInfo,
    reviewMode,
    setReviewMode,
    linesWithAudioIssues,
    scriptData,
    sessionStarted,
    setSessionStarted,
    sessionId,
    setSessionId,
    recordings,
    setRecordings,
    completedLines,
    setCompletedLines,
    audioValidationModal,
    setAudioValidationModal,
    endSessionModal,
    setEndSessionModal,
    
    // Refs
    partnerAudioRefs,
    previewAudioRefs,
    recordingPlayRefs,
    reviewStartIndexRef,
    
    // Recording
    isRecording,
    recordTimer,
    mediaRecorderRef,
    mediaStreamRef,
    chunksRef,
    ensureRecorder,
    stopRecording,
    startTimer,
    stopTimer,
    setIsRecording,
    cleanupRecording,
    
    // Audio player
    audioPlayer,
    
    // Helpers
    checkIsUserLine,
    getLineAudio,
    findNextLineWithAudio,
    scrollToLine,
    playbackMode,
    
    // Data
    versionId,
    scriptId,
    title,
    scene,
    scriptLines,
    characterOptions,
    toneOptions,
    rehearsalStartLoading,
    rehearsalCompleteLoading,
  };
};

