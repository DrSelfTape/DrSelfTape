// Icon import
import { InfoOutlinedIcon, RestartIcon } from '../../../assets/icons';
import { CustomButton } from '../../Shared';
import { CircularProgress } from '@mui/material';

/**
 * Helper function to format percentage with clamping
 */
const formatPercent = (percent) => {
  if (percent === null || percent === undefined) return 0;
  const clamped = Math.max(0, Math.min(100, percent));
  return Math.round(clamped);
};

/**
 * Helper function to split overall coaching tips by newline
 */
const splitOverallTips = (tips) => {
  if (!tips || typeof tips !== 'string') return [];
  return tips.split('\n').filter((tip) => tip.trim().length > 0);
};

/**
 * Performance Progress Component
 * Displays real-time analysis data with state management to prevent blinking
 */
const PerformanceProgress = ({
  pendingSession,
  performanceAnalysis,
  performanceAnalysisError,
  sessionStarted,
  rehearsalStartLoading,
  loadingPreviousAnalysis = false,
  onStartSession,
  scriptLines = [], // Array of script lines to look up line text by lineId
  scriptAnalysis = null, // Original scriptAnalysis API response as fallback
}) => {
  // Determine UI state based on props
  // Priority: error > loading previous > running > ready > empty
  const hasPending = pendingSession?.sessionId && pendingSession?.versionId;
  const hasError = !!performanceAnalysisError;
  const hasAnalysis = !!performanceAnalysis;
  
  let uiState;
  if (hasError) {
    uiState = 'error';
  } else if (loadingPreviousAnalysis) {
    uiState = 'loading_previous';
  } else if (hasPending) {
    uiState = 'running';
  } else if (hasAnalysis) {
    uiState = 'ready';
  } else {
    uiState = 'empty';
  }

  // Extract data from analysis
  const memorizationPercent = performanceAnalysis?.memorization_percent ?? null;
  const linesRehearsed = performanceAnalysis?.lines_rehearsed ?? null;
  const overallTips = performanceAnalysis?.overall_coaching_tips ?? null;
  const coachingTips = performanceAnalysis?.coaching_tips ?? [];

  // Render empty state
  if (uiState === 'empty') {
    return (
      <>
        <div className='flex flex-col p-3'>
          <div className='text-lg font-semibold leading-none tracking-tight text-secondary-dark'>
            Performance Progress
          </div>
          <div className='text-xs text-secondary'>
            Track your rehearsal progress
          </div>
        </div>

        <div className='p-3 space-y-4'>
          <div className='flex flex-col items-center justify-center py-8 text-center'>
            <div className='text-sm font-medium text-secondary-dark mb-2'>
              No rehearsal data yet
            </div>
            <div className='text-xs text-secondary mb-4'>
              Start a rehearsal to generate memorization insights and AI coaching tips.
            </div>
            <CustomButton
              onClick={onStartSession}
              className='!w-full'
              variant='contained'
              disabled={sessionStarted || rehearsalStartLoading}
            >
              <div className='flex gap-2 items-center justify-center'>
                <RestartIcon />
                <span>Start New Rehearsal</span>
              </div>
            </CustomButton>
          </div>
        </div>
      </>
    );
  }

  // Render loading previous analysis state
  if (uiState === 'loading_previous') {
    return (
      <>
        <div className='flex flex-col p-3'>
          <div className='text-lg font-semibold leading-none tracking-tight text-secondary-dark'>
            Performance Progress
          </div>
          <div className='text-xs text-secondary'>
            Track your rehearsal progress
          </div>
        </div>

        <div className='p-3 space-y-4'>
          {/* Loading indicator */}
          <div className='flex flex-col items-center justify-center py-8'>
            <CircularProgress size={32} className='mb-3' />
            <div className='text-sm font-medium text-secondary-dark mb-1'>
              Loading previous analysis...
            </div>
            <div className='text-xs text-secondary text-center'>
              Retrieving your last rehearsal results
            </div>
          </div>
        </div>
      </>
    );
  }

  // Render running/analyzing state
  if (uiState === 'running') {
    return (
      <>
        <div className='flex flex-col p-3'>
          <div className='text-lg font-semibold leading-none tracking-tight text-secondary-dark'>
            Performance Progress
          </div>
          <div className='text-xs text-secondary'>
            Track your rehearsal progress
          </div>
        </div>

        <div className='p-3 space-y-4'>
          {/* Loading skeleton/indicator */}
          <div className='flex flex-col items-center justify-center py-8'>
            <CircularProgress size={32} className='mb-3' />
            <div className='text-sm font-medium text-secondary-dark mb-1'>
              Analyzing your rehearsal…
            </div>
            <div className='text-xs text-secondary text-center'>
              Generating performance insights and coaching tips. This usually takes a moment.
            </div>
          </div>

          <div className='pt-2'>
            <CustomButton
              onClick={onStartSession}
              className='!w-full'
              variant='contained'
              disabled={sessionStarted || rehearsalStartLoading}
            >
              <div className='flex gap-2 items-center justify-center'>
                <RestartIcon />
                <span>Start New Rehearsal</span>
              </div>
            </CustomButton>
          </div>
        </div>
      </>
    );
  }

  // Render error state
  if (uiState === 'error') {
    return (
      <>
        <div className='flex flex-col p-3'>
          <div className='text-lg font-semibold leading-none tracking-tight text-secondary-dark'>
            Performance Progress
          </div>
          <div className='text-xs text-secondary'>
            Track your rehearsal progress
          </div>
        </div>

        <div className='p-3 space-y-4'>
          <div className='flex flex-col items-center justify-center py-8 text-center'>
            <div className='text-sm font-medium text-secondary-dark mb-2'>
              We couldn't load your performance insights
            </div>
            <div className='text-xs text-secondary mb-4'>
              {performanceAnalysisError || 'Please try again in a moment.'}
            </div>
            <CustomButton
              onClick={onStartSession}
              className='!w-full'
              variant='contained'
              disabled={sessionStarted || rehearsalStartLoading}
            >
              <div className='flex gap-2 items-center justify-center'>
                <RestartIcon />
                <span>Start New Rehearsal</span>
              </div>
            </CustomButton>
          </div>
        </div>
      </>
    );
  }

  // Render ready/complete state with real data
  const formattedPercent = formatPercent(memorizationPercent);
  const overallTipsList = splitOverallTips(overallTips);

  return (
    <>
      <div className='flex flex-col p-3'>
        <div className='text-lg font-semibold leading-none tracking-tight text-secondary-dark'>
          Performance Progress
        </div>
        <div className='text-xs text-secondary'>
          Track your rehearsal progress
        </div>
      </div>

      <div className='p-3 space-y-4'>
        {/* Memorization Progress */}
        <div>
          <div className='flex items-center justify-between mb-1'>
            <div className='text-xs font-medium text-secondary-dark'>
              Memorization
            </div>
            <div className='text-xs text-secondary'>{formattedPercent}%</div>
          </div>
          <div className='relative w-full overflow-hidden rounded-full bg-secondary/20 h-2'>
            <div
              className='h-full bg-primary transition-all duration-300'
              style={{ width: `${formattedPercent}%` }}
              role='progressbar'
              aria-valuenow={formattedPercent}
              aria-valuemin='0'
              aria-valuemax='100'
            />
          </div>
        </div>

        {/* Rehearsal Activity */}
        {linesRehearsed !== null && (
          <div>
            <div className='text-xs font-medium text-secondary-dark mb-1'>
              Rehearsal Activity
            </div>
            <div className='text-xs text-secondary'>
              Lines rehearsed: {linesRehearsed}
            </div>
          </div>
        )}

        {/* Overall Coaching Tips */}
        {overallTipsList.length > 0 && (
          <div className='pt-2'>
            <div className='text-sm font-medium mb-2 text-secondary-dark'>
              AI Coaching Tips
            </div>
            <div className='space-y-2'>
              {overallTipsList.map((tip, index) => (
                <div
                  key={`overall-tip-${index}`}
                  className='flex gap-2 p-2 rounded-md bg-info/10'
                >
                  <InfoOutlinedIcon className='text-black flex-shrink-0 mt-0.5' />
                  <div className='text-sm text-secondary'>{tip}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-line Coaching Tips */}
        {coachingTips.length > 0 && (
          <div className='pt-2'>
            <div className='text-sm font-medium mb-2 text-secondary-dark'>
              Line-Specific Tips
            </div>
            <div className='space-y-3'>
              {coachingTips.map((tipGroup, groupIndex) => {
                const lineId = tipGroup?.line_id;
                const tips = tipGroup?.tips || [];
                
                if (tips.length === 0) return null;

                // Extract numeric ID from lineId (handle "Line 1877" format from API)
                const extractNumericId = (id) => {
                  if (id == null) return null;
                  if (typeof id === 'number') return id;
                  if (typeof id === 'string') {
                    // Remove "Line" prefix if present and extract number
                    const cleaned = id.replace(/^Line\s*/i, '').trim();
                    const num = parseInt(cleaned, 10);
                    return isNaN(num) ? null : num;
                  }
                  return null;
                };

                const numericLineId = extractNumericId(lineId);

                // Find the line in scriptLines by lineId to get line text and order_index
                // Match by numeric ID extracted from lineId
                let lineData = scriptLines.find((line) => {
                  const storedLineId = line?.lineId;
                  if (storedLineId == null || numericLineId == null) return false;
                  
                  // Extract numeric part from storedLineId if it's a string
                  const storedNumericId = extractNumericId(storedLineId);
                  
                  // Compare numeric IDs
                  if (storedNumericId !== null && numericLineId !== null) {
                    return storedNumericId === numericLineId;
                  }
                  
                  // Fallback to string/number comparison
                  return String(storedLineId) === String(lineId) || Number(storedLineId) === Number(lineId);
                });
                
                // If not found in scriptLines, try to find in original scriptAnalysis
                if (!lineData && scriptAnalysis) {
                  let apiLineData = null;
                  scriptAnalysis?.scenes?.forEach((scene) => {
                    scene?.lines?.forEach((apiLine) => {
                      const apiLineNumericId = extractNumericId(apiLine?.id);
                      
                      // Match by numeric ID
                      if (apiLineNumericId !== null && numericLineId !== null && apiLineNumericId === numericLineId) {
                        apiLineData = {
                          lineId: apiLine?.id,
                          order_index: apiLine?.order_index !== undefined && apiLine?.order_index !== null
                            ? apiLine.order_index
                            : (apiLine?.line_index !== undefined && apiLine?.line_index !== null ? apiLine.line_index : null),
                          character: apiLine?.character?.name || '',
                          line: apiLine?.text || '',
                        };
                      } else if (String(apiLine?.id) === String(lineId) || Number(apiLine?.id) === Number(lineId)) {
                        // Fallback to direct comparison
                        apiLineData = {
                          lineId: apiLine?.id,
                          order_index: apiLine?.order_index !== undefined && apiLine?.order_index !== null
                            ? apiLine.order_index
                            : (apiLine?.line_index !== undefined && apiLine?.line_index !== null ? apiLine.line_index : null),
                          character: apiLine?.character?.name || '',
                          line: apiLine?.text || '',
                        };
                      }
                    });
                  });
                  if (apiLineData) {
                    lineData = apiLineData;
                  }
                }
                
                const lineText = lineData?.line || '';
                const orderIndex = lineData?.order_index;
                const character = lineData?.character || '';
                
                // Extract numeric order index (handle both number and string, remove "Line" prefix if present)
                const getNumericOrderIndex = (index) => {
                  if (index === null || index === undefined) return null;
                  if (typeof index === 'number') return index;
                  if (typeof index === 'string') {
                    // Remove "Line" prefix if present and extract number
                    const cleaned = index.replace(/^Line\s*/i, '').trim();
                    const num = parseInt(cleaned, 10);
                    return isNaN(num) ? null : num;
                  }
                  return null;
                };
                
                const numericOrderIndex = getNumericOrderIndex(orderIndex);
                
                // Create user-friendly line display
                // Show character name and line text for better UI
                const displayLine = (() => {
                  if (lineText) {
                    // Truncate long lines for display
                    const truncatedText = lineText.length > 60 
                      ? lineText.substring(0, 60) + '...' 
                      : lineText;
                    
                    // Prefer showing character name with line text
                    if (character) {
                      return { type: 'character', text: truncatedText, character };
                    } else if (numericOrderIndex !== null) {
                      return { type: 'numbered', text: truncatedText, number: numericOrderIndex };
                    }
                    return { type: 'text', text: truncatedText };
                  }
                  // Fallback if line text not found
                  if (numericOrderIndex !== null) {
                    return { type: 'number-only', number: numericOrderIndex };
                  }
                  // Use the already extracted numericLineId (from earlier in the function)
                  // This prevents showing "Line Line 1877"
                  if (numericLineId !== null) {
                    return { type: 'number-only', number: numericLineId };
                  }
                  // Last resort: show the original lineId (shouldn't happen if extraction worked)
                  return { type: 'fallback', id: lineId };
                })();

                return (
                  <div key={`line-tip-${lineId}-${groupIndex}`}>
                    <div className='text-xs font-medium text-secondary-dark mb-1.5'>
                      {displayLine.type === 'character' ? (
                        <>
                          <span className='font-semibold text-primary'>{displayLine.character}:</span>{' '}
                          <span className='text-secondary'>"{displayLine.text}"</span>
                        </>
                      ) : displayLine.type === 'numbered' ? (
                        <>
                          <span className='text-secondary'>Line {displayLine.number}:</span>{' '}
                          <span className='text-secondary'>"{displayLine.text}"</span>
                        </>
                      ) : displayLine.type === 'text' ? (
                        <span className='text-secondary'>"{displayLine.text}"</span>
                      ) : displayLine.type === 'number-only' ? (
                        <span className='text-secondary'>Line {displayLine.number}</span>
                      ) : (
                        // Fallback: extract number from id if it's a string with "Line" prefix
                        <span className='text-secondary'>
                          {typeof displayLine.id === 'string' && displayLine.id.includes('Line')
                            ? `Line ${displayLine.id.replace(/^Line\s*/i, '').trim()}`
                            : `Line ${displayLine.id}`}
                        </span>
                      )}
                    </div>
                    <div className='space-y-2'>
                      {tips.map((tip, tipIndex) => (
                        <div
                          key={`tip-${lineId}-${tipIndex}`}
                          className='flex gap-2 p-2 rounded-md bg-success/10'
                        >
                          <InfoOutlinedIcon className='!text-success flex-shrink-0 mt-0.5' />
                          <div className='text-sm text-secondary'>{tip}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No tips fallback */}
        {overallTipsList.length === 0 && coachingTips.length === 0 && (
          <div className='pt-2'>
            <div className='text-sm font-medium mb-2 text-secondary-dark'>
              AI Coaching Tips
            </div>
            <div className='text-xs text-secondary text-center py-4'>
              No coaching tips yet
              <br />
              Complete another rehearsal to generate targeted coaching recommendations.
            </div>
          </div>
        )}

        {/* Start New Rehearsal Button */}
        <div className='pt-2'>
          <CustomButton
            onClick={onStartSession}
            className='!w-full'
            variant='contained'
          >
            <div className='flex gap-2 items-center justify-center'>
              <RestartIcon />
              <span>Start New Rehearsal</span>
            </div>
          </CustomButton>
        </div>
      </div>
    </>
  );
};

export default PerformanceProgress;
