// Library Imports
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

// Local Imports
import axios from '../../http';
import endPoints from '../../constant';

const initialState = {
  auditions: [],
  currentAudition: null,
  loading: false,
  deleteLoading: false,
  error: null,
  totalCount: 0,
};

const handleApiError = (error) => {
  const message =
    error?.response?.data?.message ||
    error?.message ||
    'An unexpected error occurred';
  return message;
};

export const createCastingAudition = createAsyncThunk(
  'castingAuditions/create',
  async (values, { rejectWithValue }) => {
    try {
      const formData = new FormData();

      // Append form fields
      Object.keys(values).forEach((key) => {
        if (key === 'attachments' && values[key]) {
          formData.append('attachments', values[key]);
        } else {
          formData.append(key, values[key]);
        }
      });

      const { data } = await axios.post(endPoints.castingAuditions, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Get Casting Auditions API Function
export const getCastingAuditions = createAsyncThunk(
  'castingAuditions/getAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(endPoints.castingAuditions, { params });
      return data?.data?.map((audition) => ({
        title: audition?.title,
        status: audition?.state,
        role_info: audition?.role_info,
        deadline: audition?.deadline,
        ...audition,
      }));
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Update Casting Audition API Function
export const updateCastingAudition = createAsyncThunk(
  'castingAuditions/update',
  async ({ id, values }, { rejectWithValue }) => {
    try {
      const { data } = await axios.put(
        `${endPoints.castingAuditions}${id}/`,
        values
      );
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Delete Casting Audition API Function
export const deleteCastingAudition = createAsyncThunk(
  'castingAuditions/delete',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${endPoints.castingAuditions}${id}/`);
      return id;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Reducers
export const castingAuditionsSlice = createSlice({
  name: 'castingAuditions',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentAudition: (state, action) => {
      state.currentAudition = action.payload;
    },
    clearCurrentAudition: (state) => {
      state.currentAudition = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Casting Audition
      .addCase(createCastingAudition.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCastingAudition.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(createCastingAudition.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get Casting Auditions
      .addCase(getCastingAuditions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCastingAuditions.fulfilled, (state, action) => {
        state.loading = false;
        state.auditions = action.payload?.results || action.payload || [];
        state.error = null;
      })
      .addCase(getCastingAuditions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update Casting Audition
      .addCase(updateCastingAudition.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCastingAudition.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(updateCastingAudition.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete Casting Audition
      .addCase(deleteCastingAudition.pending, (state) => {
        state.deleteLoading = true;
        state.error = null;
      })
      .addCase(deleteCastingAudition.fulfilled, (state, action) => {
        state.deleteLoading = false;
        state.error = null;
      })
      .addCase(deleteCastingAudition.rejected, (state, action) => {
        state.deleteLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, setCurrentAudition, clearCurrentAudition } =
  castingAuditionsSlice.actions;

export default castingAuditionsSlice.reducer;
