// src/components/Controls/LeaveMeetingModal.jsx
// ---------------------------------------------------------------
// Simple confirmation dialog for leaving the meeting.
// ---------------------------------------------------------------

import { CustomModal, CustomButton } from '../../../components/Shared';

const LeaveMeetingModal = ({ open, onClose, onConfirm }) => (
  <CustomModal
    open={open}
    close={onClose}
    title="Leave Meeting"
    primaryButtonText="Leave"
    primaryButtonProps={{ className: '!bg-red-600 hover:!bg-red-700' }}
    secondaryButtonText="Cancel"
    onPrimaryButtonClick={onConfirm}
    onSecondaryButtonClick={onClose}
  >
    <p className="text-sm text-gray-600">
      Are you sure you want to leave this meeting?
    </p>
  </CustomModal>
);

export { LeaveMeetingModal };