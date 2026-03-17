// Library imports
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

// Local imports
import {
  SectionCustomTab,
  SectionCustomTabs,
} from '../../Shared';
import { ScriptAnalysisScriptTab } from './ScriptAnalysisTabs/ScriptAnalysisScriptTab';
import { ScriptAnalysisAnalysisTab } from './ScriptAnalysisTabs/ScriptAnalysisAnalysisTab';
import { ScriptAnalysisNotesTab } from './ScriptAnalysisTabs/ScriptAnalysisNotesTab';
import { useSceneAnalysis } from './hooks/useSceneAnalysis';
import { useScriptAudioPlayer } from '../../../hooks/useScriptAudioPlayer';

/**
 * Unified Script Analysis Tabs Container
 * Handles both Actor and Coach modes via props
 * Used by both ScriptAnalysisSidebar and Body/LeftSection
 */
export const ScriptAnalysisTabsContainer = ({
  selectedCharacter,
  scriptData,
  setScriptData,
  mode = 'actor',
  enableAnalysisTab = true,
  enableNotesTab = true,
  enableAnnotations = true,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { scriptId } = useParams();
  const [value, setValue] = useState(0);

  const { scriptAnalysis } = useSelector((state) => state.sceneStudyScripts);
  const { sceneAnalysisData, getSceneAnaylsisData } = useSceneAnalysis({
    dispatch,
    navigate,
    mode,
    redirectPath: mode === 'coach' ? '/collaboration' : '/scene-study/analysis',
    enableSceneAnalysis: enableAnalysisTab,
    enableNotes: enableNotesTab,
  });

  // Use the audio player hook to get the state needed for highlighting
  const { currentLineIndex, highlightedWordIndex } = useScriptAudioPlayer({
    scriptData,
    selectedCharacter,
  });

  useEffect(() => {
    if (scriptAnalysis) {
      const title = scriptAnalysis.script?.title || 'Untitled Script';
      const scene = scriptAnalysis.script?.description || '';

      const scriptLines = [];
      const charactersWithLines = new Set(); // Track characters that have lines

      scriptAnalysis.scenes?.forEach((s) => {
        let lastLine = null;
        s.lines?.forEach((line) => {
          if (line.is_stage_direction) {
            if (lastLine) {
              lastLine.tip =
                (lastLine.tip ? lastLine.tip + ' ' : '') + line.text;
            }
          } else if (line.character) {
            const charName = line.character.name.toUpperCase();
            // Track this character as having lines
            charactersWithLines.add(line.character.name.toLowerCase());
            lastLine = {
              character: charName,
              active: false,
              line: line.text,
              tip: null,
              lineId: line.id,
              audio_by_tone: line?.audio_by_tone,
            };
            scriptLines.push(lastLine);
          }
        });
      });

      // Filter characterOptions to only include characters that have lines
      const characterOptions =
        scriptAnalysis.characters
          ?.filter((c) => {
            // Check if this character has any lines in the script
            return charactersWithLines.has(c?.name?.toLowerCase());
          })
          ?.map((c) => ({
            label: c?.name,
            value: c?.id,
          })) || [];

      setScriptData({ title, scene, scriptLines, characterOptions });
    }
  }, [scriptAnalysis, setScriptData]);

  // Update active lines when character changes
  useEffect(() => {
    if (selectedCharacter?.character) {
      setScriptData((prev) => ({
        ...prev,
        scriptLines: prev.scriptLines.map((line) => ({
          ...line,
          active:
            line?.character?.toLowerCase() ===
            selectedCharacter?.character?.label?.toLowerCase(),
        })),
      }));
    }
  }, [selectedCharacter?.character, setScriptData]);

  const handleTabChange = (_, newValue) => {
    setValue(newValue);
  };

  return (
    <div className='pt-3 lg:pt-6'>
      {mode !== 'coach' && (
        <div className='inline-flex h-10 items-center justify-center bg-gray-100 text-gray-600 rounded-md p-1'>
          <SectionCustomTabs
            value={value}
            onChange={handleTabChange}
            aria-label='custom tabs'
          >
            <SectionCustomTab
              label='Script'
              id='tab-0'
              aria-controls='tabpanel-0'
            />
            {enableAnalysisTab && (
              <SectionCustomTab
                label='Analysis'
                id='tab-1'
                aria-controls='tabpanel-1'
              />
            )}
            {enableNotesTab && (
              <SectionCustomTab
                label='Notes'
                id='tab-2'
                aria-controls='tabpanel-2'
              />
            )}
          </SectionCustomTabs>
        </div>
      )}

      <div className={`w-full flex flex-col ${mode !== 'coach' ? 'mt-[10px]' : ''}`}>
        <ScriptAnalysisScriptTab
          value={mode === 'coach' ? 0 : value}
          index={0}
          scriptData={scriptData}
          selectedCharacter={selectedCharacter}
          sceneAnalysisData={sceneAnalysisData}
          getSceneAnaylsisData={getSceneAnaylsisData}
          mode={mode}
          enableAnnotations={enableAnnotations}
        />

        {enableAnalysisTab && (
          <ScriptAnalysisAnalysisTab
            value={value}
            index={1}
            sceneAnalysisData={sceneAnalysisData}
            currentLineIndex={currentLineIndex}
            highlightedWordIndex={highlightedWordIndex}
            selectedCharacter={selectedCharacter}
          />
        )}

        {enableNotesTab && (
          <ScriptAnalysisNotesTab
            value={value}
            index={2}
            sceneAnalysisData={sceneAnalysisData}
          />
        )}
      </div>
    </div>
  );
};
