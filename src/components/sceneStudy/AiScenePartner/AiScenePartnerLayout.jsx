// Library imports
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useEffect, useRef } from 'react';

// Shared components
import { CustomButton } from '../../Shared';
import PerformanceProgress from '../ScriptAnalysis/PerformanceProgress';

// Local imports
import AudioValidationModal from './modals/AudioValidationModal';
import EndSessionModal from './modals/EndSessionModal';
import { useRecording } from './hooks/useRecording';
import { formatDuration } from './utils/formatDuration';
import AiScenePartnerTeleprompter from './AiScenePartnerTeleprompter';
import AiScenePartnerMainPanel from './AiScenePartnerMainPanel';

// Hooks
import { useAiScenePartnerState } from './hooks/useAiScenePartnerState';
import { useAiScenePartnerHelpers } from './hooks/useAiScenePartnerHelpers';
import { useAiScenePartnerAudioPlayer } from './hooks/useAiScenePartnerAudioPlayer';
import { useAiScenePartnerEffects } from './hooks/useAiScenePartnerEffects';
import { useAiScenePartnerHandlers } from './hooks/useAiScenePartnerHandlers';

const AiScenePartnerLayout = () => {
  const { scriptId } = useParams();

  const {
    scriptAnalysis,
    audioData,
    rehearsalStartLoading,
    rehearsalCompleteLoading,
    analysisLoading,
  } = useSelector((state) => state.sceneStudyScripts);

  // State management
  const state = useAiScenePartnerState(scriptId);
  const {
    title,
    scene,
    scriptLines,
    characterOptions,
    toneOptions,
    teleprompterMode,
    scriptId: versionId,
  } = state;
  
  // Read currentLineIndex directly from state to ensure it's always current
  const { currentLineIndex } = state;

  // Recording hook
  const recording = useRecording();

  // Helper functions (audioPlayer will be updated via ref)
  const helpers = useAiScenePartnerHelpers({
    selectedCharacter: state.selectedCharacter,
    tone: state.tone,
    audioData,
    scriptLines,
    completedLines: state.completedLines,
    audioPlayer: null,
  });

  // Audio player (uses helpers)
  const audioPlayer = useAiScenePartnerAudioPlayer({
    scriptLines,
    playbackMode: state.playbackMode,
    completedLines: state.completedLines,
    recordings: state.recordings,
    tone: state.tone,
    teleprompterMode,
    checkIsUserLine: helpers.checkIsUserLine,
    getLineAudio: helpers.getLineAudio,
    setCompletedLines: state.setCompletedLines,
    setReviewMode: state.setReviewMode,
    setCurrentLineIndex: state.setCurrentLineIndex,
    scrollToLine: helpers.scrollToLine,
    findNextLineWithAudio: helpers.findNextLineWithAudio,
  });

  // Update helpers to include audioPlayer for functions that need it
  const helpersWithPlayer = {
    ...helpers,
    getLastCompletedLineIndex: () => {
      if (audioPlayer) {
        return audioPlayer.getLastCompletedLineIndex();
      }
      if (state.completedLines.size === 0) return -1;
      return Math.max(...Array.from(state.completedLines));
    },
    findNextCompletedLine: (startIndex) => {
      if (audioPlayer) {
        return audioPlayer.findNextCompletedLine(startIndex);
      }
      for (let i = startIndex + 1; i < scriptLines.length; i++) {
        if (state.completedLines.has(i)) {
          return i;
        }
      }
      return -1;
    },
    scrollToLine: (index) => helpers.scrollToLine(index, audioPlayer),
  };

  // Effects and data fetching
  const { versionId: effectiveVersionId } = useAiScenePartnerEffects({
    state,
    scriptAnalysis,
    audioData,
    recording,
    audioPlayer,
    checkIsUserLine: helpersWithPlayer.checkIsUserLine,
    getLineAudio: helpersWithPlayer.getLineAudio,
    scrollToLine: helpersWithPlayer.scrollToLine,
  });

  // Handlers
  const handlers = useAiScenePartnerHandlers({
    state,
    recording,
    audioPlayer,
    helpers: helpersWithPlayer,
    scriptAnalysis,
    versionId: effectiveVersionId,
  });

  // Track previous scriptId to detect route changes
  const prevScriptIdRef = useRef(scriptId);
  const stopAllPlaybackRef = useRef(handlers.stopAllPlayback);
  const audioPlayerRef = useRef(audioPlayer);

  // Update refs when handlers/audioPlayer change
  useEffect(() => {
    stopAllPlaybackRef.current = handlers.stopAllPlayback;
    audioPlayerRef.current = audioPlayer;
  }, [handlers.stopAllPlayback, audioPlayer]);

  // Stop audio when route changes (scriptId changes) or component unmounts
  useEffect(() => {
    // If scriptId changed, stop all audio
    if (prevScriptIdRef.current !== scriptId && prevScriptIdRef.current !== undefined) {
      console.log('[AiScenePartnerLayout] Route changed, stopping all audio');
      if (audioPlayerRef.current && audioPlayerRef.current.stopPlayback) {
        audioPlayerRef.current.stopPlayback();
      } else if (stopAllPlaybackRef.current) {
        stopAllPlaybackRef.current();
      }
    }
    prevScriptIdRef.current = scriptId;

    // Cleanup on unmount
    return () => {
      console.log('[AiScenePartnerLayout] Component unmounting, stopping all audio');
      if (audioPlayerRef.current && audioPlayerRef.current.stopPlayback) {
        audioPlayerRef.current.stopPlayback();
      } else if (stopAllPlaybackRef.current) {
        stopAllPlaybackRef.current();
      }
    };
  }, [scriptId]);

  // Stop audio when performance analysis becomes available (analysis modal opens)
  // Use a ref to track if we've already stopped audio for this analysis
  const prevPerformanceAnalysisRef = useRef(state.performanceAnalysis);
  useEffect(() => {
    // Only stop audio if performanceAnalysis just became available (was null/undefined, now has value)
    if (state.performanceAnalysis && !prevPerformanceAnalysisRef.current && audioPlayerRef.current) {
      console.log('[AiScenePartnerLayout] Performance analysis available, stopping all audio');
      // Stop audio when analysis results are shown for the first time
      if (audioPlayerRef.current.stopPlayback) {
        audioPlayerRef.current.stopPlayback();
      } else if (stopAllPlaybackRef.current) {
        stopAllPlaybackRef.current();
      }
    }
    prevPerformanceAnalysisRef.current = state.performanceAnalysis;
  }, [state.performanceAnalysis]);

  // Handler for record stop button
  const handleRecordStop = () => {
    handlers.handleRecordToggle(currentLineIndex);
  };

  // Show teleprompter view if in teleprompter mode
  if (teleprompterMode) {
    const completionRate = (() => {
      const userLinesCount = scriptLines.filter((line) => helpersWithPlayer.checkIsUserLine(line)).length;
      const completedUserLinesCount = scriptLines
        .map((line, idx) => ({ line, idx }))
        .filter(({ line }) => helpersWithPlayer.checkIsUserLine(line))
        .filter(({ idx }) => state.completedLines.has(idx)).length;
      return userLinesCount > 0 
        ? Math.round((completedUserLinesCount / userLinesCount) * 100) 
        : 0;
    })();

    return (
      <AiScenePartnerTeleprompter
        currentLineIndex={currentLineIndex}
        scriptLines={scriptLines}
        isUserLine={helpersWithPlayer.checkIsUserLine}
        hasRecording={handlers.hasRecording}
        getRecordingForIndex={handlers.getRecordingForIndex}
        checkIsUserLine={helpersWithPlayer.checkIsUserLine}
        completedLines={state.completedLines}
        completionRate={completionRate}
        tone={state.tone}
        isRecording={recording.isRecording}
        recordTimer={recording.recordTimer}
        formatDuration={formatDuration}
        reviewMode={state.reviewMode}
        teleprompterMode={teleprompterMode}
        audioPlayer={audioPlayer}
        stopAllPlayback={handlers.stopAllPlayback}
        setReviewMode={state.setReviewMode}
        getLastCompletedLineIndex={handlers.getLastCompletedLineIndex}
        setCurrentLineIndex={state.setCurrentLineIndex}
        setTeleprompterMode={state.setTeleprompterMode}
        handlePrev={handlers.handlePrev}
        findPreviousCompletedLine={handlers.findPreviousCompletedLine}
        handleRecordToggle={handlers.handleRecordToggle}
        sessionStarted={state.sessionStarted}
        handlePlayNonUserLine={handlers.handlePlayNonUserLine}
        getLineAudio={helpersWithPlayer.getLineAudio}
        handleNext={handlers.handleNext}
        findNextCompletedLine={handlers.findNextCompletedLine}
        playRecordingForIndex={handlers.playRecordingForIndex}
        isPlayingIndex={state.isPlayingIndex}
        previewAudioRefs={state.previewAudioRefs}
        handleRestartLine={handlers.handleRestartLine}
        reviewStartIndexRef={state.reviewStartIndexRef}
        stopRecording={recording.stopRecording}
      />
    );
  }

  // Show loader while script lines are loading
  const isLoading = analysisLoading || scriptLines.length === 0;

  // Main view
  return (
    <>
      <style>{`
        audio::-webkit-media-controls-play-button,
        audio::-webkit-media-controls-start-playback-button {
          display: none !important;
        }
        audio::-webkit-media-controls-panel {
          background-color: transparent;
        }
      `}</style>

      {isLoading ? (
        <div className='w-full h-full flex items-center justify-center'>
          <div className='flex flex-col items-center gap-4'>
            <div className='h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin' />
            <p className='text-gray-600 text-lg font-medium'>Loading script lines...</p>
          </div>
        </div>
      ) : (
        <div className='w-full h-full p-[10px]'>
          <div className='flex flex-col lg:flex-row gap-[10px] lg:overflow-auto'>
            <AiScenePartnerMainPanel
              scriptConfig={{
                scriptId,
                title,
                scene,
                selectedCharacter: state.selectedCharacter,
                characterOptions,
                tone: state.tone,
                toneOptions,
              }}
              sessionConfig={{
                sessionStarted: state.sessionStarted,
                rehearsalStartLoading,
                rehearsalCompleteLoading,
                teleprompterMode,
              }}
              scriptLinesConfig={{
                scriptLines,
                currentLineIndex,
                isPlayingIndex: state.isPlayingIndex,
                checkIsUserLine: helpersWithPlayer.checkIsUserLine,
                hasRecording: handlers.hasRecording,
                getRecordingForIndex: handlers.getRecordingForIndex,
                linesWithAudioIssues: state.linesWithAudioIssues,
                getLineAudio: helpersWithPlayer.getLineAudio,
                completedLines: state.completedLines,
                reviewMode: state.reviewMode,
                audioPlayer,
              }}
              recordingConfig={{
                isRecording: recording.isRecording,
                recordTimer: recording.recordTimer,
                recordings: state.recordings,
                previewAudioRefs: state.previewAudioRefs,
                playbackInfo: state.playbackInfo,
                partnerAudioRefs: state.partnerAudioRefs,
              }}
              handlers={{
                handleToneChange: handlers.handleToneChange,
                handleStartSession: handlers.handleStartSession,
                handleEndSession: handlers.handleEndSession,
                handleRestartScene: handlers.handleRestartScene,
                handleRecordToggle: handlers.handleRecordToggle,
                handlePlayNonUserLine: handlers.handlePlayNonUserLine,
                handleRestartLine: handlers.handleRestartLine,
                handleNext: handlers.handleNext,
                playRecordingForIndex: handlers.playRecordingForIndex,
                scrollToLine: handlers.scrollToLine,
                stopAllPlayback: handlers.stopAllPlayback,
              }}
              stateSetters={{
                setSelectedCharacter: state.setSelectedCharacter,
                setTeleprompterMode: state.setTeleprompterMode,
                setIsPlayingIndex: state.setIsPlayingIndex,
                setCurrentLineIndex: state.setCurrentLineIndex,
                setPlaybackInfo: state.setPlaybackInfo,
                setReviewMode: state.setReviewMode,
                getLastCompletedLineIndex: handlers.getLastCompletedLineIndex,
                reviewStartIndexRef: state.reviewStartIndexRef,
                stopRecording: recording.stopRecording,
              }}
            />
          
          <div className='flex flex-col min-h-0 mb-5 bg-white border border-gray-200 rounded-lg p-3 w-full max-w-[28rem] lg:max-w-[20rem]'>
            <div className='flex-1 border rounded-lg border-gray-200 max-h-[600px] overflow-auto'>
              <PerformanceProgress
                pendingSession={state.pendingSession}
                performanceAnalysis={state.performanceAnalysis}
                performanceAnalysisError={state.performanceAnalysisError}
                sessionStarted={state.sessionStarted}
                rehearsalStartLoading={rehearsalStartLoading}
                loadingPreviousAnalysis={state.loadingPreviousAnalysis}
                onStartSession={handlers.handleStartSession}
                scriptLines={scriptLines}
                scriptAnalysis={scriptAnalysis}
              />
            </div>
          </div>
        </div>
        </div>
      )}

      {!isLoading && recording.isRecording && (
        <div className='fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-red-600 text-white px-4 py-3 rounded-full shadow-lg'>
          <span className='inline-block w-2 h-2 bg-white rounded-full animate-pulse' />
          <span className='text-sm font-medium'>Recording line {currentLineIndex + 1}</span>
          <span className='text-xs bg-white/20 px-2 py-[2px] rounded-full'>
            {formatDuration(recording.recordTimer)}
          </span>
          <CustomButton
            variant='contained'
            onClick={handleRecordStop}
            className='!min-w-[70px] !h-8 bg-white text-red-600 hover:bg-gray-100'
            sx={{
              backgroundColor: '#ffffff',
              color: '#dc2626',
              '&:hover': {
                backgroundColor: '#f3f4f6',
              },
            }}
          >
            Stop
          </CustomButton>
        </div>
      )}

      <AudioValidationModal
        open={state.audioValidationModal.open}
        onClose={() => state.setAudioValidationModal({ open: false, missingLines: [] })}
        missingLines={state.audioValidationModal.missingLines}
        onContinue={() => {
          state.setAudioValidationModal({ open: false, missingLines: [] });
          // Call the API to start session
          handlers.startRehearsalSessionAPI();
        }}
      />

      <EndSessionModal
        open={state.endSessionModal.open}
        onClose={() => state.setEndSessionModal({ open: false })}
        scriptLines={scriptLines}
        completedLines={state.completedLines}
        recordings={state.recordings}
        selectedCharacter={state.selectedCharacter}
        checkIsUserLine={helpersWithPlayer.checkIsUserLine}
        formatDuration={formatDuration}
        teleprompterMode={teleprompterMode}
        onConfirmEnd={handlers.confirmEndSession}
        loading={rehearsalCompleteLoading}
        onRecordMissing={(firstMissing) => {
          state.setEndSessionModal({ open: false });
          if (firstMissing !== undefined) {
            state.setCurrentLineIndex(firstMissing);
            if (!teleprompterMode) {
              handlers.scrollToLine(firstMissing);
            }
          }
        }}
      />
    </>
  );
};

export default AiScenePartnerLayout;
