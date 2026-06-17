// Library Imports
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

// Local Imports
import axios from '../../http';
import endPoints from '../../constant';

// Initial state for auth
const initialState = {
  user: null,
  profileDetails: null,
  loading: false,
  updatePasswordLoading: false,
  error: null,
  isAuthenticated: false,
};

// Helper function to handle API errors consistently.
//
// The BE wraps validation errors in `{ message: [...] }` where the list
// contains one `{field: "human message"}` entry per failing field
// (helpers/api_exception.py:validation_errors). Toasts + form labels
// rendered that list directly and React threw "Objects are not valid
// as a React child" on the resulting object — fix is to always return
// a string, flattening field-keyed objects when present.
const handleApiError = (error) => {
  const raw = error?.response?.data?.message ?? error?.message;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) {
    const parts = raw.map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object') {
        return Object.entries(entry)
          .map(([field, msg]) => {
            const text = Array.isArray(msg) ? msg.join(' ') : String(msg);
            // Hide the field name on the common single-field cases —
            // "This email already exists" reads better than
            // "email: This email already exists" in a toast.
            return text;
          })
          .join(' ');
      }
      return String(entry);
    }).filter(Boolean);
    return parts.join(' ') || 'An unexpected error occurred';
  }
  if (raw && typeof raw === 'object') {
    return Object.values(raw)
      .map((v) => (Array.isArray(v) ? v.join(' ') : String(v)))
      .join(' ') || 'An unexpected error occurred';
  }
  return 'An unexpected error occurred';
};

// Sign Up User API Function
export const registerUser = createAsyncThunk(
  'auth/register',
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.register, formData);
      try { const { trackEvent, Events } = await import('../../../utils/analytics'); trackEvent(Events.SIGNUP, { method: 'email' }); } catch { /* swallow */ }
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Login user API Function
export const loginUser = createAsyncThunk(
  'auth/login',
  async (values, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.login, {
        ...values,
      });
      try { const { trackEvent, Events } = await import('../../../utils/analytics'); trackEvent(Events.LOGIN, { method: 'email' }); } catch { /* swallow */ }
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Sign in with Apple — verifies the Apple identityToken on the BE and
// returns the same shape as a normal login response.
export const appleLoginUser = createAsyncThunk(
  'auth/appleLogin',
  async ({ identityToken, firstName, lastName }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post('/v1/users/apple-login/', {
        identityToken,
        firstName: firstName || '',
        lastName: lastName || '',
      });
      // Apple sign-in covers both first-time signup AND returning login. We
      // can't tell which from this response, so fire LOGIN — the BE creates
      // the User on first signin if needed.
      try { const { trackEvent, Events } = await import('../../../utils/analytics'); trackEvent(Events.LOGIN, { method: 'apple' }); } catch { /* swallow */ }
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Forgot Password API Function
export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (values, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.forgotPassword, {
        ...values,
      });
      import('../../../utils/analytics').then(({ trackEvent }) => {
        trackEvent('forgot_password_requested', {});
      }).catch(() => { /* swallow */ });
      return data;
    } catch (error) {
      import('../../../utils/analytics').then(({ trackEvent }) => {
        trackEvent('forgot_password_failed', { status: error?.response?.status });
      }).catch(() => { /* swallow */ });
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Reset Password API Function
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (values, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.resetPassword, {
        ...values,
      });
      import('../../../utils/analytics').then(({ trackEvent }) => {
        trackEvent('password_reset_success', {});
      }).catch(() => { /* swallow */ });
      return data;
    } catch (error) {
      import('../../../utils/analytics').then(({ trackEvent }) => {
        trackEvent('password_reset_failed', { status: error?.response?.status });
      }).catch(() => { /* swallow */ });
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Update Password API Function
export const updatePassword = createAsyncThunk(
  'auth/updatePassword',
  async (values, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.updatePassword, {
        ...values,
      });
      return data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Get Profile Details API Function
export const getProfileDetails = createAsyncThunk(
  'auth/getProfileDetails',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(endPoints.profileDetails);
      return data?.data?.user;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Update Profile API Function
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await axios.put(endPoints.updateProfile, formData);
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Add Coach Profile API Function
export const addCoachProfile = createAsyncThunk(
  'auth/addCoachProfile',
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.addCoachProfile, formData);
      return data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Switch Role API Function
export const switchRole = createAsyncThunk(
  'auth/switchRole',
  async (roleData, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.switchRole, roleData);
      return data?.data || data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Reducers
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logoutUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
    clearTempSession: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
    // Apple guideline 5.1.1(i): once the user accepts the AI consent
    // modal, the BE returns a timestamp we mirror on state.user so the
    // gate stops triggering for the rest of the session.
    setAiConsentAcceptedAt: (state, action) => {
      if (state.user) state.user.ai_consent_accepted_at = action.payload || null;
    },
    // Terms §1 / COPPA: once the age gate captures a birthdate, mirror it
    // onto state.user so the gate stops re-triggering for the session.
    setDateOfBirth: (state, action) => {
      if (state.user) state.user.date_of_birth = action.payload || null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.user = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        // API returns user data directly (no login_data wrapper)
        const src = action?.payload?.login_data || action?.payload;
        const userData = {
          id: src?.id,
          first_name: src?.first_name,
          last_name: src?.last_name,
          phone_no: src?.phone_no,
          email: src?.email,
          token: src?.token?.access || src?.token,
          all_user_permissions: src?.all_user_permissions,
          role: src?.active_role || src?.role,
          is_active: src?.is_active,
          is_reset_password: src?.is_reset_password,
          is_staff: src?.is_staff,
          date_of_birth: src?.date_of_birth,
        };
        state.loading = false;
        // Password resets now go through the emailed token-based /reset-password
        // flow, so a successful auth response always carries a usable session.
        // Never null the user while isAuthenticated is true — that left the user
        // stranded on /login with no token and no reset screen.
        state.user = userData;
        state.isAuthenticated = !!userData.id;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.user = null;
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.user = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        const userData = {
          id: action.payload?.id,
          first_name: action.payload?.first_name,
          last_name: action.payload?.last_name,
          phone_no: action.payload?.phone_no,
          email: action.payload?.email,
          token: action.payload?.token?.access || action.payload?.token,
          all_user_permissions: action.payload?.all_user_permissions,
          role: action.payload?.active_role || action.payload?.role, // Use active_role if available
          is_active: action.payload?.is_active,
          is_reset_password: action.payload?.is_reset_password,
          is_staff: action.payload?.is_staff,
          date_of_birth: action.payload?.date_of_birth,
        };
        // Password resets now go through the emailed token-based /reset-password
        // flow, so a successful login always carries a usable session. Never null
        // the user while isAuthenticated is true — that left the user stranded on
        // /login with no token and no reset screen.
        state.user = userData;
        state.error = null;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.user = null;
        state.isAuthenticated = false;
      })
      // Sign in with Apple — mirror loginUser handlers so the dashboard
      // route guards see the same authenticated state.
      .addCase(appleLoginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.user = null;
      })
      .addCase(appleLoginUser.fulfilled, (state, action) => {
        state.loading = false;
        const userData = {
          id: action.payload?.id,
          first_name: action.payload?.first_name,
          last_name: action.payload?.last_name,
          phone_no: action.payload?.phone_no,
          email: action.payload?.email,
          token: action.payload?.token?.access || action.payload?.token,
          all_user_permissions: action.payload?.all_user_permissions,
          role: action.payload?.active_role || action.payload?.role,
          is_active: action.payload?.is_active,
          is_reset_password: action.payload?.is_reset_password,
          is_staff: action.payload?.is_staff,
          date_of_birth: action.payload?.date_of_birth,
        };
        state.user = userData;
        state.error = null;
        state.isAuthenticated = true;
      })
      .addCase(appleLoginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updatePassword.pending, (state) => {
        state.updatePasswordLoading = true;
        state.error = null;
      })
      .addCase(updatePassword.fulfilled, (state, action) => {
        state.updatePasswordLoading = false;
        state.error = null;
      })
      .addCase(updatePassword.rejected, (state, action) => {
        state.updatePasswordLoading = false;
        state.error = action.payload;
      })
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getProfileDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProfileDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.profileDetails = action.payload;
        state.error = null;
      })
      .addCase(getProfileDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addCoachProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCoachProfile.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
        // Note: Token is revoked by backend, so we don't update user state here
        // The logout will be handled in the component after showing success message
      })
      .addCase(addCoachProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(switchRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(switchRole.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        // Update user state with new token, role, and permissions
        if (action.payload) {
          const userData = {
            ...state.user,
            token: action.payload?.token?.access || action.payload?.access || state.user?.token,
            role: action.payload?.role || state.user?.role,
            all_user_permissions: action.payload?.all_user_permissions || state.user?.all_user_permissions,
          };
          state.user = userData;
        }
      })
      .addCase(switchRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logoutUser, clearTempSession, setAiConsentAcceptedAt, setDateOfBirth } = authSlice.actions;

// Logout that ALSO clears persisted data slices (auditions, submissions,
// scripts, etc.) so the next user on this device starts clean. Call this
// instead of `logoutUser` at user-facing sign-out points.
export const performLogout = () => async (dispatch) => {
  // De-register this device's push token FIRST, while the auth header is
  // still present, so the orphaned APNs/VoIP token stops mapping this device
  // to the logged-out user (next user's pushes could otherwise misroute).
  try {
    const { unregisterPushToken } = await import('../../../hooks/usePushNotifications');
    await unregisterPushToken();
  } catch { /* push util unavailable — don't block logout */ }
  dispatch(logoutUser());
  // Strip onboarding progress + dismissed banner version — none of these are
  // user-scoped, so leaving them carries another user's state forward.
  try {
    window.localStorage.removeItem('dst_onb_step');
    window.localStorage.removeItem('dst_onb_data');
    window.localStorage.removeItem('updateBannerDismissed');
  } catch { /* storage unavailable */ }
  // Import lazily to avoid a circular dependency with redux/store.js.
  const { persistor } = await import('../../store');
  await persistor.purge();
};

export default authSlice.reducer;
