// Library imports
import { CustomModal } from '../../../Shared';

/**
 * Audio Validation Modal Component
 * Shows missing audio files before starting session
 */
const AudioValidationModal = ({ open, onClose, missingLines, onContinue }) => {
  return (
    <CustomModal
      open={open}
      close={onClose}
      title="Missing Audio Files"
      primaryButtonText="Reload Page"
      secondaryButtonText="Continue Anyway"
      onPrimaryButtonClick={() => {
        window.location.reload();
      }}
      onSecondaryButtonClick={onContinue}
      primaryButtonProps={{
        className: '!bg-blue-500 hover:!bg-blue-600',
      }}
    >
      <div className="py-4">
        <p className="text-sm text-gray-700 mb-4">
          The following partner lines are missing audio files. You can reload the page to try loading them again, or continue with available audios.
        </p>
        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded p-3 bg-gray-50">
          <ul className="space-y-2">
            {missingLines.map((item, idx) => (
              <li key={idx} className="text-sm text-gray-600">
                <span className="font-semibold">Line {item.index}:</span> {item.character} - {item.line.substring(0, 50)}{item.line.length > 50 ? '...' : ''}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </CustomModal>
  );
};

export default AudioValidationModal;

