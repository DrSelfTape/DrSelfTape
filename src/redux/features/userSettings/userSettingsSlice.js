/**
 * User Settings slice — cross-device sync of per-user client preferences.
 *
 * Backed by the Django `/v1/users/settings/` endpoint (UserSettings model).
 * The blob is opaque to the backend; frontend owns the schema.
 *
 * Pattern:
 *   - On login (and on app boot when authed), call `fetchUserSettings()`
 *     to hydrate from the server.
 *   - When a preference changes, call `patchUserSettings({ key: value })`
 *     which optimistically updates local state AND PATCHes the server.
 *   - localStorage (via userStorage helper) acts as offline cache so the
 *     UI still has correct defaults before the server hydrate lands.
 */

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from '../../http';
import { baseURL } from '../../constant';

const SETTINGS_URL = `${baseURL}/v1/users/settings/`;

const initialState = {
  data: {},          // the user's settings blob
  loaded: false,     // has the initial hydrate completed?
  loading: false,
  error: null,
};

export const fetchUserSettings = createAsyncThunk(
  'userSettings/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(SETTINGS_URL);
      return res.data?.data?.data || {};
    } catch (err) {
      // Backend may not have the endpoint yet (older deploy) — treat as empty
      // settings rather than blocking the UI.
      if (err?.response?.status === 404) return {};
      return rejectWithValue(err?.response?.data?.message || err.message);
    }
  },
);

export const patchUserSettings = createAsyncThunk(
  'userSettings/patch',
  async (partial, { rejectWithValue }) => {
    if (!partial || typeof partial !== 'object') return {};
    try {
      const res = await axios.patch(SETTINGS_URL, { data: partial });
      return res.data?.data?.data || partial;
    } catch (err) {
      // If the endpoint is missing (404), still resolve so optimistic
      // local-state updates persist this session. The Redux slice already
      // applied the change in the `.pending` handler.
      if (err?.response?.status === 404) return partial;
      return rejectWithValue(err?.response?.data?.message || err.message);
    }
  },
);

const userSettingsSlice = createSlice({
  name: 'userSettings',
  initialState,
  reducers: {
    /* Local-only update — useful for migrating legacy localStorage values
     * into the slice on first run before we PATCH them up. */
    setLocalSetting: (state, { payload }) => {
      const { key, value } = payload || {};
      if (!key) return;
      state.data[key] = value;
    },
    resetSettings: (state) => {
      state.data = {};
      state.loaded = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserSettings.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchUserSettings.fulfilled, (state, { payload }) => {
        state.data = payload || {};
        state.loaded = true;
        state.loading = false;
      })
      .addCase(fetchUserSettings.rejected, (state, { payload }) => {
        state.loaded = true;   // still mark loaded so UI doesn't block forever
        state.loading = false;
        state.error = payload;
      })
      // Optimistic apply on pending so UI updates instantly.
      .addCase(patchUserSettings.pending, (state, action) => {
        const partial = action.meta.arg || {};
        Object.assign(state.data, partial);
      })
      .addCase(patchUserSettings.fulfilled, (state, { payload }) => {
        // Server is authoritative — replace with the returned blob.
        if (payload && typeof payload === 'object') {
          state.data = { ...state.data, ...payload };
        }
      });
  },
});

export const { setLocalSetting, resetSettings } = userSettingsSlice.actions;

/* Selectors */
export const selectSetting = (key, fallback = null) => (state) => {
  const v = state.userSettings?.data?.[key];
  return v === undefined ? fallback : v;
};

export default userSettingsSlice.reducer;
