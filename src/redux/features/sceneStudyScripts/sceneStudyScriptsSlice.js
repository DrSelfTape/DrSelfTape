import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from '../../http';
import endPoints from '../../constant';

const initialState = {
  scripts: [],
  notes: null,
  currentScript: null,
  audioData: null,
  audioDataLoading: null,
  scriptAnalysis: null,
  loading: false,
  listingLoading: false,
  deleteLoading: false,
  analysisLoading: false,
  notesListingLoading: false,
  notesLoading: false,
  notesDeleteLoading:false,
  sceneAnalysis: [],
  error: null,
  annotations: {},
  annotationLoading: false,
  annotationDeleteLoading: false,
  annotationListingLoading: false,
  // Script meta data update
  updateMetadataLoading: false,
  updateMetadataError: null,
  rehearsalStartLoading: false,
  rehearsalCompleteLoading: false,
  rehearsalError: null,
};

const handleApiError = (error) => {
  const message =
    error?.response?.data?.message ||
    error?.message ||
    'An unexpected error occurred';
  return message;
};

export const createScript = createAsyncThunk(
  'sceneStudyScripts/create',
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.scripts, formData);
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const getScripts = createAsyncThunk(
  'sceneStudyScripts/getAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(endPoints.scripts, { params });
      return data?.data?.map((script) => ({
        title: script?.title,
        description: script?.description,
        ...script,
      }));
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const deleteScript = createAsyncThunk(
  'sceneStudyScripts/delete',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${endPoints.scripts}${id}/`);
      return id;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const getScriptAnalysis = createAsyncThunk(
  'sceneStudyScripts/getAnalysis',
  async (versionId, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(
        `${endPoints.scriptAnalysis}/version/${versionId}/scene/`
      );
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Coach: get script scenes (same shape as getScriptAnalysis but coach-only endpoint)
export const getCoachScriptScenes = createAsyncThunk(
  'sceneStudyScripts/getCoachScriptScenes',
  async (scriptId, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(
        `${endPoints.coachScriptScenes}${scriptId}/scenes/`
      );
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Update Script Metadata
export const updateScriptMetadata = createAsyncThunk(
  'sceneStudyScripts/updateMetadata',
  async ({ scriptId, payload }, { rejectWithValue }) => {
    console.log('clicked', scriptId);
    try {
      const { data } = await axios.patch(
        `${endPoints.updateScriptMetadata}${scriptId}/metadata/`,
        payload
      );
      return data?.data?.script;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const getSceneAnalysis = createAsyncThunk(
  'sceneStudyScripts/sceneAnalysis',
  async (versionId, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(
        `${endPoints.scriptAnalysis}/version/${versionId}/analysis/`
      );
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Get Notes
export const getNotes = createAsyncThunk(
  'sceneStudyScripts/getNotes',
  async (analysisId, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(
        `${endPoints.scriptAnalysis}/analysis/${analysisId}/notes/`
      );
      // API returns { data: { notes: "..." } }
      return data?.data?.notes || null;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Create Notes
export const createNotes = createAsyncThunk(
  'sceneStudyScripts/createNotes',
  async ({ analysisId, payload }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${endPoints.scriptAnalysis}/analysis/${analysisId}/notes/`,
        payload
      );
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Update Notes
export const updateNotes = createAsyncThunk(
  'sceneStudyScripts/updateNotes',
  async ({ analysisId, noteId, payload }, { rejectWithValue }) => {
    try {
      const { data } = await axios.put(
        `${endPoints.scriptAnalysis}/analysis/${analysisId}/notes/`,
        payload
      );
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Delete Notes
export const deleteNotes = createAsyncThunk(
  'sceneStudyScripts/deleteNotes',
  async (analysisId, { rejectWithValue }) => {
    try {
      const { data } = await axios.delete(
        `${endPoints.scriptAnalysis}/analysis/${analysisId}/notes/`
      );
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// get Audio Composition
export const getAudioComposition = createAsyncThunk(
  'sceneStudyScripts/getAudioComposition',
  async (versionId, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(
        `${endPoints.scriptAnalysis}/audio/${versionId}/composition/`
      );
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Start rehearsal session
export const startRehearsalSession = createAsyncThunk(
  'sceneStudyScripts/startRehearsalSession',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.rehearsalStart, payload);
      // Handle both wrapped { data: {...} } and direct {...} responses
      return data?.data || data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Complete rehearsal session with uploads (FormData)
export const completeRehearsalSession = createAsyncThunk(
  'sceneStudyScripts/completeRehearsalSession',
  async (formData, { rejectWithValue }) => {
    try {
      // Don't set Content-Type header manually - let axios set it automatically with boundary
      // Manually setting 'multipart/form-data' prevents browser from adding the boundary parameter
      const { data } = await axios.post(endPoints.rehearsalComplete, formData);
      // Handle both wrapped { data: {...} } and direct {...} responses
      return data?.data || data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// ========== Line Annotation CRUD ==========

// GET annotation for specific line
export const getLineAnnotation = createAsyncThunk(
  'sceneStudyScripts/getLineAnnotation',
  async ({ versionId, lineId }, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(
        `${endPoints.scriptAnalysis}/version/${versionId}/lines/${lineId}/annotation/`
      );
      return data?.data?.annotation || null;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// CREATE annotation
export const createLineAnnotation = createAsyncThunk(
  'sceneStudyScripts/createLineAnnotation',
  async ({ versionId, lineId, payload }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${endPoints.scriptAnalysis}/version/${versionId}/lines/${lineId}/annotation/`,
        payload
      );
      return data?.data?.annotation || null;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// UPDATE annotation
export const updateLineAnnotation = createAsyncThunk(
  'sceneStudyScripts/updateLineAnnotation',
  async ({ versionId, lineId, payload }, { rejectWithValue }) => {
    try {
      const { data } = await axios.put(
        `${endPoints.scriptAnalysis}/version/${versionId}/lines/${lineId}/annotation/`,
        payload
      );
      return data?.data?.annotation || null;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// DELETE annotation
export const deleteLineAnnotation = createAsyncThunk(
  'sceneStudyScripts/deleteLineAnnotation',
  async ({ versionId, lineId }, { rejectWithValue }) => {
    try {
      await axios.delete(
        `${endPoints.scriptAnalysis}/version/${versionId}/lines/${lineId}/annotation/`
      );
      return lineId; // for state cleanup
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const sceneStudyScriptsSlice = createSlice({
  name: 'sceneStudyScripts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentScript: (state, action) => {
      state.currentScript = action.payload;
    },
    clearCurrentScript: (state) => {
      state.currentScript = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Script
      .addCase(createScript.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createScript.fulfilled, (state, action) => {
        state.loading = false;
        state.scripts.push(action.payload);
      })
      .addCase(createScript.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Scripts
      .addCase(getScripts.pending, (state) => {
        state.listingLoading = true;
        state.error = null;
      })
      .addCase(getScripts.fulfilled, (state, action) => {
        state.listingLoading = false;
        state.scripts = action.payload || [];
      })
      .addCase(getScripts.rejected, (state, action) => {
        state.listingLoading = false;
        state.error = action.payload;
      })
      // Delete Script
      .addCase(deleteScript.pending, (state) => {
        state.deleteLoading = true;
        state.error = null;
      })
      .addCase(deleteScript.fulfilled, (state, action) => {
        state.deleteLoading = false;
        state.scripts = state.scripts.filter(
          (script) => script.id !== action.payload
        );
      })
      .addCase(deleteScript.rejected, (state, action) => {
        state.deleteLoading = false;
        state.error = action.payload;
      })
      // Get Script Analysis
      .addCase(getScriptAnalysis.pending, (state) => {
        state.analysisLoading = true;
        state.error = null;
      })
      .addCase(getScriptAnalysis.fulfilled, (state, action) => {
        state.analysisLoading = false;
        state.scriptAnalysis = action.payload;
      })
      .addCase(getScriptAnalysis.rejected, (state, action) => {
        state.analysisLoading = false;
        state.error = action.payload;
      })
      // Coach script scenes (shares scriptAnalysis state)
      .addCase(getCoachScriptScenes.pending, (state) => {
        state.analysisLoading = true;
        state.error = null;
      })
      .addCase(getCoachScriptScenes.fulfilled, (state, action) => {
        state.analysisLoading = false;
        state.scriptAnalysis = action.payload;
      })
      .addCase(getCoachScriptScenes.rejected, (state, action) => {
        state.analysisLoading = false;
        state.error = action.payload;
      })
      .addCase(getSceneAnalysis.pending, (state) => {
        state.analysisLoading = true;
        state.error = null;
      })
      .addCase(getSceneAnalysis.fulfilled, (state, action) => {
        state.analysisLoading = false;
        state.sceneAnalysis = action.payload;
      })
      .addCase(getSceneAnalysis.rejected, (state, action) => {
        state.analysisLoading = false;
        state.error = action.payload;
      })
      // Get Notes
      .addCase(getNotes.pending, (state) => {
        state.notesListingLoading = true;
      })
      .addCase(getNotes.fulfilled, (state, action) => {
        state.notesListingLoading = false;
        state.notes = action.payload || null;
      })
      .addCase(getNotes.rejected, (state, action) => {
        state.notesListingLoading = false;
      })

      //  Create Notes
      .addCase(createNotes.pending, (state) => {
        state.notesLoading = true;
      })
      .addCase(createNotes.fulfilled, (state, action) => {
        state.notesLoading = false;
        state.notes = action.payload?.notes || null;
      })
      .addCase(createNotes.rejected, (state, action) => {
        state.notesLoading = false;
      })

      //  Update Notes
      .addCase(updateNotes.pending, (state) => {
        state.notesLoading = true;
      })
      .addCase(updateNotes.fulfilled, (state, action) => {
        state.notesLoading = false;
        state.notes = action.payload?.notes || null;
      })
      .addCase(updateNotes.rejected, (state, action) => {
        state.notesLoading = false;
      })

      //  Delete Notes
      .addCase(deleteNotes.pending, (state) => {
        state.notesDeleteLoading = true;
      })
      .addCase(deleteNotes.fulfilled, (state, action) => {
        state.notesDeleteLoading = false;
      })
      .addCase(deleteNotes.rejected, (state, action) => {
        state.notesDeleteLoading = false;
      })

      // Get Audio Composition
      .addCase(getAudioComposition.pending, (state) => {
        state.audioDataLoading = true;
      })
      .addCase(getAudioComposition.fulfilled, (state, action) => {
        state.audioDataLoading = false;
        state.audioData = action.payload;
      })
      .addCase(getAudioComposition.rejected, (state, action) => {
        state.audioDataLoading = false;
        state.error = action.payload;
      })

      // ========== Line Annotation ==========
      .addCase(getLineAnnotation.pending, (state) => {
        state.annotationListingLoading = true;
      })
      .addCase(getLineAnnotation.fulfilled, (state, action) => {
        state.annotationListingLoading = false;
        const annotation = action.payload;
        if (annotation) state.annotations[annotation.line] = annotation;
      })
      .addCase(getLineAnnotation.rejected, (state) => {
        state.annotationListingLoading = false;
      })

      .addCase(createLineAnnotation.pending, (state) => {
        state.annotationLoading = true;
      })
      .addCase(createLineAnnotation.fulfilled, (state, action) => {
        state.annotationLoading = false;
        const annotation = action.payload;
        state.annotations[annotation.line] = annotation;
      })
      .addCase(createLineAnnotation.rejected, (state) => {
        state.annotationLoading = false;
      })

      .addCase(updateLineAnnotation.pending, (state) => {
        state.annotationLoading = true;
      })
      .addCase(updateLineAnnotation.fulfilled, (state, action) => {
        state.annotationLoading = false;
        const annotation = action.payload;
        state.annotations[annotation.line] = annotation;
      })
      .addCase(updateLineAnnotation.rejected, (state) => {
        state.annotationLoading = false;
      })

      .addCase(deleteLineAnnotation.pending, (state) => {
        state.annotationDeleteLoading = true;
      })
      .addCase(deleteLineAnnotation.fulfilled, (state, action) => {
        state.annotationDeleteLoading = false;
        const lineId = action.payload;
        delete state.annotations[lineId];
      })
      .addCase(deleteLineAnnotation.rejected, (state) => {
        state.annotationDeleteLoading = false;
      })

      // Update Script Metadata
      .addCase(updateScriptMetadata.pending, (state) => {
        state.updateMetadataLoading = true;
        state.updateMetadataError = null;
      })
      .addCase(updateScriptMetadata.fulfilled, (state) => {
        state.updateMetadataLoading = false;
      })
      .addCase(updateScriptMetadata.rejected, (state, action) => {
        state.updateMetadataLoading = false;
        state.updateMetadataError = action.payload;
      })

      // Start rehearsal session
      .addCase(startRehearsalSession.pending, (state) => {
        state.rehearsalStartLoading = true;
        state.rehearsalError = null;
      })
      .addCase(startRehearsalSession.fulfilled, (state, action) => {
        state.rehearsalStartLoading = false;
      })
      .addCase(startRehearsalSession.rejected, (state, action) => {
        state.rehearsalStartLoading = false;
        state.rehearsalError = action.payload;
      })

      // Complete rehearsal session
      .addCase(completeRehearsalSession.pending, (state) => {
        state.rehearsalCompleteLoading = true;
        state.rehearsalError = null;
      })
      .addCase(completeRehearsalSession.fulfilled, (state) => {
        state.rehearsalCompleteLoading = false;
      })
      .addCase(completeRehearsalSession.rejected, (state, action) => {
        state.rehearsalCompleteLoading = false;
        state.rehearsalError = action.payload;
      });
  },
});

export const { clearError, setCurrentScript, clearCurrentScript } =
  sceneStudyScriptsSlice.actions;

export default sceneStudyScriptsSlice.reducer;
