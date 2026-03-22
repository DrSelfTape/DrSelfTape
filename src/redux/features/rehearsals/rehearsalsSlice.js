/**
 * src/redux/features/rehearsals/rehearsalsSlice.js
 *
 * Added thunks:
 *  - joinRoomThunk  (POST /rehearsals/{id}/join/)
 *  - leaveRoomThunk (POST /rehearsals/{id}/leave/)
 *  - fetchRoomTokenThunk (POST /rehearsals/{id}/token/)
 *  - fetchRoomThunk (GET /rehearsals/{id}/)
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import http from '../../http';
import endPoints from '../../constant';

/* ═══════════════════════════════════════════════════
   THUNKS
   ═══════════════════════════════════════════════════ */

/** Fetch all rooms */
export const fetchRoomsThunk = createAsyncThunk(
  'rehearsals/fetchRooms',
  async (_, { rejectWithValue }) => {
    try {
      const res = await http.get(endPoints.rehearsals);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Fetch single room by id */
export const fetchRoomThunk = createAsyncThunk(
  'rehearsals/fetchRoom',
  async (id, { rejectWithValue }) => {
    try {
      const res = await http.get(`${endPoints.rehearsals}${id}/`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Create a new room */
export const createRoomThunk = createAsyncThunk(
  'rehearsals/createRoom',
  async (formData, { rejectWithValue }) => {
    try {
      const res = await http.post(endPoints.rehearsals, formData);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Join a room */
export const joinRoomThunk = createAsyncThunk(
  'rehearsals/joinRoom',
  async (id, { rejectWithValue }) => {
    try {
      const res = await http.post(`${endPoints.rehearsals}${id}/join/`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Leave a room */
export const leaveRoomThunk = createAsyncThunk(
  'rehearsals/leaveRoom',
  async (id, { rejectWithValue }) => {
    try {
      const res = await http.post(`${endPoints.rehearsals}${id}/leave/`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Get Daily.co meeting token */
export const fetchRoomTokenThunk = createAsyncThunk(
  'rehearsals/fetchToken',
  async (id, { rejectWithValue }) => {
    try {
      const res = await http.post(`${endPoints.rehearsals}${id}/token/`);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Start cloud recording */
export const startRecordingThunk = createAsyncThunk(
  'rehearsals/startRecording',
  async (id, { rejectWithValue }) => {
    try {
      const res = await http.post(`${endPoints.rehearsals}${id}/recording/start/`);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Stop cloud recording */
export const stopRecordingThunk = createAsyncThunk(
  'rehearsals/stopRecording',
  async (id, { rejectWithValue }) => {
    try {
      const res = await http.post(`${endPoints.rehearsals}${id}/recording/stop/`);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** List recordings for a room */
export const fetchRecordingsThunk = createAsyncThunk(
  'rehearsals/fetchRecordings',
  async (id, { rejectWithValue }) => {
    try {
      const res = await http.get(`${endPoints.rehearsals}${id}/recordings/`);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Get access link for a recording */
export const fetchRecordingLinkThunk = createAsyncThunk(
  'rehearsals/fetchRecordingLink',
  async ({ roomId, recordingId }, { rejectWithValue }) => {
    try {
      const res = await http.get(`${endPoints.rehearsals}${roomId}/recordings/${recordingId}/link/`);
      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ═══════════════════════════════════════════════════
   SLICE
   ═══════════════════════════════════════════════════ */

const rehearsalsSlice = createSlice({
  name: 'rehearsals',
  initialState: {
    rooms: [],
    currentRoom: null,
    loading: false,
    error: null,
    // Recording
    isRecording: false,
    recordings: [],
    recordingLoading: false,
  },
  reducers: {
    clearCurrentRoom: (state) => {
      state.currentRoom = null;
    },
    setIsRecording: (state, action) => {
      state.isRecording = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch all rooms
    builder
      .addCase(fetchRoomsThunk.pending, (state) => { state.loading = true; })
      .addCase(fetchRoomsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.rooms = action.payload?.data || action.payload || [];
      })
      .addCase(fetchRoomsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch single room
    builder
      .addCase(fetchRoomThunk.pending, (state) => { state.loading = true; })
      .addCase(fetchRoomThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRoom = action.payload?.data || action.payload;
      })
      .addCase(fetchRoomThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Create room
    builder
      .addCase(createRoomThunk.fulfilled, (state, action) => {
        const room = action.payload?.data || action.payload;
        if (room?.id) state.rooms = [room, ...state.rooms];
      });

    // Join — update current room with fresh data
    builder
      .addCase(joinRoomThunk.fulfilled, (state, action) => {
        const updated = action.payload?.data;
        if (updated) state.currentRoom = updated;
      });

    // Leave — clear current room
    builder
      .addCase(leaveRoomThunk.fulfilled, (state) => {
        state.currentRoom = null;
      });

    // Start recording
    builder
      .addCase(startRecordingThunk.pending, (state) => { state.recordingLoading = true; })
      .addCase(startRecordingThunk.fulfilled, (state) => {
        state.recordingLoading = false;
        state.isRecording = true;
      })
      .addCase(startRecordingThunk.rejected, (state) => { state.recordingLoading = false; });

    // Stop recording
    builder
      .addCase(stopRecordingThunk.pending, (state) => { state.recordingLoading = true; })
      .addCase(stopRecordingThunk.fulfilled, (state) => {
        state.recordingLoading = false;
        state.isRecording = false;
      })
      .addCase(stopRecordingThunk.rejected, (state) => { state.recordingLoading = false; });

    // Fetch recordings
    builder
      .addCase(fetchRecordingsThunk.fulfilled, (state, action) => {
        state.recordings = action.payload?.recordings || [];
        state.isRecording = action.payload?.is_recording ?? state.isRecording;
      });
  },
});

export const { clearCurrentRoom, setIsRecording } = rehearsalsSlice.actions;
export default rehearsalsSlice.reducer;
