// Library imports
import { Button } from '@mui/material';
import { CustomModal } from '../../../Shared';

/**
 * End Session Confirmation Modal Component
 * Shows session summary before ending
 */
const EndSessionModal = ({
  open,
  onClose,
  scriptLines,
  completedLines,
  recordings,
  selectedCharacter,
  checkIsUserLine,
  formatDuration,
  teleprompterMode,
  onConfirmEnd,
  onRecordMissing,
  loading = false,
}) => {
  return (
    <CustomModal
      open={open}
      close={onClose}
      title="End Rehearsal Session"
      noFooter={true}
      mainBoxClassName="!max-w-[90vw] !w-full sm:!max-w-[700px] !max-h-[90vh] !flex !flex-col !p-0"
      headerBoxClassName="!px-6 !pt-6 !pb-4"
      childClassName="!max-w-none !min-w-0 !flex !flex-col !flex-1 !min-h-0 !p-0"
    >
      <div className="flex flex-col h-full min-h-0">
        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Session Summary</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="text-sm text-gray-600 mb-1">Completed Lines</div>
                <div className="text-2xl font-bold text-blue-700">
                  {(() => {
                    const completedUserLinesCount = scriptLines
                      .map((line, idx) => ({ line, idx }))
                      .filter(({ line }) => checkIsUserLine(line))
                      .filter(({ idx }) => completedLines.has(idx)).length;
                    return completedUserLinesCount;
                  })()}
                </div>
                <div className="text-xs text-gray-500">
                  out of {scriptLines.filter((line) => checkIsUserLine(line)).length} user lines
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <div className="text-sm text-gray-600 mb-1">Completion Rate</div>
                <div className="text-2xl font-bold text-green-700">
                  {(() => {
                    const userLinesCount = scriptLines.filter((line) => checkIsUserLine(line)).length;
                    const completedUserLinesCount = scriptLines
                      .map((line, idx) => ({ line, idx }))
                      .filter(({ line }) => checkIsUserLine(line))
                      .filter(({ idx }) => completedLines.has(idx)).length;
                    return userLinesCount > 0
                      ? Math.round((completedUserLinesCount / userLinesCount) * 100)
                      : 0;
                  })()}%
                </div>
              </div>
            </div>
          </div>

          {/* Completed Lines List */}
          {completedLines.size > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Completed Lines ({completedLines.size})
              </h4>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="space-y-2">
                  {Array.from(completedLines).sort((a, b) => a - b).map((lineIdx) => {
                    const line = scriptLines[lineIdx];
                    const rec = recordings.find((r) => r.index === lineIdx);
                    return (
                      <div key={lineIdx} className="flex items-start justify-between p-2 bg-white rounded border border-gray-200">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-500">Line {lineIdx + 1}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                              {line?.character || 'Character'}
                            </span>
                            {rec && (
                              <span className="text-xs text-gray-500">
                                • {formatDuration(rec.duration || 0)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">{line?.line || ''}</p>
                        </div>
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Missing Lines for Selected Character */}
          {selectedCharacter && (() => {
            const userLines = scriptLines
              .map((line, idx) => ({ line, idx }))
              .filter(({ line }) => checkIsUserLine(line));
            const missingUserLines = userLines.filter(({ idx }) => !completedLines.has(idx));

            if (missingUserLines.length > 0) {
              return (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Missing Lines for {selectedCharacter.label} ({missingUserLines.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto border border-amber-200 rounded-lg p-3 bg-amber-50">
                    <div className="space-y-2">
                      {missingUserLines.map(({ line, idx }) => (
                        <div key={idx} className="flex items-start gap-2 p-2 bg-white rounded border border-amber-200">
                          <span className="text-xs font-semibold text-gray-500 flex-shrink-0">Line {idx + 1}</span>
                          <p className="text-sm text-gray-700 line-clamp-2 flex-1">{line?.line || ''}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-amber-700 mt-2 italic">
                    These lines will not be included in the submission.
                  </p>
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* Fixed footer */}
        <div className="p-6 border-t border-gray-200 flex-shrink-0 bg-white">
          <p className="text-sm text-gray-700 mb-3">
            <strong>Ready to submit?</strong> Your completed recordings will be saved and submitted.
          </p>
          {completedLines.size === 0 && (
            <p className="text-sm text-amber-600 font-medium mb-3">
              ⚠️ No lines have been completed. The session will end without any submissions.
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {(() => {
              const userLines = selectedCharacter ? scriptLines
                .map((line, idx) => ({ line, idx }))
                .filter(({ line }) => checkIsUserLine(line)) : [];
              const missingUserLines = userLines.filter(({ idx }) => !completedLines.has(idx));
              const hasMissingLines = missingUserLines.length > 0;

              if (hasMissingLines) {
                return (
                  <>
                    <Button
                      variant="contained"
                      onClick={() => {
                        onClose();
                        const firstMissing = missingUserLines[0]?.idx;
                        if (firstMissing !== undefined && onRecordMissing) {
                          onRecordMissing(firstMissing);
                        }
                      }}
                      disabled={loading}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      <span>Record Missing Lines ({missingUserLines.length})</span>
                    </Button>
                    <Button
                      variant="contained"
                      onClick={onConfirmEnd}
                      disabled={loading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>End Session with Missing Lines</span>
                        </>
                      )}
                    </Button>
                  </>
                );
              } else {
                return (
                  <>
                    <Button
                      variant="outlined"
                      onClick={onClose}
                      disabled={loading}
                      className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2.5 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      onClick={onConfirmEnd}
                      disabled={loading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Confirm & Submit</span>
                        </>
                      )}
                    </Button>
                  </>
                );
              }
            })()}
          </div>
        </div>
      </div>
    </CustomModal>
  );
};

export default EndSessionModal;

