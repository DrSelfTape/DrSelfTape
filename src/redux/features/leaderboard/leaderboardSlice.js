import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import http from '../../http';
import { baseURL } from '../../constant';

/**
 * GET /v1/growth/leaderboard/?metric=xp|callbacks|streak&scope=all|friends
 * Response shape (per `apps/growth/views.py:CommunityLeaderboardView`):
 *   { data: { leaders[], community_size, your_rank, metric, scope } }
 */
export const fetchLeaderboard = createAsyncThunk(
  'leaderboard/fetch',
  async ({ metric = 'xp', scope = 'all' } = {}, { rejectWithValue }) => {
    try {
      const { data } = await http.get(`${baseURL}/v1/growth/leaderboard/`, {
        params: { metric, scope },
      });
      return data?.data || data || {};
    } catch (err) {
      return rejectWithValue(err?.response?.data || err.message);
    }
  }
);

const initialState = {
  leaders: [],
  community_size: 0,
  your_rank: 0,
  metric: 'xp',
  scope: 'all',
  loading: false,
  error: null,
  unavailable: false, // true if endpoint 404s — FE falls back to "coming soon"
};

const slice = createSlice({
  name: 'leaderboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeaderboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLeaderboard.fulfilled, (state, action) => {
        const payload = action.payload || {};
        state.loading = false;
        state.unavailable = false;
        state.leaders = Array.isArray(payload.leaders) ? payload.leaders : [];
        state.community_size = payload.community_size || state.leaders.length;
        state.your_rank = payload.your_rank || 0;
        state.metric = payload.metric || state.metric;
        state.scope = payload.scope || state.scope;
      })
      .addCase(fetchLeaderboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        // If the endpoint returned 404 the BE hasn't deployed yet —
        // surface that as `unavailable` so the panel can show a polite
        // "Leaderboard coming soon" rather than a hard error.
        const status = action.payload?.status || action.error?.message;
        state.unavailable = String(status).includes('404');
      });
  },
});

export default slice.reducer;
