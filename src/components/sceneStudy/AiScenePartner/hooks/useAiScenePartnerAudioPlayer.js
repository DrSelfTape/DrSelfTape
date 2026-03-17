// Library imports
import { useCallback } from 'react';
import { useScriptAudioPlayer } from '../../../../hooks/useScriptAudioPlayer';
import { AUDIO_TIMING } from '../../../../constants/audioPlayer';

/**
 * Custom hook for AI Scene Partner audio player setup
 * Configures and manages the unified audio player
 */
export const useAiScenePartnerAudioPlayer = ({
  scriptLines,
  playbackMode,
  completedLines,
  recordings,
  tone,
  teleprompterMode,
  checkIsUserLine,
  getLineAudio,
  setCompletedLines,
  setReviewMode,
  setCurrentLineIndex,
  scrollToLine,
  findNextLineWithAudio,
}) => {
  const player = useScriptAudioPlayer({
    scriptLines,
    mode: playbackMode,
    completedLines,
    recordings,
    tone,
    autoAdvance: true,
    autoScroll: !teleprompterMode,
    isUserLine: checkIsUserLine,
    getLineAudio: getLineAudio,
    onLineComplete: (lineIndex) => {
      if (!completedLines.has(lineIndex)) {
        setCompletedLines((prev) => new Set([...prev, lineIndex]));
      }
    },
    onReviewComplete: () => {
      setReviewMode(false);
      let lastCompletedIndex = -1;
      if (player) {
        lastCompletedIndex = player.getLastCompletedLineIndex();
      } else if (completedLines.size > 0) {
        lastCompletedIndex = Math.max(...Array.from(completedLines));
      }
      if (lastCompletedIndex >= 0) {
        setCurrentLineIndex(lastCompletedIndex);
        if (!teleprompterMode) {
          scrollToLine(lastCompletedIndex, player);
        }
      }
    },
    onError: (error, lineIndex) => {
      // Only auto-advance on error if NOT in teleprompter mode
      // In teleprompter mode, we handle errors differently to avoid infinite loops
      if (lineIndex !== undefined && !teleprompterMode) {
        const nextLine = findNextLineWithAudio(lineIndex);
        if (nextLine >= 0) {
          setTimeout(() => {
            player?.playLine(nextLine, { skipIfNoAudio: true });
          }, AUDIO_TIMING.ADVANCE_DELAY);
        }
      }
    },
  });

  return player;
};

