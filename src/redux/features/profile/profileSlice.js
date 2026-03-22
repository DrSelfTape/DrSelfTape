import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from '../../http';
import endPoints from '../../constant';

const initialState = {
  profile: null,
  loading: false,
  updateLoading: false,
  error: null,
};

export const fetchProfileThunk = createAsyncThunk(
  'profile/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(endPoints.profile);
      return data?.data || data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || 'Failed to load profile.'
      );
    }
  }
);

export const updateProfileThunk = createAsyncThunk(
  'profile/updateProfile',
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await axios.patch(endPoints.profile, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data?.data || data;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        (error?.response?.data && typeof error.response.data === 'object'
          ? Object.values(error.response.data).flat().join('. ')
          : 'Failed to update profile.');
      return rejectWithValue(message);
    }
  }
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearProfileError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch profile
      .addCase(fetchProfileThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfileThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchProfileThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update profile
      .addCase(updateProfileThunk.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.updateLoading = false;
        state.profile = action.payload;
      })
      .addCase(updateProfileThunk.rejected, (state, action) => {
        state.updateLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearProfileError } = profileSlice.actions;
export default profileSlice.reducer;
