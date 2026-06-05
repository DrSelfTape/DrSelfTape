/**
 * src/redux/features/auditions/auditionsSlice.js
 *
 * Redux slice for the Dashboard Auditions panel.
 * Includes thunks for: list, stats, tracker, create, update, delete.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import http from '../../http'; // your axios instance with JWT interceptor
import endPoints from '../../constant';

/* ═══════════════════════════════════════════════════════════════════
   THUNKS
   ═══════════════════════════════════════════════════════════════════ */

/** Fetch all auditions (flat list) */
export const fetchAuditionsThunk = createAsyncThunk(
  'auditions/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await http.get(endPoints.auditions);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Fetch audition stats (for dashboard cards) */
export const fetchAuditionStatsThunk = createAsyncThunk(
  'auditions/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const res = await http.get(endPoints.auditionStats);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Fetch tracker (kanban buckets) */
export const fetchTrackerThunk = createAsyncThunk(
  'auditions/fetchTracker',
  async (_, { rejectWithValue }) => {
    try {
      const res = await http.get(endPoints.auditionTracker);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Create a new audition */
export const createAuditionThunk = createAsyncThunk(
  'auditions/create',
  async (formData, { rejectWithValue }) => {
    try {
      const res = await http.post(endPoints.auditions, formData);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Update (PATCH) an audition */
export const updateAuditionThunk = createAsyncThunk(
  'auditions/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await http.patch(`${endPoints.auditions}${id}/`, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Delete an audition */
export const deleteAuditionThunk = createAsyncThunk(
  'auditions/delete',
  async (id, { rejectWithValue }) => {
    try {
      const res = await http.delete(`${endPoints.auditions}${id}/`);
      return { id, ...res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ═══════════════════════════════════════════════════════════════════
   SLICE
   ═══════════════════════════════════════════════════════════════════ */

const auditionsSlice = createSlice({
  name: 'auditions',
  initialState: {
    // Flat list
    data: [],
    // Stats for dashboard cards
    stats: { data: null, loading: false, error: null },
    // Kanban tracker
    tracker: { data: null, loading: false, error: null },
    // Per-mutation flags so UIs can show per-row spinners + retry hooks
    createLoading: false,
    createError: null,
    updateLoading: false,
    updateError: null,
    deleteLoading: false,
    deleteError: null,
    // General loading/error
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    // ── Fetch all ──
    builder
      .addCase(fetchAuditionsThunk.pending, (state) => { state.loading = true; })
      .addCase(fetchAuditionsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload?.data || [];
      })
      .addCase(fetchAuditionsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ── Fetch stats ──
    builder
      .addCase(fetchAuditionStatsThunk.pending, (state) => { state.stats.loading = true; })
      .addCase(fetchAuditionStatsThunk.fulfilled, (state, action) => {
        state.stats.loading = false;
        state.stats.data = action.payload?.data || {};
      })
      .addCase(fetchAuditionStatsThunk.rejected, (state, action) => {
        state.stats.loading = false;
        state.stats.error = action.payload;
      });

    // ── Fetch tracker ──
    builder
      .addCase(fetchTrackerThunk.pending, (state) => { state.tracker.loading = true; state.loading = true; })
      .addCase(fetchTrackerThunk.fulfilled, (state, action) => {
        state.tracker.loading = false;
        state.loading = false;
        state.tracker.data = action.payload?.data || {};
      })
      .addCase(fetchTrackerThunk.rejected, (state, action) => {
        state.tracker.loading = false;
        state.loading = false;
        state.tracker.error = action.payload;
      });

    // ── Create ──
    builder
      .addCase(createAuditionThunk.pending, (state) => {
        state.createLoading = true;
        state.createError = null;
      })
      .addCase(createAuditionThunk.fulfilled, (state) => {
        state.createLoading = false;
      })
      .addCase(createAuditionThunk.rejected, (state, action) => {
        state.createLoading = false;
        state.createError = action.payload;
      });

    // ── Update ──
    builder
      .addCase(updateAuditionThunk.pending, (state) => {
        state.updateLoading = true;
        state.updateError = null;
      })
      .addCase(updateAuditionThunk.fulfilled, (state) => {
        state.updateLoading = false;
      })
      .addCase(updateAuditionThunk.rejected, (state, action) => {
        state.updateLoading = false;
        state.updateError = action.payload;
      });

    // ── Delete ──
    builder
      .addCase(deleteAuditionThunk.pending, (state) => {
        state.deleteLoading = true;
        state.deleteError = null;
      })
      .addCase(deleteAuditionThunk.fulfilled, (state) => {
        state.deleteLoading = false;
      })
      .addCase(deleteAuditionThunk.rejected, (state, action) => {
        state.deleteLoading = false;
        state.deleteError = action.payload;
      });
  },
});

export default auditionsSlice.reducer;
