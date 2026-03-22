import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchLocationsThunk,
  createBookingThunk,
  fetchAvailableSlotsThunk,
} from '../../../redux/features/bookings/bookingsSlice';

const sessionTypes = [
  { id: 'self-tape', name: 'Self-Tape', desc: 'Professional self-tape recording' },
  { id: 'zoom-callback', name: 'Zoom Callback', desc: 'Virtual audition with reader' },
  { id: 'coaching', name: 'Coaching', desc: 'One-on-one coaching session' },
  { id: 'voice-over', name: 'Voice Over', desc: 'Voice over recording session' },
];

const durations = [
  { id: '60', label: '1 Hour', price: 125, minutes: 60 },
  { id: '90', label: '90 Minutes', price: 175, minutes: 90 },
  { id: '120', label: '2 Hours', price: 222, minutes: 120 },
];

const timeSlots = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
];

const steps = ['Location', 'Date & Time', 'Details', 'Confirm'];

function parseTimeSlot(dateStr, timeStr) {
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
}

export default function BookSession() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { locations: apiLocations, locationsLoading, createLoading, error, availableSlots, slotsLoading } = useSelector(
    (state) => state.bookings
  );

  const [currentStep, setCurrentStep] = useState(0);
  const [booking, setBooking] = useState({
    location: '',
    date: '',
    time: '',
    sessionType: '',
    duration: '',
  });
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    dispatch(fetchLocationsThunk());
  }, [dispatch]);

  // Fetch available slots when date and location are selected
  useEffect(() => {
    if (booking.date && booking.location) {
      dispatch(fetchAvailableSlotsThunk({ date: booking.date, location_id: booking.location }));
    }
  }, [dispatch, booking.date, booking.location]);

  // Derive unavailable slots from the API response (if fetch fails or no data, all slots available)
  const unavailableSlots = availableSlots
    ? timeSlots.filter((slot) => !availableSlots.includes(slot))
    : [];

  // Use API locations if available, fall back to static
  const locations = apiLocations.length > 0
    ? apiLocations.map((loc) => ({
        id: loc.id,
        name: loc.name,
        address: loc.address || loc.location || '',
        studios: loc.studios || [],
      }))
    : [
        { id: 'hollywood', name: 'Hollywood', address: '6600 Sunset Blvd, Hollywood, CA', studios: [] },
        { id: 'dtla', name: 'Downtown LA', address: '350 S Grand Ave, Los Angeles, CA', studios: [] },
        { id: 'nyc', name: 'New York', address: '1500 Broadway, New York, NY', studios: [] },
        { id: 'sandiego', name: 'San Diego', address: '750 B St, San Diego, CA', studios: [] },
      ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleConfirm = async () => {
    const selectedLocation = locations.find((l) => String(l.id) === String(booking.location));
    const selectedDuration = durations.find((d) => d.id === booking.duration);

    // Build start and end datetime
    const startDatetime = parseTimeSlot(booking.date, booking.time);
    const endDatetime = new Date(startDatetime.getTime() + (selectedDuration?.minutes || 60) * 60 * 1000);

    const payload = {
      studio: selectedLocation?.studios?.[0]?.id || selectedLocation?.id,
      session_type: booking.sessionType,
      start_datetime: startDatetime.toISOString(),
      end_datetime: endDatetime.toISOString(),
    };

    const result = await dispatch(createBookingThunk(payload));
    if (createBookingThunk.fulfilled.match(result)) {
      setSuccessMessage('Session booked successfully!');
      setTimeout(() => navigate('/dashboard'), 1500);
    }
  };

  const generateCalendarDays = () => {
    const today = new Date();
    const days = [];
    for (let i = 0; i < 28; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const calendarDays = generateCalendarDays();
  const selectedLocation = locations.find((l) => String(l.id) === String(booking.location));
  const selectedType = sessionTypes.find((t) => t.id === booking.sessionType);
  const selectedDuration = durations.find((d) => d.id === booking.duration);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Book a Session</h2>
        <p className="text-gray-500 text-sm">Reserve your studio time in just a few steps</p>
      </div>

      {/* Success Toast */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm font-medium">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Progress Stepper */}
      <div className="flex items-center mb-8">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center flex-1 last:flex-initial">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  index <= currentStep
                    ? 'bg-[#ff6b35] text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index < currentStep ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${
                index <= currentStep ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 ${
                index < currentStep ? 'bg-[#ff6b35]' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        {/* Step 1: Location */}
        {currentStep === 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Choose a studio location</h3>
            {locationsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-24" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => setBooking({ ...booking, location: String(loc.id) })}
                    className={`p-5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      String(booking.location) === String(loc.id)
                        ? 'border-[#ff6b35] bg-[#ff6b35]/5'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        String(booking.location) === String(loc.id) ? 'bg-[#ff6b35] text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{loc.name}</p>
                        <p className="text-sm text-gray-500 mt-1">{loc.address}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Date & Time */}
        {currentStep === 1 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Pick a date and time</h3>

            {/* Calendar */}
            <div className="mb-8">
              <p className="text-sm font-medium text-gray-700 mb-3">Select a date</p>
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-gray-400 py-2">{day}</div>
                ))}
                {calendarDays.map((day, i) => {
                  const dateStr = day.toISOString().split('T')[0];
                  const isSelected = booking.date === dateStr;
                  const isToday = new Date().toDateString() === day.toDateString();
                  return (
                    <button
                      key={i}
                      onClick={() => setBooking({ ...booking, date: dateStr, time: '' })}
                      className={`py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#ff6b35] text-white'
                          : isToday
                          ? 'bg-[#ff6b35]/10 text-[#ff6b35]'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slots */}
            {booking.date && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Available time slots
                  {slotsLoading && <span className="ml-2 text-xs text-gray-400">(loading...)</span>}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {timeSlots.map((slot) => {
                    const isUnavailable = unavailableSlots.includes(slot);
                    const isSelected = booking.time === slot;
                    return (
                      <button
                        key={slot}
                        disabled={isUnavailable}
                        onClick={() => setBooking({ ...booking, time: slot })}
                        className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                          isUnavailable
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-[#ff6b35] text-white cursor-pointer'
                            : 'bg-gray-50 text-gray-700 hover:bg-[#ff6b35]/10 hover:text-[#ff6b35] cursor-pointer'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Session Details */}
        {currentStep === 2 && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Session type</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sessionTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setBooking({ ...booking, sessionType: type.id })}
                    className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      booking.sessionType === type.id
                        ? 'border-[#ff6b35] bg-[#ff6b35]/5'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <p className="font-semibold text-gray-900">{type.name}</p>
                    <p className="text-sm text-gray-500 mt-1">{type.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Duration</h3>
              <div className="grid grid-cols-3 gap-3">
                {durations.map((dur) => (
                  <button
                    key={dur.id}
                    onClick={() => setBooking({ ...booking, duration: dur.id })}
                    className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer ${
                      booking.duration === dur.id
                        ? 'border-[#ff6b35] bg-[#ff6b35]/5'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <p className="font-semibold text-gray-900">{dur.label}</p>
                    <p className="text-lg font-bold text-[#ff6b35] mt-1">${dur.price}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {currentStep === 3 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Review your booking</h3>
            <div className="bg-gray-50 rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm text-gray-500">Location</span>
                <span className="text-sm font-semibold text-gray-900">{selectedLocation?.name || '—'}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm text-gray-500">Date</span>
                <span className="text-sm font-semibold text-gray-900">
                  {booking.date ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm text-gray-500">Time</span>
                <span className="text-sm font-semibold text-gray-900">{booking.time || '—'}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm text-gray-500">Session Type</span>
                <span className="text-sm font-semibold text-gray-900">{selectedType?.name || '—'}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm text-gray-500">Duration</span>
                <span className="text-sm font-semibold text-gray-900">{selectedDuration?.label || '—'}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-base font-semibold text-gray-900">Total</span>
                <span className="text-xl font-bold text-[#ff6b35]">
                  ${selectedDuration?.price || 0}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
          {currentStep > 0 ? (
            <button
              onClick={handleBack}
              className="px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < steps.length - 1 ? (
            <button
              onClick={handleNext}
              className="bg-[#ff6b35] hover:bg-[#e55a2b] text-white px-6 py-3 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={createLoading}
              className="bg-[#ff6b35] hover:bg-[#e55a2b] text-white px-8 py-3 rounded-lg font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createLoading ? 'Booking...' : 'Confirm Booking'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
