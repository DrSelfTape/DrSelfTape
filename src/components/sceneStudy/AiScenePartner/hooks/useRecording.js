// Library imports
import { useState, useRef, useCallback, createElement } from 'react';
import { createRoot } from 'react-dom/client';

// Local imports
import PermissionsModal from '../../../PermissionsModal';
import useHideMobileHeader from '../../../Shared/useHideMobileHeader';

/**
 * Mic-denial prompt.
 *
 * This is a hook, so it has no render tree of its own to portal into — and the
 * blocking `alert()` this replaces froze the whole page and looked nothing like
 * the app. So the hook owns one host root and renders the real PermissionsModal
 * into it. The root is created once and reused; hiding renders null rather than
 * unmounting, which keeps us out of React's "unmount while rendering" path.
 */
let micPromptRoot = null;

function MicPermissionPrompt({ onClose }) {
  // Same contract as every other modal — slide MobileApp's top bar away.
  useHideMobileHeader(true);
  return createElement(PermissionsModal, {
    isOpen: true,
    requireCamera: false,
    requireMic: true,
    context: 'the AI scene partner',
    onGranted: onClose,
    onDenied: onClose,
  });
}

function showMicPermissionPrompt() {
  if (typeof document === 'undefined') return;
  if (!micPromptRoot) {
    const host = document.createElement('div');
    document.body.appendChild(host);
    micPromptRoot = createRoot(host);
  }
  const close = () => micPromptRoot.render(null);
  micPromptRoot.render(createElement(MicPermissionPrompt, { onClose: close }));
}

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
  // Exposed so a panel can also reflect the denial inline; the prompt above
  // shows regardless, so nothing is silent if a caller ignores this.
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

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
        setMicPermissionDenied(false);
      } catch (err) {
        console.error('Mic access error', err);
        setMicPermissionDenied(true);
        showMicPermissionPrompt();
        return false;
      }
    }

    // Recreate recorder fresh to avoid stale state. pickAudioMime() picks
    // an iOS-compatible mp4/aac on iOS and webm/opus elsewhere.
    const mime = pickAudioMime();
    try {
      mediaRecorderRef.current = createRecorder(mime ? { mimeType: mime } : undefined);
    } catch {
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
    micPermissionDenied,
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
