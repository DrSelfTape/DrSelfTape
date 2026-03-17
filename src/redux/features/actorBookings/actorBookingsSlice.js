import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from '../../http';
import endPoints from '../../constant';

const initialState = {
  bookings: [],
  currentBooking: null,
  loading: false,
  deleteLoading: false,
  error: null,
};

const handleApiError = (error) => {
  const message =
    error?.response?.data?.message ||
    error?.message ||
    'An unexpected error occurred';
  return message;
};

export const createBooking = createAsyncThunk(
  'actorBookings/create',
  async (values, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.bookings, values);
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const getBookings = createAsyncThunk(
  'actorBookings/getAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(endPoints.bookings, { params });
      return data?.data?.map((booking) => ({
        id: booking?.id,
        audition: booking?.audition_title,
        auditionID:booking?.audition,
        location: booking?.location,
        type: booking?.type,
        status: booking?.status,
       
      }));
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const getBookingDetail = createAsyncThunk(
  'actorBookings/getDetail',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(endPoints.bookingDetail(id));
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const updateBooking = createAsyncThunk(
  'actorBookings/update',
  async ({ id, values }, { rejectWithValue }) => {
    try {
      const { data } = await axios.put(endPoints.bookingDetail(id), values);
      return data?.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const deleteBooking = createAsyncThunk(
  'actorBookings/delete',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(endPoints.bookingDetail(id));
      return id;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const actorBookingsSlice = createSlice({
  name: 'actorBookings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentBooking: (state, action) => {
      state.currentBooking = action.payload;
    },
    clearCurrentBooking: (state) => {
      state.currentBooking = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(createBooking.rejected, (state, action) => {
        console.log(action)
        state.loading = false;
        // state.error = action?.payload?.error;
      })
      .addCase(getBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload?.results || action.payload || [];
        state.error = null;
      })
      .addCase(getBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getBookingDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBookingDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBooking = action.payload;
        state.error = null;
      })
      .addCase(getBookingDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBooking.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(updateBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteBooking.pending, (state) => {
        state.deleteLoading = true;
        state.error = null;
      })
      .addCase(deleteBooking.fulfilled, (state, action) => {
        state.deleteLoading = false;
        state.error = null;
      })
      .addCase(deleteBooking.rejected, (state, action) => {
        state.deleteLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, setCurrentBooking, clearCurrentBooking } =
  actorBookingsSlice.actions;

export default actorBookingsSlice.reducer;
