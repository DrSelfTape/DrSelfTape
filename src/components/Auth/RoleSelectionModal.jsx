// Library imports
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

// Local imports
import { CustomModal } from '../Shared/CustomModal';
import { CustomButton } from '../Shared/CustomButton';
import { switchRole } from '../../redux/features/auth/authSlice';
import { useSnackbar } from '../../hooks/useSnackbar';
import { setAuthToken } from '../../redux/http';
import { getFirstRouteByRole } from '../../routes/routeHelpers';

export const RoleSelectionModal = ({ open, onClose, availableRoles = [], onRoleSelected }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { toast } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const handleRoleSelection = async (role) => {
    if (loading) return;

    try {
      setLoading(true);
      setSelectedRole(role);

      const result = await dispatch(switchRole({ role })).unwrap();

      // Update token
      const newToken = result?.token?.access || result?.access;
      if (newToken) {
        setAuthToken(newToken);
      }

      // Show success message
      const roleLabel = getRoleLabel(role);
      toast.success(`Successfully logged in as ${roleLabel}.`);

      // Close modal
      onClose();

      const firstRoute = getFirstRouteByRole(role);
      // iOS Capacitor: react-router's imperative navigate() no-ops in the
      // native shell, which stranded multi-role users on /login. Hand the
      // chosen route back to the parent (PublicRoutes) so it can do the same
      // declarative <Navigate> the single-role path uses — that DOES work on
      // iOS. Fall back to imperative navigate() when no callback is wired
      // (e.g. web usages that don't pass onRoleSelected).
      if (typeof onRoleSelected === 'function') {
        onRoleSelected(role, firstRoute);
      } else {
        navigate(firstRoute, { replace: true });
      }
    } catch (error) {
      const errorMessage =
        typeof error === 'string'
          ? error
          : error?.message || 'Failed to switch role. Please try again.';

      toast.error(errorMessage);
      setSelectedRole(null);
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      actor: 'Actor',
      coach: 'Reader',
      agent: 'Agent',
      casting_director: 'Casting Director',
      admin: 'Admin',
    };
    return labels[role] || role;
  };

  const getRoleDescription = (role) => {
    const descriptions = {
      actor:
        'Access your actor profile, auditions, bookings, and scene study tools.',
      coach:
        'Access your reader profile, manage sessions, and help other actors prepare for auditions.',
      agent: 'Manage your agency and client relationships.',
      casting_director: 'Manage auditions and casting calls.',
      admin: 'Access administrative features.',
    };
    return descriptions[role] || 'Access your profile and features.';
  };

  return (
    <CustomModal
      open={open}
      close={onClose}
      title='Select Your Role'
      noFooter={true}
      disableBackdropClick={loading}
      disableEscapeKeyDown={loading}
      mainBoxClassName='!max-w-[420px] !w-[calc(100vw-2rem)] sm:!w-[420px]'
      childClassName='!max-w-[420px] !min-w-0 !w-full !max-h-[65vh] overflow-y-auto !px-4'
    >
      <div className='py-3'>
        <p className='text-sm text-secondary-dark mb-4 text-center'>
          You have access to multiple roles. Please select which role you would
          like to use for this session.
        </p>

        <div className='space-y-2.5'>
          {availableRoles.map((role) => (
            <div
              key={role}
              className={`border rounded-md p-3.5 cursor-pointer transition-colors ${
                selectedRole === role
                  ? 'border-primary bg-primary-light'
                  : 'border-gray-200 hover:border-primary hover:bg-gray-50'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !loading && handleRoleSelection(role)}
            >
              <div className='flex items-start gap-2.5'>
                <div className='flex-1 min-w-0'>
                  <h3 className='text-[15px] font-semibold text-secondary-dark mb-1'>
                    Login as {getRoleLabel(role)}
                  </h3>
                  <p className='text-[13px] text-secondary leading-snug'>
                    {getRoleDescription(role)}
                  </p>
                </div>
                <div className='flex-shrink-0 pt-0.5'>
                  {selectedRole === role && loading ? (
                    <div className='h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin' />
                  ) : (
                    <div className='h-4 w-4 border-2 border-gray-300 rounded-full flex items-center justify-center'>
                      {selectedRole === role && (
                        <div className='h-2 w-2 bg-primary rounded-full' />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className='mt-4 pt-3 border-t border-gray-200'>
          <CustomButton
            onClick={onClose}
            variant='outlined'
            disabled={loading}
            className='w-full'
            sx={{
              borderColor: 'var(--color-input)',
              color: 'var(--color-secondary-dark)',
              '&:hover': {
                borderColor: 'var(--color-primary)',
                backgroundColor: 'var(--color-primary-light)',
              },
            }}
          >
            Cancel
          </CustomButton>
        </div>
      </div>
    </CustomModal>
  );
};

