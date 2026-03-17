// src/components/MeetingRoom/Hooks/useAudioAnalyser.js
// ---------------------------------------------------------------
// Calculates RMS audio level (0–1) for local & remote streams.
// Provides `setupAudioAnalyser(stream, 'local' | 'remote')`.
// Cleans up AudioContext and animation frames properly.
// ---------------------------------------------------------------

import { useCallback, useRef, useState } from 'react';

export const useAudioAnalyser = () => {
  // Audio levels (0 = silence, 1 = max volume)
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);

  // Store AudioContext per stream type
  const localAudioContextRef = useRef(null);
  const remoteAudioContextRef = useRef(null);

  // Track animation frame IDs to cancel on cleanup
  const animationRef = useRef({ local: null, remote: null });

  /**
   * Sets up real-time audio level analysis for a MediaStream.
   * @param {MediaStream} stream - The audio stream to analyze
   * @param {'local' | 'remote'} target - Which stream we're analyzing
   */
  const setupAudioAnalyser = useCallback((stream, target) => {
    // Determine refs and setters based on target
    const ctxRef = target === 'local' ? localAudioContextRef : remoteAudioContextRef;
    const setLevel = target === 'local' ? setLocalAudioLevel : setRemoteAudioLevel;
    const animKey = target;

    // === Cleanup previous analyser ===
    if (animationRef.current[animKey]) {
      cancelAnimationFrame(animationRef.current[animKey]);
      animationRef.current[animKey] = null;
    }

    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }

    // === Guard clauses ===
    if (!stream) return;
    if (typeof window === 'undefined') return;

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0 || !audioTracks[0].enabled) {
      setLevel(0);
      return;
    }

    // === Setup new analyser ===
    try {
      const ctx = new AudioContextCtor();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256; // Good balance: responsive + smooth
      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteTimeDomainData(data);

        let sumSquares = 0;
        for (let i = 0; i < data.length; i++) {
          const normalized = (data[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }

        const rms = Math.sqrt(sumSquares / data.length);
        setLevel(rms);

        animationRef.current[animKey] = requestAnimationFrame(tick);
      };

      tick();
      ctxRef.current = ctx;
    } catch (err) {
      console.warn(`Audio analyser failed for ${target}:`, err);
      setLevel(0);
    }
  }, []);

  // === Optional: expose cleanup for external use ===
  const cleanupAudioAnalyser = useCallback((target) => {
    const ctxRef = target === 'local' ? localAudioContextRef : remoteAudioContextRef;
    const animKey = target;

    if (animationRef.current[animKey]) {
      cancelAnimationFrame(animationRef.current[animKey]);
      animationRef.current[animKey] = null;
    }

    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }

    if (target === 'local') setLocalAudioLevel(0);
    if (target === 'remote') setRemoteAudioLevel(0);
  }, []);

  return {
    localAudioLevel,
    remoteAudioLevel,
    setRemoteAudioLevel,    // Expose setter for usePeerConnection
    setupAudioAnalyser,
    cleanupAudioAnalyser,   // Optional: call on disconnect
  };
};