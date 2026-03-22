import { useDispatch } from 'react-redux';
import { hideSnackbar, showSnackbar } from '../redux/features/snackbarSlice/snackbarSlice';

export const useSnackbar = () => {
    const dispatch = useDispatch();

    const show = (message, options = {}) => {
        dispatch(showSnackbar({
            message,
            vertical: options.vertical || 'top',
            horizontal: options.horizontal || 'center',
            variant: options.variant || 'info'
        }));
    };

    const methods = {
        success: (message, options = {}) => show(message, { ...options, variant: 'success' }),
        error: (message, options = {}) => show(message, { ...options, variant: 'error' }),
        warning: (message, options = {}) => show(message, { ...options, variant: 'warning' }),
        info: (message, options = {}) => show(message, { ...options, variant: 'info' }),
        default: (message, options = {}) => show(message, options),
    };
    
    return {
        toast: methods,
        hideMessage: () => dispatch(hideSnackbar()),
    };
}