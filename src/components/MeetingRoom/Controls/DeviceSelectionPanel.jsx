// components/MeetingRoom/controls/DeviceSelectionPanel.jsx
import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
} from '@mui/material';
import { Videocam, Mic, SettingsInputAntenna } from '@mui/icons-material';

/**
 * Device Selection Panel Component - Standalone device selection interface
 * Can be used in pre-join screen or during meeting for device switching
 *
 * @param {Object} props
 * @param {Object} props.mediaDevices - Media devices hook instance
 * @param {Object} props.localStream - Local stream management object
 * @param {boolean} props.showToggles - Whether to show camera/mic toggle switches
 * @param {string} props.title - Panel title
 * @param {string} props.variant - Layout variant: 'compact' | 'detailed'
 */
const DeviceSelectionPanel = ({
  mediaDevices,
  localStream,
  showToggles = true,
  title = 'Device Settings',
  variant = 'detailed',
}) => {
  /**
   * Handle camera device change
   */
  const handleCameraChange = (event) => {
    mediaDevices.setSelectedCameraId(event.target.value);
  };

  /**
   * Handle microphone device change
   */
  const handleMicrophoneChange = (event) => {
    mediaDevices.setSelectedMicrophoneId(event.target.value);
  };

  /**
   * Handle camera toggle
   */
  const handleCameraToggle = (event) => {
    if (localStream.toggleCamera) {
      localStream.toggleCamera();
    }
  };

  /**
   * Handle microphone toggle
   */
  const handleMicrophoneToggle = (event) => {
    if (localStream.toggleMicrophone) {
      localStream.toggleMicrophone();
    }
  };

  // Compact variant for in-meeting use
  if (variant === 'compact') {
    return (
      <Box className='space-y-3 p-4 bg-slate-800/50 rounded-lg'>
        <Typography variant='subtitle1' className='!text-white !font-semibold'>
          <SettingsInputAntenna className='!w-4 !h-4 mr-2' />
          Devices
        </Typography>

        <div className='space-y-2'>
          {/* Camera Selection */}
          <FormControl fullWidth size='small'>
            <InputLabel id='compact-camera-label' className='!text-white/70'>
              Camera
            </InputLabel>
            <Select
              labelId='compact-camera-label'
              label='Camera'
              value={mediaDevices.selectedCameraId}
              onChange={handleCameraChange}
              className='!text-white'
            >
              {mediaDevices.availableCameras.map((device, index) => (
                <MenuItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${index + 1}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Microphone Selection */}
          <FormControl fullWidth size='small'>
            <InputLabel
              id='compact-microphone-label'
              className='!text-white/70'
            >
              Microphone
            </InputLabel>
            <Select
              labelId='compact-microphone-label'
              label='Microphone'
              value={mediaDevices.selectedMicrophoneId}
              onChange={handleMicrophoneChange}
              className='!text-white'
            >
              {mediaDevices.availableMicrophones.map((device, index) => (
                <MenuItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${index + 1}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      </Box>
    );
  }

  // Detailed variant for pre-join screen
  return (
    <Box className='space-y-4'>
      {/* Header */}
      <Typography variant='h6' className='!text-white !font-semibold'>
        {title}
      </Typography>

      {/* Toggle Switches */}
      {showToggles && (
        <Box className='flex flex-wrap items-center gap-6 p-4 bg-slate-800/30 rounded-lg'>
          <FormControlLabel
            control={
              <Switch
                checked={localStream.isCameraEnabled}
                onChange={handleCameraToggle}
                color='primary'
              />
            }
            label={
              <Box className='flex items-center gap-2'>
                <Videocam className='!w-4 !h-4' />
                <span className='text-white'>
                  {localStream.isCameraEnabled ? 'Camera On' : 'Camera Off'}
                </span>
              </Box>
            }
          />
          <FormControlLabel
            control={
              <Switch
                checked={localStream.isMicrophoneEnabled}
                onChange={handleMicrophoneToggle}
                color='primary'
              />
            }
            label={
              <Box className='flex items-center gap-2'>
                <Mic className='!w-4 !h-4' />
                <span className='text-white'>
                  {localStream.isMicrophoneEnabled
                    ? 'Microphone On'
                    : 'Microphone Muted'}
                </span>
              </Box>
            }
          />
        </Box>
      )}

      {/* Device Selection */}
      <Box className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        {/* Camera Selection */}
        <FormControl fullWidth>
          <InputLabel id='camera-select-label' className='!text-white/70'>
            Camera
          </InputLabel>
          <Select
            labelId='camera-select-label'
            label='Camera'
            value={mediaDevices.selectedCameraId}
            onChange={handleCameraChange}
            disabled={mediaDevices.availableCameras.length === 0}
            className='!text-white'
          >
            {mediaDevices.availableCameras.length === 0 ? (
              <MenuItem value='' disabled>
                No cameras available
              </MenuItem>
            ) : (
              mediaDevices.availableCameras.map((device, index) => (
                <MenuItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${index + 1}`}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>

        {/* Microphone Selection */}
        <FormControl fullWidth>
          <InputLabel id='microphone-select-label' className='!text-white/70'>
            Microphone
          </InputLabel>
          <Select
            labelId='microphone-select-label'
            label='Microphone'
            value={mediaDevices.selectedMicrophoneId}
            onChange={handleMicrophoneChange}
            disabled={mediaDevices.availableMicrophones.length === 0}
            className='!text-white'
          >
            {mediaDevices.availableMicrophones.length === 0 ? (
              <MenuItem value='' disabled>
                No microphones available
              </MenuItem>
            ) : (
              mediaDevices.availableMicrophones.map((device, index) => (
                <MenuItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${index + 1}`}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      </Box>

      {/* Device Status */}
      <Box className='text-sm text-white/60'>
        <p>
          {mediaDevices.availableCameras.length} camera(s),{' '}
          {mediaDevices.availableMicrophones.length} microphone(s) detected
        </p>
        {mediaDevices.isLoadingDevices && (
          <p className='text-blue-400'>Refreshing device list...</p>
        )}
      </Box>
    </Box>
  );
};

export default DeviceSelectionPanel;
