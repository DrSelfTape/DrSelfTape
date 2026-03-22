// Library imports
import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook for managing audio recording functionality
 * Handles MediaRecorder initialization, recording state, and timer
 */
export const useRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startTimer = useCallback(() => {
    setRecordTimer(0);
    timerRef.current = setInterval(() => {
      setRecordTimer((t) => t + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const teardownStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  const createRecorder = useCallback((opts) => {
    const rec = new MediaRecorder(mediaStreamRef.current, opts);
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onerror = (e) => console.error('MediaRecorder runtime error', e.error || e);
    return rec;
  }, []);

  const ensureRecorder = useCallback(async () => {
    const live = mediaStreamRef.current?.getTracks().some((t) => t.readyState === 'live');

    if (!live) {
      teardownStream();
      try {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, noiseSuppression: true, echoCancellation: true },
        });
      } catch (err) {
        console.error('Mic access error', err);
        alert('Microphone access denied. Please allow microphone permissions.');
        return false;
      }
    }

    // Recreate recorder fresh to avoid stale state
    try {
      mediaRecorderRef.current = createRecorder({ mimeType: 'audio/webm;codecs=opus' });
    } catch (e1) {
      try {
        mediaRecorderRef.current = createRecorder({ mimeType: 'audio/webm' });
      } catch (e2) {
        try {
          mediaRecorderRef.current = createRecorder();
        } catch (e3) {
          console.error('MediaRecorder init error', e3);
          alert('Recorder not supported in this browser. Please try another browser.');
          return false;
        }
      }
    }

    return true;
  }, [teardownStream, createRecorder]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
      setIsRecording(false);
      stopTimer();
    }
  }, [stopTimer]);

  const cleanup = useCallback(() => {
    stopRecording();
    teardownStream();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [stopRecording, teardownStream]);

  return {
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
    cleanup,
    teardownStream,
  };
};

