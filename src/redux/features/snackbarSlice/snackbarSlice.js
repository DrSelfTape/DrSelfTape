// features/snackbar/snackbarSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  open: false,
  message: '',
  vertical: 'bottom',
  horizontal: 'left',
  variant: 'info',
};

const snackbarSlice = createSlice({
  name: 'snackbar',
  initialState,
  reducers: {
    showSnackbar: (state, action) => {
      const { message, vertical, horizontal, variant } = action.payload;
      state.open = true;
      state.message = message;
      state.vertical = vertical || 'top';
      state.horizontal = horizontal || 'center';
      state.variant = variant || 'info';
    },
    hideSnackbar: (state) => {
      state.open = false;
    },
  },
});

export const { showSnackbar, hideSnackbar } = snackbarSlice.actions;
export default snackbarSlice.reducer;