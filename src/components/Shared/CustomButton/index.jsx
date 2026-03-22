import Button from '@mui/material/Button';
import { CircularProgress } from '@mui/material';

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
}) => {
  const baseColor = isDelete ? '#ef4444' : 'primary.main';
  const hoverColor = isDelete ? '#dc2626' : 'primary.dark';

  return (
    <Button
      variant={variant}
      onClick={disabled || loading ? null : onClick}
      disabled={disabled || loading}
      type={type || 'submit'}
      className={className}
      startIcon={startIcon}
      endIcon={endIcon}
      sx={{
        textTransform: 'none',
        height: '35px',
        display: 'flex !important',
        textWrap: 'nowrap',
        alignItems: 'center',
        boxShadow: 'none',
        ...(variant === 'outlined' && {
          backgroundColor: 'transparent',
          border: '1px solid',
          borderColor: baseColor,
          color: baseColor,
          '&:hover': {
            backgroundColor: isDelete
              ? 'rgba(239, 68, 68, 0.1)'
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
