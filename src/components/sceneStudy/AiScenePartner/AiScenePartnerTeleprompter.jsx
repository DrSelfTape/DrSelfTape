// Library imports
import { Button } from '@mui/material';

/**
 * Teleprompter View Component
 * Full-screen teleprompter view for rehearsal
 */
const AiScenePartnerTeleprompter = ({
  currentLineIndex,
  scriptLines,
  isUserLine,
  hasRecording,
  getRecordingForIndex,
  checkIsUserLine,
  completedLines,
  completionRate,
  tone,
  isRecording,
  recordTimer,
  formatDuration,
  reviewMode,
  teleprompterMode,
  audioPlayer,
  stopAllPlayback,
  setReviewMode,
  getLastCompletedLineIndex,
  setCurrentLineIndex,
  setTeleprompterMode,
  handlePrev,
  findPreviousCompletedLine,
  handleRecordToggle,
  sessionStarted,
  handlePlayNonUserLine,
  getLineAudio,
  handleNext,
  completedLines: completedLinesProp,
  findNextCompletedLine,
  scriptLines: scriptLinesProp,
  playRecordingForIndex,
  isPlayingIndex,
  previewAudioRefs,
  handleRestartLine,
  reviewStartIndexRef,
  stopRecording,
}) => {
  const current = scriptLines[currentLineIndex] || {};
  const userLine = current ? isUserLine(current) : false;
  const recordingDone = hasRecording(currentLineIndex);
  const progressLabel = `Line ${currentLineIndex + 1} / ${scriptLines.length}`;
  const currentRecording = getRecordingForIndex(currentLineIndex);

  return (
    <div className='w-full h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white flex flex-col fixed inset-0 z-50'>
      <div className='flex items-center justify-between px-4 py-3 bg-black/70 border-b border-white/10 backdrop-blur'>
        <div className='flex items-center gap-3'>
          <div className='text-sm uppercase tracking-wide text-white/80'>Teleprompter</div>
          {reviewMode && (
            <div className='text-xs px-2 py-1 rounded bg-purple-600/30 border border-purple-400/50 text-purple-200 font-semibold'>
              Review Mode
            </div>
          )}
          <div className='text-xs text-white/60'>{progressLabel}</div>
          <div className='text-xs text-white/60'>Complete {completionRate}%</div>
        </div>

        <div className='flex items-center gap-2'>
          {reviewMode && (
            <Button
              size='small'
              variant='outlined'
              onClick={() => {
                if (audioPlayer) {
                  audioPlayer.stopPlayback();
                } else {
                  stopAllPlayback();
                }
                setReviewMode(false);
                const lastCompletedIndex = audioPlayer?.getLastCompletedLineIndex() ?? getLastCompletedLineIndex();
                if (lastCompletedIndex >= 0) {
                  setCurrentLineIndex(lastCompletedIndex);
                }
              }}
              className='!text-xs !h-8 !text-white border-purple-400/50 hover:border-purple-400'
            >
              Exit Review
            </Button>
          )}
          <Button
            size='small'
            variant='outlined'
            onClick={() => setTeleprompterMode(false)}
            className='!text-xs !h-8 !text-white border-white/40 hover:border-white'
          >
            Exit
          </Button>
        </div>
      </div>

      <div className='flex-1 flex flex-col items-center justify-center px-6 overflow-hidden'>
        <div className='max-w-4xl text-center space-y-5'>
          <div className='flex justify-center gap-3 text-xs text-white/60'>
            <span>{current?.character || 'Character'}</span>
            <span className='text-white/30'>•</span>
            <span>{tone}</span>
            {recordingDone && (
              <>
                <span className='text-white/30'>•</span>
                <span className='text-green-300'>Recorded</span>
              </>
            )}
            {isRecording && (
              <>
                <span className='text-white/30'>•</span>
                <span className='text-red-300'>Recording line {currentLineIndex + 1}</span>
              </>
            )}
          </div>

          <div
            key={currentLineIndex}
            className='text-3xl sm:text-4xl leading-relaxed font-semibold px-2 sm:px-6 text-white transition-all duration-500 ease-in-out'
            style={{
              opacity: current?.line ? 1 : 0,
              transform: 'translateY(0)',
            }}
          >
            {current?.line || ''}
          </div>

          <div className='flex justify-center gap-2 text-[11px] text-white/50 flex-wrap'>
            <span className='px-2 py-1 rounded-full bg-white/10 border border-white/10'>
              {progressLabel}
            </span>

            {isRecording && (
              <span className='px-2 py-1 rounded-full bg-red-600/30 border border-red-500/50 text-red-100'>
                Recording • {formatDuration(recordTimer)}
              </span>
            )}

            {isPlayingIndex === currentLineIndex && (
              <span className='px-2 py-1 rounded-full bg-blue-500/20 border border-blue-400/50 text-blue-100'>
                Playing
              </span>
            )}
          </div>
        </div>
      </div>

      <div className='w-full bg-black/85 border-t border-white/10 backdrop-blur px-4 py-3'>
        <div className='max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
          <div className='flex flex-wrap justify-center gap-2 sm:gap-3'>
            <Button
              variant='outlined'
              onClick={handlePrev}
              className='min-w-[90px] border-white/40 text-white'
              disabled={
                reviewMode
                  ? (audioPlayer ? false : findPreviousCompletedLine(currentLineIndex) < 0)
                  : currentLineIndex === 0
              }
            >
              ◀ Prev
            </Button>

            {userLine ? (
              <Button
                onClick={() => {
                  if (reviewMode && recordingDone) {
                    if (audioPlayer) {
                      audioPlayer.stopPlayback();
                    } else {
                      stopAllPlayback();
                    }
                  }
                  handleRecordToggle(currentLineIndex);
                }}
                disabled={!sessionStarted}
                className={`min-w-[140px] flex items-center justify-center gap-2 ${
                  isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-500 hover:bg-blue-600'
                } text-white font-semibold`}
              >
                {isRecording ? (
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
            ) : (
              <div className='relative group'>
                {(() => {
                  const currentLine = scriptLines[currentLineIndex];
                  const hasAudioIssue = currentLine && !getLineAudio(currentLine);
                  return (
                    <Button
                      size='small'
                      variant='outlined'
                      onClick={() => {
                        if (hasAudioIssue) return;
                        handlePlayNonUserLine(currentLineIndex);
                      }}
                      disabled={!sessionStarted || reviewMode || hasAudioIssue}
                      className={`min-w-[140px] flex items-center justify-center gap-2 transition-all ${
                        hasAudioIssue
                          ? 'border border-red-300/50 text-red-600 bg-red-50/80 cursor-not-allowed hover:bg-red-50'
                          : 'border-white/25 text-white/80 hover:text-white hover:border-white/50 bg-white/5'
                      } disabled:opacity-60`}
                    >
                      {hasAudioIssue ? (
                        <>
                          <svg className='w-4 h-4 fill-current text-red-500' viewBox='0 0 20 20'>
                            <path
                              fillRule='evenodd'
                              d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                              clipRule='evenodd'
                            />
                          </svg>
                          <span className='text-xs font-medium text-red-600'>Audio Unavailable</span>
                        </>
                      ) : (
                        <>
                          <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 24 24'>
                            <path d='M8 5v14l11-7z' />
                          </svg>
                          <span>Play partner</span>
                        </>
                      )}
                    </Button>
                  );
                })()}
              </div>
            )}

            <Button
              variant='outlined'
              onClick={() => handleNext(currentLineIndex)}
              className='min-w-[90px] border-white/40 text-white'
              disabled={
                reviewMode
                  ? (() => {
                      const isCurrentCompleted = completedLinesProp.has(currentLineIndex);
                      const hasNextCompleted = audioPlayer
                        ? audioPlayer.findNextCompletedLine(currentLineIndex) >= 0
                        : findNextCompletedLine(currentLineIndex) >= 0;
                      const isAtLastLine = currentLineIndex >= scriptLines.length - 1;
                      return !isAtLastLine && !isCurrentCompleted && !hasNextCompleted;
                    })()
                  : currentLineIndex >= scriptLines.length - 1
              }
            >
              Next ▶
            </Button>
          </div>

          <div className='flex flex-wrap justify-center gap-2 sm:gap-3'>
            {recordingDone && (
              <>
                <Button
                  size='small'
                  variant='outlined'
                  onClick={() => playRecordingForIndex(currentLineIndex)}
                  disabled={!currentRecording}
                  className='min-w-[140px] border-white/40 text-white hover:bg-white/10 disabled:opacity-40 flex items-center justify-center gap-2'
                >
                  {isPlayingIndex === currentLineIndex &&
                  previewAudioRefs.current[`rec-${currentLineIndex}`] &&
                  !previewAudioRefs.current[`rec-${currentLineIndex}`].paused ? (
                    <>
                      <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 24 24'>
                        <path d='M6 4h4v16H6V4zm8 0h4v16h-4V4z' />
                      </svg>
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 24 24'>
                        <path d='M8 5v14l11-7z' />
                      </svg>
                      <span>Play My Take</span>
                    </>
                  )}
                </Button>
                <Button
                  size='small'
                  variant='outlined'
                  onClick={() => handleRestartLine(currentLineIndex)}
                  disabled={!recordingDone}
                  className='min-w-[140px] border-red-400/50 text-red-300 hover:bg-red-500/20 hover:border-red-400 disabled:opacity-40 flex items-center justify-center gap-2'
                >
                  <svg className='w-4 h-4 flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth='2'
                      d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                    />
                  </svg>
                  <span>Remove Recording</span>
                </Button>
              </>
            )}
            {!reviewMode && (
              <Button
                size='small'
                variant='outlined'
                onClick={() => {
                  if (completedLinesProp.size === 0) {
                    console.warn('Complete at least one line before review.');
                    return;
                  }
                  const startIdx = Math.min(...Array.from(completedLinesProp));
                  stopRecording();
                  stopAllPlayback();
                  reviewStartIndexRef.current = startIdx;
                  setCurrentLineIndex(startIdx);
                  setReviewMode(true);
                }}
                className='min-w-[140px] border-white/40 text-white disabled:opacity-40'
                disabled={completedLinesProp.size === 0}
              >
                Review from here
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiScenePartnerTeleprompter;

