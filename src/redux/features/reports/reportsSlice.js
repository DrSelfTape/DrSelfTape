import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from '../../http';
import endPoints from '../../constant';
import { aiIdempotencyHeaders } from '../../../utils/aiIdempotency';

const initialState = {
  data: null,
  loading: false,
  error: null,
  aiInsight: null,
  aiInsightLoading: false,
};

export const fetchReportsThunk = createAsyncThunk(
  'reports/fetchReports',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(endPoints.reports);
      return data?.results || data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.detail || 'Failed to load reports.'
      );
    }
  }
);

export const fetchAIInsightThunk = createAsyncThunk(
  'reports/fetchAIInsight',
  async (statsPrompt, { rejectWithValue }) => {
    try {
      const body = {
        line: statsPrompt,
        script_context: 'Career analysis for actor',
        character: 'Career Coach',
        type: 'line',
      };
      // cd-feedback spends a token; without a key the BE skips dedup entirely
      // and a retry charges twice for one insight.
      const { data } = await axios.post(
        endPoints.cdFeedback, body, aiIdempotencyHeaders('cd_feedback', body),
      );
      return data?.data?.feedback || data?.feedback || null;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.detail || 'Failed to generate AI insight.'
      );
    }
  }
);

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearReportsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReportsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReportsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchReportsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // AI Insight
      .addCase(fetchAIInsightThunk.pending, (state) => {
        state.aiInsightLoading = true;
      })
      .addCase(fetchAIInsightThunk.fulfilled, (state, action) => {
        state.aiInsightLoading = false;
        state.aiInsight = action.payload;
      })
      .addCase(fetchAIInsightThunk.rejected, (state) => {
        state.aiInsightLoading = false;
      });
  },
});

export const { clearReportsError } = reportsSlice.actions;
export default reportsSlice.reducer;
