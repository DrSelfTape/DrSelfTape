// Library imports
import { useScriptAudioPlayer } from '../../../../hooks/useScriptAudioPlayer';

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
      // NOTE: Do NOT auto-advance here. The internal error handler in
      // useScriptAudioPlayer already handles auto-skipping to the next
      // playable line on errors. Adding a second auto-advance here was
      // causing two playLine() calls for the same next line, resulting
      // in double audio playback ("dialogue said twice" bug).
      console.warn('[AiScenePartnerAudioPlayer] Audio error on line', lineIndex, error?.message);
    },
  });

  return player;
};

