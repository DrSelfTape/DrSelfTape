import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { hideSnackbar } from '../../../redux/features/snackbarSlice/snackbarSlice';

// Lightweight toast — replaces MUI's <Snackbar>, whose single use here dragged
// the entire @mui/material vendor chunk into the cold-boot bundle. Same behavior
// (white card, colored left border by variant, auto-hide, anchor position),
// zero dependencies. Tap to dismiss.
const VARIANT_COLORS = {
  success: '#4caf50',
  error: '#f44336',
  warning: '#ff9800',
  info: '#2196f3',
  default: '#757575',
};

export const Toastbar = () => {
  const dispatch = useDispatch();
  const { open, message, vertical = 'bottom', horizontal = 'center', variant } = useSelector(
    (state) => state.snackbar
  );

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => dispatch(hideSnackbar()), 6000);
    return () => clearTimeout(t);
  }, [open, message, dispatch]);

  if (!open) return null;

  const isTop = vertical === 'top';
  const pos = {
    [isTop ? 'top' : 'bottom']: `calc(env(safe-area-inset-${isTop ? 'top' : 'bottom'}, 0px) + 20px)`,
    ...(horizontal === 'left'
      ? { left: 20 }
      : horizontal === 'right'
        ? { right: 20 }
        : { left: '50%', transform: 'translateX(-50%)' }),
  };

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={() => dispatch(hideSnackbar())}
      style={{
        position: 'fixed', zIndex: 2000, ...pos,
        maxWidth: 'min(92vw, 420px)',
        background: 'white', color: 'black',
        borderLeft: `6px solid ${VARIANT_COLORS[variant] || VARIANT_COLORS.default}`,
        borderRadius: 5, padding: '8px 12px',
        fontSize: 12, fontWeight: 700, textAlign: 'center', lineHeight: 1.4,
        boxShadow: '0 6px 24px rgba(0,0,0,0.18)', cursor: 'pointer',
      }}
    >
      {message}
    </div>
  );
};
