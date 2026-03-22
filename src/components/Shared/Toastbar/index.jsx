import { Snackbar } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { hideSnackbar } from '../../../redux/features/snackbarSlice/snackbarSlice';

export const Toastbar = () => {
  const dispatch = useDispatch();
  const { open, message, vertical, horizontal, variant } = useSelector(
    (state) => state.snackbar
  );

  const handleClose = () => {
    dispatch(hideSnackbar());
  };

  const getVariantColor = (variant) => {
    const variantColors = {
      success: '#4caf50',
      error: '#f44336',
      warning: '#ff9800',
      info: '#2196f3',
      default: '#757575',
    };
    return variantColors[variant] || variantColors.default;
  };


  return (
    <Snackbar
      anchorOrigin={{ vertical, horizontal }}
      open={open}
      onClose={handleClose}
      message={message}
      key={vertical + horizontal}
      autoHideDuration={6000}
      sx={{
        '& .MuiSnackbarContent-root': {
          backgroundColor: 'white',
          color: 'black',
          borderLeftWidth: '6px',
          borderColor: getVariantColor(variant),
          borderStyle: 'solid',
          borderRadius: '5px',
          padding: '6px 10px',
          fontSize: '12px',
          fontWeight: 'bold',
          textAlign: 'center',
          minHeight: '30px',
        },
      }}
    />
  );
}