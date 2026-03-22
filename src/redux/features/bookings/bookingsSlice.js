import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from '../../http';
import endPoints from '../../constant';

const initialState = {
  bookings: [],
  locations: [],
  membership: null,
  availableSlots: null,
  loading: false,
  locationsLoading: false,
  membershipLoading: false,
  slotsLoading: false,
  createLoading: false,
  error: null,
  wixServices: [],
  wixSlots: [],
  wixLoading: false,
};

export const fetchBookingsThunk = createAsyncThunk(
  'bookings/fetchBookings',
  async (params, { rejectWithValue }) => {
    try {
      const query = params?.status ? `?status=${params.status}` : '';
      const { data } = await axios.get(`${endPoints.bookings}${query}`);
      return data?.data || data?.results || data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.detail || 'Failed to load bookings.'
      );
    }
  }
);

export const fetchLocationsThunk = createAsyncThunk(
  'bookings/fetchLocations',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(endPoints.locations);
      return data?.results || data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.detail || 'Failed to load locations.'
      );
    }
  }
);

export const createBookingThunk = createAsyncThunk(
  'bookings/createBooking',
  async (bookingData, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.bookings, bookingData);
      return data;
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        (error?.response?.data && typeof error.response.data === 'object'
          ? Object.values(error.response.data).flat().join('. ')
          : 'Failed to create booking.');
      return rejectWithValue(message);
    }
  }
);

export const fetchAvailableSlotsThunk = createAsyncThunk(
  'bookings/fetchAvailableSlots',
  async ({ date, location_id }, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(endPoints.availableSlots, {
        params: { date, location_id },
      });
      return data?.data || data?.results || data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.detail || 'Failed to load available slots.'
      );
    }
  }
);

export const fetchMembershipThunk = createAsyncThunk(
  'bookings/fetchMembership',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(endPoints.membership);
      return data?.data || data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.detail || 'Failed to load membership.'
      );
    }
  }
);


// ── Wix Bookings thunks ──────────────────────────────────────────

export const fetchWixServicesThunk = createAsyncThunk(
  'bookings/fetchWixServices',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(endPoints.wixServices);
      return data?.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch Wix services');
    }
  }
);

export const fetchWixAvailabilityThunk = createAsyncThunk(
  'bookings/fetchWixAvailability',
  async ({ serviceId, startDate, endDate }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.wixAvailability, {
        service_id: serviceId,
        start_date: startDate,
        end_date: endDate,
      });
      return data?.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch availability');
    }
  }
);

export const createWixBookingThunk = createAsyncThunk(
  'bookings/createWixBooking',
  async (bookingData, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.wixBook, bookingData);
      return data?.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create booking');
    }
  }
);

const bookingsSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    clearBookingsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch bookings
      .addCase(fetchBookingsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookingsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload;
      })
      .addCase(fetchBookingsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch locations
      .addCase(fetchLocationsThunk.pending, (state) => {
        state.locationsLoading = true;
      })
      .addCase(fetchLocationsThunk.fulfilled, (state, action) => {
        state.locationsLoading = false;
        state.locations = action.payload;
      })
      .addCase(fetchLocationsThunk.rejected, (state, action) => {
        state.locationsLoading = false;
        state.error = action.payload;
      })
      // Create booking
      .addCase(createBookingThunk.pending, (state) => {
        state.createLoading = true;
        state.error = null;
      })
      .addCase(createBookingThunk.fulfilled, (state, action) => {
        state.createLoading = false;
        state.bookings.unshift(action.payload);
      })
      .addCase(createBookingThunk.rejected, (state, action) => {
        state.createLoading = false;
        state.error = action.payload;
      })
      // Fetch available slots
      .addCase(fetchAvailableSlotsThunk.pending, (state) => {
        state.slotsLoading = true;
        state.availableSlots = null;
      })
      .addCase(fetchAvailableSlotsThunk.fulfilled, (state, action) => {
        state.slotsLoading = false;
        state.availableSlots = action.payload;
      })
      .addCase(fetchAvailableSlotsThunk.rejected, (state) => {
        state.slotsLoading = false;
        state.availableSlots = null;
      })
      // Fetch membership
      .addCase(fetchMembershipThunk.pending, (state) => {
        state.membershipLoading = true;
      })
      .addCase(fetchMembershipThunk.fulfilled, (state, action) => {
        state.membershipLoading = false;
        state.membership = action.payload;
      })
      .addCase(fetchMembershipThunk.rejected, (state, action) => {
        state.membershipLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearBookingsError } = bookingsSlice.actions;
export default bookingsSlice.reducer;
