import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../http';
import endPoints from '../../constant';

// --- Async Thunks ---

export const fetchSubmissionsThunk = createAsyncThunk(
  'submissions/fetchSubmissions',
  async (params, { rejectWithValue }) => {
    try {
      const query = params?.status ? `?status=${params.status}` : '';
      const { data } = await axios.get(`${endPoints.submissions}${query}`);
      return data?.data || data?.results || data;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to load submissions.');
    }
  }
);

export const createSubmissionThunk = createAsyncThunk(
  'submissions/createSubmission',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.submissions, payload);
      return data?.data || data;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to create submission.');
    }
  }
);

export const updateSubmissionThunk = createAsyncThunk(
  'submissions/updateSubmission',
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const { data } = await axios.patch(`${endPoints.submissions}${id}/`, payload);
      return data?.data || data;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to update submission.');
    }
  }
);

export const deleteSubmissionThunk = createAsyncThunk(
  'submissions/deleteSubmission',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${endPoints.submissions}${id}/`);
      return id;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to delete submission.');
    }
  }
);

export const promoteToAuditionThunk = createAsyncThunk(
  'submissions/promoteToAudition',
  async ({ id, audition_date }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${endPoints.submissions}${id}/promote/`, { audition_date });
      return { id, ...(data?.data || data) };
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to promote to audition.');
    }
  }
);

export const parseTalentReportThunk = createAsyncThunk(
  'submissions/parseTalentReport',
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await axios.post(`${endPoints.auditions}parse-talent-report/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data?.data || data;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to parse report.');
    }
  }
);

export const importSubmissionsThunk = createAsyncThunk(
  'submissions/importSubmissions',
  async (submissions, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${endPoints.auditions}import-submissions/`, { submissions });
      return data?.data || data;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to import submissions.');
    }
  }
);

// --- Slice ---

const initialState = {
  submissions: [],
  loading: false,
  createLoading: false,
  error: null,
  parseLoading: false,
  parsedReport: null,
  importLoading: false,
};

const submissionsSlice = createSlice({
  name: 'submissions',
  initialState,
  reducers: {
    clearSubmissionsError: (state) => { state.error = null; },
    clearParsedReport: (state) => { state.parsedReport = null; },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchSubmissionsThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchSubmissionsThunk.fulfilled, (state, action) => { state.loading = false; state.submissions = action.payload; })
      .addCase(fetchSubmissionsThunk.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      // Create
      .addCase(createSubmissionThunk.pending, (state) => { state.createLoading = true; state.error = null; })
      .addCase(createSubmissionThunk.fulfilled, (state, action) => { state.createLoading = false; state.submissions = [action.payload, ...state.submissions]; })
      .addCase(createSubmissionThunk.rejected, (state, action) => { state.createLoading = false; state.error = action.payload; })
      // Update
      .addCase(updateSubmissionThunk.fulfilled, (state, action) => {
        const idx = state.submissions.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) state.submissions[idx] = action.payload;
      })
      // Delete
      .addCase(deleteSubmissionThunk.fulfilled, (state, action) => {
        state.submissions = state.submissions.filter((s) => s.id !== action.payload);
      })
      // Promote to audition — update submission status in place
      .addCase(promoteToAuditionThunk.fulfilled, (state, action) => {
        const idx = state.submissions.findIndex(s => s.id === action.payload.id);
        if (idx !== -1) state.submissions[idx] = { ...state.submissions[idx], status: 'viewed', promoted: true };
      })
      // Parse talent report
      .addCase(parseTalentReportThunk.pending, (state) => { state.parseLoading = true; state.parsedReport = null; state.error = null; })
      .addCase(parseTalentReportThunk.fulfilled, (state, action) => { state.parseLoading = false; state.parsedReport = action.payload; })
      .addCase(parseTalentReportThunk.rejected, (state, action) => { state.parseLoading = false; state.error = action.payload; })
      // Import
      .addCase(importSubmissionsThunk.pending, (state) => { state.importLoading = true; })
      .addCase(importSubmissionsThunk.fulfilled, (state) => { state.importLoading = false; state.parsedReport = null; })
      .addCase(importSubmissionsThunk.rejected, (state, action) => { state.importLoading = false; state.error = action.payload; });
  },
});

export const { clearSubmissionsError, clearParsedReport } = submissionsSlice.actions;
export default submissionsSlice.reducer;
