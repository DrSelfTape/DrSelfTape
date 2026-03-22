import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from '../../http';
import endPoints from '../../constant';

// Initial state
const initialState = {
  readers: [],
  coachInvites: {},
  outgoingShares: [],
  // Separate loading states for each function
  getReadersLoading: false,
  getReadersError: null,
  getCoachInvitesLoading: false,
  getCoachInvitesError: null,
  acceptShareLoading: false,
  rejectShareLoading: false,
  respondToShareError: null,
  inviteCoachLoading: false,
  inviteCoachError: null,
  cancelShareLoading: false,
  cancelShareError: null,
  getOutgoingSharesLoading: false,
  getOutgoingSharesError: null,
};

// Utility for consistent error handling
const handleApiError = (error) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    'An unexpected error occurred'
  );
};

// ========== Thunks ==========

// Get all coaches
export const getReaders = createAsyncThunk(
  'coaches/getAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(endPoints.coaches, { params });
      return data?.data?.coaches || [];
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// ========== Reader-side Thunks ==========

// Get ScriptShare invites for the current coach
export const getCoachInvites = createAsyncThunk(
  'readers/getCoachInvites',
  async (_, { rejectWithValue }) => {
    try {
      const url = `${endPoints.scriptAnalysis}/coach/invites/`;
      const { data } = await axios.get(url);
      return data?.data || {};
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Respond to a ScriptShare (accept/reject)
export const respondToShare = createAsyncThunk(
  'readers/respondToShare',
  async ({ shareId, status }, { rejectWithValue }) => {
    try {
      const url = `${endPoints.scriptAnalysis}/shares/${shareId}/respond/`;
      const { data } = await axios.post(url, { status });
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// ========== Actor-side Thunks ==========

// Actor invites a Coach to a script
export const inviteCoach = createAsyncThunk(
  'coaches/inviteCoach',
  async ({ scriptId, coachId, role = 'viewer' }, { rejectWithValue }) => {
    try {
      const url = `${endPoints.scriptAnalysis}/scripts/${scriptId}/shares/invite`;
      const { data } = await axios.post(url, { coach_id: coachId, role });
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Actor cancels a pending ScriptShare
export const cancelShare = createAsyncThunk(
  'coaches/cancelShare',
  async (shareId, { rejectWithValue }) => {
    try {
      const url = `${endPoints.scriptAnalysis}/shares/${shareId}/cancel`;
      const { data } = await axios.post(url);
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Get all outgoing ScriptShare invites by actor
export const getOutgoingShares = createAsyncThunk(
  'coaches/getOutgoingShares',
  async (_, { rejectWithValue }) => {
    try {
      const url = `${endPoints.scriptAnalysis}/shares/outgoing/`;
      const { data } = await axios.get(url);
      return data?.data || [];
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// ========== Slice ==========
export const readersSlice = createSlice({
  name: 'readers',
  initialState,
  reducers: {
    clearCoachesError: (state) => {
      state.getReadersError = null;
      state.getCoachInvitesError = null;
      state.respondToShareError = null;
      state.inviteCoachError = null;
      state.cancelShareError = null;
      state.getOutgoingSharesError = null;
    },
    clearGetReadersError: (state) => {
      state.getReadersError = null;
    },
    clearGetCoachInvitesError: (state) => {
      state.getCoachInvitesError = null;
    },
    clearRespondToShareError: (state) => {
      state.respondToShareError = null;
    },
    clearInviteCoachError: (state) => {
      state.inviteCoachError = null;
    },
    clearCancelShareError: (state) => {
      state.cancelShareError = null;
    },
    clearGetOutgoingSharesError: (state) => {
      state.getOutgoingSharesError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ========== getReaders ==========
      .addCase(getReaders.pending, (state) => {
        state.getReadersLoading = true;
        state.getReadersError = null;
      })
      .addCase(getReaders.fulfilled, (state, action) => {
        state.getReadersLoading = false;
        state.readers = action.payload;
      })
      .addCase(getReaders.rejected, (state, action) => {
        state.getReadersLoading = false;
        state.getReadersError = action.payload;
      })

      // ========== getCoachInvites ==========
      .addCase(getCoachInvites.pending, (state) => {
        state.getCoachInvitesLoading = true;
        state.getCoachInvitesError = null;
      })
      .addCase(getCoachInvites.fulfilled, (state, action) => {
        state.getCoachInvitesLoading = false;
        state.coachInvites = action.payload;
      })
      .addCase(getCoachInvites.rejected, (state, action) => {
        state.getCoachInvitesLoading = false;
        state.getCoachInvitesError = action.payload;
      })

      // ========== respondToShare ==========
      .addCase(respondToShare.pending, (state, action) => {
        const status = action.meta?.arg?.status;
        if (status === 'accepted') state.acceptShareLoading = true;
        if (status === 'rejected') state.rejectShareLoading = true;
        state.respondToShareError = null;
      })
      .addCase(respondToShare.fulfilled, (state, action) => {
        const status = action.meta?.arg?.status;
        if (status === 'accepted') state.acceptShareLoading = false;
        if (status === 'rejected') state.rejectShareLoading = false;
      })
      .addCase(respondToShare.rejected, (state, action) => {
        const status = action.meta?.arg?.status;
        if (status === 'accepted') state.acceptShareLoading = false;
        if (status === 'rejected') state.rejectShareLoading = false;
        state.respondToShareError = action.payload;
      })

      // ========== inviteCoach ==========
      .addCase(inviteCoach.pending, (state) => {
        state.inviteCoachLoading = true;
        state.inviteCoachError = null;
      })
      .addCase(inviteCoach.fulfilled, (state) => {
        state.inviteCoachLoading = false;
      })
      .addCase(inviteCoach.rejected, (state, action) => {
        state.inviteCoachLoading = false;
        state.inviteCoachError = action.payload;
      })

      // ========== cancelShare ==========
      .addCase(cancelShare.pending, (state) => {
        state.cancelShareLoading = true;
        state.cancelShareError = null;
      })
      .addCase(cancelShare.fulfilled, (state) => {
        state.cancelShareLoading = false;
      })
      .addCase(cancelShare.rejected, (state, action) => {
        state.cancelShareLoading = false;
        state.cancelShareError = action.payload;
      })

      // ========== getOutgoingShares ==========
      .addCase(getOutgoingShares.pending, (state) => {
        state.getOutgoingSharesLoading = true;
        state.getOutgoingSharesError = null;
      })
      .addCase(getOutgoingShares.fulfilled, (state, action) => {
        state.getOutgoingSharesLoading = false;
        state.outgoingShares = action.payload;
      })
      .addCase(getOutgoingShares.rejected, (state, action) => {
        state.getOutgoingSharesLoading = false;
        state.getOutgoingSharesError = action.payload;
      });
  },
});

export const { clearCoachesError, clearGetReadersError, clearGetCoachInvitesError, clearRespondToShareError, clearInviteCoachError, clearCancelShareError, clearGetOutgoingSharesError } = readersSlice.actions;

export default readersSlice.reducer;
