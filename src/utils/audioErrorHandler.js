import { SCRIPT_MODES, SCRIPT_ANALYSIS_MODES } from '../constants/audioPlayer';

export const createAudioError = (mode, scriptAnalysisMode, context = 'noAudio', originalError = null) => {
  const isScriptAnalysis = mode === SCRIPT_MODES.SCRIPT_ANALYSIS;
  const isCoachMode = scriptAnalysisMode === SCRIPT_ANALYSIS_MODES.COACH;

  const errorMessages = {
    noAudio: {
      message: 'Audio not available',
      suggestion: isScriptAnalysis && isCoachMode
        ? 'This line does not have audio. Please try another line.'
        : isScriptAnalysis
          ? 'This line does not have audio. Please try another line or reload the script.'
          : 'This line does not have audio.',
    },
    playbackError: {
      message: 'Audio playback error',
      suggestion: isScriptAnalysis && isCoachMode
        ? 'Unable to play audio. Please try another line.'
        : isScriptAnalysis
          ? 'Unable to play audio. Please try another line or reload the script.'
          : 'Unable to play audio. Please try again.',
    },
    toneError: {
      message: 'Audio not available',
      suggestion: 'This line does not have audio for the selected tone. Please try another tone or another line.',
    },
  };

  const errorTemplate = errorMessages[context] || errorMessages.noAudio;

  // If original error provided, include its message
  if (originalError && context === 'playbackError') {
    const errorDetail = originalError?.message || originalError?.error?.message || 'Unknown error';
    return {
      ...errorTemplate,
      message: `${errorTemplate.message}: ${errorDetail}`,
      originalError,
    };
  }

  return errorTemplate;
};

export const createToneError = (mode, scriptAnalysisMode) => {
  return createAudioError(mode, scriptAnalysisMode, 'toneError');
};

export const createPlaybackError = (mode, scriptAnalysisMode, error) => {
  return createAudioError(mode, scriptAnalysisMode, 'playbackError', error);
};

