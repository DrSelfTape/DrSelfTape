import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import axiosInstance from '../../http';
import endPoints from '../../constant';

export const getNotifications = createAsyncThunk(
  'notifications/getNotifications',
  async (options, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(endPoints.myNotifications, { params: options?.before ? { before: options.before } : {} });
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
    nextBefore: null,
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
        const received = action.payload.data || [];
        state.notifications = action.meta.arg?.before
          ? [...new Map([...state.notifications, ...received].map(n => [n.id, n])).values()]
          : received;
        state.nextBefore = action.payload.next_before || null;
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
