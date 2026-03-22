// Library import
import { useState } from 'react';

// Local import
import { defaultScriptData } from '../../../utils/data';
import { ScriptAnalysisCharacterSelector } from './ScriptAnalysisCharacterSelector';
import { ScriptAnalysisTabsContainer } from './ScriptAnalysisTabsContainer';

const ScriptAnalysisSidebar = ({
  mode = 'actor',
  enableAnalysisTab = true,
  enableNotesTab = true,
  enableAnnotations = true,
}) => {
  const [selectedCharacter, setSelectedCharacter] = useState({ character: '' });
  const [scriptData, setScriptData] = useState(defaultScriptData);

  return (
    <div className='h-auto mb-5 rounded-xl bg-white px-3 lg:px-6 py-3 border border-gray-200 w-full'>
      {mode !== 'coach' && (
        <ScriptAnalysisCharacterSelector
          scriptData={scriptData}
          selectedCharacter={selectedCharacter}
          setSelectedCharacter={setSelectedCharacter}
          setScriptData={setScriptData}
          allowEditMetadata={mode === 'actor'}
        />
      )}
      <ScriptAnalysisTabsContainer
        scriptData={scriptData}
        setScriptData={setScriptData}
        selectedCharacter={selectedCharacter}
        mode={mode}
        enableAnalysisTab={enableAnalysisTab}
        enableNotesTab={enableNotesTab}
        enableAnnotations={enableAnnotations}
      />
    </div>
  );
};

export default ScriptAnalysisSidebar;

