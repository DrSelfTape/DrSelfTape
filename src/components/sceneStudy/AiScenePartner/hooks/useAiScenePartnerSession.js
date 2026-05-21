// Library imports
import { useState, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  startRehearsalSession,
  completeRehearsalSession,
} from '../../../../redux/features/sceneStudyScripts/sceneStudyScriptsSlice';

/**
 * Custom hook for managing AI Scene Partner session state and operations
 */
export const useAiScenePartnerSession = ({
  scriptLines,
  selectedCharacter,
  tone,
  versionId,
  scriptAnalysis,
  checkIsUserLine,
  getLineAudio,
  onSessionStart,
  onSessionEnd,
}) => {
  const dispatch = useDispatch();

  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [completedLines, setCompletedLines] = useState(new Set());
  const [recordings, setRecordings] = useState([]);
  const [audioValidationModal, setAudioValidationModal] = useState({
    open: false,
    missingLines: [],
  });
  const [endSessionModal, setEndSessionModal] = useState({ open: false });

  const validatePartnerAudios = useCallback(() => {
    if (!scriptLines || scriptLines.length === 0) {
      return { isValid: true, missingLines: [] };
    }

    const missingLines = [];
    scriptLines.forEach((line, index) => {
      if (!checkIsUserLine(line)) {
        const audioSrc = getLineAudio(line);
        if (!audioSrc) {
          missingLines.push({
            index: index + 1,
            line: line.line || 'N/A',
            character: line.character,
          });
        }
      }
    });

    return {
      isValid: missingLines.length === 0,
      missingLines,
    };
  }, [scriptLines, checkIsUserLine, getLineAudio]);

  const handleStartSession = useCallback(async () => {
    if (!selectedCharacter) return;

    const validation = validatePartnerAudios();
    if (!validation.isValid) {
      setAudioValidationModal({
        open: true,
        missingLines: validation.missingLines,
      });
      return;
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

    try {
      const res = await dispatch(startRehearsalSession(payload)).unwrap();
      const sid = res?.session_id || res?.id || null;
      setSessionId(sid);
      setSessionStarted(true);
      setCompletedLines(new Set());
      onSessionStart?.();
    } catch (err) {
      console.error('Start session error', err);
    }
  }, [
    selectedCharacter,
    validatePartnerAudios,
    versionId,
    scriptAnalysis,
    tone,
    dispatch,
    onSessionStart,
  ]);

  const handleEndSession = useCallback(() => {
    setEndSessionModal({ open: true });
  }, []);

  const confirmEndSession = useCallback(
    async (onStopRecording, onStopAllPlayback) => {
      onStopRecording?.();
      onStopAllPlayback?.();

      const audios = recordings
        .map((r, idx) => ({
          line_id: scriptLines[r.index]?.lineId || null,
          order_index: idx + 1,
          tone,
          file: r.blob,
        }))
        .filter((a) => a.file);

      const fd = new FormData();
      fd.append('session_id', sessionId || '');
      fd.append('version_id', versionId || '');

      audios.forEach((a, i) => {
        fd.append(`audios[${i}].line_id`, a.line_id);
        fd.append(`audios[${i}].order_index`, a.order_index);
        fd.append(`audios[${i}].tone`, a.tone);
        // Derive the extension from the blob's actual mime type so iOS
        // (mp4/aac) and web (webm/opus) recordings both upload with the
        // correct extension.
        const mime = a.file?.type || 'audio/mp4';
        const ext = mime.includes('mp4') ? 'm4a' : mime.includes('webm') ? 'webm' : 'audio';
        const fileName = `audio_${a.line_id}_${Date.now()}.${ext}`;
        fd.append(`audios[${i}].file`, a.file, fileName);
      });

      try {
        await dispatch(completeRehearsalSession(fd)).unwrap();
        setSessionStarted(false);
        setEndSessionModal({ open: false });
        setCompletedLines(new Set());
        onSessionEnd?.();
      } catch (err) {
        console.error('Complete session error', err);
        setEndSessionModal({ open: false });
      }
    },
    [recordings, scriptLines, tone, sessionId, versionId, dispatch, onSessionEnd]
  );

  const addRecording = useCallback(
    (index, url, blob, duration, recordingTone) => {
      setRecordings((prevRecs) => {
        prevRecs
          .filter((r) => r.index === index && r.url)
          .forEach((r) => URL.revokeObjectURL(r.url));
        const filtered = prevRecs.filter((r) => r.index !== index);
        return [
          ...filtered,
          { index, tone: recordingTone, url, blob, duration },
        ];
      });
      setCompletedLines((prev) => new Set([...prev, index]));
    },
    []
  );

  const removeRecording = useCallback((index) => {
    setRecordings((prevRecs) => {
      const rec = prevRecs.find((r) => r.index === index && r.url);
      if (rec?.url) URL.revokeObjectURL(rec.url);
      return prevRecs.filter((r) => r.index !== index);
    });
    setCompletedLines((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, []);

  const getRecording = useCallback(
    (index) => {
      return recordings.find((r) => r.index === index && r.url);
    },
    [recordings]
  );

  const hasRecording = useCallback(
    (index) => {
      return recordings.some((r) => r.index === index);
    },
    [recordings]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recordings.forEach((r) => {
        if (r.url) URL.revokeObjectURL(r.url);
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    sessionStarted,
    sessionId,
    completedLines,
    setCompletedLines,
    recordings,
    audioValidationModal,
    setAudioValidationModal,
    endSessionModal,
    setEndSessionModal,
    handleStartSession,
    handleEndSession,
    confirmEndSession,
    addRecording,
    removeRecording,
    getRecording,
    hasRecording,
    validatePartnerAudios,
  };
};

