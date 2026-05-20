// Library imports
import { useState, useRef, useCallback } from 'react';

/**
 * Pick the best MediaRecorder mime type available in this browser.
 *
 * Order matters: iOS Safari only supports mp4/aac, Chrome/Firefox
 * prefer webm/opus. Trying webm first on iOS fails outright (not just
 * falls back) — so we probe each one and use the first that's supported.
 */
function pickAudioMime() {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = [
    'audio/mp4;codecs=mp4a.40.2',  // iOS Safari (AAC-LC)
    'audio/mp4',                    // iOS Safari fallback
    'audio/webm;codecs=opus',       // Chrome/Firefox preferred
    'audio/webm',                   // Chrome/Firefox fallback
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

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

    // Recreate recorder fresh to avoid stale state. pickAudioMime() picks
    // an iOS-compatible mp4/aac on iOS and webm/opus elsewhere.
    const mime = pickAudioMime();
    try {
      mediaRecorderRef.current = createRecorder(mime ? { mimeType: mime } : undefined);
    } catch (err) {
      try {
        mediaRecorderRef.current = createRecorder();
      } catch (err2) {
        console.error('MediaRecorder init error', err2);
        alert('Recorder not supported on this device.');
        return false;
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

