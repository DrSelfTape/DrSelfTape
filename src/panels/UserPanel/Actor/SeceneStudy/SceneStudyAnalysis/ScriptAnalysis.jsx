// Library imports
import React from 'react';

// Local imports
import Header from '../../../../../components/sceneStudy/ScriptAnalysis/Header';
import ScriptAnalysisLayout from '../../../../../components/sceneStudy/ScriptAnalysis/ScriptAnalysisLayout';

// Actor script analysis page
// Uses full analysis (script + analysis + notes) with annotations enabled.
const ScriptAnalysis = () => {
  return (
    <>
      <Header />
      <ScriptAnalysisLayout
        mode='actor'
        enableAnalysisTab
        enableNotesTab
        enableAnnotations
        showPerformanceProgress={false}
      />
    </>
  );
};

export default ScriptAnalysis;
