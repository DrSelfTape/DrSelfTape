// src/components/Controls/MeetingControls.jsx
// ---------------------------------------------------------------
// Bottom bar with mute / camera / screen-share / record buttons.
// ---------------------------------------------------------------

import { useState, useRef, useCallback } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Mic, MicOff, Videocam, VideocamOff, ScreenShare, StopScreenShare, FiberManualRecord, Stop, Download } from '@mui/icons-material';

const MeetingControls = ({
  isMuted,
  isCameraOff,
  isScreenSharing,
  handleToggleMute,
  handleToggleCamera,
  startScreenShare,
  stopScreenShare,
  localStreamRef,
  remoteStreamRef,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = useCallback(() => {
    try {
      // Combine local + remote audio/video into one stream
      const combined = new MediaStream();
      const local = localStreamRef?.current;
      const remote = remoteStreamRef?.current;

      if (local) local.getTracks().forEach((t) => combined.addTrack(t.clone()));
      if (remote) remote.getAudioTracks().forEach((t) => combined.addTrack(t.clone()));

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : 'video/webm';

      const recorder = new MediaRecorder(combined, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DrSelfTape-Rehearsal-${new Date().toISOString().slice(0, 16).replace('T', '-')}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        chunksRef.current = [];
      };

      recorder.start(1000);
      recorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, [localStreamRef, remoteStreamRef]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
  <div className="flex items-center justify-center gap-3">
    {/* Mute/Unmute Button */}
    <Tooltip title={isMuted ? 'Unmute' : 'Mute'} arrow placement="top">
      <IconButton
        onClick={handleToggleMute}
        className={`!rounded-full !transition-all !duration-200 ${
          isMuted 
            ? '!bg-red-500 hover:!bg-red-600 !text-white' 
            : '!bg-white/15 hover:!bg-white/25 !text-white backdrop-blur-sm'
        }`}
        sx={{
          width: 48,
          height: 48,
          boxShadow: isMuted 
            ? '0 4px 12px rgba(239, 68, 68, 0.4)' 
            : '0 2px 8px rgba(0, 0, 0, 0.3)',
          '&:hover': {
            transform: 'scale(1.08)',
            boxShadow: isMuted 
              ? '0 6px 16px rgba(239, 68, 68, 0.5)' 
              : '0 4px 12px rgba(0, 0, 0, 0.4)',
          },
          '&:active': {
            transform: 'scale(0.95)',
          },
        }}
      >
        {isMuted ? (
          <MicOff sx={{ fontSize: 20 }} />
        ) : (
          <Mic sx={{ fontSize: 20 }} />
        )}
      </IconButton>
    </Tooltip>

    {/* Camera On/Off Button */}
    <Tooltip title={isCameraOff ? 'Turn camera on' : 'Turn camera off'} arrow placement="top">
      <IconButton
        onClick={handleToggleCamera}
        className={`!rounded-full !transition-all !duration-200 ${
          isCameraOff 
            ? '!bg-white/15 hover:!bg-white/25 !text-white backdrop-blur-sm' 
            : '!bg-red-500 hover:!bg-red-600 !text-white'
        }`}
        sx={{
          width: 48,
          height: 48,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          '&:hover': {
            transform: 'scale(1.08)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          },
          '&:active': {
            transform: 'scale(0.95)',
          },
        }}
      >
        {isCameraOff ? (
          <VideocamOff sx={{ fontSize: 20 }} />
        ) : (
          <Videocam sx={{ fontSize: 20 }} />
        )}
      </IconButton>
    </Tooltip>

    {/* Screen Share Button */}
    <Tooltip title={isScreenSharing ? 'Stop sharing' : 'Share screen'} arrow placement="top">
      <IconButton
        onClick={isScreenSharing ? stopScreenShare : startScreenShare}
        className={`!rounded-full !transition-all !duration-200 ${
          isScreenSharing 
            ? '!bg-red-500 hover:!bg-red-600 !text-white' 
            : '!bg-white/15 hover:!bg-white/25 !text-white backdrop-blur-sm'
        }`}
        sx={{
          width: 48,
          height: 48,
          boxShadow: isScreenSharing 
            ? '0 4px 12px rgba(239, 68, 68, 0.4)' 
            : '0 2px 8px rgba(0, 0, 0, 0.3)',
          '&:hover': {
            transform: 'scale(1.08)',
            boxShadow: isScreenSharing 
              ? '0 6px 16px rgba(239, 68, 68, 0.5)' 
              : '0 4px 12px rgba(0, 0, 0, 0.4)',
          },
          '&:active': {
            transform: 'scale(0.95)',
          },
        }}
      >
        {isScreenSharing ? (
          <StopScreenShare sx={{ fontSize: 20 }} />
        ) : (
          <ScreenShare sx={{ fontSize: 20 }} />
        )}
      </IconButton>
    </Tooltip>

    {/* Record Button */}
    <Tooltip title={isRecording ? `Stop recording (${formatTime(recordingTime)})` : 'Record rehearsal'} arrow placement="top">
      <IconButton
        onClick={isRecording ? stopRecording : startRecording}
        className={`!rounded-full !transition-all !duration-200 ${
          isRecording
            ? '!bg-red-500 hover:!bg-red-600 !text-white'
            : '!bg-white/15 hover:!bg-white/25 !text-white backdrop-blur-sm'
        }`}
        sx={{
          width: 48,
          height: 48,
          boxShadow: isRecording
            ? '0 4px 12px rgba(239, 68, 68, 0.4)'
            : '0 2px 8px rgba(0, 0, 0, 0.3)',
          '&:hover': {
            transform: 'scale(1.08)',
          },
          '&:active': {
            transform: 'scale(0.95)',
          },
        }}
      >
        {isRecording ? (
          <Stop sx={{ fontSize: 20 }} />
        ) : (
          <FiberManualRecord sx={{ fontSize: 20 }} />
        )}
      </IconButton>
    </Tooltip>

    {/* Recording indicator */}
    {isRecording && (
      <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-full px-3 py-1.5">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-red-400 text-xs font-semibold">{formatTime(recordingTime)}</span>
      </div>
    )}
  </div>
  );
};

export { MeetingControls };