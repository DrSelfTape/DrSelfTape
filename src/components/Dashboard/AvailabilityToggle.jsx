import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleAvailability } from '../../redux/features/readers/readersMatchSlice';
import { showSnackbar } from '../../redux/features/snackbarSlice/snackbarSlice';
import { markStep } from './TutorialChecklist';

export default function AvailabilityToggle({ compact = false }) {
  const dispatch = useDispatch();
  const isAvailable = useSelector((s) => s.readersMatch.isAvailable);
  const toggling = useSelector((s) => s.readersMatch.availabilityToggling);

  const runToggle = async (next) => {
    try {
      await dispatch(toggleAvailability(next)).unwrap();
      if (next) markStep('go_available');
    } catch (err) {
      dispatch(showSnackbar({
        message: err?.message || err?.detail || "Couldn't update availability. Please try again.",
        variant: 'error',
      }));
    }
  };

  const handleToggle = () => {
    if (!toggling) runToggle(!isAvailable);
  };

  // Listen for tutorial-triggered toggle
  useEffect(() => {
    const handler = () => {
      if (!isAvailable && !toggling) runToggle(true);
    };
    window.addEventListener('drst-tutorial-toggle-available', handler);
    return () => window.removeEventListener('drst-tutorial-toggle-available', handler);
  }, [isAvailable, toggling]); // eslint-disable-line react-hooks/exhaustive-deps

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        disabled={toggling}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
          isAvailable
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-[#1E1E1E] text-[#BBBBBB] border border-[#3A3A3A] hover:text-white hover:border-[#555]'
        }`}
      >
        <span className={`inline-block w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-[#666666]'}`} />
        {isAvailable ? 'Available' : 'Go Available'}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={toggling}
      className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
        isAvailable
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15'
          : 'bg-[#1E1E1E] text-[#BBBBBB] border border-[#3A3A3A] hover:text-white hover:bg-[#252525]'
      }`}
    >
      <span className="relative flex h-2.5 w-2.5">
        {isAvailable && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isAvailable ? 'bg-emerald-500' : 'bg-[#888888]'}`} />
      </span>
      {isAvailable ? 'Available to Read' : 'Go Available'}
    </button>
  );
}
