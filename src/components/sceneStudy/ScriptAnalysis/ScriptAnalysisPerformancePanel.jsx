// Local import
import PerformanceProgress from './PerformanceProgress';

const ScriptAnalysisPerformancePanel = ({ showPerformance = true }) => {
  if (!showPerformance) {
    return null;
  }

  return (
    <div className='flex flex-col min-h-0 mb-5 bg-white border border-gray-200 rounded-lg p-3 w-full max-w-[28rem] lg:max-w-[20rem]'>
      <div className='flex-1 border rounded-lg border-gray-200 max-h-[600px] overflow-auto'>
        <PerformanceProgress />
      </div>
    </div>
  );
};

export default ScriptAnalysisPerformancePanel;

