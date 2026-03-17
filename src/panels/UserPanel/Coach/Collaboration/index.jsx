// Library imports
import { useEffect, useState, useMemo } from 'react';
import { CircularProgress } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams, useNavigate } from 'react-router-dom';

// Local imports
import {
  CustomButton,
  CustomTabPanel,
} from '../../../../components/Shared';
import { CustomTab, CustomTabs } from '../../../../components/Shared';
import {
  getCoachInvites,
  respondToShare,
} from '../../../../redux/features/sceneStudyScripts/readersSlice';
import { createMeeting } from '../../../../utils/meeting';
import { useSnackbar } from '../../../../hooks/useSnackbar';
import { useNotificationHighlight } from '../../../../hooks/useNotificationHighlight';
import { InsightsIcon } from '../../../../assets/icons';

const CoachCollaboration = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = Number(searchParams.get('tab')) || 0;
  const [value, setValue] = useState(tabFromUrl);
  const [isRefreshing, setIsRefreshing] = useState(false); // avoid full-panel loading on soft refresh
  const dispatch = useDispatch();
  const { toast } = useSnackbar();
  const navigate = useNavigate();

  const {
    coachInvites,
    getCoachInvitesLoading,
    getCoachInvitesError,
  } = useSelector((state) => state.readers);

  // Per-invite loading to avoid blocking all rows
  const [acceptLoadingId, setAcceptLoadingId] = useState(null);
  const [rejectLoadingId, setRejectLoadingId] = useState(null);

  // Memoized invite lists
  const pendingInvites = useMemo(
    () =>
      coachInvites?.pending && Array.isArray(coachInvites.pending)
        ? coachInvites.pending
        : [],
    [coachInvites]
  );

  const acceptedInvites = useMemo(
    () =>
      coachInvites?.accepted && Array.isArray(coachInvites.accepted)
        ? coachInvites.accepted
        : [],
    [coachInvites]
  );

  // Use the notification highlight hook - handles scroll & highlight automatically
  const { isHighlighted } = useNotificationHighlight({
    items: [...pendingInvites, ...acceptedInvites],
    isLoading: getCoachInvitesLoading,
    elementIdPrefix: 'invite-card',
  });

  useEffect(() => {
    dispatch(getCoachInvites());
  }, [dispatch]);

  // Sync tab with URL
  useEffect(() => {
    const currentTab = Number(searchParams.get('tab')) || 0;
    if (currentTab !== value) setValue(currentTab);
  }, [searchParams]);

  // Update tab in URL on change
  const handleTabChange = (_, newValue) => {
    setValue(newValue);
    setSearchParams({ tab: newValue });
  };

  const handleRespondToShare = async (shareId, status) => {
    // Set per-invite loading flags
    if (status === 'accepted') setAcceptLoadingId(shareId);
    if (status === 'rejected') setRejectLoadingId(shareId);
    setIsRefreshing(true);

    try {
      await dispatch(respondToShare({ shareId, status })).unwrap();
      // Soft refresh invites list after responding
      await dispatch(getCoachInvites());
    } catch (error) {
      console.error('Failed to respond to share:', error);
      const errorMessage =
        typeof error === 'string' ? error : 'Failed to update invitation. Please try again.';

      // Handle specific case: share already rejected/accepted elsewhere
      if (
        errorMessage.toLowerCase().includes('already rejected') ||
        errorMessage.toLowerCase().includes('share already rejected')
      ) {
        // Soft refresh to sync with backend state
        await dispatch(getCoachInvites());
        toast.info('This invitation is no longer available.');
      } else {
        // Show error for other failures
        toast.error(errorMessage);
      }
    } finally {
      // Clear per-invite loading flags
      if (status === 'accepted') setAcceptLoadingId(null);
      if (status === 'rejected') setRejectLoadingId(null);
      setIsRefreshing(false);
    }
  };

  const renderInviteCard = (invite, type) => {
    // Prefer latest version id when available; fallback to script id
    const scriptId =
      invite?.script?.latest_version?.id || invite?.script?.id;

    const handleViewScriptInsights = () => {
      if (!scriptId) return;
      navigate(`/collaboration/script-insights/${scriptId}`, {
        state: {
          from: 'collaboration',
          tab: type,
          inviteId: invite.id,
          status: invite.status,
        },
      });
    };

    // Status badge styling - soft amber/yellow for pending, subtle and professional
    const getStatusBadgeClass = (status) => {
      const baseClass = 'text-xs font-medium px-2.5 py-0.5 rounded-full capitalize whitespace-nowrap flex-shrink-0';
      switch (status?.toLowerCase()) {
        case 'pending':
          return `${baseClass} bg-amber-50 text-amber-700 border border-amber-200/50`;
        case 'accepted':
          return `${baseClass} bg-green-50 text-green-700 border border-green-200/50`;
        case 'rejected':
          return `${baseClass} bg-red-50 text-red-700 border border-red-200/50`;
        default:
          return `${baseClass} bg-gray-50 text-gray-600 border border-gray-200/50`;
      }
    };

    const highlighted = isHighlighted(invite.id);
    
    return (
      <div
        key={invite.id}
        id={`invite-card-${invite.id}`}
        className={`
          relative bg-white border rounded-lg shadow-sm p-5 sm:p-6 
          hover:shadow-md hover:border-gray-300 
          transition-all duration-200 
          focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary 
          flex-[1_1_300px] min-w-[300px] max-w-[300px]
          ${highlighted 
            ? 'border-primary shadow-lg ring-2 ring-primary/30 animate-notification-pulse' 
            : 'border-gray-200'
          }
        `}
        tabIndex={0}
      >
        <div className='flex flex-col gap-5'>
          {/* Header Section */}
          <div className='flex-1 min-w-0'>
            {/* Title Row with Status Badge */}
            <div className='flex items-start justify-between gap-3 sm:gap-4 mb-2'>
              <h3 className='text-base font-semibold text-gray-900 leading-tight flex-1 min-w-0 truncate pr-2'>
                {invite?.script?.title || 'Untitled Script'}
              </h3>
              <span className={getStatusBadgeClass(invite?.status)}>
                {invite?.status}
              </span>
            </div>
            
            {/* Email - Secondary Metadata */}
            <p className='text-sm text-gray-500 leading-relaxed break-words'>
              {invite?.invited_email}
            </p>
          </div>

          {/* Actions Section */}
          <div className='flex flex-col gap-3 pt-4 border-t border-gray-100'>
            {type === 'accepted' && (
              <CustomButton
                onClick={handleViewScriptInsights}
                disabled={!scriptId}
                variant='outlined'
                startIcon={<InsightsIcon width={14} height={14} className='text-current' />}
                className='!h-9 !text-[13px] !font-medium w-full justify-center tracking-[0.01em] transition-all duration-150 focus:ring-2 focus:ring-primary/20 disabled:opacity-40'
                sx={{
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  '& .MuiButton-startIcon': {
                    marginRight: '8px',
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(47, 128, 237, 0.08)',
                    borderColor: 'primary.dark',
                    color: 'primary.dark',
                  },
                }}
              >
                View Script Insights
              </CustomButton>
            )}

            {/* Primary Action Buttons - Equal Width for Balance */}
            <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5'>
              {type === 'accepted' && (
                <CustomButton 
                  onClick={createMeeting}
                  className='!h-9 !text-sm !font-semibold w-full flex-1 tracking-[0.01em] transition-all duration-150 hover:-translate-y-px active:translate-y-0 focus:ring-2 focus:ring-blue-200'
                >
                  Start Meeting
                </CustomButton>
              )}

              {type === 'pending' && (
                <>
                  <CustomButton
                    onClick={() => handleRespondToShare(invite.id, 'accepted')}
                    disabled={acceptLoadingId === invite.id}
                    loading={acceptLoadingId === invite.id}
                    className='!h-9 !text-sm !font-semibold w-full sm:w-full flex-1 tracking-[0.01em] transition-all duration-150 hover:-translate-y-px active:translate-y-0 focus:ring-2 focus:ring-green-200 disabled:opacity-60'
                    sx={{
                      backgroundColor: '#10b981',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#059669',
                      },
                    }}
                  >
                    Accept
                  </CustomButton>
                  <CustomButton
                    onClick={() => handleRespondToShare(invite.id, 'rejected')}
                    disabled={rejectLoadingId === invite.id}
                    loading={rejectLoadingId === invite.id}
                    variant='outlined'
                    isDelete={true}
                    className='!h-9 !text-sm !font-semibold w-full sm:w-full flex-1 tracking-[0.01em] transition-all duration-150 hover:-translate-y-px active:translate-y-0 focus:ring-2 focus:ring-red-200 disabled:opacity-60'
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(239, 68, 68, 0.06)',
                        borderColor: '#dc2626',
                        color: '#dc2626',
                      },
                    }}
                  >
                    Reject
                  </CustomButton>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Avoid showing full-panel loader during soft refresh triggered by accept/reject
  const showPrimaryLoading = getCoachInvitesLoading && !isRefreshing;

  return (
    <>
      {/* Header */}
      <div className='topbar-style border-style !p-0'>
        <div className='w-full flex justify-between items-center px-[16px]'>
          <CustomTabs value={value} onChange={handleTabChange}>
            <CustomTab
              label='Rehearsal'
              id='tab-0'
              aria-controls='tabpanel-0'
            />
            <CustomTab
              label='Invitation'
              id='tab-1'
              aria-controls='tabpanel-1'
            />
          </CustomTabs>
        </div>
      </div>

      {/* Panels */}
      <div className='w-full flex flex-col'>
        {/* Rehearsal (Accepted Invites) */}
        <CustomTabPanel value={value} index={0}>
          <div className='m-[10px]'>
            {showPrimaryLoading ? (
              <div className='flex items-center justify-center h-[300px]'>
                <div className='flex flex-col items-center gap-3'>
                  <CircularProgress size={40} className='!text-primary' />
                  <p className='text-sm text-muted-foreground'>
                    Loading accepted invites...
                  </p>
                </div>
              </div>
            ) : getCoachInvitesError ? (
              <div className='flex flex-col items-center justify-center h-[300px] text-center'>
                <p className='text-lg font-semibold text-destructive'>
                  Failed to load invites
                </p>
                <CustomButton
                  onClick={() => dispatch(getCoachInvites())}
                  className='!mt-2'
                >
                  Retry
                </CustomButton>
              </div>
            ) : acceptedInvites.length === 0 ? (
              <div className='flex items-center justify-center h-[300px] text-center'>
                <p className='text-muted-foreground'>
                  No accepted invites yet.
                </p>
              </div>
            ) : (
              <div className='flex flex-wrap gap-4 max-w-7xl mx-auto'>
                {acceptedInvites.map((invite) =>
                  renderInviteCard(invite, 'accepted')
                )}
              </div>
            )}
          </div>
        </CustomTabPanel>

        {/* Invitation (Pending Invites) */}
        <CustomTabPanel value={value} index={1}>
          <div className='m-[10px]'>
            {showPrimaryLoading ? (
              <div className='flex items-center justify-center h-[300px]'>
                <div className='flex flex-col items-center gap-3'>
                  <CircularProgress size={40} className='!text-primary' />
                  <p className='text-sm text-muted-foreground'>
                    Loading pending invitations...
                  </p>
                </div>
              </div>
            ) : getCoachInvitesError ? (
              <div className='flex flex-col items-center justify-center h-[300px] text-center'>
                <p className='text-lg font-semibold text-destructive'>
                  Failed to load invites
                </p>
                <CustomButton
                  onClick={() => dispatch(getCoachInvites())}
                  className='!mt-2'
                >
                  Retry
                </CustomButton>
              </div>
            ) : pendingInvites.length === 0 ? (
              <div className='flex items-center justify-center h-[300px] text-center'>
                <p className='text-muted-foreground'>No pending invitations.</p>
              </div>
            ) : (
              <div className='flex flex-wrap gap-[10px] max-w-7xl mx-auto'>
                {pendingInvites.map((invite) =>
                  renderInviteCard(invite, 'pending')
                )}
              </div>
            )}
          </div>
        </CustomTabPanel>
      </div>
    </>
  );
};

export default CoachCollaboration;
