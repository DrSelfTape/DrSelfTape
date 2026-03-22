// src/redux/features/auditionTracker/auditionTrackerSlice.js
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from '../../http';
import endPoints from '../../constant';

const initialState = {
  auditionTracker: {
    totalAuditions: { value: 0, change: 0 },
    callbacksReceived: { value: 0, change: 0 },
    rolesBooked: { value: 0, change: 0 },
    bookingRate: { value: 0, change: 0 },
    mostCommonType: { type: '', count: 0 },
  },
  bookingRatio: {
    bookingRate: 0,
    callbackRate: 0,
    notSelectedRate: 0,
    counts: { booked: 0, callback: 0, not_selected: 0, other: 0 },
  },
  auditionTimeline: [],
  goalProgress:{},
  milestoneBadges: [],
  loading: false,
  error: null,
};

const handleApiError = (error) => {
  const message =
    error?.response?.data?.message ||
    error?.message ||
    'An unexpected error occurred';
  return message;
};

export const getAuditionTracker = createAsyncThunk(
  'auditionTracker/get',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(endPoints.auditionTracker, { params });
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const auditionTrackerSlice = createSlice({
  name: 'auditionTracker',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Audition Tracker
      .addCase(getAuditionTracker.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAuditionTracker.fulfilled, (state, action) => {
        console.log('redux console', action.payload);
        state.loading = false;
        state.auditionTracker = {
          totalAuditions: action.payload?.audition_tracker?.total_auditions || {
            value: 0,
            change: 0,
          },
          callbacksReceived: action.payload?.audition_tracker
            ?.callbacks_received || {
            value: 0,
            change: 0,
          },
          rolesBooked: action.payload?.audition_tracker?.roles_booked || {
            value: 0,
            change: 0,
          },
          bookingRate: action.payload?.audition_tracker?.booking_rate || {
            value: 0,
            change: 0,
          },
          mostCommonType: action.payload?.audition_tracker
            ?.most_common_type || {
            type: '',
            count: 0,
          },
        };
        state.bookingRatio = action.payload?.booking_ratio || {
          bookingRate: 0,
          callbackRate: 0,
          notSelectedRate: 0,
          counts: { booked: 0, callback: 0, not_selected: 0, other: 0 },
        };
        state.goalProgress = action.payload?.goal_progress || {};
        state.auditionTimeline = action.payload?.audition_timeline || [];
        state.milestoneBadges = action.payload?.milestone_badges || [];
        state.error = null;
      })
      .addCase(getAuditionTracker.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError } = auditionTrackerSlice.actions;

export default auditionTrackerSlice.reducer;
