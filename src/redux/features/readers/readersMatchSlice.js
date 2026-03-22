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

// ─── Mock seed data (shown when API isn't connected) ───────────────────────
const MOCK_READERS = [
  {
    id: 1,
    name: 'Maya Chen',
    experience: '8 years · Working Actor',
    bio: 'SAG-AFTRA actress based in LA. Love drama and indie films. Happy to read opposite or take scenes. Looking for serious scene partners.',
    genres: ['Drama', 'Thriller', 'Indie'],
    unionStatus: 'SAG-AFTRA',
    isAvailable: true,
    headshotUrl: null,
    match_score: 94,
  },
  {
    id: 2,
    name: 'Jordan Rivers',
    experience: '3 years · Emerging Actor',
    bio: 'Comedy and commercial actor. Trained at UCB and Groundlings. Great for comedic scenes, sitcom sides, or anything light and fun.',
    genres: ['Comedy', 'Commercial', 'Sitcom'],
    unionStatus: 'Non-Union',
    isAvailable: true,
    headshotUrl: null,
    match_score: 88,
  },
  {
    id: 3,
    name: 'Dominique Pierce',
    experience: '12 years · Veteran Actor',
    bio: 'Theater background, moved into film and TV. Specializes in heavy dramatic material — Shakespeare, O\'Neill, prestige drama. Stage combat certified.',
    genres: ['Drama', 'Theater', 'Period'],
    unionStatus: 'SAG-AFTRA',
    isAvailable: false,
    headshotUrl: null,
    match_score: 91,
  },
  {
    id: 4,
    name: 'Alex Torres',
    experience: '5 years · Mid-Career',
    bio: 'Versatile reader available for any genre. Bilingual (English/Spanish). Love helping actors prep for auditions — no ego, just good work.',
    genres: ['Drama', 'Comedy', 'Horror'],
    unionStatus: 'Non-Union',
    isAvailable: true,
    headshotUrl: null,
    match_score: 85,
  },
  {
    id: 5,
    name: 'Simone Adeyemi',
    experience: '6 years · Working Actor',
    bio: 'Voice actor and on-camera actress. Excellent for voiceover sides, animation callbacks, and anything with strong character work.',
    genres: ['Voiceover', 'Animation', 'Drama'],
    unionStatus: 'SAG-AFTRA',
    isAvailable: true,
    headshotUrl: null,
    match_score: 79,
  },
];

const MOCK_MATCHES = [
  {
    id: 101,
    reader: {
      id: 2,
      name: 'Jordan Rivers',
      isAvailable: true,
      headshotUrl: null,
    },
    lastMessage: 'Hey! Excited to run lines with you 🎬',
    lastMessageTime: '2m ago',
    unread: true,
  },
];

const MOCK_GREEN_ROOM_MESSAGES = {
  101: [
    {
      id: 1,
      matchId: 101,
      senderId: 2,
      senderName: 'Jordan Rivers',
      text: 'Hey! Just saw we matched — so excited to read with you!',
      timestamp: '11:32 AM',
      isMine: false,
    },
    {
      id: 2,
      matchId: 101,
      senderId: 2,
      senderName: 'Jordan Rivers',
      text: 'What sides are you working on? I can do comedy, drama, whatever you need 🎭',
      timestamp: '11:33 AM',
      isMine: false,
    },
  ],
};

const MOCK_WHO_WANTS_TO_READ = [
  {
    id: 3,
    name: 'Dominique Pierce',
    experience: 'Veteran Actor',
    genres: ['Drama', 'Theater'],
    isAvailable: false,
    headshotUrl: null,
  },
  {
    id: 5,
    name: 'Simone Adeyemi',
    experience: 'Working Actor',
    genres: ['Voiceover', 'Drama'],
    isAvailable: true,
    headshotUrl: null,
  },
];
// ────────────────────────────────────────────────────────────────────────────

const initialState = {
  readers: MOCK_READERS,
  readersLoading: false,
  matches: MOCK_MATCHES,
  matchesLoading: false,
  greenRoomMessages: MOCK_GREEN_ROOM_MESSAGES,
  messagesLoading: false,
  whoWantsToRead: MOCK_WHO_WANTS_TO_READ,
  likesLoading: false,
  onlineCount: 12,
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
      const msg = action.payload;
      const key = msg.matchId;
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
        // Only replace mock data if API returned real results
        if (action.payload && action.payload.length > 0) {
          state.readers = action.payload;
        }
      })
      .addCase(fetchAvailableReaders.rejected, (state) => {
        state.readersLoading = false;
        // Keep mock data on error
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
        if (action.payload && action.payload.length > 0) {
          state.matches = action.payload;
        }
      })
      .addCase(fetchMatches.rejected, (state) => {
        state.matchesLoading = false;
        // Keep mock data on error
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
        const msg = action.payload;
        if (msg?.matchId) {
          if (!Array.isArray(state.greenRoomMessages[msg.matchId])) {
            state.greenRoomMessages[msg.matchId] = [];
          }
          state.greenRoomMessages[msg.matchId].push(msg);
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
