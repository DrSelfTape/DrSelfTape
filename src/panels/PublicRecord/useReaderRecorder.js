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
    chunksRef,
    ensureRecorder,
    stopRecording,
    startTimer,
    setIsRecording,
    cleanup,
  } = useRecording();

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
    Object.values(takesRef.current).forEach((t) => {
      if (t?.url) URL.revokeObjectURL(t.url);
    });
    cleanup();
  }, [cleanup]);

  const start = useCallback(async (lineId) => {
    setMicDenied(false);

    const ready = await ensureRecorder();
    if (!ready) {
      // useRecording already surfaces the denial to the user; the page adds
      // an inline, non-blocking hint because a stranger who taps Record and
      // sees nothing happen simply leaves.
      setMicDenied(true);
      return false;
    }

    const rec = mediaRecorderRef.current;
    if (!rec || rec.state !== 'inactive') return false;

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
      setIsRecording(false);
      return false;
    }

    setIsRecording(true);
    startTimer();
    setActiveLineId(lineId);
    return true;
  }, [ensureRecorder, mediaRecorderRef, chunksRef, setIsRecording, startTimer]);

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
