import Button from '@mui/material/Button';
import { CircularProgress } from '@mui/material';

/**
 * CustomButton — the default button on every non-Studio screen.
 *
 * It used to be 35px tall, which is under Apple's 44px floor on a surface
 * that is mostly fingers. It is 44 now. Where a design genuinely needs a
 * shorter box — a toolbar, a table-row action — pass `dense`: the button
 * draws at 36px and an invisible pseudo-element stretches the HIT area
 * back to 44 without touching the layout.
 *
 * Every prop that worked before still works. `sx` is still spread last,
 * so a caller that already pinned its own height keeps it.
 */
export const CustomButton = ({
  variant = 'contained',
  onClick,
  disabled,
  loading,
  children,
  sx,
  type,
  className,
  isDelete = false,
  CircularProgressSize,
  startIcon,
  endIcon,
  dense = false,
}) => {
  // #ef4444 under white text measures 3.8:1 — under AA on a button whose
  // whole job is to be read before something is destroyed.
  const baseColor = isDelete ? 'var(--dst-danger, #C62828)' : 'primary.main';
  const hoverColor = isDelete ? 'var(--dst-danger-deep, #A32020)' : 'primary.dark';

  return (
    <Button
      variant={variant}
      onClick={disabled || loading ? null : onClick}
      disabled={disabled || loading}
      type={type || 'submit'}
      className={className}
      startIcon={startIcon}
      endIcon={endIcon}
      aria-busy={loading ? true : undefined}
      sx={{
        textTransform: 'none',
        minHeight: dense ? 'var(--dst-tap-dense, 36px)' : 'var(--dst-tap-min, 44px)',
        display: 'flex !important',
        textWrap: 'nowrap',
        alignItems: 'center',
        boxShadow: 'none',
        // Dense keeps its small box and borrows the missing millimetres.
        ...(dense && {
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            left: '50%',
            top: '50%',
            translate: '-50% -50%',
            width: '100%',
            height: 'var(--dst-tap-min, 44px)',
          },
        }),
        ...(variant === 'outlined' && {
          backgroundColor: 'transparent',
          border: '1px solid',
          borderColor: baseColor,
          color: baseColor,
          '&:hover': {
            backgroundColor: isDelete
              ? 'var(--dst-danger-tint, rgba(198,40,40,0.10))'
              : 'rgba(0, 0, 0, 0.04)',
            borderColor: baseColor,
            color: baseColor,
            boxShadow: 'none',
          },
          '&:disabled': {
            backgroundColor: 'transparent',
            borderColor: baseColor,
            color: baseColor,
            opacity: 0.5,
          },
        }),
        ...(variant === 'contained' && {
          backgroundColor: sx?.backgroundColor || baseColor,
          color: sx?.color || 'white',
          '&:hover': {
            backgroundColor: sx?.backgroundColor || hoverColor,
            boxShadow: 'none',
          },
          '&:disabled': {
            backgroundColor: sx?.backgroundColor || baseColor,
            color: sx?.color || 'white',
            opacity: 0.5,
          },
        }),
        ...sx,
      }}
    >
      {loading ? (
        <div className='flex items-center gap-1'>
          {children}
          <CircularProgress
            size={CircularProgressSize || 16}
            sx={{
              color: variant === 'outlined' ? baseColor : 'white',
            }}
          />
        </div>
      ) : (
        children
      )}
    </Button>
  );
};
