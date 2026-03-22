// Library imports
import { Button } from '@mui/material';

// Local imports
import { formatDuration } from '../utils/formatDuration';

/**
 * User Line Controls Component
 * Controls for recording user lines
 */
const UserLineControls = ({
  index,
  isRecording,
  currentLineIndex,
  recordTimer,
  recordingDone,
  reviewMode,
  sessionStarted,
  canAccessLine,
  setCurrentLineIndex,
  handleRecordToggle,
  handleRestartLine,
}) => {
  return (
    <>
      <Button
        onClick={() => {
          console.log('[UserLineControls] Record button clicked, index:', index);
          console.log('[UserLineControls] reviewMode:', reviewMode, 'recordingDone:', recordingDone);
          if (reviewMode && recordingDone) {
            console.log('[UserLineControls] Review mode with recording - stopping playback');
            // Stop playback handled in parent
          }
          setCurrentLineIndex(index);
          handleRecordToggle(index);
        }}
        disabled={
          !sessionStarted ||
          !canAccessLine ||
          (index !== currentLineIndex && !reviewMode)
        }
        className={`min-w-[140px] flex items-center justify-center gap-2 font-semibold ${
          isRecording && currentLineIndex === index
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        } disabled:opacity-60`}
      >
        {isRecording && currentLineIndex === index ? (
          <>
            <span className='inline-block w-3 h-3 bg-white rounded-full animate-pulse' />
            <span>Stop Recording</span>
          </>
        ) : (
          <>
            <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 24 24'>
              <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='2' fill='none' />
              <circle cx='12' cy='12' r='6' fill='currentColor' />
            </svg>
            <span>{reviewMode && recordingDone ? 'Re-record' : 'Record Line'}</span>
          </>
        )}
      </Button>

      {recordingDone && reviewMode && (
        <Button
          onClick={() => {
            console.log('[UserLineControls] Remove recording button clicked, index:', index);
            setCurrentLineIndex(index);
            handleRestartLine(index);
          }}
          disabled={!recordingDone}
          className='min-w-[140px] border-red-400 text-red-600 hover:bg-red-50 disabled:opacity-40 flex items-center justify-center gap-2'
        >
          <svg className='w-4 h-4 flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
          </svg>
          <span>Remove Recording</span>
        </Button>
      )}

      {isRecording && currentLineIndex === index && (
        <div className='flex items-center gap-2 text-xs text-red-600'>
          <span className='inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse' />
          <span>{formatDuration(recordTimer)}</span>
        </div>
      )}
    </>
  );
};

export default UserLineControls;

