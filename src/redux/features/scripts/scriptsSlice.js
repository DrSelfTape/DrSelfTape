import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from '../../http';
import endPoints from '../../constant';

const initialState = {
  scripts: [],
  loading: false,
  createLoading: false,
  error: null,
};

export const fetchScriptsThunk = createAsyncThunk(
  'scripts/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(endPoints.auditionScripts);
      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || 'Failed to fetch scripts.'
      );
    }
  }
);

export const createScriptThunk = createAsyncThunk(
  'scripts/create',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.auditionScripts, payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || 'Failed to create script.'
      );
    }
  }
);

export const deleteScriptThunk = createAsyncThunk(
  'scripts/delete',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${endPoints.auditionScripts}${id}/`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || 'Failed to delete script.'
      );
    }
  }
);

const scriptsSlice = createSlice({
  name: 'scripts',
  initialState,
  reducers: {
    clearScriptsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchScriptsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchScriptsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.scripts = action.payload?.data || action.payload || [];
      })
      .addCase(fetchScriptsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createScriptThunk.pending, (state) => {
        state.createLoading = true;
        state.error = null;
      })
      .addCase(createScriptThunk.fulfilled, (state, action) => {
        state.createLoading = false;
        const script = action.payload?.data || action.payload;
        state.scripts.unshift(script);
      })
      .addCase(createScriptThunk.rejected, (state, action) => {
        state.createLoading = false;
        state.error = action.payload;
      })
      // Delete
      .addCase(deleteScriptThunk.pending, (state) => {
        state.error = null;
      })
      .addCase(deleteScriptThunk.fulfilled, (state, action) => {
        state.scripts = state.scripts.filter((s) => s.id !== action.payload);
      })
      .addCase(deleteScriptThunk.rejected, (state, action) => {
        // Surface delete failures instead of leaving the card stuck in its
        // confirm state with no feedback (the "delete does nothing" report).
        state.error = action.payload || 'Failed to delete script.';
      });
  },
});

export const { clearScriptsError } = scriptsSlice.actions;
export default scriptsSlice.reducer;
