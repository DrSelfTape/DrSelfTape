import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from '../../http';
import { baseURL } from '../../constant';

// ========== Thunks ==========

export const fetchAvailableReaders = createAsyncThunk(
  'readersMatch/fetchAvailableReaders',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${baseURL}/v1/readers/available/`, { params });
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
      const { data } = await axios.post(`${baseURL}/v1/readers/swipe/`, {
        reader_id,
        action,
      });
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
      const { data } = await axios.get(`${baseURL}/v1/readers/matches/`);
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
      const { data } = await axios.get(`${baseURL}/v1/readers/messages/${matchId}`);
      return data?.data || [];
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
    try {
      const { data } = await axios.post(`${baseURL}/v1/readers/messages/send/`, {
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
      const { data } = await axios.get(`${baseURL}/v1/readers/likes/`);
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

// ========== Slice ==========

const initialState = {
  readers: [],
  readersLoading: false,
  matches: [],
  matchesLoading: false,
  greenRoomMessages: [],
  messagesLoading: false,
  whoWantsToRead: [],
  likesLoading: false,
  filters: {},
  error: null,
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
      state.greenRoomMessages.push(action.payload);
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
        state.readers = action.payload;
      })
      .addCase(fetchAvailableReaders.rejected, (state, action) => {
        state.readersLoading = false;
        state.error = action.payload;
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
        state.matches = action.payload;
      })
      .addCase(fetchMatches.rejected, (state, action) => {
        state.matchesLoading = false;
        state.error = action.payload;
      })

      // fetchGreenRoomMessages
      .addCase(fetchGreenRoomMessages.pending, (state) => {
        state.messagesLoading = true;
        state.error = null;
      })
      .addCase(fetchGreenRoomMessages.fulfilled, (state, action) => {
        state.messagesLoading = false;
        state.greenRoomMessages = action.payload;
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
        state.greenRoomMessages.push(action.payload);
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
      });
  },
});

export const { clearReadersMatchError, setFiltersLocal, appendMessage } =
  readersMatchSlice.actions;

export default readersMatchSlice.reducer;
