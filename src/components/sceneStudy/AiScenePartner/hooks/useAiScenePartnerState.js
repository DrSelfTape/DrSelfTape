// Library imports
import { useMemo, useRef, useState, useEffect } from 'react';
import { getUserItem, setUserItem, removeUserItem, getCurrentUserId } from '../../../../utils/userStorage';

/**
 * Custom hook for AI Scene Partner state management
 * Centralizes all state declarations
 * @param {string|number} scriptId - The script ID to make localStorage keys script-specific
 */
export const useAiScenePartnerState = (scriptId) => {
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

  // Session management state
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [completedLines, setCompletedLines] = useState(new Set());
  
  // Initialize pending session (sessionId and versionId) from localStorage on mount.
  // Keys are namespaced by user id AND script id so a shared device can't surface
  // user A's pending session to user B (was a real bug — these keys were global).
  const getPendingSessionFromStorage = (currentScriptId) => {
    if (!currentScriptId) return { sessionId: null, versionId: null };
    const uid = getCurrentUserId();
    const storedSessionId = getUserItem(uid, `aiScenePartner_pendingSessionId_${currentScriptId}`);
    const storedVersionId = getUserItem(uid, `aiScenePartner_pendingVersionId_${currentScriptId}`);
    return {
      sessionId: storedSessionId ? parseInt(storedSessionId, 10) : null,
      versionId: storedVersionId ? parseInt(storedVersionId, 10) : null,
    };
  };

  const [pendingSession, setPendingSessionState] = useState(() => getPendingSessionFromStorage(scriptId));

  // Reload pending session when scriptId changes
  useEffect(() => {
    const storedSession = getPendingSessionFromStorage(scriptId);
    setPendingSessionState(storedSession);
  }, [scriptId]);

  // Wrapper to update both state and localStorage. Per-user namespaced.
  const setPendingSession = ({ sessionId, versionId }) => {
    setPendingSessionState({ sessionId, versionId });
    if (!scriptId) return;
    const uid = getCurrentUserId();
    if (sessionId && versionId) {
      setUserItem(uid, `aiScenePartner_pendingSessionId_${scriptId}`, String(sessionId));
      setUserItem(uid, `aiScenePartner_pendingVersionId_${scriptId}`, String(versionId));
    } else {
      removeUserItem(uid, `aiScenePartner_pendingSessionId_${scriptId}`);
      removeUserItem(uid, `aiScenePartner_pendingVersionId_${scriptId}`);
    }
  };
  
  // Backward compatibility - for easier refactoring
  const pendingSessionId = pendingSession.sessionId;
  
  // Performance analysis data state
  const [performanceAnalysis, setPerformanceAnalysis] = useState(null);
  const [performanceAnalysisError, setPerformanceAnalysisError] = useState(null);
  const [loadingPreviousAnalysis, setLoadingPreviousAnalysis] = useState(false);
  
  const [audioValidationModal, setAudioValidationModal] = useState({
    open: false,
    missingLines: [],
  });
  const [endSessionModal, setEndSessionModal] = useState({ open: false });

  // Refs
  const partnerAudioRefs = useRef({});
  const previewAudioRefs = useRef({});
  const recordingPlayRefs = useRef({});
  const reviewStartIndexRef = useRef(null);
  const reviewModeRef = useRef(false);

  const { title, scene, scriptLines, characterOptions, toneOptions } = scriptData;

  // Determine current playback mode
  const playbackMode = useMemo(() => {
    if (reviewMode) return 'review';
    if (teleprompterMode) return 'teleprompter';
    return 'rehearsal';
  }, [reviewMode, teleprompterMode]);

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
    setLinesWithAudioIssues,
    scriptData,
    setScriptData,
    sessionStarted,
    setSessionStarted,
    sessionId,
    setSessionId,
    recordings,
    setRecordings,
    completedLines,
    setCompletedLines,
    pendingSessionId, // Backward compatibility
    pendingSession,
    setPendingSession,
    performanceAnalysis,
    setPerformanceAnalysis,
    performanceAnalysisError,
    setPerformanceAnalysisError,
    loadingPreviousAnalysis,
    setLoadingPreviousAnalysis,
    audioValidationModal,
    setAudioValidationModal,
    endSessionModal,
    setEndSessionModal,
    
    // Refs
    partnerAudioRefs,
    previewAudioRefs,
    recordingPlayRefs,
    reviewStartIndexRef,
    reviewModeRef,
    
    // Computed
    title,
    scene,
    scriptLines,
    characterOptions,
    toneOptions,
    playbackMode,
  };
};

