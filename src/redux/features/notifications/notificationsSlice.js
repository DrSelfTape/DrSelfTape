import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import axiosInstance from '../../http';
import endPoints from '../../constant';

export const getNotifications = createAsyncThunk(
  'notifications/getNotifications',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(endPoints.myNotifications);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || 'Failed to fetch notifications'
      );
    }
  }
);

export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(
        `${endPoints.markNotificationRead}${id}/`
      );
      return { id, data: response.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || 'Failed to mark notification as read'
      );
    }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    notifications: [],
    loading: false,
    error: null,
  },

  extraReducers: (builder) => {
    builder
      .addCase(getNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.data;
      })
      .addCase(getNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const id = action.payload.id;
        const notif = state.notifications?.find((n) => n.id === id);
        if (notif) notif.is_read = true;
      });
  },
});

export default notificationSlice.reducer;
