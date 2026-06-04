/**
 * src/redux/features/admin/adminSlice.js
 *
 * Redux slice for the Admin panel.
 * Includes thunks for: stats, users, payments, messages, banned users.
 */

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from '../../http';
import { baseURL } from '../../constant';

/* ═══════════════════════════════════════════════════════════════════
   THUNKS
   ═══════════════════════════════════════════════════════════════════ */

/** Fetch admin dashboard stats */
export const fetchAdminStats = createAsyncThunk(
  'admin/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${baseURL}/v1/admin/stats/`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchAdminReports = createAsyncThunk(
  'admin/fetchReports',
  async (range = '30d', { rejectWithValue }) => {
    try {
      const res = await axios.get(`${baseURL}/v1/admin/reports/`, {
        params: { range },
      });
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Fetch admin users list (supports ?search=, ?role=, ?status= query params) */
export const fetchAdminUsers = createAsyncThunk(
  'admin/fetchUsers',
  async (params = {}, { rejectWithValue }) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${baseURL}/v1/admin/users/${queryString ? `?${queryString}` : ''}`;
      const res = await axios.get(url);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Fetch single admin user detail */
export const fetchAdminUserDetail = createAsyncThunk(
  'admin/fetchUserDetail',
  async (id, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${baseURL}/v1/admin/users/${id}/`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Update admin user (PATCH) */
export const updateAdminUser = createAsyncThunk(
  'admin/updateUser',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await axios.patch(`${baseURL}/v1/admin/users/${id}/`, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Ban a user */
export const banUser = createAsyncThunk(
  'admin/banUser',
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${baseURL}/v1/admin/users/${id}/ban/`, { reason });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Unban a user */
export const unbanUser = createAsyncThunk(
  'admin/unbanUser',
  async (id, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${baseURL}/v1/admin/users/${id}/unban/`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Fetch admin payments (supports ?status=, ?plan= query params) */
export const fetchAdminPayments = createAsyncThunk(
  'admin/fetchPayments',
  async (params = {}, { rejectWithValue }) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${baseURL}/v1/admin/payments/${queryString ? `?${queryString}` : ''}`;
      const res = await axios.get(url);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Fetch admin messages */
export const fetchAdminMessages = createAsyncThunk(
  'admin/fetchMessages',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${baseURL}/v1/admin/messages/`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Reply to a message */
export const replyToMessage = createAsyncThunk(
  'admin/replyToMessage',
  async ({ id, content }, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${baseURL}/v1/admin/messages/${id}/reply/`, { content });
      return { id, reply: res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Fetch banned users */
export const fetchBannedUsers = createAsyncThunk(
  'admin/fetchBannedUsers',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${baseURL}/v1/admin/banned-users/`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ═══════════════════════════════════════════════════════════════════
   SLICE
   ═══════════════════════════════════════════════════════════════════ */

const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    stats: null,
    statsLoading: false,
    users: [],
    usersLoading: false,
    userDetail: null,
    userDetailLoading: false,
    payments: [],
    paymentsLoading: false,
    messages: [],
    messagesLoading: false,
    bannedUsers: [],
    bannedUsersLoading: false,
    reports: null,
    reportsLoading: false,
    error: null,
  },
  reducers: {
    clearAdminError(state) {
      state.error = null;
    },
    clearUserDetail(state) {
      state.userDetail = null;
    },
    markMessageRead(state, action) {
      const msg = state.messages.find((m) => m.id === action.payload);
      if (msg) msg.status = 'read';
    },
    markMessageResolved(state, action) {
      const msg = state.messages.find((m) => m.id === action.payload);
      if (msg) msg.status = 'resolved';
    },
  },
  extraReducers: (builder) => {
    // ── Fetch Stats ──
    builder
      .addCase(fetchAdminStats.pending, (state) => {
        state.statsLoading = true;
        state.error = null;
      })
      .addCase(fetchAdminStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.stats = action.payload?.data || action.payload;
      })
      .addCase(fetchAdminStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.error = action.payload;
      })
      // ── Fetch Reports ──
      .addCase(fetchAdminReports.pending, (state) => {
        state.reportsLoading = true;
        state.error = null;
      })
      .addCase(fetchAdminReports.fulfilled, (state, action) => {
        state.reportsLoading = false;
        state.reports = action.payload;
      })
      .addCase(fetchAdminReports.rejected, (state, action) => {
        state.reportsLoading = false;
        state.error = action.payload;
      });

    // ── Fetch Users ──
    builder
      .addCase(fetchAdminUsers.pending, (state) => {
        state.usersLoading = true;
        state.error = null;
      })
      .addCase(fetchAdminUsers.fulfilled, (state, action) => {
        state.usersLoading = false;
        state.users = action.payload?.data || action.payload || [];
      })
      .addCase(fetchAdminUsers.rejected, (state, action) => {
        state.usersLoading = false;
        state.error = action.payload;
      });

    // ── Fetch User Detail ──
    builder
      .addCase(fetchAdminUserDetail.pending, (state) => {
        state.userDetailLoading = true;
        state.error = null;
      })
      .addCase(fetchAdminUserDetail.fulfilled, (state, action) => {
        state.userDetailLoading = false;
        state.userDetail = action.payload?.data || action.payload;
      })
      .addCase(fetchAdminUserDetail.rejected, (state, action) => {
        state.userDetailLoading = false;
        state.error = action.payload;
      });

    // ── Update User ──
    builder
      .addCase(updateAdminUser.fulfilled, (state, action) => {
        const updated = action.payload?.data || action.payload;
        if (updated?.id) {
          const idx = state.users.findIndex((u) => u.id === updated.id);
          if (idx !== -1) state.users[idx] = { ...state.users[idx], ...updated };
          if (state.userDetail?.id === updated.id) {
            state.userDetail = { ...state.userDetail, ...updated };
          }
        }
      })
      .addCase(updateAdminUser.rejected, (state, action) => {
        state.error = action.payload;
      });

    // ── Ban User ──
    builder
      .addCase(banUser.fulfilled, (state, action) => {
        const banned = action.payload?.data || action.payload;
        if (banned?.id) {
          const idx = state.users.findIndex((u) => u.id === banned.id);
          if (idx !== -1) state.users[idx] = { ...state.users[idx], status: 'banned' };
        }
      })
      .addCase(banUser.rejected, (state, action) => {
        state.error = action.payload;
      });

    // ── Unban User ──
    builder
      .addCase(unbanUser.fulfilled, (state, action) => {
        const unbanned = action.payload?.data || action.payload;
        if (unbanned?.id) {
          state.bannedUsers = state.bannedUsers.filter((u) => u.id !== unbanned.id);
          const idx = state.users.findIndex((u) => u.id === unbanned.id);
          if (idx !== -1) state.users[idx] = { ...state.users[idx], status: 'active' };
        }
      })
      .addCase(unbanUser.rejected, (state, action) => {
        state.error = action.payload;
      });

    // ── Fetch Payments ──
    builder
      .addCase(fetchAdminPayments.pending, (state) => {
        state.paymentsLoading = true;
        state.error = null;
      })
      .addCase(fetchAdminPayments.fulfilled, (state, action) => {
        state.paymentsLoading = false;
        state.payments = action.payload?.data || action.payload || [];
      })
      .addCase(fetchAdminPayments.rejected, (state, action) => {
        state.paymentsLoading = false;
        state.error = action.payload;
      });

    // ── Fetch Messages ──
    builder
      .addCase(fetchAdminMessages.pending, (state) => {
        state.messagesLoading = true;
        state.error = null;
      })
      .addCase(fetchAdminMessages.fulfilled, (state, action) => {
        state.messagesLoading = false;
        state.messages = action.payload?.data || action.payload || [];
      })
      .addCase(fetchAdminMessages.rejected, (state, action) => {
        state.messagesLoading = false;
        state.error = action.payload;
      });

    // ── Reply to Message ──
    builder
      .addCase(replyToMessage.fulfilled, (state, action) => {
        const { id, reply } = action.payload;
        const msg = state.messages.find((m) => m.id === id);
        if (msg) {
          if (!msg.replies) msg.replies = [];
          msg.replies.push(reply?.data || reply);
          msg.status = 'read';
        }
      })
      .addCase(replyToMessage.rejected, (state, action) => {
        state.error = action.payload;
      });

    // ── Fetch Banned Users ──
    builder
      .addCase(fetchBannedUsers.pending, (state) => {
        state.bannedUsersLoading = true;
        state.error = null;
      })
      .addCase(fetchBannedUsers.fulfilled, (state, action) => {
        state.bannedUsersLoading = false;
        state.bannedUsers = action.payload?.data || action.payload || [];
      })
      .addCase(fetchBannedUsers.rejected, (state, action) => {
        state.bannedUsersLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearAdminError, clearUserDetail, markMessageRead, markMessageResolved } =
  adminSlice.actions;

export default adminSlice.reducer;
