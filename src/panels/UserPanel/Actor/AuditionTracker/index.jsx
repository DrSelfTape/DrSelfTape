// src/components/AuditionTracker.js
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box, CircularProgress, TextField } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import {
  BookmarkIcon,
  ClockIcon,
  CrossIcon,
  FlashIcon,
  StarIcon,
  TargetIcon,
} from '../../../../assets/icons';
import AuditionActivityChart from '../../../../components/Audition/AuditionActivityChart';
import BookingRatioChart from '../../../../components/Audition/BookingRatioChart';
import {
  AddNewButton,
  StatsCard,
} from '../../../../components/shared';
import { getAuditionTracker } from '../../../../redux/features/actorAuditions/auditionTrackerSlice';
import { BadgeDetailModal } from '../../../../components/Booking/BadgeDetailModal';

export const AuditionTracker = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    auditionTracker,
    bookingRatio,
    auditionTimeline,
    milestoneBadges,
    loading,
    goalProgress,
  } = useSelector((state) => state.auditionTracker);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);


  const [date, setDate] = useState(dayjs());

  useEffect(() => {
    dispatch(getAuditionTracker({
      month: searchParams.get('date') || dayjs().format('YYYY-MM'),
    }));
  }, [searchParams]);

  const stats = [
    {
      name: 'Total Auditions',
      amount: auditionTracker?.totalAuditions?.value || '0',
      percentage: auditionTracker?.totalAuditions?.change || '0',
      metrics: auditionTracker?.totalAuditions?.change || '0',
    },
    {
      name: 'Callback Received',
      amount: auditionTracker?.callbacksReceived?.value || '0',
      percentage: auditionTracker?.callbacksReceived?.change || '0',
      metrics: auditionTracker?.callbacksReceived?.change || '0',
    },
    {
      name: 'Roles Booked',
      amount: auditionTracker?.rolesBooked?.value || '0',
      percentage: auditionTracker?.rolesBooked?.change || '0',
      metrics: auditionTracker?.rolesBooked?.change || '0',
    },
    {
      name: 'Booking Rate',
      amount: `${auditionTracker?.bookingRate?.value}%` || '0%',
      percentage: auditionTracker?.bookingRate?.change || '0',
      metrics: auditionTracker?.bookingRate?.change || '0',
    },
    {
      name: 'Most Common Type',
      amount: auditionTracker?.mostCommonType?.type || '',
      percentage: auditionTracker?.mostCommonType?.count || '0',
      metrics: auditionTracker?.mostCommonType?.count || '0',
    },
  ];

  const data = [
    {
      name: '',
      Booked: bookingRatio.counts?.booked || 0,
      Callback: bookingRatio.counts?.callback || 0,
      NotSelected: bookingRatio.counts?.not_selected || 0,
    },
  ];

  const stackKeys = ['Booked', 'Callback', 'NotSelected'];
  const colors = ['#a7ecda', '#fce072', '#ffb49a'];

  const getAuditionIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'callback':
        return {
          icon: <ClockIcon className='!size-5' />,
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          statusBg: 'bg-yellow-50',
          statusText: 'text-yellow-700',
        };
      case 'rejected':
      case 'not_selected':
        return {
          icon: <CrossIcon className='!size-4' />,
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          statusBg: 'bg-red-50',
          statusText: 'text-red-700',
        };
      case 'booked':
        return {
          icon: <StarIcon className='!size-5' />,
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          statusBg: 'bg-green-50',
          statusText: 'text-green-700',
        };
      default:
        return {
          icon: <ClockIcon className='!size-5' />,
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600',
          statusBg: 'bg-gray-50',
          statusText: 'text-gray-700',
        };
    }
  };

  // Default badges to show in false mode when no API data
  const defaultBadges = [
    {
      id: 'first_audition',
      name: 'First Audition',
      description: 'Completed your first audition',
      earned: false,
    },
    {
      id: 'five_auditions',
      name: 'Five Auditions',
      description: 'Completed 5 auditions',
      earned: false,
    },
    {
      id: 'first_callback',
      name: 'First Callback',
      description: 'Received your first callback',
      earned: false,
    },
    {
      id: 'ten_auditions',
      name: 'Ten Auditions',
      description: 'Completed 10 auditions',
      earned: false,
    },
    {
      id: 'first_booking',
      name: 'First Booking',
      description: 'Booked your first role',
      earned: false,
    },
    {
      id: 'twenty_five_auditions',
      name: 'Twenty Five Auditions',
      description: 'Completed 25 auditions',
      earned: false,
    },
  ];

  useEffect(() => {
    setSearchParams({ date: dayjs(date)?.format('YYYY-MM') });
  }, [date]);

  const handleBadgeClick = (badge) => {
    setSelectedBadge(badge);
    setIsBadgeModalOpen(true);
  };

  return (
    <>
      <div className='topbar-style border-style'>
        <AddNewButton
          text='Audition'
          onClick={() => navigate('/auditions-tracker/add-audition')}
          isSearchOpen={isSearchOpen}
        />
        <div className='flex items-center gap-3 w-fit ml-auto select-none'>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              variant="standard"
              views={['month', 'year']}
              value={date}
              onChange={(newValue) => setDate(newValue)}
              slotProps={{
                textField: {
                  size: 'small',
                  color: 'gray',
                  borderWidth: '1px !important',
                  sx: {
                    [`.Mui-focused .MuiPickersOutlinedInput-notchedOutline`]: {
                      borderWidth: '1px !important',
                    },
                    maxWidth: "200px",
                  },
                },
              }}
            />
          </LocalizationProvider>
        </div>
      </div>
      <div className='p-[10px]'>
        {loading ? (
          <Box
            display='flex'
            justifyContent='center'
            alignItems='center'
            height='80vh'
          >
            <CircularProgress size={40} className='!text-primary' />
          </Box>
        ) : (
          <>
            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full'>
              {stats?.map((state, index) => (
                <StatsCard
                  name={state?.name}
                  amount={state?.amount}
                  percentage={state?.percentage}
                  metrics={state?.metrics}
                  key={index}
                />
              ))}
            </div>

            <div className='flex flex-col lg:flex-row gap-4 mt-[10px]'>
              <div className='card-section w-full lg:w-1/2 p-3 md:p-6'>
                <div>
                  <h1 className='text-xl md:2xl font-semibold'>
                    Audition Activity
                  </h1>
                  <p className='text-sm text-input-title'>
                    Audition outcomes this month
                  </p>
                </div>

                <AuditionActivityChart
                  total={goalProgress?.goal}
                  completed={goalProgress?.actual}
                />
              </div>

              <div className='card-section w-full lg:w-1/2 p-3 md:p-6'>
                <div className='mb-8'>
                  <h1 className='text-xl md:2xl font-semibold'>
                    Booking Ratio
                  </h1>
                  <p className='text-sm text-input-title'>
                    Audition outcomes this month
                  </p>
                </div>
                <BookingRatioChart
                  data={data}
                  stackKeys={stackKeys}
                  colors={colors}
                />
                <div className='mt-4 flex justify-around text-center'>
                  <div>
                    <div className='text-lg font-bold'>
                      {bookingRatio.booking_rate || 0}%
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      Booking Rate
                    </div>
                  </div>
                  <div>
                    <div className='text-lg font-bold'>
                      {bookingRatio.callback_rate || 0}%
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      Callback Rate
                    </div>
                  </div>
                  <div>
                    <div className='text-lg font-bold'>
                      {bookingRatio.not_selected_rate || 0}%
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      Not Selected
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className='w-full card-section mt-[10px]'>
              <div className='mb-8'>
                <h1 className='text-xl md:2xl font-semibold'>
                  Audition Timeline
                </h1>
                <p className='text-sm text-input-title'>
                  Recent audition history and outcomes
                </p>
              </div>
              <div className='space-y-4'>
                {auditionTimeline?.length > 0 ? (
                  auditionTimeline?.map((audition, index) => {
                    const { icon, iconBg, iconColor, statusBg, statusText } =
                      getAuditionIcon(audition.status);
                    return (
                      <div
                        className='flex items-start gap-3 w-full h-full'
                        key={audition.id || index}
                      >
                        <div className='h-full flex flex-col items-center'>
                          <div
                            className={`${iconBg} rounded-full p-1 ${iconColor}`}
                          >
                            {icon}
                          </div>
                          {index !== auditionTimeline?.length - 1 && (
                            <div className='mt-1 min-h-[8rem] h-full !w-[2px] border-r border-neutral-600' />
                          )}
                        </div>
                        <div className='bg-white border border-neutral-500 rounded-lg p-4 w-full'>
                          <div className='flex items-start justify-between'>
                            <div className='flex items-start space-x-4 flex-1'>
                              <div className='flex-1 min-w-0'>
                                <div className='flex items-start justify-between mb-1'>
                                  <h3 className='text-lg font-semibold text-gray-900'>
                                    {audition.title}
                                  </h3>
                                  <span className='text-sm text-gray-500 whitespace-nowrap ml-4'>
                                    {audition.date}
                                  </span>
                                </div>
                                <div className='flex items-center space-x-3 mb-3'>
                                  <span className='text-gray-700 font-medium'>
                                    {audition.project}
                                  </span>
                                  <span className='px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-medium rounded-full'>
                                    {audition.type}
                                  </span>
                                </div>
                                <p className='text-input-title mb-4 text-sm'>
                                  {audition.description === 'N/A'
                                    ? 'Description not added'
                                    : audition.description}
                                </p>
                                <div className='flex items-center gap-4'>
                                  <span
                                    className={`px-3 py-1 rounded-full text-sm font-medium ${statusBg} ${statusText}`}
                                  >
                                    {audition.status}
                                  </span>
                                  <span className='text-sm text-gray-500'>
                                    CD: {audition.casting_director_name}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className='text-center text-gray-500 text-lg'>
                    No Data Found
                  </div>
                )}
              </div>
            </div>
            <div className='w-full card-section mt-[10px]'>
              <div className='mb-8'>
                <h1 className='text-xl md:2xl font-semibold'>
                  Milestone Badges
                </h1>
                <p className='text-sm text-input-title'>
                  Achievements and progress
                </p>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
                {(milestoneBadges?.length > 0
                  ? milestoneBadges
                  : defaultBadges
                )?.map((milestone, index) => {
                  const iconMap = {
                    first_audition: <BookmarkIcon />,
                    five_auditions: <FlashIcon className='!size-7' />,
                    first_callback: <TargetIcon className='!size-7' />,
                    ten_auditions: <FlashIcon className='!size-7' />,
                    first_booking: <BookmarkIcon />,
                    twenty_five_auditions: <FlashIcon className='!size-7' />,
                  };

                  const gradiant = {
                    0: 'bg-amber-100',
                    1: 'bg-cyan-100',
                    2: 'bg-emerald-100',
                    3: 'bg-purple-100',
                    4: 'bg-rose-100',
                    5: 'bg-indigo-100',
                  };

                  // Calculate progress for unearned badges
                  const getProgress = () => {
                    if (milestone?.earned) return null;
                    const progressMap = {
                      five_auditions: { 
                        current: auditionTracker?.totalAuditions?.value || 0, 
                        target: 5 
                      },
                      ten_auditions: { 
                        current: auditionTracker?.totalAuditions?.value || 0, 
                        target: 10 
                      },
                      twenty_five_auditions: { 
                        current: auditionTracker?.totalAuditions?.value || 0, 
                        target: 25 
                      },
                    };
                    return progressMap[milestone.id] || null;
                  };

                  const progress = getProgress();
                  const progressPercentage = progress 
                    ? Math.min((progress.current / progress.target) * 100, 100)
                    : 0;

                  return (
                    <div
                      key={milestone?.id}
                      onClick={() => handleBadgeClick(milestone)}
                      className={`relative overflow-hidden transition-all duration-300 rounded-xl hover:scale-105 hover:shadow-lg !cursor-pointer ${milestone?.earned
                        ? `${[gradiant[index]]} border border-white shadow-lg`
                        : 'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200'
                        }`}
                    >
                      {milestone?.earned && (
                        <div className='absolute top-3 right-3 bg-success text-white text-xs p-1 rounded'>
                          <StarIcon className='!size-3 text-white' />
                        </div>
                      )}

                      <div className='p-6 text-center space-y-4'>
                        <div
                          className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${milestone?.earned
                            ? 'bg-white shadow-lg ring-4 ring-white/50'
                            : 'bg-gray-200'
                            }`}
                        >
                          {iconMap[milestone.id] || <BookmarkIcon />}
                        </div>

                        <div className='space-y-2'>
                          <h3
                            className={`text-xl font-semibold transition-colors duration-300 ${milestone?.earned
                              ? 'text-gray-900'
                              : 'text-gray-500'
                              }`}
                          >
                            {milestone?.name}
                          </h3>
                          <p
                            className={`text-sm transition-colors duration-300 ${milestone?.earned
                              ? 'text-gray-700'
                              : 'text-gray-400'
                              }`}
                          >
                            {milestone?.description}
                          </p>
                        </div>

                        {!milestone?.earned && progress && (
                          <div className='pt-2 px-2'>
                            <div className='flex justify-between items-center mb-1'>
                              <span className='text-xs text-gray-500'>Progress</span>
                              <span className='text-xs font-semibold text-gray-600'>
                                {progress.current} / {progress.target}
                              </span>
                            </div>
                            <div className='w-full bg-gray-200 rounded-full h-1.5'>
                              <div
                                className='bg-primary h-1.5 rounded-full transition-all duration-300'
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {!milestone?.earned && !progress && (
                          <div className='pt-2'>
                            <p className='text-xs text-gray-500 mt-1'>
                              Not yet achieved
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <BadgeDetailModal
        open={isBadgeModalOpen}
        onClose={() => {
          setIsBadgeModalOpen(false);
          setSelectedBadge(null);
        }}
        badge={selectedBadge}
        totalAuditions={auditionTracker?.totalAuditions?.value || 0}
        totalCallbacks={auditionTracker?.callbacksReceived?.value || bookingRatio?.counts?.callback || 0}
      />
    </>
  );
};
