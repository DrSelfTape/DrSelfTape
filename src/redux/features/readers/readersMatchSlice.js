import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from '../../http';
import { baseURL } from '../../constant';

// ========== Thunks ==========

export const fetchAvailableReaders = createAsyncThunk(
  'readersMatch/fetchAvailableReaders',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${baseURL}/v1/matching/discover/`, { params });
      return data?.data || [];
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Failed to fetch readers'
      );
    }
  }
);

export const swipeOnReader = createAsyncThunk(
  'readersMatch/swipeOnReader',
  async ({ reader_id, action }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${baseURL}/v1/matching/swipe/`, {
        to_user_id: reader_id,
        direction: action,
      });
      try {
        const { trackEvent, Events } = await import('../../../utils/analytics');
        trackEvent(Events.SWIPE, { direction: action });
        // If the swipe resulted in a mutual match, fire match_created too.
        const matched = data?.data?.matched || data?.data?.is_match || data?.matched;
        if (matched) trackEvent(Events.MATCH, { match_id: data?.data?.match_id || data?.data?.id });
      } catch { /* swallow */ }
      return data?.data || data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Swipe failed'
      );
    }
  }
);

export const fetchMatches = createAsyncThunk(
  'readersMatch/fetchMatches',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${baseURL}/v1/matching/matches/`);
      return data?.data || [];
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Failed to fetch matches'
      );
    }
  }
);

export const fetchGreenRoomMessages = createAsyncThunk(
  'readersMatch/fetchGreenRoomMessages',
  async (matchId, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${baseURL}/v1/matching/messages/${matchId}/`);
      return { matchId, messages: data?.data || [] };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Failed to fetch messages'
      );
    }
  }
);

export const sendGreenRoomMessage = createAsyncThunk(
  'readersMatch/sendGreenRoomMessage',
  async ({ match_id, content }, { rejectWithValue }) => {
    try { const { trackEvent, Events } = await import('../../../utils/analytics'); trackEvent(Events.SEND_MESSAGE, { match_id, length: (content || '').length }); } catch { /* swallow */ }
    try {
      const { data } = await axios.post(`${baseURL}/v1/matching/messages/send/`, {
        match_id,
        content,
      });
      return data?.data || data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Failed to send message'
      );
    }
  }
);

export const fetchWhoWantsToRead = createAsyncThunk(
  'readersMatch/fetchWhoWantsToRead',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${baseURL}/v1/matching/likes/`);
      return data?.data || [];
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Failed to fetch likes'
      );
    }
  }
);

export const updateReaderProfile = createAsyncThunk(
  'readersMatch/updateReaderProfile',
  async (body, { rejectWithValue }) => {
    try {
      const { data } = await axios.patch(`${baseURL}/v1/readers/profile/`, body);
      return data?.data || data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Failed to update profile'
      );
    }
  }
);

export const fetchFavorites = createAsyncThunk(
  'readersMatch/fetchFavorites',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${baseURL}/v1/matching/favorites/`);
      return data?.data || [];
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to fetch favorites');
    }
  }
);

// Direct fetch fallback for the Reader Profile page. The page first checks
// local redux caches (swipe stack / matches / favorites); if the actor isn't
// there (page refresh, deep link, stale state) it falls back to this.
export const fetchReaderById = createAsyncThunk(
  'readersMatch/fetchReaderById',
  async (readerId, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${baseURL}/v1/matching/readers/${readerId}/`);
      return data?.data || null;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Failed to fetch reader'
      );
    }
  }
);

export const updateReaderFilters = createAsyncThunk(
  'readersMatch/updateReaderFilters',
  async (filters, { rejectWithValue }) => {
    try {
      const { data } = await axios.patch(`${baseURL}/v1/readers/filters/`, filters);
      return data?.data || filters;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Failed to update filters'
      );
    }
  }
);

export const fetchMatchingStats = createAsyncThunk(
  'readersMatch/fetchMatchingStats',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${baseURL}/v1/matching/stats/`);
      return data?.data || {};
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to fetch stats');
    }
  }
);

export const toggleAvailability = createAsyncThunk(
  'readersMatch/toggleAvailability',
  async (isAvailable, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${baseURL}/v1/matching/presence/`, { is_available: isAvailable });
      try { const { trackEvent, Events } = await import('../../../utils/analytics'); trackEvent(Events.GO_AVAILABLE, { available: !!isAvailable }); } catch { /* swallow */ }
      return { is_available: isAvailable, data: data?.data };
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to toggle availability');
    }
  }
);

export const fetchActivityFeed = createAsyncThunk(
  'readersMatch/fetchActivityFeed',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${baseURL}/v1/matching/activity/`);
      return data?.data || {};
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to fetch activity');
    }
  }
);

export const onboardReader = createAsyncThunk(
  'readersMatch/onboardReader',
  async (body, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${baseURL}/v1/matching/onboard/`, body);
      return data?.data || {};
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to onboard');
    }
  }
);

export const submitReaderRating = createAsyncThunk(
  'readersMatch/submitReaderRating',
  async ({ match_id, rating, review }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${baseURL}/v1/matching/rate/`, {
        match_id,
        rating,
        review,
      });
      return data?.data || data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Failed to submit rating'
      );
    }
  }
);

// ========== Slice ==========


const initialState = {
  readers: [],
  readersLoading: false,
  matches: [],
  matchesLoading: false,
  favorites: [],
  favoritesLoading: false,
  greenRoomMessages: {},
  messagesLoading: false,
  whoWantsToRead: [],
  likesLoading: false,
  onlineCount: 0,
  filters: {},
  error: null,
  matchingStats: { available_count: 0, pending_likes_count: 0, active_matches_count: 0 },
  isAvailable: false,
  availabilityToggling: false,
  activityFeed: null,
  // Cache for one-off profile fetches keyed by readerId.
  // Shape: { [id]: { data, loading, error } }
  readerById: {},
};

const readersMatchSlice = createSlice({
  name: 'readersMatch',
  initialState,
  reducers: {
    clearReadersMatchError: (state) => {
      state.error = null;
    },
    setFiltersLocal: (state, action) => {
      state.filters = action.payload;
    },
    appendMessage: (state, action) => {
      const msg = action.payload;
      const key = msg?.matchId || msg?.match_id;
      if (key == null) return;
      if (!Array.isArray(state.greenRoomMessages[key])) {
        state.greenRoomMessages[key] = [];
      }
      state.greenRoomMessages[key].push(msg);
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAvailableReaders
      .addCase(fetchAvailableReaders.pending, (state) => {
        state.readersLoading = true;
        state.error = null;
      })
      .addCase(fetchAvailableReaders.fulfilled, (state, action) => {
        state.readersLoading = false;
        state.readers = action.payload || [];
      })
      .addCase(fetchAvailableReaders.rejected, (state) => {
        state.readersLoading = false;
      })

      // swipeOnReader
      .addCase(swipeOnReader.pending, (state) => {
        state.error = null;
      })
      .addCase(swipeOnReader.fulfilled, (state) => {
        // handled in component
      })
      .addCase(swipeOnReader.rejected, (state, action) => {
        state.error = action.payload;
      })

      // fetchMatches
      .addCase(fetchMatches.pending, (state) => {
        state.matchesLoading = true;
        state.error = null;
      })
      .addCase(fetchMatches.fulfilled, (state, action) => {
        state.matchesLoading = false;
        state.matches = action.payload || [];
      })
      .addCase(fetchMatches.rejected, (state) => {
        state.matchesLoading = false;
      })

      // fetchGreenRoomMessages
      .addCase(fetchGreenRoomMessages.pending, (state) => {
        state.messagesLoading = true;
        state.error = null;
      })
      .addCase(fetchGreenRoomMessages.fulfilled, (state, action) => {
        state.messagesLoading = false;
        const { matchId, messages } = action.payload;
        if (matchId) {
          state.greenRoomMessages[matchId] = messages;
        }
      })
      .addCase(fetchGreenRoomMessages.rejected, (state, action) => {
        state.messagesLoading = false;
        state.error = action.payload;
      })

      // sendGreenRoomMessage
      .addCase(sendGreenRoomMessage.pending, (state) => {
        state.error = null;
      })
      .addCase(sendGreenRoomMessage.fulfilled, (state, action) => {
        const msg = action.payload;
        // BE may return match_id (snake_case) or matchId (camel) — accept
        // both shapes so persisted messages always land in the right bucket.
        const key = msg?.matchId || msg?.match_id;
        if (key) {
          if (!Array.isArray(state.greenRoomMessages[key])) {
            state.greenRoomMessages[key] = [];
          }
          state.greenRoomMessages[key].push(msg);
        }
      })
      .addCase(sendGreenRoomMessage.rejected, (state, action) => {
        state.error = action.payload;
      })

      // fetchWhoWantsToRead
      .addCase(fetchWhoWantsToRead.pending, (state) => {
        state.likesLoading = true;
        state.error = null;
      })
      .addCase(fetchWhoWantsToRead.fulfilled, (state, action) => {
        state.likesLoading = false;
        state.whoWantsToRead = action.payload;
      })
      .addCase(fetchWhoWantsToRead.rejected, (state, action) => {
        state.likesLoading = false;
        state.error = action.payload;
      })

      // fetchFavorites
      .addCase(fetchFavorites.pending, (state) => { state.favoritesLoading = true; })
      .addCase(fetchFavorites.fulfilled, (state, action) => {
        state.favoritesLoading = false;
        state.favorites = action.payload;
      })
      .addCase(fetchFavorites.rejected, (state) => { state.favoritesLoading = false; })

      // fetchReaderById — direct profile fetch fallback
      .addCase(fetchReaderById.pending, (state, action) => {
        const id = String(action.meta.arg);
        state.readerById[id] = { ...(state.readerById[id] || {}), loading: true, error: null };
      })
      .addCase(fetchReaderById.fulfilled, (state, action) => {
        const id = String(action.meta.arg);
        state.readerById[id] = { data: action.payload, loading: false, error: null };
      })
      .addCase(fetchReaderById.rejected, (state, action) => {
        const id = String(action.meta.arg);
        state.readerById[id] = { ...(state.readerById[id] || {}), loading: false, error: action.payload };
      })

      // updateReaderProfile
      .addCase(updateReaderProfile.rejected, (state, action) => {
        state.error = action.payload;
      })

      // updateReaderFilters
      .addCase(updateReaderFilters.fulfilled, (state, action) => {
        state.filters = action.payload;
      })
      .addCase(updateReaderFilters.rejected, (state, action) => {
        state.error = action.payload;
      })

      // fetchMatchingStats
      .addCase(fetchMatchingStats.fulfilled, (state, action) => {
        state.matchingStats = action.payload;
      })

      // toggleAvailability
      .addCase(toggleAvailability.pending, (state) => {
        state.availabilityToggling = true;
      })
      .addCase(toggleAvailability.fulfilled, (state, action) => {
        state.availabilityToggling = false;
        state.isAvailable = action.payload.is_available;
      })
      .addCase(toggleAvailability.rejected, (state) => {
        state.availabilityToggling = false;
      })

      // fetchActivityFeed
      .addCase(fetchActivityFeed.fulfilled, (state, action) => {
        state.activityFeed = action.payload;
      })

      // onboardReader
      .addCase(onboardReader.fulfilled, (state) => {
        state.isAvailable = true;
      });
  },
});

export const { clearReadersMatchError, setFiltersLocal, appendMessage } =
  readersMatchSlice.actions;

export default readersMatchSlice.reducer;
