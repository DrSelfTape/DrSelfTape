// Shared components
import { ScriptLineContainer } from '../Shared/ScriptLineViewer';

// Local imports
import { formatDuration } from './utils/formatDuration';
import ScriptLineItem from './components/ScriptLineItem';

/**
 * Script Lines Component
 * Renders all script lines with recording and playback controls
 */
const AiScenePartnerScriptLines = ({
  scriptLinesConfig = {},
  recordingConfig = {},
  sessionConfig = {},
  handlers = {},
  stateSetters = {},
}) => {
  const {
    scriptLines,
    currentLineIndex,
    isPlayingIndex,
    checkIsUserLine,
    hasRecording,
    linesWithAudioIssues,
    getLineAudio,
    completedLines,
    reviewMode,
    audioPlayer,
  } = scriptLinesConfig;

  const {
    isRecording,
    recordTimer,
    recordings,
    previewAudioRefs,
    playbackInfo,
    partnerAudioRefs,
  } = recordingConfig;

  const { sessionStarted } = sessionConfig;

  const {
    handleRecordToggle,
    handlePlayNonUserLine,
    handleRestartLine,
    handleNext,
    playRecordingForIndex,
    scrollToLine,
    stopAllPlayback,
  } = handlers;

  const {
    setIsPlayingIndex,
    setCurrentLineIndex,
    setPlaybackInfo,
  } = stateSetters;

  const isUserLine = checkIsUserLine;
  const formatDurationHelper = formatDuration;
  const isPlaying = audioPlayer?.isPlaying || false;

  return (
    <ScriptLineContainer maxHeight="22rem">
      {scriptLines.map((line, index) => {
        const userLine = isUserLine(line);
        const recordingDone = hasRecording(index);
        const isActive = index === currentLineIndex;
        const canAccessLine =
          !sessionStarted ||
          reviewMode ||
          index === currentLineIndex ||
          completedLines.has(index);
        const hasAudioIssue = linesWithAudioIssues.has(index);

        return (
          <ScriptLineItem
            key={`${line.character}-${index}`}
            line={line}
            index={index}
            userLine={userLine}
            recordingDone={recordingDone}
            isActive={isActive}
            canAccessLine={canAccessLine}
            hasAudioIssue={hasAudioIssue}
            getLineAudio={getLineAudio}
            sessionStarted={sessionStarted}
            reviewMode={reviewMode}
            isRecording={isRecording}
            currentLineIndex={currentLineIndex}
            recordTimer={recordTimer}
            isPlayingIndex={isPlayingIndex}
            isPlaying={isPlaying}
            completedLines={completedLines}
            recordings={recordings}
            previewAudioRefs={previewAudioRefs}
            playbackInfo={playbackInfo}
            setIsPlayingIndex={setIsPlayingIndex}
            setCurrentLineIndex={setCurrentLineIndex}
            setPlaybackInfo={setPlaybackInfo}
            partnerAudioRefs={partnerAudioRefs}
            handleRecordToggle={handleRecordToggle}
            handlePlayNonUserLine={handlePlayNonUserLine}
            handleRestartLine={handleRestartLine}
            handleNext={handleNext}
            playRecordingForIndex={playRecordingForIndex}
            scrollToLine={scrollToLine}
            formatDuration={formatDurationHelper}
            stopAllPlayback={stopAllPlayback}
            audioPlayer={audioPlayer}
          />
        );
      })}
    </ScriptLineContainer>
  );
};

export default AiScenePartnerScriptLines;
