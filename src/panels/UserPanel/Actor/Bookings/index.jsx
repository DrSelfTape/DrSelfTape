// Library imports
import { useState, useEffect, useCallback, useMemo } from 'react';
import { CircularProgress } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

// Local imports
import {
  CustomButton,
  CustomTabPanel,
  Search,
  SelectDropdown,
} from '../../../../components/Shared';
import CustomFilter from '../../../../components/Shared/CustomFilter/index.jsx';
import CalendarEvent from '../../../../components/Shared/EventCalander/index.jsx';
import CastingSchedule from '../../../../components/Booking/CastingSchedule/index.jsx';
import {
  getActorAuditions,
  getActorAuditionsCalander,
  updateActorAudition,
  deleteActorAudition,
} from '../../../../redux/features/actorAuditions/actorAuditionsSlice.js';
import { AuditionStepperModal } from '../../../../components/Booking/AuditionStepperModal';
import { useSnackbar } from '../../../../hooks/useSnackbar';
import { ActorAuditions } from '../Audition/index.jsx';
import AddIcon from '../../../../assets/icons/AddIcon.jsx';
import { useNavigate } from 'react-router-dom';
import { CustomTab, CustomTabs } from '../../../../components/Shared';

// Custom debounce function
const debounce = (func, delay) => {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

export const ActorBooking = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { toast } = useSnackbar();
  const { calanderView, calanderViewLoading, loading, deleteLoading } = useSelector(
    (state) => state?.actorAuditions
  );

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [rowData, setRowData] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('search') || ''
  );
  const [openFilter, setOpenFilter] = useState(false);
  const [value, setValue] = useState(parseInt(searchParams.get('tab')) || 0);

  const [filterOptions] = useState({
    audition_status: [
      { label: 'Applied', value: 'applied' },
      { label: 'Scheduled', value: 'scheduled' },
      { label: 'Callback', value: 'callback' },
      { label: 'Booked', value: 'booked' },
      { label: 'Rejected', value: 'rejected' },
    ],
    audition_type: [
      { label: 'Commercial', value: 'commercial' },
      { label: 'TV Drama', value: 'tv_drama' },
      { label: 'Film', value: 'film' },
      { label: 'Voice Over', value: 'voice_over' },
      { label: 'Theatrical', value: 'theatrical' },
      { label: 'Industrial', value: 'industrial' },
      { label: 'Others', value: 'others' },
    ],
  });

  const [selectedFilters, setSelectedFilters] = useState({
    audition_status: searchParams.get('audition_status') || '',
    audition_type: searchParams.get('audition_type') || '',
  });

  // Debounced search handler with custom debounce
  const debouncedSearch = useCallback(
    debounce((query) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        if (query) newParams.set('search', query);
        else newParams.delete('search');
        return newParams;
      });
    }, 500),
    [setSearchParams]
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => {
      debouncedSearch.cancel = () => clearTimeout(debouncedSearch.timeoutId);
      debouncedSearch.cancel();
    };
  }, [searchQuery, debouncedSearch]);

  useEffect(() => {
    const params = {
      tab: value,
      search: searchParams.get('search') || '',
      audition_status: searchParams.get('audition_status') || '',
      audition_type: searchParams.get('audition_type') || '',
    };
    dispatch(getActorAuditions(params));
  }, [dispatch, value, searchParams]);

  useEffect(() => {
    dispatch(getActorAuditionsCalander());
  }, [dispatch]);

  useEffect(() => {
    if (!isViewModalOpen) {
      setRowData(null);
    }
  }, [isViewModalOpen]);

  const events = calanderView?.filter((booking) => booking?.audition_date).map((booking) => {
    const startDate = new Date(booking?.audition_date);
    const endDate = booking?.end_date
      ? new Date(booking?.end_date)
      : new Date(startDate);
    const isValidStart = !isNaN(startDate.getTime());
    const isValidEnd = !isNaN(endDate.getTime());
    if (!isValidStart) return null;
    return {
      id: booking?.id,
      title: booking?.title || 'Booking',
      start: startDate.toISOString(),
      end: isValidEnd ? endDate.toISOString() : startDate.toISOString(),
      extendedProps: booking,
      backgroundColor: 'var(--color-primary)',
    };
  }).filter(Boolean);

  const handleEventClick = ({ event }) => {
    setRowData({ row: event.extendedProps });
    setIsViewModalOpen(true);
  };

  const handleCloseModal = () => {
    setRowData(null);
    setIsViewModalOpen(false);
  };

  const handleSubmit = async (formPayload) => {
    const action = await dispatch(
      updateActorAudition({
        id: formPayload.get('id'),
        values: formPayload,
      })
    );

    if (action.meta.requestStatus === 'fulfilled') {
      toast.success('Audition updated');
      setIsViewModalOpen(false);
      setRowData(null);
      // Refresh calendar data
      dispatch(getActorAuditionsCalander());
    } else {
      toast.error(
        typeof action?.payload === 'string'
          ? action.payload
          : 'Failed to update audition'
      );
    }
  };

  const handleDelete = async (auditionId) => {
    const action = await dispatch(deleteActorAudition(auditionId));
    if (action.meta.requestStatus === 'fulfilled') {
      toast.success('Audition deleted successfully');
      setIsViewModalOpen(false);
      setRowData(null);
      // Refresh calendar data
      dispatch(getActorAuditionsCalander());
    } else {
      toast.error(action.payload || 'Failed to delete audition');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setSelectedFilters((prev) => ({
      ...prev,
      [name]: value?.value || '',
    }));
  };

  const handleApply = () => {
    const newParams = new URLSearchParams();
    newParams.set('tab', value.toString());
    if (searchQuery) newParams.set('search', searchQuery);
    if (selectedFilters.audition_status)
      newParams.set('audition_status', selectedFilters.audition_status);
    if (selectedFilters.audition_type)
      newParams.set('audition_type', selectedFilters.audition_type);
    setSearchParams(newParams);
    setOpenFilter(false);
  };

  const handleClear = () => {
    setSelectedFilters({ audition_status: '', audition_type: '' });
    setSearchQuery('');
    setSearchParams({ tab: value.toString() });
    setOpenFilter(false);
  };

  // Filter and sort upcoming auditions
  const upcomingAuditions = useMemo(() => {
    if (!calanderView || calanderView.length === 0) return [];
    
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set to start of today for accurate comparison
    
    // Define valid statuses for "Upcoming Sessions"
    // Only show confirmed/active statuses, exclude rejected and unconfirmed (applied)
    const validStatuses = ['scheduled', 'callback', 'booked'];
    
    return calanderView
      .filter((audition) => {
        // Filter out past auditions
        if (!audition?.audition_date) return false;
        const auditionDate = new Date(audition.audition_date);
        auditionDate.setHours(0, 0, 0, 0);
        if (auditionDate < now) return false;
        
        // Filter by status - only include confirmed/active statuses
        const status = (audition.audition_status || '').toLowerCase();
        if (!validStatuses.includes(status)) return false;
        
        return true;
      })
      .sort((a, b) => {
        // Sort by date first, then by title
        const dateA = new Date(a.audition_date || 0);
        const dateB = new Date(b.audition_date || 0);
        
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA - dateB; // Earlier dates first
        }
        
        // If dates are the same, sort by title alphabetically
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return titleA.localeCompare(titleB);
      });
  }, [calanderView]);

  // Group filtered and sorted auditions by location
  const groupedByLocation = useMemo(() => {
    return upcomingAuditions.reduce((locationArray, audition) => {
      const location = audition.location_name || 'Other';
      if (!locationArray[location]) {
        locationArray[location] = [];
      }
      locationArray[location].push(audition);
      return locationArray;
    }, {});
  }, [upcomingAuditions]);

  const handleTabChange = (_, newValue) => {
    setValue(newValue);
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', newValue.toString());
      return newParams;
    });
  };

  return (
    <>
      <div className='topbar-style border-style !p-0'>
        <div className={`w-full flex justify-between items-center px-[16px] `}>
          <CustomTabs
            value={value}
            onChange={handleTabChange}
            aria-label='bookings tabs'
          >
            <CustomTab label='Calander' id='tab-0' aria-controls='tabpanel-0' />
            <CustomTab label='Bookings' id='tab-1' aria-controls='tabpanel-1' />
          </CustomTabs>

          {value === 1 && (
            <div className='flex justify-end items-center gap-4'>
              <Search
                isSearchOpen={isSearchOpen}
                setIsSearchOpen={setIsSearchOpen}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />

              <div className={`${isSearchOpen ? 'hidden sm:block' : 'block'}`}>
                <CustomFilter
                  open={openFilter}
                  setOpen={setOpenFilter}
                  handleClear={handleClear}
                  active={
                    filterOptions.audition_status.find(
                      (option) =>
                        option.value === selectedFilters.audition_status
                    ) ||
                    filterOptions.audition_type.find(
                      (option) => option.value === selectedFilters.audition_type
                    )
                  }
                >
                  <div className='pt-2 flex flex-col gap-3'>
                    <SelectDropdown
                      label='Audition Status'
                      name='audition_status'
                      value={
                        filterOptions.audition_status.find(
                          (option) =>
                            option.value === selectedFilters.audition_status
                        ) || null
                      }
                      onChange={handleFilterChange}
                      options={filterOptions.audition_status}
                      placeholder='Select status'
                      className='w-full'
                      crossIcon={false}
                      sx={{
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'border-style',
                          borderWidth: '1px',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'border-style',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'border-style',
                        },
                        backgroundColor: 'var(--color-white)',
                      }}
                      labelSx={{ color: 'var(--color-secondary-dark)' }}
                      placeholderClassName='!text-secondary-dark'
                    />

                    <SelectDropdown
                      label='Audition Type'
                      name='audition_type'
                      value={
                        filterOptions.audition_type.find(
                          (option) =>
                            option.value === selectedFilters.audition_type
                        ) || null
                      }
                      onChange={handleFilterChange}
                      options={filterOptions.audition_type}
                      placeholder='Select type'
                      className='w-full'
                      crossIcon={false}
                      sx={{
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'border-style',
                          borderWidth: '1px',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'border-style',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'border-style',
                        },
                        backgroundColor: 'var(--color-white)',
                      }}
                      labelSx={{ color: 'var(--color-secondary-dark)' }}
                      placeholderClassName='!text-secondary-dark'
                    />

                    <CustomButton
                      onClick={handleApply}
                      disabled={
                        !selectedFilters.audition_status &&
                        !selectedFilters.audition_type &&
                        !searchQuery
                      }
                      className='!bg-primary !text-white !font-medium !h-[32px] !text-[14px] !px-4 !rounded-md self-end hover:!bg-primary-dark'
                    >
                      Apply
                    </CustomButton>
                  </div>
                </CustomFilter>
              </div>

              <CustomButton
                sx={{
                  display: {
                    xs: isSearchOpen ? 'none' : 'block',
                    sm: 'block',
                  },
                }}
                className={`!h-[28px] sm:!h-[33px] !font-normal bg-primary/80 !py-0 !w-fit !min-w-fit !px-2 sm:!pr-[12px]`}
                onClick={() => navigate('/bookings/add-audition')}
              >
                <div className='flex items-center justify-center gap-1 text-white'>
                  <AddIcon height={16} width={16} />
                  <span className='hidden sm:block'>Audition</span>
                </div>
              </CustomButton>
            </div>
          )}
        </div>
      </div>

      <div className='w-full flex flex-col'>
        <CustomTabPanel value={value} index={0}>
          <div className='w-full h-full p-[10px] flex flex-col max-h-[calc(100vh-130px)] overflow-auto'>
            <div className='w-full h-full'>
              {calanderViewLoading ? (
                <div className='flex justify-center items-center h-[calc(100vh-180px)]'>
                  <CircularProgress
                    size={40}
                    sx={{ color: 'var(--color-primary)' }}
                  />
                </div>
              ) : (
                <div className='flex flex-col xl:flex-row gap-[10px] h-[calc(100vh-150px)]'>
                  {/* Left Div (Calendar View) */}
                  <div className='xl:w-[75%] w-full flex flex-col bg-white border border-style rounded-xl p-3 lg:p-4'>
                    <div className='pb-4'>
                      <h1 className='text-xl md:text-2xl font-semibold text-secondary-dark'>
                        Calendar View
                      </h1>
                      <p className='text-sm text-secondary'>
                        Upcoming bookings for all locations
                      </p>
                    </div>

                    <div className='overflow-auto max-h-[60rem] h-full'>
                      <CalendarEvent
                        events={events}
                        initialView='dayGridMonth'
                        onEventClick={handleEventClick}
                      />
                    </div>
                  </div>

                  {/* Right Div (Upcoming Sessions) */}
                  <div className='min-w-[15rem] xl:w-[25%] w-full flex flex-col bg-white border border-style rounded-xl'>
                    <div className='p-3'>
                      <h1 className='text-xl md:text-2xl font-semibold text-secondary-dark'>
                        Upcoming Sessions
                      </h1>
                      <p className='text-sm text-secondary'>By location</p>
                    </div>

                    <div className='flex-1 overflow-auto'>
                      <div className='h-full p-3'>
                        {Object.entries(groupedByLocation)?.length > 0 ? (
                          Object.entries(groupedByLocation)?.map(
                            ([location, data]) => (
                              <CastingSchedule
                                key={location}
                                location={location}
                                data={data}
                              />
                            )
                          )
                        ) : (
                          <div className='flex items-center justify-center h-full text-center'>
                            <p className='text-lg text-secondary-dark font-medium'>
                              No Data Found
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CustomTabPanel>
        <CustomTabPanel value={value} index={1}>
          <ActorAuditions />
        </CustomTabPanel>
      </div>

      {isViewModalOpen && rowData?.row && (
        <AuditionStepperModal
          open={isViewModalOpen}
          onClose={handleCloseModal}
          initialData={rowData.row}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
          loading={loading}
          deleteLoading={deleteLoading}
          showDelete={true}
          title='Edit Audition'
        />
      )}
    </>
  );
};
