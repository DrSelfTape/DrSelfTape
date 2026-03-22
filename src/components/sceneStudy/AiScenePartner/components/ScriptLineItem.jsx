// Library imports
import { Button } from '@mui/material';

// Shared components
import { ScriptLineCard } from '../../Shared/ScriptLineViewer';

// Local imports
import UserLineControls from './UserLineControls';
import PartnerLineControls from './PartnerLineControls';
import RecordingPreview from './RecordingPreview';

/**
 * Script Line Item Component
 * Individual script line with controls
 */
const ScriptLineItem = ({
  line,
  index,
  userLine,
  recordingDone,
  isActive,
  canAccessLine,
  hasAudioIssue,
  getLineAudio,
  sessionStarted,
  reviewMode,
  isRecording,
  currentLineIndex,
  recordTimer,
  isPlayingIndex,
  isPlaying,
  completedLines,
  recordings,
  previewAudioRefs,
  playbackInfo,
  setIsPlayingIndex,
  setCurrentLineIndex,
  setPlaybackInfo,
  partnerAudioRefs,
  handleRecordToggle,
  handlePlayNonUserLine,
  handleRestartLine,
  handleNext,
  playRecordingForIndex,
  scrollToLine,
  formatDuration,
  stopAllPlayback,
  audioPlayer,
}) => {
  return (
    <>
      <ScriptLineCard
        key={`${line.character}-${index}`}
        line={line}
        index={index}
        isActiveLine={isActive}
        isPlaying={isPlayingIndex === index}
        isUserLine={userLine}
        isSelectedCharacter={true}
        onClick={(e) => {
          if (!canAccessLine) return;
          // Only stop audio on actual user clicks (not programmatic changes)
          // Check if this is a real click event and audio is playing on a different line
          if (e && e.type === 'click' && isPlayingIndex !== null && isPlayingIndex !== index && isPlayingIndex !== currentLineIndex) {
            // Only stop if audio is actually playing on a different line
            // Don't stop if we're just changing to the same line that's already playing
            if (audioPlayer && audioPlayer.stopPlayback) {
              audioPlayer.stopPlayback();
            } else if (stopAllPlayback) {
              stopAllPlayback();
            }
          }
          setCurrentLineIndex(index);
          scrollToLine(index);
        }}
        isMissing={false}
        hasRecording={recordingDone}
        canAccessLine={canAccessLine}
        textSlot={<span className='text-gray-700'>{line.line}</span>}
      >
        <div className='mt-3 flex flex-wrap gap-3 items-center'>
          {userLine ? (
            <UserLineControls
              index={index}
              isRecording={isRecording}
              currentLineIndex={currentLineIndex}
              recordTimer={recordTimer}
              recordingDone={recordingDone}
              reviewMode={reviewMode}
              sessionStarted={sessionStarted}
              canAccessLine={canAccessLine}
              setCurrentLineIndex={setCurrentLineIndex}
              handleRecordToggle={handleRecordToggle}
              handleRestartLine={handleRestartLine}
            />
          ) : (
            <PartnerLineControls
              index={index}
              isPlayingIndex={isPlayingIndex}
              isPlaying={isPlaying}
              hasAudioIssue={hasAudioIssue}
              canAccessLine={canAccessLine}
              reviewMode={reviewMode}
              sessionStarted={sessionStarted}
              setCurrentLineIndex={setCurrentLineIndex}
              handlePlayNonUserLine={handlePlayNonUserLine}
            />
          )}

          <Button
            variant='outline'
            onClick={(e) => {
              e.stopPropagation();
              if (!canAccessLine || reviewMode) return;
              setCurrentLineIndex(index);
              if (sessionStarted && completedLines.has(index)) handleNext(index);
            }}
            disabled={!sessionStarted || reviewMode || !completedLines.has(index)}
            className='border border-gray-200 min-w-[100px] text-gray-700 hover:bg-gray-100 disabled:opacity-60'
          >
            Next ➜
          </Button>
        </div>

        {recordingDone && (
          <RecordingPreview
            index={index}
            recordings={recordings}
            previewAudioRefs={previewAudioRefs}
            isPlayingIndex={isPlayingIndex}
            playbackInfo={playbackInfo}
            setIsPlayingIndex={setIsPlayingIndex}
            setCurrentLineIndex={setCurrentLineIndex}
            setPlaybackInfo={setPlaybackInfo}
            handleRestartLine={handleRestartLine}
            handleRecordToggle={handleRecordToggle}
            reviewMode={reviewMode}
            playRecordingForIndex={playRecordingForIndex}
            formatDuration={formatDuration}
          />
        )}
      </ScriptLineCard>

      {getLineAudio(line) && (
        <audio
          id={`partner-audio-${index}`}
          ref={(el) => {
            if (el) partnerAudioRefs.current[index] = el;
          }}
          src={getLineAudio(line)}
          preload='auto'
          className='hidden'
        />
      )}
    </>
  );
};

export default ScriptLineItem;

