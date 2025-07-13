// Library Imports
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

// Local Imports
import axios from '../../http';
import endPoints from '../../http';

// Initial state for auth
const initialState = {
  login: {
    user: null,
    loading: false,
    error: null,
  },
  register: {
    user: null,
    loading: false,
    error: null,
  },
};

// Sign user API Function
export const registerUser = createAsyncThunk(
  'auth/register',
  async (values, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.register, {
        ...values,
      });
      return data?.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message);
    }
  }
);

// Login user API Function
export const loginUser = createAsyncThunk(
  'auth/login',
  async (values, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.login, {
        ...values,
      });
      return data?.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message);
    }
  }
);

// Reducers
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logoutUser: (state) => {
      state.user = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.register.loading = true;
        state.register.error = null;
        state.register.user = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.register.loading = false;
        state.register.user = action.payload;
        state.register.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.register.user = null;
      })
      .addCase(loginUser.pending, (state) => {
        state.login.loading = true;
        state.login.error = null;
        state.login.user = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.login.loading = false;
        state.login.user = action.payload;
        state.login.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.login.loading = false;
        state.login.error = action.payload;
        state.login.user = null;
      });
  },
});

export const { logoutUser } = authSlice.actions;
export default authSlice.reducer;
