// src/components/PreJoin/PreJoinScreen.jsx
// ---------------------------------------------------------------
// Modal shown before the user joins the meeting.
// Handles device preview, name input, camera/mic toggles.
// ---------------------------------------------------------------

import { useEffect, useRef, useState, useMemo } from 'react';
import { CustomModal, CustomButton } from '../../../components/Shared';
import {
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
} from '@mui/material';
import { CircularProgress } from '@mui/material';

const PreJoinScreen = ({
  open,
  isHost,
  displayName,
  setDisplayName,
  selectedCameraId,
  setSelectedCameraId,
  selectedMicrophoneId,
  setSelectedMicrophoneId,
  availableCameras,
  availableMicrophones,
  preJoinVideoRef,
  localAudioLevel,
  getInitials,
  onJoin,
  isInitializing,
  setIsInitializing,
  meetingError,
  setMeetingError,
  setupAudioAnalyser,
  initialCameraState = true,
  initialMicState = true,
}) => {
  const preJoinStreamRef = useRef(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [joinWithCam, setJoinWithCam] = useState(initialCameraState !== false);
  const [joinWithMic, setJoinWithMic] = useState(initialMicState !== false);
  const [streamReady, setStreamReady] = useState(false);

  // -------------------------------------------------------------
  // Start preview stream
  // -------------------------------------------------------------
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const start = async () => {
      setPreviewLoading(true);
      setPreviewError('');
      try {
        const cam = selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true;
        const mic = selectedMicrophoneId ? { deviceId: { exact: selectedMicrophoneId } } : true;
        const stream = await navigator.mediaDevices.getUserMedia({ video: cam, audio: mic });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        preJoinStreamRef.current = stream;
        const v = stream.getVideoTracks()[0];
        if (v) v.enabled = joinWithCam;
        stream.getAudioTracks().forEach((t) => (t.enabled = joinWithMic));
        const videoEl = preJoinVideoRef.current;
        if (videoEl) {
          videoEl.srcObject = stream;
        }
        setupAudioAnalyser(stream, 'local');
        setStreamReady(true);
      } catch (e) {
        setPreviewError(e?.message || 'Cannot access media');
      } finally {
        setPreviewLoading(false);
      }
    };
    start();
    return () => {
      cancelled = true;
      preJoinStreamRef.current?.getTracks().forEach((t) => t.stop());
      preJoinStreamRef.current = null;
      setStreamReady(false);
    };
  }, [
    open,
    selectedCameraId,
    selectedMicrophoneId,
    joinWithCam,
    joinWithMic,
    setupAudioAnalyser,
  ]);

  // -------------------------------------------------------------
  // Toggle preview cam/mic
  // -------------------------------------------------------------
  useEffect(() => {
    const v = preJoinStreamRef.current?.getVideoTracks()[0];
    if (v) {
      v.enabled = joinWithCam;
      // Force re-render to update avatar visibility
      setStreamReady((prev) => !prev);
    }
  }, [joinWithCam]);

  useEffect(() => {
    preJoinStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = joinWithMic));
  }, [joinWithMic]);

  // -------------------------------------------------------------
  // Avatar for preview
  // -------------------------------------------------------------
  const initials = getInitials(displayName);
  const showAvatar = useMemo(() => {
    if (!joinWithCam) return true;
    if (!preJoinStreamRef.current) return true;
    const videoTracks = preJoinStreamRef.current.getVideoTracks();
    if (!videoTracks || videoTracks.length === 0) return true;
    const hasEnabledTrack = videoTracks.some((t) => t.enabled && !t.muted);
    return !hasEnabledTrack;
  }, [joinWithCam, streamReady]);

  const renderAvatar = () => {
    const intensity = Math.min(1, (localAudioLevel || 0) * 3);
    const scale = 1 + intensity * 0.1;
    return (
      <div
        className="relative flex items-center justify-center w-40 h-40 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-blue-500/80 via-sky-500/70 to-cyan-500/80 text-white font-semibold text-5xl md:text-6xl"
        style={{ transform: `scale(${scale})` }}
      >
        {initials}
      </div>
    );
  };

  return (
    <CustomModal open={open} close={() => {}} title={isHost ? 'Get ready to host' : 'Join meeting'} noFooter disableBackdropClick disableEscapeKeyDown hideCloseIcon>
      <div className="space-y-4 p-4">
        {/* ---- Preview ---- */}
        <div className="relative aspect-video w-full max-h-[300px] rounded-2xl overflow-hidden bg-slate-900/80 flex items-center justify-center">
          <video 
            ref={preJoinVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`w-full h-full object-cover transition-opacity duration-300 ${showAvatar ? 'opacity-0' : 'opacity-100'}`} 
          />
          {showAvatar && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              {renderAvatar()}
            </div>
          )}
          {previewLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl">
              <CircularProgress 
                size={40} 
                sx={{ 
                  color: 'white',
                  '& .MuiCircularProgress-circle': {
                    strokeLinecap: 'round',
                  }
                }} 
              />
              <p className="mt-4 text-sm font-medium text-white">Preparing preview…</p>
            </div>
          )}
          {previewError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 text-red-400 text-center p-4">
              {previewError}
            </div>
          )}
          <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md border border-white/30 rounded-full px-3 py-1 text-[10px] font-medium text-white uppercase tracking-wide shadow-lg">
            Device preview
          </div>
          <div className="absolute top-3 right-3 flex gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase shadow-lg backdrop-blur-md border transition-all duration-200 ${
              joinWithCam 
                ? 'bg-emerald-500 text-white border-emerald-400/60 shadow-emerald-500/30' 
                : 'bg-red-500/90 text-white border-red-400/50 shadow-red-500/20'
            }`}>
              {joinWithCam ? 'Camera On' : 'Camera Off'}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase shadow-lg backdrop-blur-md border transition-all duration-200 ${
              joinWithMic 
                ? 'bg-emerald-500 text-white border-emerald-400/60 shadow-emerald-500/30' 
                : 'bg-red-500/90 text-white border-red-400/50 shadow-red-500/20'
            }`}>
              {joinWithMic ? 'Mic On' : 'Mic Muted'}
            </span>
          </div>
        </div>

        {/* ---- Name input ---- */}
        <TextField
          label="Your name"
          variant="outlined"
          fullWidth
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoFocus
        />

        {/* ---- Toggles & device selects ---- */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <FormControlLabel
              control={<Switch checked={joinWithCam} onChange={(e) => setJoinWithCam(e.target.checked)} />}
              label={joinWithCam ? 'Camera on' : 'Camera off'}
            />
            <FormControlLabel
              control={<Switch checked={joinWithMic} onChange={(e) => setJoinWithMic(e.target.checked)} />}
              label={joinWithMic ? 'Microphone on' : 'Microphone muted'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormControl fullWidth size="small">
              <InputLabel>Camera</InputLabel>
              <Select
                value={selectedCameraId}
                label="Camera"
                onChange={(e) => setSelectedCameraId(e.target.value)}
                disabled={!availableCameras.length}
              >
                {availableCameras.length === 0 ? (
                  <MenuItem disabled>No cameras</MenuItem>
                ) : (
                  availableCameras.map((c) => (
                    <MenuItem key={c.deviceId} value={c.deviceId}>
                      {c.label || `Camera ${c.deviceId.slice(0, 4)}`}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Microphone</InputLabel>
              <Select
                value={selectedMicrophoneId}
                label="Microphone"
                onChange={(e) => setSelectedMicrophoneId(e.target.value)}
                disabled={!availableMicrophones.length}
              >
                {availableMicrophones.length === 0 ? (
                  <MenuItem disabled>No microphones</MenuItem>
                ) : (
                  availableMicrophones.map((m) => (
                    <MenuItem key={m.deviceId} value={m.deviceId}>
                      {m.label || `Mic ${m.deviceId.slice(0, 4)}`}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </div>
        </div>

        {/* ---- Join button ---- */}
        <CustomButton
          className="w-full !bg-blue-600 hover:!bg-blue-700"
          disabled={isInitializing || !displayName.trim()}
          onClick={() => {
            setIsInitializing(true);
            onJoin({
              cameraEnabled: joinWithCam,
              micEnabled: joinWithMic,
              cameraId: selectedCameraId,
              microphoneId: selectedMicrophoneId,
            });
          }}
        >
          {isInitializing ? 'Joining…' : 'Join Meeting'}
        </CustomButton>
      </div>
    </CustomModal>
  );
};

export { PreJoinScreen };