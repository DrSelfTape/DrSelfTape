// Library imports
import { useState } from 'react';
import { useParams } from 'react-router-dom';

// Local imports
import { CustomTabPanel } from '../../../Shared';
import { ScriptLineCard, ScriptLineContainer } from '../../Shared/ScriptLineViewer';
import { ScriptPlaybackControls } from '../ScriptAnalysisComponents/ScriptPlaybackControls';
import { HighlightedText } from '../ScriptAnalysisComponents/HighlightedText';
import { LineAnnotation } from '../ScriptAnalysisComponents/LineAnnotation';
import { useScriptAudioPlayer } from '../../../../hooks/useScriptAudioPlayer';

export const ScriptAnalysisScriptTab = ({
  value,
  index,
  scriptData,
  selectedCharacter,
  sceneAnalysisData,
  getSceneAnaylsisData,
  enableAnnotations = true,
  mode = 'actor',
}) => {
  const [selectedTone, setSelectedTone] = useState({
    label: 'Neutral',
    value: 'neutral',
  });
  const [selectedAudioSpeed, setSelectedAudioSpeed] = useState({
    label: '1x',
    value: 1.0,
  });
  const [selectedVolume, setSelectedVolume] = useState(100);

  const { scriptLines } = scriptData;
  const { scriptId } = useParams();

  const {
    isPlaying,
    currentLineIndex,
    highlightedWordIndex,
    handleLineClick,
    handlePreviousLine,
    handleNextLine,
    handlePlayPause,
    handleReset,
    getAudioForLine,
    audioError,
  } = useScriptAudioPlayer({
    scriptData,
    selectedCharacter,
    sceneAnalysisData,
    getSceneAnaylsisData,
    selectedTone,
    setSelectedTone,
    selectedAudioSpeed,
    setSelectedAudioSpeed,
    selectedVolume,
    scriptAnalysisMode: mode, // Pass mode to hook for conditional error messages
  });

  return (
    <CustomTabPanel value={value} index={index}>
      <div className='rounded-xl bg-white border border-gray-200 overflow-hidden shadow-sm'>
        {/* Header with Progress - EXACT same as original */}
        <div className='border-b border-gray-200 py-3 px-4 lg:px-6 bg-blue-50 flex items-center justify-between'>
          <div className='text-sm font-medium text-gray-700'>
            Line {currentLineIndex + 1} of {scriptLines?.length}
            <div className='w-full bg-gray-200 rounded-full h-1.5 mt-1'>
              <div
                className='bg-blue-500 h-1.5 rounded-full transition-all duration-300'
                style={{
                  width: `${
                    ((currentLineIndex + 1) / scriptLines.length) * 100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Playback Controls - EXACT same as original */}
        <ScriptPlaybackControls
          currentLineIndex={currentLineIndex}
          scriptLinesLength={scriptLines.length}
          isPlaying={isPlaying}
          onPrevious={handlePreviousLine}
          onNext={handleNextLine}
          onPlayPause={handlePlayPause}
          onReset={handleReset}
          selectedTone={selectedTone}
          setSelectedTone={setSelectedTone}
          selectedAudioSpeed={selectedAudioSpeed}
          setSelectedAudioSpeed={setSelectedAudioSpeed}
          selectedVolume={selectedVolume}
          setSelectedVolume={setSelectedVolume}
        />

        {/* Error Message - Show for both actor and coach modes */}
        {audioError && (
          <div className='px-4 lg:px-6 py-3 bg-red-50 border-l-4 border-danger'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <span className='text-danger text-xl'>⚠️</span>
                <div>
                  <p className='text-sm font-medium text-danger'>
                    {typeof audioError === 'object' && audioError?.message
                      ? audioError.message
                      : typeof audioError === 'string'
                      ? audioError
                      : 'Audio not available'}
                  </p>
                  <p className='text-xs text-danger mt-0.5'>
                    {typeof audioError === 'object' && audioError?.suggestion
                      ? audioError.suggestion
                      : 'This line does not have audio. Please try another line or reload the script.'}
                  </p>
                </div>
              </div>
              {mode !== 'coach' && (
                <button
                  onClick={() => window?.location?.reload()}
                  className='text-xs px-3 py-1 bg-danger cursor-pointer text-white rounded-md hover:bg-red-600 transition-colors'
                >
                  Reload Script
                </button>
              )}
            </div>
          </div>
        )}

        {/* Script Lines - Using Shared Components (100% compatible) */}
        <ScriptLineContainer maxHeight="22rem">
          {scriptLines?.map((line, index) => {
            const isUserLine =
              line?.character?.toLowerCase() ===
              selectedCharacter?.character?.label?.toLowerCase();
            const hasAudio = getAudioForLine(line.lineId);

            const isActiveLine = index === currentLineIndex;
            const isSelectedCharacter =
              selectedCharacter.character?.label?.toLowerCase() ===
              line.character?.toLowerCase();

            return (
              <ScriptLineCard
                key={index}
                line={line}
                index={index}
                isActiveLine={isActiveLine}
                isPlaying={isPlaying}
                isUserLine={isUserLine}
                isSelectedCharacter={isSelectedCharacter}
                onClick={() => handleLineClick(index)}
                enableAnnotations={enableAnnotations}
                annotationComponent={LineAnnotation}
                lineId={line?.lineId}
                versionId={scriptId}
                canAccessLine={true}
                textSlot={
                  <HighlightedText
                    text={line.line}
                    lineIndex={index}
                    currentLineIndex={currentLineIndex}
                    highlightedWordIndex={highlightedWordIndex}
                    selectedCharacter={selectedCharacter}
                  />
                }
              />
            );
          })}
        </ScriptLineContainer>
      </div>
    </CustomTabPanel>
  );
};

