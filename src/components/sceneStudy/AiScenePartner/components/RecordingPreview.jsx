// Library imports
import { Button } from '@mui/material';

/**
 * Recording Preview Component
 * Displays recording playback controls
 */
const RecordingPreview = ({
  index,
  recordings,
  previewAudioRefs,
  isPlayingIndex,
  playbackInfo,
  setIsPlayingIndex,
  setCurrentLineIndex,
  setPlaybackInfo,
  handleRestartLine,
  handleRecordToggle,
  reviewMode,
  playRecordingForIndex,
  formatDuration,
}) => {
  const currentRecording = recordings.find((r) => r.index === index && r.url);

  const getProgressWidth = () => {
    const ref = previewAudioRefs.current[index] || previewAudioRefs.current[`rec-${index}`];
    if (playbackInfo.index === index && playbackInfo.duration > 0 && playbackInfo.elapsed >= 0) {
      return `${(playbackInfo.elapsed / playbackInfo.duration) * 100}%`;
    }
    if (ref && ref.duration && ref.duration > 0 && ref.currentTime !== undefined && !isNaN(ref.currentTime)) {
      return `${(ref.currentTime / ref.duration) * 100}%`;
    }
    return '0%';
  };

  const getProgressColor = () => {
    const ref = previewAudioRefs.current[index] || previewAudioRefs.current[`rec-${index}`];
    const isPlaying = isPlayingIndex === index && ref && !ref.paused;
    return isPlaying ? 'bg-blue-600' : 'bg-gray-400';
  };

  const getCurrentTime = () => {
    const ref = previewAudioRefs.current[index] || previewAudioRefs.current[`rec-${index}`];
    if (isPlayingIndex === index && playbackInfo.index === index && playbackInfo.elapsed >= 0) {
      return formatDuration(playbackInfo.elapsed);
    }
    if (playbackInfo.index === index && playbackInfo.elapsed !== undefined && playbackInfo.elapsed >= 0) {
      return formatDuration(playbackInfo.elapsed);
    }
    if (ref && ref.currentTime !== undefined && !isNaN(ref.currentTime) && ref.currentTime >= 0) {
      return formatDuration(ref.currentTime);
    }
    return '0:00';
  };

  const getDuration = () => {
    const ref = previewAudioRefs.current[index] || previewAudioRefs.current[`rec-${index}`];
    if (playbackInfo.index === index && playbackInfo.duration > 0) {
      return formatDuration(playbackInfo.duration);
    }
    if (ref && ref.duration && !isNaN(ref.duration) && ref.duration > 0) {
      return formatDuration(ref.duration);
    }
    return '--:--';
  };

  const handleProgressClick = (e) => {
    const ref = previewAudioRefs.current[index] || previewAudioRefs.current[`rec-${index}`];
    if (!ref || !ref.duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = Math.max(0, Math.min(ref.duration, percentage * ref.duration));

    ref.currentTime = newTime;
    setPlaybackInfo({
      index,
      elapsed: newTime,
      duration: ref.duration,
    });
  };

  return (
    <div className='mt-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200'>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <div className='w-2 h-2 bg-green-500 rounded-full'></div>
          <span className='text-xs font-semibold text-gray-700 uppercase tracking-wide'>Your Recording</span>
        </div>
        <div className='flex items-center gap-2'>
          {reviewMode && (
            <Button
              onClick={() => {
                setCurrentLineIndex(index);
                handleRecordToggle(index);
              }}
              size='small'
              className='!px-3 !py-1.5 !h-auto !text-xs border border-blue-300 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 rounded-lg flex items-center gap-1.5 font-medium transition-all duration-200'
            >
              <svg className='w-3.5 h-3.5' fill='currentColor' viewBox='0 0 24 24'>
                <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='2' fill='none' />
                <circle cx='12' cy='12' r='6' fill='currentColor' />
              </svg>
              <span>Re-record</span>
            </Button>
          )}
          <Button
            onClick={() => handleRestartLine(index)}
            size='small'
            variant='outlined'
            className='!px-3 !py-1.5 !h-auto !text-xs border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-400 rounded-lg flex items-center gap-1.5 font-medium transition-all duration-200'
          >
            <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
            </svg>
            <span>Remove</span>
          </Button>
        </div>
      </div>

      {/* Audio Player */}
      <div className='flex items-center gap-4'>
        <button
          onClick={() => {
            console.log('[RecordingPreview] Play button clicked, index:', index);
            playRecordingForIndex(index);
          }}
          className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg ${
            isPlayingIndex === index
              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg'
              : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600'
          }`}
        >
          {(() => {
            const ref = previewAudioRefs.current[index] || previewAudioRefs.current[`rec-${index}`];
            // Check if this recording is currently active (playing or paused)
            const isActive = isPlayingIndex === index;
            // Check actual audio state from ref
            const isActuallyPlaying = ref && !ref.paused;
            const isActuallyPaused = ref && ref.paused;
            
            // Determine icon state: playing > paused > not playing
            const isPlaying = isActive && isActuallyPlaying;
            const isPaused = isActive && isActuallyPaused;
            
            if (isPlaying) {
              return (
                <svg className='w-6 h-6' fill='currentColor' viewBox='0 0 24 24'>
                  <path d='M6 4h4v16H6V4zm8 0h4v16h-4V4z'/>
                </svg>
              );
            } else if (isPaused) {
              return (
                <svg className='w-6 h-6 ml-0.5' fill='currentColor' viewBox='0 0 24 24'>
                  <path d='M8 5v14l11-7z'/>
                </svg>
              );
            } else {
              return (
                <svg className='w-6 h-6 ml-0.5' fill='currentColor' viewBox='0 0 24 24'>
                  <path d='M8 5v14l11-7z'/>
                </svg>
              );
            }
          })()}
        </button>

        {/* Progress Bar and Time */}
        <div className='flex-1 min-w-0 space-y-1'>
          <div
            className='relative h-1.5 bg-gray-200 rounded-full overflow-hidden cursor-pointer hover:h-2 transition-all duration-200 group'
            onClick={handleProgressClick}
          >
            <div
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-100 ${getProgressColor()}`}
              style={{ width: getProgressWidth() }}
            />
          </div>

          <div className='flex items-center justify-between text-xs text-gray-500'>
            <span className='font-medium'>{getCurrentTime()}</span>
            <span className='font-medium'>{getDuration()}</span>
          </div>
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={(el) => {
          if (el) {
            previewAudioRefs.current[index] = el;
            previewAudioRefs.current[`rec-${index}`] = el;
            el.onplay = () => setIsPlayingIndex(index);
            el.onpause = () => {
              // Keep isPlayingIndex set when paused (for resume functionality)
              // Force state update to ensure UI reflects pause state immediately
              setIsPlayingIndex(index);
              // Update playback info to reflect current time
              setPlaybackInfo({
                index,
                elapsed: el.currentTime || 0,
                duration: el.duration && !isNaN(el.duration) ? el.duration : 0,
              });
              console.log('[RecordingPreview] Audio paused (ref handler), keeping isPlayingIndex for resume');
            };
            el.onended = () => {
              setIsPlayingIndex(null);
              setPlaybackInfo({ index: null, elapsed: 0, duration: 0 });
            };
            el.ontimeupdate = () => {
              setPlaybackInfo({
                index,
                elapsed: el.currentTime || 0,
                duration: el.duration && !isNaN(el.duration) ? el.duration : 0,
              });
            };
            el.onloadedmetadata = () => {
              if (el.duration && !isNaN(el.duration)) {
                setPlaybackInfo({
                  index,
                  elapsed: el.currentTime || 0,
                  duration: el.duration,
                });
              }
            };
            el.style.display = 'none';
          }
        }}
        controlsList='nodownload nofullscreen noplaybackrate'
        style={{ display: 'none' }}
        src={currentRecording?.url}
        onPlay={() => setIsPlayingIndex(index)}
        onPause={(e) => {
          // Keep isPlayingIndex set when paused (for resume functionality)
          // Force state update to ensure UI reflects pause state immediately
          const audioEl = e.target;
          setIsPlayingIndex(index);
          // Update playback info to reflect current time
          if (audioEl) {
            setPlaybackInfo({
              index,
              elapsed: audioEl.currentTime || 0,
              duration: audioEl.duration && !isNaN(audioEl.duration) ? audioEl.duration : 0,
            });
          }
          console.log('[RecordingPreview] Audio paused, keeping isPlayingIndex for resume');
        }}
        onEnded={() => {
          setIsPlayingIndex((prevIndex) => {
            if (prevIndex === index) return null;
            return prevIndex;
          });
          setPlaybackInfo({ index: null, elapsed: 0, duration: 0 });
        }}
        onTimeUpdate={(e) => {
          const audioEl = e.target;
          if (audioEl) {
            setPlaybackInfo({
              index,
              elapsed: audioEl.currentTime || 0,
              duration: audioEl.duration && !isNaN(audioEl.duration) ? audioEl.duration : 0,
            });
          }
        }}
        onLoadedMetadata={(e) => {
          const audioEl = e.target;
          if (audioEl && audioEl.duration && !isNaN(audioEl.duration)) {
            setPlaybackInfo({
              index,
              elapsed: audioEl.currentTime || 0,
              duration: audioEl.duration,
            });
          }
        }}
      />
    </div>
  );
};

export default RecordingPreview;

