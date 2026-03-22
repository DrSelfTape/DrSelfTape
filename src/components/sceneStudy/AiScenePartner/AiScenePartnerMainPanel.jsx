// Library imports
import React from 'react';

// Shared components
import { SelectDropdown, CustomButton } from '../../Shared';

// Local imports
import { TeleprompterIcon } from '../../../assets/icons';
import AiScenePartnerScriptLines from './AiScenePartnerScriptLines';
import AiScenePartnerProgressHeader from './AiScenePartnerProgressHeader';

/**
 * Main Panel Component
 * Contains script header, controls, and script lines
 */
const AiScenePartnerMainPanel = ({
  scriptConfig = {},
  sessionConfig = {},
  scriptLinesConfig = {},
  recordingConfig = {},
  handlers = {},
  stateSetters = {},
}) => {
  // Extract script configuration
  const {
    scriptId,
    title,
    scene,
    selectedCharacter,
    characterOptions,
    tone,
    toneOptions,
  } = scriptConfig;

  // Extract session configuration
  const {
    sessionStarted,
    rehearsalStartLoading,
    rehearsalCompleteLoading,
    teleprompterMode,
  } = sessionConfig;

  // Extract script lines configuration
  const {
    scriptLines,
    currentLineIndex,
    isPlayingIndex,
    checkIsUserLine,
    hasRecording,
    getRecordingForIndex,
    linesWithAudioIssues,
    getLineAudio,
    completedLines,
    reviewMode,
    audioPlayer,
  } = scriptLinesConfig;

  // Extract recording configuration
  const {
    isRecording,
    recordTimer,
    recordings,
    previewAudioRefs,
    playbackInfo,
    partnerAudioRefs,
  } = recordingConfig;

  // Extract handlers
  const {
    handleToneChange,
    handleStartSession,
    handleEndSession,
  } = handlers;

  // Extract state setters
  const {
    setSelectedCharacter,
    setTeleprompterMode,
    setIsPlayingIndex,
    setCurrentLineIndex,
    setPlaybackInfo,
    setReviewMode,
    getLastCompletedLineIndex,
    reviewStartIndexRef,
    stopRecording,
  } = stateSetters;

  const handleCharacterChange = (e) => {
    const newValue = e?.target?.value;
    if (newValue && typeof newValue === 'object' && newValue.value) {
      setSelectedCharacter(newValue);
    } else if (newValue) {
      const matchingOption = characterOptions.find(opt => opt.value === newValue);
      setSelectedCharacter(matchingOption || null);
    } else {
      setSelectedCharacter(null);
    }
  };

  const handleTeleprompterToggle = () => {
    setTeleprompterMode((v) => !v);
  };

  const handleSessionButtonClick = () => {
    if (sessionStarted) {
      handleEndSession();
    } else {
      handleStartSession();
    }
  };

  return (
    <div className='h-auto mb-5 rounded-xl bg-white px-3 lg:px-6 py-3 border border-gray-200 w-full'>
      {/* Script Header */}
      <div className='flex justify-between items-center overflow-auto flex-wrap pt-1 w-full gap-4'>
        <div className='w-fit max-w-[50%]'>
          <h1 className='text-xl md:2xl font-semibold text-gray-800'>
            {title} {scriptId ? `#${scriptId}` : ''}
          </h1>
          <p className='text-xs text-gray-600'>{scene}</p>
        </div>

        {/* Character, Tone, and Session Controls */}
        <div className='flex flex-wrap items-center gap-3'>
          <SelectDropdown
            name='character'
            placeholder='Select Character'
            label='Character'
            value={selectedCharacter}
            options={characterOptions}
            onChange={handleCharacterChange}
            disabled={sessionStarted}
            className='!w-[12rem]'
          />

          <SelectDropdown
            name='tone'
            placeholder='Select Tone'
            label='Tone'
            value={tone}
            options={toneOptions}
            onChange={handleToneChange}
            disabled={sessionStarted}
            className='!w-[10rem]'
          />

          <CustomButton
            variant='contained'
            onClick={handleSessionButtonClick}
            disabled={!selectedCharacter || rehearsalStartLoading || (sessionStarted && rehearsalCompleteLoading)}
            loading={sessionStarted ? rehearsalCompleteLoading : rehearsalStartLoading}
            className={`text-white ${sessionStarted ? '!bg-red-600 hover:!bg-red-700' : '!bg-blue-500 hover:!bg-blue-600'} disabled:opacity-70`}
            sx={{
              backgroundColor: sessionStarted ? '#dc2626' : '#3b82f6',
              '&:hover': {
                backgroundColor: sessionStarted ? '#b91c1c' : '#2563eb',
              },
            }}
          >
            {sessionStarted
              ? rehearsalCompleteLoading
                ? 'Ending...'
                : 'End Session'
              : rehearsalStartLoading
              ? 'Starting...'
              : 'Start Session'}
          </CustomButton>
        </div>

        {/* Teleprompter Toggle */}
        <div className='flex flex-wrap items-center gap-2'>
          <CustomButton
            variant='outlined'
            onClick={handleTeleprompterToggle}
            className={`!text-xs !px-4 !py-2 !h-auto border transition-all duration-200 flex items-center gap-2 font-medium ${
              teleprompterMode
                ? 'border-orange-500 text-orange-700 bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 shadow-sm'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400'
            }`}
            sx={{
              borderColor: teleprompterMode ? '#f97316' : '#d1d5db',
              color: teleprompterMode ? '#c2410c' : '#374151',
              backgroundColor: teleprompterMode ? 'transparent' : 'transparent',
            }}
            startIcon={<TeleprompterIcon width={16} height={16} className={`transition-transform duration-200 ${teleprompterMode ? 'rotate-0' : ''}`} />}
          >
            <span className='font-semibold'>{teleprompterMode ? 'Teleprompter: On' : 'Teleprompter: Off'}</span>
            {teleprompterMode && (
              <span className='inline-flex items-center justify-center w-2 h-2 bg-orange-500 rounded-full animate-pulse'></span>
            )}
          </CustomButton>
        </div>
      </div>

      {/* Script Lines Container */}
      <div className='pt-3 lg:pt-6'>
        <div className='rounded-xl bg-white border border-gray-200 overflow-hidden shadow-sm'>
          <AiScenePartnerProgressHeader
            scriptLinesConfig={scriptLinesConfig}
            sessionConfig={sessionConfig}
            handlers={handlers}
            stateSetters={stateSetters}
            recordingConfig={recordingConfig}
          />

          <AiScenePartnerScriptLines
            scriptLinesConfig={scriptLinesConfig}
            recordingConfig={recordingConfig}
            sessionConfig={sessionConfig}
            handlers={handlers}
            stateSetters={stateSetters}
          />
        </div>
      </div>
    </div>
  );
};

export default AiScenePartnerMainPanel;
