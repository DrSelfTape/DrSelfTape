/**
 * Jericho — Self-Evolving AI Coach
 * Redux slice for actor memory, session logs, insights, and evolution metrics.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../http';
import endPoints from '../../constant';

// ─── Thunks ────────────────────────────────────────────────────────────

/** Fetch the actor's AI memory profile */
export const fetchActorMemory = createAsyncThunk(
  'jericho/fetchActorMemory',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(endPoints.actorMemory);
      return data?.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch actor memory');
    }
  }
);

/** Update the actor's AI memory profile (partial) */
export const updateActorMemory = createAsyncThunk(
  'jericho/updateActorMemory',
  async (updates, { rejectWithValue }) => {
    try {
      const { data } = await axios.put(endPoints.actorMemory, updates);
      return data?.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update actor memory');
    }
  }
);

/** Log a completed AI session */
export const logSession = createAsyncThunk(
  'jericho/logSession',
  async (sessionData, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.sessionLog, sessionData);
      return data?.data || data;
    } catch (err) {
      // Silently fail — session logging should never break the main flow
      console.warn('[Jericho] Session log failed:', err.message);
      return rejectWithValue(err.response?.data?.message || 'Failed to log session');
    }
  }
);

/** Update a session log with post-session feedback (mood, rating, notes) */
export const updateSessionLog = createAsyncThunk(
  'jericho/updateSessionLog',
  async ({ sessionId, ...updates }, { rejectWithValue }) => {
    try {
      const { data } = await axios.patch(`${endPoints.sessionLog}${sessionId}/`, updates);
      return data?.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update session');
    }
  }
);

/** Fetch coaching insights */
export const fetchInsights = createAsyncThunk(
  'jericho/fetchInsights',
  async (params = {}, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams(params).toString();
      const url = query ? `${endPoints.aiInsights}?${query}` : endPoints.aiInsights;
      const { data } = await axios.get(url);
      return data?.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch insights');
    }
  }
);

/** Fetch evolution metrics (improvement over time) */
export const fetchEvolution = createAsyncThunk(
  'jericho/fetchEvolution',
  async (params = {}, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams(params).toString();
      const url = query ? `${endPoints.aiEvolution}?${query}` : endPoints.aiEvolution;
      const { data } = await axios.get(url);
      return data?.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch evolution data');
    }
  }
);

/** Call Jericho's enriched coaching endpoint (replaces raw cd-feedback) */
export const jerichoCoach = createAsyncThunk(
  'jericho/coach',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.jerichoCoach, payload);
      return data?.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Coaching request failed');
    }
  }
);

/** Submit a self-tape for AI review (multipart upload → structured notes) */
export const reviewTape = createAsyncThunk(
  'jericho/reviewTape',
  async ({ video, sides = '', role = '', tone = '' }, { rejectWithValue }) => {
    try {
      const fd = new FormData();
      fd.append('video', video);
      if (sides) fd.append('sides', sides);
      if (role) fd.append('role', role);
      if (tone) fd.append('tone', tone);
      const { data } = await axios.post(endPoints.jerichoTapeReview, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        // Frame extraction + Whisper + Claude vision can take 30-60s; the
        // default instance timeout would abort a healthy analysis.
        timeout: 120000,
      });
      return data?.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Tape review failed');
    }
  }
);

/** Fetch recent session history */
export const fetchRecentSessions = createAsyncThunk(
  'jericho/fetchRecentSessions',
  async (limit = 20, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${endPoints.sessionLog}?limit=${limit}`);
      return data?.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch sessions');
    }
  }
);

// ─── Slice ─────────────────────────────────────────────────────────────

const jerichoSlice = createSlice({
  name: 'jericho',
  initialState: {
    // Actor's AI memory profile
    memory: null,
    memoryLoading: false,
    // True once the first fetch has settled (fulfilled OR rejected).
    // The dashboard needs this to distinguish "still loading" from
    // "fetch failed → keep memory=null" so it doesn't flash the empty
    // state on first paint or on a 401/403/network error.
    memoryHasFetched: false,
    memoryError: null,

    // Coaching insights derived from sessions
    insights: [],
    insightsLoading: false,

    // Evolution metrics over time
    evolution: [],
    evolutionLoading: false,

    // Recent session history
    recentSessions: [],
    sessionsLoading: false,

    // Active coaching state
    coachingLoading: false,
    lastCoachingResult: null,

    // Tape Review — submit a self-tape, get structured acting notes
    tapeReviewLoading: false,
    tapeReviewResult: null,
    tapeReviewError: null,

    // Last logged session ID (for attaching post-session feedback)
    lastSessionLogId: null,

    error: null,
  },
  reducers: {
    clearJerichoError: (state) => {
      state.error = null;
    },
    /** Optimistically append a session to recent list */
    appendLocalSession: (state, action) => {
      state.recentSessions.unshift(action.payload);
      if (state.recentSessions.length > 20) state.recentSessions.pop();
    },
    setLastSessionLogId: (state, action) => {
      state.lastSessionLogId = action.payload;
    },
    /** Reset the tape-review result (e.g. to analyze another take) */
    clearTapeReview: (state) => {
      state.tapeReviewResult = null;
      state.tapeReviewError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Actor Memory ──
      .addCase(fetchActorMemory.pending, (state) => {
        state.memoryLoading = true;
        state.memoryError = null;
      })
      .addCase(fetchActorMemory.fulfilled, (state, action) => {
        state.memoryLoading = false;
        state.memoryHasFetched = true;
        state.memoryError = null;
        state.memory = action.payload;
      })
      .addCase(fetchActorMemory.rejected, (state, action) => {
        state.memoryLoading = false;
        state.memoryHasFetched = true;
        state.memoryError = action.payload || 'Failed to load profile';
      })

      .addCase(updateActorMemory.fulfilled, (state, action) => {
        state.memory = { ...state.memory, ...action.payload };
      })

      // ── Session Logging ──
      .addCase(logSession.fulfilled, (state, action) => {
        state.lastSessionLogId = action.payload?.id || null;
        if (action.payload) {
          state.recentSessions.unshift(action.payload);
          if (state.recentSessions.length > 20) state.recentSessions.pop();
        }
        // Update memory session count locally
        if (state.memory) {
          state.memory.total_sessions = (state.memory.total_sessions || 0) + 1;
          state.memory.last_session_at = new Date().toISOString();
        }
      })

      .addCase(updateSessionLog.fulfilled, (state, action) => {
        if (action.payload?.id) {
          const idx = state.recentSessions.findIndex((s) => s.id === action.payload.id);
          if (idx !== -1) state.recentSessions[idx] = action.payload;
        }
      })

      // ── Insights ──
      .addCase(fetchInsights.pending, (state) => { state.insightsLoading = true; })
      .addCase(fetchInsights.fulfilled, (state, action) => {
        state.insightsLoading = false;
        state.insights = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchInsights.rejected, (state) => { state.insightsLoading = false; })

      // ── Evolution ──
      .addCase(fetchEvolution.pending, (state) => { state.evolutionLoading = true; })
      .addCase(fetchEvolution.fulfilled, (state, action) => {
        state.evolutionLoading = false;
        state.evolution = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchEvolution.rejected, (state) => { state.evolutionLoading = false; })

      // ── Jericho Coach ──
      .addCase(jerichoCoach.pending, (state) => { state.coachingLoading = true; })
      .addCase(jerichoCoach.fulfilled, (state, action) => {
        state.coachingLoading = false;
        state.lastCoachingResult = action.payload;
      })
      .addCase(jerichoCoach.rejected, (state, action) => {
        state.coachingLoading = false;
        state.error = action.payload;
      })

      // ── Tape Review ──
      .addCase(reviewTape.pending, (state) => {
        state.tapeReviewLoading = true;
        state.tapeReviewError = null;
      })
      .addCase(reviewTape.fulfilled, (state, action) => {
        state.tapeReviewLoading = false;
        state.tapeReviewResult = action.payload;
      })
      .addCase(reviewTape.rejected, (state, action) => {
        state.tapeReviewLoading = false;
        state.tapeReviewError = action.payload || 'Tape review failed';
      })

      // ── Recent Sessions ──
      .addCase(fetchRecentSessions.pending, (state) => { state.sessionsLoading = true; })
      .addCase(fetchRecentSessions.fulfilled, (state, action) => {
        state.sessionsLoading = false;
        state.recentSessions = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchRecentSessions.rejected, (state) => { state.sessionsLoading = false; });
  },
});

export const { clearJerichoError, appendLocalSession, setLastSessionLogId, clearTapeReview } = jerichoSlice.actions;
export default jerichoSlice.reducer;
