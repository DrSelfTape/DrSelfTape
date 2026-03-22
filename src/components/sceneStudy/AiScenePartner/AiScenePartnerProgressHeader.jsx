// Shared components
import { CustomButton } from '../../Shared';

// Local imports
import { PreviousIcon, PlayIcon } from '../../../assets/icons';

/**
 * Progress Header Component
 * Shows progress and review mode controls
 */
const AiScenePartnerProgressHeader = ({
  scriptLinesConfig = {},
  sessionConfig = {},
  handlers = {},
  stateSetters = {},
  recordingConfig = {},
}) => {
  const {
    scriptLines,
    currentLineIndex,
    reviewMode,
    completedLines,
    audioPlayer,
  } = scriptLinesConfig;

  const { sessionStarted } = sessionConfig;

  const { stopAllPlayback, scrollToLine } = handlers;

  const {
    setReviewMode,
    getLastCompletedLineIndex,
    setCurrentLineIndex,
    reviewStartIndexRef,
    stopRecording,
  } = stateSetters;

  const handleExitReview = () => {
    if (audioPlayer) {
      audioPlayer.stopPlayback();
    } else {
      stopAllPlayback();
    }
    setReviewMode(false);
    const lastCompletedIndex = audioPlayer?.getLastCompletedLineIndex() ?? getLastCompletedLineIndex();
    if (lastCompletedIndex >= 0) {
      setCurrentLineIndex(lastCompletedIndex);
      if (audioPlayer?.scrollToLine) {
        audioPlayer.scrollToLine(lastCompletedIndex);
      } else {
        scrollToLine(lastCompletedIndex);
      }
    }
  };

  const handleSwitchToReview = () => {
    if (completedLines.size === 0) {
      return;
    }
    const startIdx = Math.min(...Array.from(completedLines));
    stopRecording();
    if (audioPlayer) {
      audioPlayer.stopPlayback();
    } else {
      stopAllPlayback();
    }
    reviewStartIndexRef.current = startIdx;
    setCurrentLineIndex(startIdx);
    if (audioPlayer?.scrollToLine) {
      audioPlayer.scrollToLine(startIdx);
    } else {
      scrollToLine(startIdx);
    }
    setReviewMode(true);
  };

  return (
    <div className='border-b border-gray-200 py-3 px-4 lg:px-6 bg-blue-50 flex items-center justify-between'>
      <div className='text-sm font-medium text-gray-700'>
        {reviewMode ? (
          <span className='text-purple-700 font-semibold'>Review Mode</span>
        ) : (
          <>
            Line {currentLineIndex + 1} of {scriptLines.length}
            <div className='w-full bg-gray-200 rounded-full h-1.5 mt-1'>
              <div
                className='bg-blue-500 h-1.5 rounded-full'
                style={{
                  width: `${((currentLineIndex + 1) / scriptLines.length) * 100}%`,
                }}
              />
            </div>
          </>
        )}
      </div>

      {reviewMode ? (
        <div className='flex gap-2 items-center'>
          <CustomButton
            variant='outlined'
            onClick={handleExitReview}
            className='text-sm border border-purple-300 text-purple-700 hover:bg-purple-50 flex items-center gap-2'
            sx={{
              borderColor: '#c084fc',
              color: '#6b21a8',
            }}
            startIcon={<PreviousIcon className='w-4 h-4' />}
          >
            Exit Review
          </CustomButton>
        </div>
      ) : (
        sessionStarted && (
          <div className='flex gap-2 items-center'>
            <CustomButton
              variant='outlined'
              onClick={handleSwitchToReview}
              disabled={completedLines.size === 0}
              className='!text-sm !px-4 !py-2 !h-auto border-2 border-purple-500 text-purple-700 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 hover:border-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-semibold shadow-sm hover:shadow-md'
              sx={{
                borderColor: '#a855f7',
                color: '#6b21a8',
                backgroundColor: 'transparent',
              }}
              startIcon={<PlayIcon className='w-4 h-4' />}
            >
              Switch to Review
              {completedLines.size > 0 && (
                <span className='ml-1 px-2 py-0.5 bg-purple-200 text-purple-800 text-xs font-bold rounded-full'>
                  {completedLines.size}
                </span>
              )}
            </CustomButton>
          </div>
        )
      )}
    </div>
  );
};

export default AiScenePartnerProgressHeader;
