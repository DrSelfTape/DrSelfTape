import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { switchRole } from '../../../redux/features/auth/authSlice';
import { setAuthToken } from '../../../redux/http';
import { getFirstRouteByRole } from '../../../routes/routeHelpers';
import { useStoreData } from '../../../hooks/useStoreData';
import { useSnackbar } from '../../../hooks/useSnackbar';

const LABELS = { actor: 'Actor', coach: 'Coach', casting_director: 'Casting Director', admin: 'Admin' };
const label = (role) => LABELS[role] || role;

// V-02: the account role switch used to live in the legacy header's avatar
// menu (deleted with the MUI shell). Same flow, now a Settings section, shown
// only to accounts that actually hold more than one role.
export default function RoleSwitcher() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { toast } = useSnackbar();
  const { role, hasMultipleRoles, allUserPermissions } = useStoreData();
  const switching = useSelector((state) => state.auth?.loading);
  const [pending, setPending] = useState(null);
  if (!hasMultipleRoles) return null;

  const handleSwitch = async (target) => {
    if (switching || pending) return;
    setPending(target);
    try {
      const result = await dispatch(switchRole({ role: target })).unwrap();
      const token = result?.token?.access || result?.access;
      if (token) setAuthToken(token);
      toast.success(`Successfully switched to ${label(target)} role.`);
      navigate(getFirstRouteByRole(target), { replace: true });
    } catch (error) {
      toast.error(typeof error === 'string' ? error : error?.message || 'Failed to switch role. Please try again.');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className='card-section m-[10px]'>
      <h2 className='text-xl md:2xl font-semibold mb-2'>Account role</h2>
      <p className='mb-4' style={{ fontSize: 'var(--type-sm)' }}>
        You are using Dr. Self Tape as <strong>{label(role)}</strong>.
      </p>
      <div className='flex flex-wrap gap-3'>
        {allUserPermissions.filter((r) => r !== role).map((target) => (
          <button key={target} type='button' onClick={() => handleSwitch(target)} disabled={!!pending || !!switching}
            className='px-4 py-2 rounded-lg border font-semibold border-style disabled:opacity-60'
            style={{ fontSize: 'var(--type-sm)' }}>
            {pending === target ? 'Switching…' : `Switch to ${label(target)}`}
          </button>
        ))}
      </div>
    </div>
  );
}
