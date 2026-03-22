// Library imports
import { Button } from '@mui/material';

/**
 * Partner Line Controls Component
 * Controls for playing partner lines
 */
const PartnerLineControls = ({
  index,
  isPlayingIndex,
  isPlaying,
  hasAudioIssue,
  canAccessLine,
  reviewMode,
  sessionStarted,
  setCurrentLineIndex,
  handlePlayNonUserLine,
}) => {
  return (
    <div className='relative group'>
      <Button
        onClick={(e) => {
          console.log('[PartnerLineControls] Button clicked, index:', index);
          e.stopPropagation();
          if (!canAccessLine) {
            console.log('[PartnerLineControls] Cannot access line');
            return;
          }
          if (reviewMode) {
            console.log('[PartnerLineControls] In review mode');
            return;
          }
          if (hasAudioIssue) {
            console.log('[PartnerLineControls] Has audio issue');
            return;
          }
          console.log('[PartnerLineControls] Calling setCurrentLineIndex and handlePlayNonUserLine');
          setCurrentLineIndex(index);
          handlePlayNonUserLine(index);
        }}
        disabled={!sessionStarted || !canAccessLine || reviewMode || hasAudioIssue}
        className={`min-w-[140px] flex items-center justify-center gap-2 transition-all ${
          hasAudioIssue
            ? 'border border-red-300 text-red-600 bg-red-50 cursor-not-allowed hover:bg-red-50'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        } disabled:opacity-60`}
      >
        {hasAudioIssue ? (
          <>
            <svg className='w-4 h-4 fill-current text-red-500' viewBox='0 0 20 20'>
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className='text-xs font-medium text-red-600'>Audio Unavailable</span>
          </>
        ) : isPlayingIndex === index ? (
          <>
            {isPlaying ? (
              <>
                <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 24 24'>
                  <path d='M6 4h4v16H6V4zm8 0h4v16h-4V4z'/>
                </svg>
                <span>Pause Line</span>
              </>
            ) : (
              <>
                <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 24 24'>
                  <path d='M8 5v14l11-7z'/>
                </svg>
                <span>Resume Line</span>
              </>
            )}
          </>
        ) : (
          <>
            <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 24 24'>
              <path d='M8 5v14l11-7z'/>
            </svg>
            <span>Play Line</span>
          </>
        )}
      </Button>
      {hasAudioIssue && (
        <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900/95 backdrop-blur-sm text-white text-xs rounded-md shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 whitespace-normal max-w-[240px] text-center leading-relaxed'>
          Audio file not available for this partner line
          <div className='absolute top-full left-1/2 transform -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900/95'></div>
        </div>
      )}
    </div>
  );
};

export default PartnerLineControls;

