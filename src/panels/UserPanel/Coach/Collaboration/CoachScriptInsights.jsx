// Library imports
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';

// Local imports
import Header from '../../../../components/sceneStudy/ScriptAnalysis/Header';
import ScriptAnalysisLayout from '../../../../components/sceneStudy/ScriptAnalysis/ScriptAnalysisLayout';
import { createMeeting } from '../../../../utils/meeting';
import { respondToShare } from '../../../../redux/features/sceneStudyScripts/readersSlice';
import { useSnackbar } from '../../../../hooks/useSnackbar';
import { CustomButton } from '../../../../components/Shared';

const CoachScriptInsights = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { toast } = useSnackbar();

  const originState = location.state || {};
  const isFromPendingInvite =
    originState?.tab === 'pending' && originState?.inviteId;

  const handleBack = () => {
    navigate(-1);
  };

  const handleStartMeeting = () => {
    // Reuse existing meeting utility (same as cards)
    createMeeting();
  };

  const handleRespond = async (status) => {
    if (!originState?.inviteId) {
      handleBack();
      return;
    }
    try {
      await dispatch(
        respondToShare({ shareId: originState.inviteId, status })
      ).unwrap();
      toast.success(
        status === 'accepted'
          ? 'Invitation accepted.'
          : 'Invitation rejected.'
      );
      handleBack();
    } catch (error) {
      console.error('Failed to update invitation from insights:', error);
      toast.error('Failed to update invitation. Please try again.');
    }
  };

  return (
    <div className='w-full h-full'>
      <Header
        mode='coach'
        onStartMeeting={isFromPendingInvite ? undefined : handleStartMeeting}
        onCancel={handleBack}
        // When opened from a pending invite, show Accept / Reject / Back in header
        // instead of Start Meeting / Cancel.
        extraActions={
          isFromPendingInvite && (
            <div className='flex items-center gap-2.5'>
              <CustomButton
                onClick={() => handleRespond('accepted')}
                sx={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  letterSpacing: '0.01em',
                  height: '36px',
                  minWidth: '110px',
                  transition: 'all 0.15s ease-in-out',
                  '&:hover': {
                    backgroundColor: '#059669',
                    boxShadow: 'none',
                    transform: 'translateY(-1px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                  '&:focus': {
                    boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)',
                  },
                }}
              >
                Accept
              </CustomButton>
              <CustomButton
                variant='outlined'
                onClick={() => handleRespond('rejected')}
                sx={{
                  borderColor: '#ef4444',
                  color: '#ef4444',
                  fontSize: '14px',
                  fontWeight: 600,
                  letterSpacing: '0.01em',
                  height: '36px',
                  minWidth: '110px',
                  transition: 'all 0.15s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'rgba(239, 68, 68, 0.06)',
                    borderColor: '#dc2626',
                    color: '#dc2626',
                    boxShadow: 'none',
                    transform: 'translateY(-1px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                  '&:focus': {
                    boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.2)',
                  },
                }}
              >
                Reject
              </CustomButton>
              <CustomButton
                variant='outlined'
                onClick={handleBack}
                sx={{
                  borderColor: '#6b7280',
                  color: '#6b7280',
                  fontSize: '14px',
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                  height: '36px',
                  minWidth: '100px',
                  transition: 'all 0.15s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'rgba(107, 114, 128, 0.05)',
                    borderColor: '#4b5563',
                    color: '#4b5563',
                    boxShadow: 'none',
                    transform: 'translateY(-1px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                  '&:focus': {
                    boxShadow: '0 0 0 3px rgba(107, 114, 128, 0.2)',
                  },
                }}
              >
                Back
              </CustomButton>
            </div>
          )
        }
      />

      <ScriptAnalysisLayout
        mode='coach'
        enableAnalysisTab={false}
        enableNotesTab={false}
        enableAnnotations={false}
      />
    </div>
  );
};

export default CoachScriptInsights;

