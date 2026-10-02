// Library imports
import { useCallback, useEffect, useRef, useState } from 'react';

// Local imports — the recording pipeline already exists and is used
// unmodified. useRecording picks an iOS-compatible mp4/aac mime on Safari
// and webm/opus elsewhere, owns the MediaStream lifecycle, and surfaces
// the permission failure as a false return from ensureRecorder().
import { useRecording } from '../../components/sceneStudy/AiScenePartner/hooks/useRecording';

/**
 * One-line-at-a-time capture for the friend's page.
 *
 * The rehearsal screen records into an indexed array keyed by position in a
 * flattened script. Here the key is the server's line id, because that is
 * what the upload is addressed to (`audio_<lineId>`) and what survives a
 * reload of the page.
 *
 * Duration is measured from a wall clock rather than read off the hook's
 * one-second display timer: the display is for the human, the number we
 * send is for the actor's player.
 */
export function useReaderRecorder() {
  const {
    isRecording,
    recordTimer,
    mediaRecorderRef,
    mediaStreamRef,
    chunksRef,
    ensureRecorder,
    stopRecording,
    startTimer,
    setIsRecording,
    cleanup,
  } = useRecording();

  // ensureRecorder() awaits a microphone permission prompt, and a stranger on
  // a phone can tap another line — or leave the page entirely — while that
  // prompt is still up. Two refs close that window:
  //   startingRef is a SYNCHRONOUS lock, taken before the await, so a second
  //   tap cannot replace a recorder that is already live.
  //   aliveRef marks the page as mounted, so a permission granted after the
  //   user navigated away stops its own tracks instead of recording nobody.
  const startingRef = useRef(false);
  const aliveRef = useRef(true);

  // { [lineId]: { blob, url, durationMs } }
  const [takes, setTakes] = useState({});
  const [activeLineId, setActiveLineId] = useState(null);
  const [micDenied, setMicDenied] = useState(false);

  const startedAtRef = useRef(0);
  // Object URLs are revoked on unmount; a ref keeps the cleanup effect from
  // re-running (and revoking live URLs) every time a take lands.
  const takesRef = useRef(takes);
  takesRef.current = takes;

  useEffect(() => () => {
    aliveRef.current = false;
    Object.values(takesRef.current).forEach((t) => {
      if (t?.url) URL.revokeObjectURL(t.url);
    });
    cleanup();
  }, [cleanup]);

  const start = useCallback(async (lineId) => {
    // Taken before any await: this is what stops a second card from
    // swapping the recorder out from under a take already in progress.
    if (startingRef.current) return false;
    const live = mediaRecorderRef.current;
    if (live && live.state === 'recording') return false;
    startingRef.current = true;

    setMicDenied(false);

    let ready;
    try {
      ready = await ensureRecorder();
    } catch {
      startingRef.current = false;
      return false;
    }

    // The page went away while the permission sheet was up. Whatever we were
    // granted belongs to nobody now — release it rather than leave the mic
    // light on over a page the user already left.
    if (!aliveRef.current) {
      startingRef.current = false;
      mediaStreamRef.current?.getTracks?.().forEach((t) => t.stop());
      cleanup();
      return false;
    }

    if (!ready) {
      startingRef.current = false;
      // useRecording already surfaces the denial to the user; the page adds
      // an inline, non-blocking hint because a stranger who taps Record and
      // sees nothing happen simply leaves.
      setMicDenied(true);
      return false;
    }

    const rec = mediaRecorderRef.current;
    if (!rec || rec.state !== 'inactive') {
      startingRef.current = false;
      return false;
    }

    chunksRef.current = [];
    startedAtRef.current = Date.now();

    rec.onstop = () => {
      const chunks = chunksRef.current;
      chunksRef.current = [];
      if (!chunks.length) return;

      const type = rec.mimeType || chunks[0]?.type || 'audio/mp4';
      const blob = new Blob(chunks, { type });
      const url = URL.createObjectURL(blob);
      const durationMs = Date.now() - startedAtRef.current;

      setTakes((prev) => {
        if (prev[lineId]?.url) URL.revokeObjectURL(prev[lineId].url);
        return { ...prev, [lineId]: { blob, url, durationMs } };
      });
    };

    try {
      rec.start();
    } catch {
      startingRef.current = false;
      setIsRecording(false);
      return false;
    }

    startingRef.current = false;
    setIsRecording(true);
    startTimer();
    setActiveLineId(lineId);
    return true;
  }, [ensureRecorder, mediaRecorderRef, mediaStreamRef, chunksRef, setIsRecording, startTimer, cleanup]);

  const stop = useCallback(() => {
    stopRecording();
    setActiveLineId(null);
  }, [stopRecording]);

  const discard = useCallback((lineId) => {
    setTakes((prev) => {
      if (!prev[lineId]) return prev;
      if (prev[lineId].url) URL.revokeObjectURL(prev[lineId].url);
      const next = { ...prev };
      delete next[lineId];
      return next;
    });
  }, []);

  return {
    takes,
    activeLineId,
    isRecording,
    recordTimer,
    micDenied,
    dismissMicDenied: () => setMicDenied(false),
    start,
    stop,
    discard,
  };
}
