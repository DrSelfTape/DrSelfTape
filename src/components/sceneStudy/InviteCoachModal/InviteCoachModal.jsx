import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getScripts, clearError } from '../../../redux/features/sceneStudyScripts/sceneStudyScriptsSlice';
import {
  inviteCoach,
  getOutgoingShares,
  cancelShare,
  clearCoachesError,
} from '../../../redux/features/sceneStudyScripts/readersSlice';
import { CustomModal, CustomButton } from '../../Shared';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { useNotificationHighlight } from '../../../hooks/useNotificationHighlight';
import { CircularProgress } from '@mui/material';
import { createMeeting } from '../../../utils/meeting';
import { VedioIcon, ClockIcon, CircleCheckIcon, CrossIcon } from '../../../assets/icons';

// Helper function to normalize status (trim whitespace, lowercase)
const normalizeStatus = (status) =>
  status ? String(status).trim().toLowerCase() : null;

// Helper to format file size
const formatFileSize = (bytes) => {
  if (!bytes) return '';
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

// Status badge component
const StatusBadge = ({ status }) => {
  if (status === 'pending') {
    return (
      <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700'>
        <ClockIcon className='w-3 h-3' />
        Pending
      </span>
    );
  }
  if (status === 'accepted') {
    return (
      <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700'>
        <CircleCheckIcon className='w-3 h-3' />
        Accepted
      </span>
    );
  }
  return null;
};

const InviteCoachModal = ({ open, onClose, coachId, coachName = '', coachEmail = '', highlightShareId = null }) => {
  const dispatch = useDispatch();
  const { toast } = useSnackbar();

  const { scripts = [], listingLoading } = useSelector(
    (state) => state.sceneStudyScripts
  );
  const {
    outgoingShares,
    inviteCoachError,
    cancelShareError,
    getOutgoingSharesError,
  } = useSelector((state) => state.readers);
  const shares = outgoingShares?.shares || [];

  // Track if errors have been shown to avoid duplicate toasts
  const shownErrorsRef = useRef({
    inviteCoach: false,
    cancelShare: false,
    getOutgoingShares: false,
  });

  // Per-script loading states to avoid blocking the whole modal
  const [requestLoading, setRequestLoading] = useState(null); // script.id for "Request Session"
  const [cancelLoading, setCancelLoading] = useState(null); // share.id for "Cancel Request"

  // Use centralized notification highlight hook
  const { isHighlighted } = useNotificationHighlight({
    items: shares,
    highlightId: highlightShareId,
    isActive: open && shares.length > 0 && scripts.length > 0,
    waitForElement: true,           // Enable polling for modal
    idField: 'id',
    getElementId: (share) => {
      // Element ID is based on script.id, not share.id
      const scriptId = share.script?.id || share.script_id;
      const matchingScript = scripts.find(s => s.id === scriptId);
      return `share-item-${matchingScript ? matchingScript.id : scriptId}`;
    },
    cleanupLocationState: false,    // Modal doesn't use location.state
    highlightClass: 'border-primary bg-blue-50 outline-2 outline-offset-0 outline-primary/40 animate-notification-pulse',
  });

  // Fetch data when modal opens (with caching - only fetch if data is missing)
  useEffect(() => {
    if (open) {
      // Clear all errors when modal opens to prevent stale errors from previous sessions
      dispatch(clearError());
      dispatch(clearCoachesError());
      
      // Only fetch scripts if we don't have any
      if (scripts.length === 0) {
        dispatch(getScripts());
      }
      // Only fetch shares if we don't have any
      if (!outgoingShares || !outgoingShares.shares || outgoingShares.shares.length === 0) {
        dispatch(getOutgoingShares());
      }
      
      // Reset error tracking when modal opens
      shownErrorsRef.current = {
        inviteCoach: false,
        cancelShare: false,
        getOutgoingShares: false,
      };
    }
  }, [open, dispatch, scripts.length, outgoingShares]);

  // Clear errors when modal closes
  useEffect(() => {
    if (!open) {
      // Clear all errors when modal closes
      dispatch(clearError());
      dispatch(clearCoachesError());
      
      // Reset error tracking
      shownErrorsRef.current = {
        inviteCoach: false,
        cancelShare: false,
        getOutgoingShares: false,
      };
    }
  }, [open, dispatch]);

  // Show errors only once per modal session
  useEffect(() => {
    if (inviteCoachError && !shownErrorsRef.current.inviteCoach) {
      toast.error(inviteCoachError || 'Failed to send session request');
      shownErrorsRef.current.inviteCoach = true;
    }
  }, [inviteCoachError, toast]);

  useEffect(() => {
    if (cancelShareError && !shownErrorsRef.current.cancelShare) {
      toast.error(cancelShareError || 'Failed to cancel request');
      shownErrorsRef.current.cancelShare = true;
    }
  }, [cancelShareError, toast]);

  useEffect(() => {
    if (getOutgoingSharesError && !shownErrorsRef.current.getOutgoingShares) {
      toast.error(getOutgoingSharesError || 'Failed to load shares');
      shownErrorsRef.current.getOutgoingShares = true;
    }
  }, [getOutgoingSharesError, toast]);

  // Handle "Request Session" click
  const handleRequestSession = async (scriptId) => {
    setRequestLoading(scriptId);
    // Reset error tracking for this action
    shownErrorsRef.current.inviteCoach = false;
    try {
      const res = await dispatch(
        inviteCoach({ scriptId, coachId, role: 'viewer' })
      );
      if (res.meta.requestStatus === 'fulfilled') {
        toast.success('Session request sent successfully');
        dispatch(getOutgoingShares()); // Refresh to update UI
      }
    } finally {
      setRequestLoading(null);
    }
  };

  // Handle "Cancel Request" click
  const handleCancelRequest = async (shareId) => {
    setCancelLoading(shareId);
    // Reset error tracking for this action
    shownErrorsRef.current.cancelShare = false;
    try {
      const res = await dispatch(cancelShare(shareId));
      if (res.meta.requestStatus === 'fulfilled') {
        toast.success('Request cancelled');
        dispatch(getOutgoingShares());
      }
    } finally {
      setCancelLoading(null);
    }
  };

  // Handle "Start Meeting" click
  const handleStartMeeting = async (share) => {
    try {
      const meetingUrl = await createMeeting(
        share.script?.id,
        share.invitee?.id,
        coachName || share.invitee?.name
      );
      if (meetingUrl) {
        window.open(meetingUrl, '_blank');
      }
    } catch (error) {
      toast.error('Failed to start meeting');
    }
  };

  // Check if there are any accepted shares for this coach
  const hasAcceptedSessions = shares.some(
    (s) => normalizeStatus(s.status) === 'accepted'
  );

  // Handle modal close - clear all errors before closing
  const handleClose = () => {
    // Clear all errors when user closes modal
    dispatch(clearError());
    dispatch(clearCoachesError());
    
    // Reset error tracking
    shownErrorsRef.current = {
      inviteCoach: false,
      cancelShare: false,
      getOutgoingShares: false,
    };
    
    // Call original onClose
    onClose();
  };

  return (
    <CustomModal
      open={open}
      close={handleClose}
      title={`Connect with ${coachName || 'Coach'}`}
      noFooter
      mainBoxClassName='!max-w-[90vw] md:!max-w-[700px]'
      childClassName='!max-w-full'
    >
      <div className='pb-5'>
        {/* Header description */}
        <p className='text-sm text-gray-500 my-3'>
          {hasAcceptedSessions 
            ? `Manage your sessions or request a new one with ${coachName || 'this coach'}`
            : `Select a script to request a session with ${coachName || 'this coach'}`
          }
        </p>

        {listingLoading ? (
          <div className='flex items-center justify-center h-[300px]'>
            <CircularProgress size={32} />
          </div>
        ) : scripts.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-[300px]'>
            <p className='text-gray-500 mb-2'>No scripts available</p>
            <p className='text-sm text-gray-400'>Upload a script first to request a session</p>
          </div>
        ) : (
          <div className='h-[300px] overflow-y-auto overflow-x-hidden'>
            {/* Inner container with padding for scroll breathing room */}
            <div className='space-y-3 py-1 px-2'>
              {scripts.map((script) => {
                // Match by both script ID and invitee email
                const relatedShare = shares.find(
                  (s) => {
                    const scriptMatch = s.script?.id === script.id;
                    const emailMatch = coachEmail && s.invitee?.email 
                      ? s.invitee.email.toLowerCase().trim() === coachEmail.toLowerCase().trim()
                      : true; // If no email provided, fall back to script match only
                    return scriptMatch && emailMatch;
                  }
                );
                const status = normalizeStatus(relatedShare?.status);
                const isRequestLoading = requestLoading === script.id;
                const isCancelLoading =
                  relatedShare && cancelLoading === relatedShare.id;
                const isItemHighlighted = relatedShare && isHighlighted(relatedShare.id);

                return (
                  <div
                    key={script.id}
                    id={`share-item-${script.id}`}
                    className={`relative p-4 border rounded-lg transition-all duration-200 ${
                      isItemHighlighted
                        ? 'border-primary bg-blue-50 outline-2 outline-offset-0 outline-primary/40 animate-notification-pulse'
                        : status === 'accepted'
                          ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50'
                          : status === 'pending'
                            ? 'border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {/* Card content */}
                    <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                      {/* Script info */}
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <h4 className='font-medium text-gray-900'>
                            {script.title || 'Untitled Script'}
                          </h4>
                          <StatusBadge status={status} />
                        </div>
                        <p className='text-sm text-gray-500 mt-0.5'>
                          {script.role_name && (
                            <span className='mr-2'>Role: {script.role_name}</span>
                          )}
                          {script.file_size && (
                            <span className='text-gray-400'>
                              {formatFileSize(script.file_size)}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className='flex items-center gap-2 shrink-0'>
                        {status === 'accepted' ? (
                          <CustomButton
                            onClick={() => handleStartMeeting(relatedShare)}
                            className='!bg-green-600 hover:!bg-green-700 !text-white !px-4 !py-2 !text-sm !rounded-lg flex items-center gap-2'
                          >
                            <VedioIcon className='w-4 h-4' />
                            Start Meeting
                          </CustomButton>
                        ) : status === 'pending' ? (
                          <button
                            onClick={() => handleCancelRequest(relatedShare.id)}
                            disabled={isCancelLoading}
                            className='text-gray-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'
                          >
                            {isCancelLoading ? (
                              <CircularProgress size={14} />
                            ) : (
                              <>
                                <CrossIcon className='w-3.5 h-3.5' />
                                Cancel
                              </>
                            )}
                          </button>
                        ) : (
                          <CustomButton
                            onClick={() => handleRequestSession(script.id)}
                            loading={isRequestLoading}
                            className='!px-4 !py-2 !text-sm !rounded-lg'
                          >
                            Request Session
                          </CustomButton>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </CustomModal>
  );
};

export default InviteCoachModal;
