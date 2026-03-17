import ScriptAnalysisSidebar from './ScriptAnalysisSidebar';
import ScriptAnalysisPerformancePanel from './ScriptAnalysisPerformancePanel';

const ScriptAnalysisLayout = ({
  mode = 'actor',
  enableAnalysisTab = true,
  enableNotesTab = true,
  enableAnnotations = true,
  showPerformanceProgress = true,
}) => {
  const showPerformance = mode === 'actor' && showPerformanceProgress;

  return (
    <>
      <div className='w-full h-full p-[10px]'>
        <div className='flex flex-col lg:flex-row gap-[10px] lg:overflow-auto'>
          <ScriptAnalysisSidebar
            mode={mode}
            enableAnalysisTab={enableAnalysisTab}
            enableNotesTab={enableNotesTab}
            enableAnnotations={enableAnnotations}
          />
          <ScriptAnalysisPerformancePanel showPerformance={showPerformance} />
        </div>
      </div>
    </>
  );
};

export default ScriptAnalysisLayout;

