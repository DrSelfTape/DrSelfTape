// src/components/Hooks/useMediaDevices.js
// ---------------------------------------------------------------
// Enumerates cameras & mics, keeps selected devices in state.
// Updates automatically on device change.
// ---------------------------------------------------------------

import { useEffect, useState } from 'react';

export const useMediaDevices = () => {
  const [cameras, setCameras] = useState([]);
  const [mics, setMics] = useState([]);
  const [selectedCam, setSelectedCam] = useState('');
  const [selectedMic, setSelectedMic] = useState('');

  useEffect(() => {
    const md = navigator.mediaDevices;
    if (!md?.enumerateDevices) return;

    let cancelled = false;
    const load = async () => {
      const list = await md.enumerateDevices();
      if (cancelled) return;
      const cams = list.filter((d) => d.kind === 'videoinput');
      const microphones = list.filter((d) => d.kind === 'audioinput');
      setCameras(cams);
      setMics(microphones);

      // Pick first device if none selected
      if (cams.length && !cams.some((c) => c.deviceId === selectedCam)) {
        setSelectedCam(cams[0].deviceId);
      }
      if (microphones.length && !microphones.some((m) => m.deviceId === selectedMic)) {
        setSelectedMic(microphones[0].deviceId);
      }
    };
    load();

    const handler = () => load();
    md.addEventListener('devicechange', handler);
    return () => {
      cancelled = true;
      md.removeEventListener('devicechange', handler);
    };
  }, [selectedCam, selectedMic]);

  return {
    availableCameras: cameras,
    availableMicrophones: mics,
    selectedCameraId: selectedCam,
    setSelectedCameraId: setSelectedCam,
    selectedMicrophoneId: selectedMic,
    setSelectedMicrophoneId: setSelectedMic,
  };
};