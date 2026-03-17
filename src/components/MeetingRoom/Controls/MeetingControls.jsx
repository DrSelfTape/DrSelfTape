// src/components/Controls/MeetingControls.jsx
// ---------------------------------------------------------------
// Bottom bar with mute / camera / screen-share buttons.
// ---------------------------------------------------------------

import { IconButton, Tooltip } from '@mui/material';
import { Mic, MicOff, Videocam, VideocamOff, ScreenShare, StopScreenShare } from '@mui/icons-material';

const MeetingControls = ({
  isMuted,
  isCameraOff,
  isScreenSharing,
  handleToggleMute,
  handleToggleCamera,
  startScreenShare,
  stopScreenShare,
}) => (
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
  </div>
);

export { MeetingControls };