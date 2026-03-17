// Library imports
import { useCallback } from 'react';
import { resolveLineAudio } from '../../../../utils/audioResolution';

/**
 * Custom hook for AI Scene Partner helper functions
 * Contains utility functions and helpers
 */
export const useAiScenePartnerHelpers = ({
  selectedCharacter,
  tone,
  audioData,
  scriptLines,
  completedLines,
  audioPlayer,
}) => {
  // Helper function to check if line is user's line
  const checkIsUserLine = useCallback((line) => {
    return selectedCharacter &&
      line?.character?.toLowerCase() === selectedCharacter.label?.toLowerCase();
  }, [selectedCharacter]);

  // Helper function to get audio URL for a partner line
  const getLineAudio = useCallback((line, currentTone = tone) => {
    return resolveLineAudio(line, currentTone, audioData);
  }, [tone, audioData]);

  // Helper function to find next line with audio
  const findNextLineWithAudio = useCallback((startIndex) => {
    for (let i = startIndex + 1; i < scriptLines.length; i++) {
      const line = scriptLines[i];
      if (!line) continue;
      
      if (checkIsUserLine(line)) {
        return i;
      }
      
      const audioUrl = getLineAudio(line);
      if (audioUrl) {
        return i;
      }
    }
    return -1;
  }, [scriptLines, checkIsUserLine, getLineAudio]);

  const getLastCompletedLineIndex = useCallback(() => {
    if (audioPlayer) {
      return audioPlayer.getLastCompletedLineIndex();
    }
    if (completedLines.size === 0) return -1;
    return Math.max(...Array.from(completedLines));
  }, [audioPlayer, completedLines]);

  const findNextCompletedLine = useCallback((startIndex) => {
    if (audioPlayer) {
      return audioPlayer.findNextCompletedLine(startIndex);
    }
    for (let i = startIndex + 1; i < scriptLines.length; i++) {
      if (completedLines.has(i)) {
        return i;
      }
    }
    return -1;
  }, [audioPlayer, completedLines, scriptLines.length]);

  const findPreviousCompletedLine = useCallback((startIndex) => {
    for (let i = startIndex - 1; i >= 0; i--) {
      if (completedLines.has(i)) {
        return i;
      }
    }
    return -1;
  }, [completedLines]);

  const scrollToLine = useCallback((index, audioPlayer) => {
    if (audioPlayer?.scrollToLine) {
      audioPlayer.scrollToLine(index);
    } else {
      setTimeout(() => {
        const el = document.getElementById(`line-${index}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }, []);

  return {
    checkIsUserLine,
    getLineAudio,
    findNextLineWithAudio,
    getLastCompletedLineIndex,
    findNextCompletedLine,
    findPreviousCompletedLine,
    scrollToLine,
  };
};

