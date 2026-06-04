/**
 * Craft Journey — skill_progress + craft_xp from the BE.
 *
 * BE owns the canonical state for which node is locked / current /
 * done. The FE keeps a copy here for fast renders and optimistic
 * updates when a session ends.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../http';
import endPoints from '../../constant';

export const fetchCraftJourney = createAsyncThunk(
  'craftJourney/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(endPoints.craftJourney);
      return data?.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch progress');
    }
  },
);

/** Mark a node done. Accepts either a node id ('f1') or a label ('Cold Reads'). */
export const completeCraftNode = createAsyncThunk(
  'craftJourney/complete',
  async ({ node, stars = 2 }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.craftJourneyComplete, { node, stars });
      return data?.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to mark complete');
    }
  },
);

const craftJourneySlice = createSlice({
  name: 'craftJourney',
  initialState: {
    skill_progress: {},
    craft_xp: 0,
    path_order: [],
    loading: false,
    hasFetched: false,
    lastResult: null, // { node_id, unlocked_next, xp_awarded, already_done, stars }
  },
  reducers: {
    clearLastResult: (state) => { state.lastResult = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCraftJourney.pending, (state) => { state.loading = true; })
      .addCase(fetchCraftJourney.fulfilled, (state, action) => {
        state.loading = false;
        state.hasFetched = true;
        state.skill_progress = action.payload?.skill_progress || {};
        state.craft_xp = action.payload?.craft_xp || 0;
        state.path_order = action.payload?.path_order || [];
      })
      .addCase(fetchCraftJourney.rejected, (state) => {
        state.loading = false;
        state.hasFetched = true;
      })
      .addCase(completeCraftNode.fulfilled, (state, action) => {
        state.skill_progress = action.payload?.skill_progress || state.skill_progress;
        state.craft_xp = action.payload?.craft_xp ?? state.craft_xp;
        state.lastResult = action.payload?.result || null;
      });
  },
});

export const { clearLastResult } = craftJourneySlice.actions;
export default craftJourneySlice.reducer;
