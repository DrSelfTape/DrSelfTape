import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from '../../http';
import endPoints from '../../constant';

const initialState = {
  auditions: [],
  castingAuditions: {
    open: [],
    closed: [],
    completed: [],
  },
  currentAudition: null,
  loading: false,
  deleteLoading: false,
  calanderView: [],
  calanderViewLoading: false,
  calanderViewError: null,
  error: null,
  totalCount: 0,
  materialError: null,
  materialLoading: false,
  materials: [],
};

const handleApiError = (error) => {
  const message =
    error?.response?.data?.message ||
    error?.message ||
    'An unexpected error occurred';
  return message;
};

export const createActorAudition = createAsyncThunk(
  'actorAuditions/create',
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.selfAudition, formData);

      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const addActorAuditionMaterial = createAsyncThunk(
  'actorAuditions/addMaterial',
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.auditionMaterial, formData);

      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const getActorAuditions = createAsyncThunk(
  'actorAuditions/getAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(endPoints.selfAudition, { params });
      return data?.data?.map((audition) => ({
        title: audition?.title,
        description: audition?.description,
        purpose: audition?.purpose,
        status: audition?.status,
        ...audition,
      }));
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const getActorAuditionsCalander = createAsyncThunk(
  'actorAuditions/calanderView',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(endPoints.selfAudition, { params });
      return data?.data?.map((audition) => ({
        title: audition?.title,
        description: audition?.description,
        purpose: audition?.purpose,
        status: audition?.status,
        ...audition,
      }));
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const getActorAuditionsMaterialListing = createAsyncThunk(
  'actorAuditions/getmaterial',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(endPoints.getAuditionMaterial, { params });
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const getActorCastingAuditions = createAsyncThunk(
  'actorAuditions/getCastingAuditions',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(endPoints.actorCastingAuditions, {
        params,
      });
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const updateActorAudition = createAsyncThunk(
  'actorAuditions/update',
  async ({ id, values }, { rejectWithValue }) => {
    try {
      const { data } = await axios.put(
        `${endPoints.selfAudition}${id}/`,
        values
      );
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const deleteActorAudition = createAsyncThunk(
  'actorAuditions/delete',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${endPoints.selfAudition}${id}/`);
      return id;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const deleteActorAuditionMaterial = createAsyncThunk(
  'actorAuditions/deleteMaterial',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${endPoints.auditionMaterial}${id}/`);
      return id;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const actorAuditionsSlice = createSlice({
  name: 'actorAuditions',
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
      // Create Actor Audition
      .addCase(createActorAudition.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createActorAudition.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(createActorAudition.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // add Actor Audition material
      .addCase(addActorAuditionMaterial.pending, (state) => {
        state.materialLoading = true;
        state.materialError = null;
      })
      .addCase(addActorAuditionMaterial.fulfilled, (state, action) => {
        state.materialLoading = false;
        state.materialError = null;
      })
      .addCase(addActorAuditionMaterial.rejected, (state, action) => {
        state.materialLoading = false;
        state.materialLoading = action.payload;
      })

      // Get Actor Auditions
      .addCase(getActorAuditions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getActorAuditions.fulfilled, (state, action) => {
        state.loading = false;
        state.auditions = action.payload?.results || action.payload || [];
        state.error = null;
      })
      .addCase(getActorAuditions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get Actor Auditions
      .addCase(getActorAuditionsCalander.pending, (state) => {
        state.calanderViewLoading = true;
        state.calanderViewError = null;
      })
      .addCase(getActorAuditionsCalander.fulfilled, (state, action) => {
        state.calanderViewLoading = false;
        state.calanderView = action.payload?.results || action.payload || [];
        state.calanderViewError = null;
      })
      .addCase(getActorAuditionsCalander.rejected, (state, action) => {
        state.calanderViewLoading = false;
        state.calanderViewError = action.payload;
      })

      // Get Actor Auditions material
      .addCase(getActorAuditionsMaterialListing.pending, (state) => {
        state.materialLoading = true;
        state.error = null;
      })
      .addCase(getActorAuditionsMaterialListing.fulfilled, (state, action) => {
        state.materialLoading = false;
        state.materials = action.payload?.results || action.payload || [];
        state.error = null;
      })
      .addCase(getActorAuditionsMaterialListing.rejected, (state, action) => {
        state.materialLoading = false;
        state.error = action.payload;
      })

      // Get Actor Casting Auditions
      .addCase(getActorCastingAuditions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getActorCastingAuditions.fulfilled, (state, action) => {
        state.loading = false;
        state.castingAuditions = action.payload || {
          open: [],
          closed: [],
          completed: [],
        };
        state.error = null;
      })
      .addCase(getActorCastingAuditions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update Actor Audition
      .addCase(updateActorAudition.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateActorAudition.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(updateActorAudition.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete Actor Audition
      .addCase(deleteActorAudition.pending, (state) => {
        state.deleteLoading = true;
        state.error = null;
      })
      .addCase(deleteActorAudition.fulfilled, (state, action) => {
        state.deleteLoading = false;
        state.error = null;
      })
      .addCase(deleteActorAudition.rejected, (state, action) => {
        state.deleteLoading = false;
        state.error = action.payload;
      })

      // Delete Actor Audition meterial
      .addCase(deleteActorAuditionMaterial.pending, (state) => {
        state.materialLoading = true;
        state.materialError = null;
      })
      .addCase(deleteActorAuditionMaterial.fulfilled, (state, action) => {
        state.materialLoading = false;
        state.materialError = null;
      })
      .addCase(deleteActorAuditionMaterial.rejected, (state, action) => {
        state.materialLoading = false;
        state.materialError = action.payload;
      });
  },
});

export const { clearError, setCurrentAudition, clearCurrentAudition } =
  actorAuditionsSlice.actions;

export default actorAuditionsSlice.reducer;
