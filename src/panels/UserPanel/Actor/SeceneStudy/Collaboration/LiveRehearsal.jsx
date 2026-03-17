// Library imports
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// Local imports
import {
  CustomButton,
  CustomTabPanel,
} from '../../../../../components/Shared';
import {
  CustomTab,
  CustomTabs,
  SectionCustomTab,
  SectionCustomTabs,
} from '../../../../../components/Shared';
import ReaderProfileCard from '../../../../../components/sceneStudy/LiveRehearsal/Reader/ReaderProfileCard';
import InviteCoachModal from '../../../../../components/sceneStudy/InviteCoachModal';
import { BecomeCoachModal } from '../../../../../components/sceneStudy/LiveRehearsal/BecomeCoachModal';
import {
  AddProfileIcon,
  StarIcon,
} from '../../../../../assets/icons';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReaderCard from '../../../../../components/sceneStudy/ReaderCard';
import { GenreCard } from '../../../../../components/sceneStudy/LiveRehearsal/Community/GenreCard';
import RepeatIcon from '../../../../../assets/icons/RepeatIcon';
import GlobeIcon from '../../../../../assets/icons/GlobeIcon';
import FlameIcon from '../../../../../assets/icons/FlameIcon';
import { ReaderOnboardingSection } from '../../../../../components/sceneStudy/LiveRehearsal/Community/ReaderOnboardingSection';
import RehearsalProgress from '../../../../../components/sceneStudy/LiveRehearsal/Progress/RehearsalProgress';
import PerformanceGrowth from '../../../../../components/sceneStudy/LiveRehearsal/Progress/PerformanceGrowth';
import Badges from '../../../../../components/sceneStudy/LiveRehearsal/Progress/Badges';
import { useDispatch, useSelector } from 'react-redux';
import { getReaders } from '../../../../../redux/features/sceneStudyScripts/readersSlice';
import { useLocation } from 'react-router-dom';
import { useStoreData } from '../../../../../hooks/useStoreData';
import { filterAvailableReaders } from '../../../../../utils/utils';
import { switchRole } from '../../../../../redux/features/auth/authSlice';
import { useSnackbar } from '../../../../../hooks/useSnackbar';
import { setAuthToken } from '../../../../../redux/http';
import { getFirstRouteByRole } from '../../../../../routes/routeHelpers';

export const LiveRehearsal = () => {
  const [value, setValue] = useState(0);
  const [SectionTabvalue, SectionTabsetValue] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReader, setSelectedReader] = useState(null);
  const [isBecomeCoachModalOpen, setIsBecomeCoachModalOpen] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { toast } = useSnackbar();
  const { role, hasRole, email: currentUserEmail } = useStoreData();
  const {
    readers: readersListing,
    getReadersLoading,
    getReadersError
  } = useSelector((state) => state.readers);
  const { loading: switchRoleLoading } = useSelector((state) => state.auth);

  const location = useLocation();
  const { notification, highlightShareId: stateHighlightId } = location.state || {};

  // Track if modal was opened from notification (vs manual click)
  const [openedFromNotification, setOpenedFromNotification] = useState(false);

  // Extract share ID for highlighting in modal
  // Priority: 1. Direct from state (set by Header), 2. From notification object
  const notificationHighlightId = stateHighlightId ||
    notification?.redirect_info?.object_id ||
    notification?.share_id ||
    notification?.script_share_id ||
    null;

  useEffect(() => {
    dispatch(getReaders());
  }, [dispatch]);

  useEffect(() => {
    if (!notification || !readersListing || readersListing.length === 0) return;

    const matchedReader = readersListing.find(
      (reader) => reader.display_name === notification.sender_name
    );

    if (matchedReader) {
      // Normalize to the same shape used in the Find a Reader tab
      const mapped = transformReaderData(matchedReader);
      setSelectedReader(mapped);
      setOpenedFromNotification(true); // Mark as opened from notification
      setIsModalOpen(true);
    }
  }, [notification, readersListing]);


  // Transform Redux data to component format
  const transformReaderData = (reader) => {
    return {
      id: reader?.id,
      name: reader?.display_name || 'Reader',
      email: reader?.email || reader?.user_email || null,
      rating: reader?.average_rating || null,
      reviewCount: reader?.review_count || 0,
      specialties: Array.isArray(reader?.specialties) ? reader.specialties : [],
      bio: reader?.bio || null,
      headshot: reader?.headshot || null,
      isAvailable: reader?.is_available_now || false,
      hourlyRate: reader?.hourly_rate || null,
      currency: reader?.currency || 'USD',
      yearsExperience: reader?.years_experience || null,
      languages: Array.isArray(reader?.languages) ? reader.languages : [],
      totalSessions: reader?.total_sessions || 0,
      meetingMethods: Array.isArray(reader?.meeting_methods) ? reader.meeting_methods : [],
      requestStatus: reader?.request_status || null,
    };
  };

  // Map Redux readers data - only use real API data
  const mappedReaders = useMemo(() => {
    if (
      !readersListing ||
      !Array.isArray(readersListing) ||
      readersListing.length === 0
    ) {
      return [];
    }
    // Filter out unavailable readers and current user
    const filteredReaders = filterAvailableReaders(readersListing, currentUserEmail);
    return filteredReaders.map(transformReaderData);
  }, [readersListing, currentUserEmail]);

  // Use mapped readers from API
  const readers = mappedReaders;

  // Filter readers for "Available Now" tab
  const availableNowReadersList = useMemo(() => {
    return readers.filter((reader) => reader.isAvailable === true);
  }, [readers]);

  // Sort readers for "Top Rated" tab by average_rating (highest first)
  const topRatedReadersList = useMemo(() => {
    return [...readers]
      .filter((reader) => reader.rating && parseFloat(reader.rating) > 0)
      .sort((a, b) => {
        const ratingA = parseFloat(a.rating) || 0;
        const ratingB = parseFloat(b.rating) || 0;
        return ratingB - ratingA;
      });
  }, [readers]);

  // Extract unique specialties from all readers
  const specialtiesList = useMemo(() => {
    const specialtyMap = new Map();
    readers.forEach((reader) => {
      if (Array.isArray(reader.specialties) && reader.specialties.length > 0) {
        reader.specialties.forEach((specialty) => {
          if (specialty) {
            const count = specialtyMap.get(specialty) || 0;
            specialtyMap.set(specialty, count + 1);
          }
        });
      }
    });
    return Array.from(specialtyMap.entries()).map(([specialty, count]) => ({
      specialty,
      count,
    }));
  }, [readers]);

  // Filter readers by selected specialty
  const specialtyFilteredReaders = useMemo(() => {
    if (!selectedSpecialty) return [];
    return readers.filter((reader) => {
      return (
        Array.isArray(reader.specialties) &&
        reader.specialties.includes(selectedSpecialty)
      );
    });
  }, [readers, selectedSpecialty]);

  // Handler for specialty selection
  const handleSpecialtyClick = (specialty) => {
    if (selectedSpecialty === specialty) {
      setSelectedSpecialty(null); // Deselect if already selected
    } else {
      setSelectedSpecialty(specialty);
    }
  };

  // Filter & Search functionality - Commented for future use
  // const [selectedFilters, setSelectedFilters] = useState({
  //   readerAvailability: '',
  //   readerSort: '',
  // });

  // const filterOptions = {
  //   readerAvailability: [
  //     { label: 'All Readers', value: 'all' },
  //     { label: 'Available Now', value: 'available' },
  //   ],
  //   readerSort: [
  //     { label: 'Most Booked', value: 'booked' },
  //     { label: 'Highly Rated', value: 'rated' },
  //     { label: 'Recently Active', value: 'active' },
  //   ],
  // };

  const handleTabChange = (_, newValue) => {
    setValue(newValue);
  };

  // Filter & Search handlers - Commented for future use
  // const handleFilterChange = (e) => {
  //   const { name, value } = e.target;
  //   setSelectedFilters((prev) => ({
  //     ...prev,
  //     [name]: value?.value || '',
  //   }));
  // };

  // const handleApply = () => {
  //   setOpenFilter(false);
  // };

  // const handleClear = () => {
  //   setSelectedFilters({ readerAvailability: '', readerSort: '' });
  //   setSearchQuery('');
  //   setOpenFilter(false);
  // };

  const handleSectionTabChange = (_, newValue) => {
    SectionTabsetValue(newValue);
    // Clear specialty selection when switching tabs
    if (newValue !== 2) {
      setSelectedSpecialty(null);
    }
  };

  const handleRequestSession = (reader) => {
    setSelectedReader(reader);
    setOpenedFromNotification(false); // Manual click, not from notification
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReader(null);
    setOpenedFromNotification(false); // Reset on close
  };

  // Handle "Become a Reader" - opens coach registration modal
  const handleBecomeACoach = () => {
    // Check if user already has coach permission
    if (hasRole('coach')) {
      toast.info('You already have a coach profile.');
      return;
    }

    // Check if user is an actor
    if (role !== 'actor') {
      toast.error('Only actors can become coaches.');
      return;
    }

    setIsBecomeCoachModalOpen(true);
  };

  // Handle "Switch to Reader" - switches role immediately
  const handleSwitchToReader = async () => {
    if (!hasRole('coach')) {
      toast.error('You do not have a reader profile. Please register first.');
      return;
    }

    try {
      const result = await dispatch(switchRole({ role: 'coach' })).unwrap();

      // Update token
      const newToken = result?.token?.access || result?.access;
      if (newToken) {
        setAuthToken(newToken);
      }

      // Show success message
      toast.success('Successfully switched to reader role.');

      // Navigate to coach dashboard
      const firstRoute = getFirstRouteByRole('coach');
      navigate(firstRoute, { replace: true });
    } catch (error) {
      const errorMessage =
        typeof error === 'string'
          ? error
          : error?.message || 'Failed to switch role. Please try again.';

      toast.error(errorMessage);
    }
  };

  // Handle "Switch to Actor" - switches role back to actor
  const handleSwitchToActor = async () => {
    if (!hasRole('actor')) {
      toast.error('You do not have an actor profile.');
      return;
    }

    try {
      const result = await dispatch(switchRole({ role: 'actor' })).unwrap();

      // Update token
      const newToken = result?.token?.access || result?.access;
      if (newToken) {
        setAuthToken(newToken);
      }

      // Show success message
      toast.success('Successfully switched to actor role.');

      // Navigate to actor dashboard
      const firstRoute = getFirstRouteByRole('actor');
      navigate(firstRoute, { replace: true });
    } catch (error) {
      const errorMessage =
        typeof error === 'string'
          ? error
          : error?.message || 'Failed to switch role. Please try again.';

      toast.error(errorMessage);
    }
  };

  // Determine button text, icon, and action
  const getButtonConfig = () => {
    // If user doesn't have coach permission, show "Become a Reader"
    if (!hasRole('coach')) {
      return {
        text: 'Become a Reader',
        icon: <AddProfileIcon className='w-4 h-4' />,
        onClick: handleBecomeACoach,
        disabled: role !== 'actor' || switchRoleLoading,
      };
    }

    // If user has coach permission but is currently actor, show "Switch to Reader"
    if (hasRole('coach') && role === 'actor') {
      return {
        text: 'Switch to Reader',
        icon: <SwapHorizIcon className='w-4 h-4' />,
        onClick: handleSwitchToReader,
        disabled: switchRoleLoading,
      };
    }

    // If user is already coach (reader), show "Switch to Actor"
    if (role === 'coach' && hasRole('actor')) {
      return {
        text: 'Switch to Actor',
        icon: <SwapHorizIcon className='w-4 h-4' />,
        onClick: handleSwitchToActor,
        disabled: switchRoleLoading,
      };
    }

    // Default: hide button
    return {
      text: null,
      icon: null,
      onClick: null,
      disabled: false,
    };
  };

  const buttonConfig = getButtonConfig();

  return (
    <>
      {/* Top Header */}
      <div className='topbar-style border-style !p-0'>
        <div className='w-full flex justify-between items-center px-[16px]'>
          {/* Tabs */}
          <CustomTabs
            value={value}
            onChange={handleTabChange}
            aria-label='Live Rehearsal Tabs'
          >
            <CustomTab
              label='Find a Reader'
              id='tab-0'
              aria-controls='tabpanel-0'
            />
            <CustomTab
              label='Community'
              id='tab-1'
              aria-controls='tabpanel-1'
            />
          </CustomTabs>
        </div>
      </div>

      {/* Tab Panels */}
      <div className='w-full flex flex-col'>
        <CustomTabPanel value={value} index={0}>
          <div className='m-[10px]'>
            {getReadersLoading ? (
              <div className='flex items-center justify-center h-[400px]'>
                <div className='flex flex-col items-center gap-3'>
                  <div className='h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin' />
                  <p className='text-sm text-muted-foreground'>Loading readers...</p>
                </div>
              </div>
            ) : getReadersError ? (
              <div className='flex items-center justify-center h-[400px]'>
                <div className='flex flex-col items-center gap-3 text-center'>
                  <p className='text-lg font-semibold text-destructive'>
                    Error loading readers
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    {getReadersError || 'Something went wrong. Please try again later.'}
                  </p>
                  <CustomButton
                    onClick={() => dispatch(getReaders())}
                    className='!mt-2'
                  >
                    Retry
                  </CustomButton>
                </div>
              </div>
            ) : readers.length === 0 ? (
              <div className='flex items-center justify-center h-[400px]'>
                <div className='flex flex-col items-center gap-3 text-center'>
                  <p className='text-lg font-semibold'>No readers found</p>
                  <p className='text-sm text-muted-foreground'>
                    There are no readers available at the moment. Please check back later.
                  </p>
                </div>
              </div>
            ) : (
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[10px]'>
                {readers.map((reader, index) => (
                  <ReaderProfileCard
                    key={reader.id || `reader-${index}`}
                    {...reader}
                    onRequestSession={() => handleRequestSession(reader)}
                  />
                ))}
              </div>
            )}
          </div>
        </CustomTabPanel>
        <CustomTabPanel value={value} index={1}>
          <div className={`grid grid-cols-1 gap-[10px] m-[10px] ${!hasRole('coach') ? 'md:grid-cols-[7fr_3fr]' : 'md:grid-cols-1'}`}>
            <div>
              <div className='card-section'>
                <div className='flex gap-[10px] flex-col sm:flex-row justify-between items-center'>
                  <div>
                    <h1 className='text-xl font-semibold'>Reader Community</h1>

                    <p className='text-sm text-input-title max-w-md'>
                      Connect with other actors and help each other prepare for
                      auditions
                    </p>
                  </div>
                  {buttonConfig.text && (
                    <CustomButton
                      className={'!min-w-[170px]'}
                      onClick={buttonConfig.onClick}
                      disabled={buttonConfig.disabled}
                    >
                      <div className='flex items-center gap-1'>
                        {switchRoleLoading ? (
                          <>
                            <div className='h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                            <span className='pt-[2.5px]'>Processing...</span>
                          </>
                        ) : (
                          <>
                            {buttonConfig.icon}
                            <span className='pt-[2.5px]'>{buttonConfig.text}</span>
                          </>
                        )}
                      </div>
                    </CustomButton>
                  )}
                </div>

                <div className='pt-3 lg:pt-6'>
                  <div className='inline-flex h-10 items-center justify-center bg-gray-100 text-gray-600 rounded-md p-1'>
                    <SectionCustomTabs
                      value={SectionTabvalue}
                      onChange={handleSectionTabChange}
                      aria-label='custom tabs'
                    >
                      <SectionCustomTab
                        label='Available Now'
                        id='tab-0'
                        aria-controls='tabpanel-0'
                      />
                      <SectionCustomTab
                        label='Top Reated'
                        id='tab-1'
                        aria-controls='tabpanel-1'
                      />
                      <SectionCustomTab
                        label='Specialties'
                        id='tab-2'
                        aria-controls='tabpanel-2'
                      />
                    </SectionCustomTabs>
                  </div>

                  {/* Tab Panels */}
                  <div className='w-full mt-[10px] flex flex-col'>
                    <CustomTabPanel value={SectionTabvalue} index={0}>
                      {availableNowReadersList.length === 0 ? (
                        <div className='flex items-center justify-center py-12'>
                          <div className='flex flex-col items-center gap-3 text-center'>
                            <p className='text-lg font-semibold'>
                              No Readers Available Now
                            </p>
                            <p className='text-sm text-muted-foreground max-w-sm'>
                              There are no readers available at the moment. Please
                              check back later.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className='flex flex-col 1xl:grid md:grid-cols-2 gap-[10px]'>
                          {availableNowReadersList.map((reader, index) => (
                            <ReaderCard
                              key={reader.id || `available-reader-${index}`}
                              name={reader.name}
                              rating={
                                reader.rating
                                  ? parseFloat(reader.rating).toFixed(1)
                                  : null
                              }
                              count={reader.reviewCount || 0}
                              countLabel='reviews'
                              status='Available'
                              headshot={reader.headshot}
                              image={reader.headshot || null}
                              user_image={reader.headshot || null}
                              isOffline={false}
                              onConnect={() => handleRequestSession(reader)}
                            />
                          ))}
                        </div>
                      )}
                    </CustomTabPanel>

                    <CustomTabPanel value={SectionTabvalue} index={1}>
                      {topRatedReadersList.length === 0 ? (
                        <div className='flex items-center justify-center py-12'>
                          <div className='flex flex-col items-center gap-3 text-center'>
                            <p className='text-lg font-semibold'>
                              No Rated Readers Found
                            </p>
                            <p className='text-sm text-muted-foreground max-w-sm'>
                              There are no readers with ratings yet. Check back
                              later for top-rated readers.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className='flex flex-col 1xl:grid md:grid-cols-2 gap-[10px]'>
                          {topRatedReadersList.map((reader, index) => (
                            <ReaderCard
                              key={reader.id || `rated-reader-${index}`}
                              name={reader.name}
                              rating={parseFloat(reader.rating).toFixed(1)}
                              count={reader.reviewCount || 0}
                              countLabel='reviews'
                              status={
                                reader.isAvailable ? 'Available' : 'Offline'
                              }
                              headshot={reader.headshot}
                              image={reader.headshot || null}
                              user_image={reader.headshot || null}
                              isOffline={!reader.isAvailable}
                              onConnect={() => handleRequestSession(reader)}
                            />
                          ))}
                        </div>
                      )}
                    </CustomTabPanel>
                    <CustomTabPanel value={SectionTabvalue} index={2}>
                      {selectedSpecialty ? (
                        <div>
                          <div className='flex items-center justify-between mb-4'>
                            <h3 className='text-lg font-semibold'>
                              Readers in {selectedSpecialty}
                            </h3>
                            <button
                              onClick={() => setSelectedSpecialty(null)}
                              className='flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark font-medium transition-colors cursor-pointer'
                            >
                              <ArrowBackIcon fontSize='small' />
                              Back
                            </button>
                          </div>
                          {specialtyFilteredReaders.length === 0 ? (
                            <div className='flex items-center justify-center py-12'>
                              <div className='flex flex-col items-center gap-3 text-center'>
                                <p className='text-lg font-semibold'>
                                  No Readers Found
                                </p>
                                <p className='text-sm text-muted-foreground max-w-sm'>
                                  No readers found for {selectedSpecialty}.
                                  Please try another specialty.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className='flex flex-col 1xl:grid md:grid-cols-2 gap-[10px]'>
                              {specialtyFilteredReaders.map((reader, index) => (
                                <ReaderCard
                                  key={reader.id || `specialty-reader-${index}`}
                                  name={reader.name}
                                  rating={
                                    reader.rating
                                      ? parseFloat(reader.rating).toFixed(1)
                                      : null
                                  }
                                  count={reader.reviewCount || 0}
                                  countLabel='reviews'
                                  status={
                                    reader.isAvailable ? 'Available' : 'Offline'
                                  }
                                  headshot={reader.headshot}
                                  image={reader.headshot || null}
                                  user_image={reader.headshot || null}
                                  isOffline={!reader.isAvailable}
                                  onConnect={() => handleRequestSession(reader)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          {specialtiesList.length === 0 ? (
                            <div className='flex items-center justify-center py-12'>
                              <div className='flex flex-col items-center gap-3 text-center'>
                                <p className='text-lg font-semibold'>
                                  No Specialties Found
                                </p>
                                <p className='text-sm text-muted-foreground max-w-sm'>
                                  There are no specialties available at the
                                  moment. Please check back later.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                              {specialtiesList.map((item, index) => (
                                <GenreCard
                                  key={index}
                                  genre={item.specialty}
                                  readers={item.count}
                                  onClick={() =>
                                    handleSpecialtyClick(item.specialty)
                                  }
                                />
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </CustomTabPanel>
                  </div>
                </div>
              </div>

            </div>
            <div>
              {/* Become a Reader section - Only show if user is not already a reader */}
              {!hasRole('coach') && (
                <div className='card-section'>
                  <div>
                    <h1 className='text-xl font-semibold'>Become a Reader</h1>

                    <p className='text-sm text-input-title max-w-md'>
                      Help other actors and earn while you learn
                    </p>
                  </div>
                  <ReaderOnboardingSection onCreateProfile={handleBecomeACoach} />
                </div>
              )}
            </div>
          </div>
        </CustomTabPanel>
        <CustomTabPanel value={value} index={2}>
          <div className='grid grid-cols-1 md:grid-cols-[7fr_3fr] gap-[10px] m-[10px]'>
            <div>
              <div className='card-section'>
                <div>
                  <h1 className='text-xl font-semibold'>
                    Your Rehearsal Progress
                  </h1>
                  <p className='text-sm text-input-title max-w-md'>
                    Track your growth and achievements
                  </p>
                </div>
                <RehearsalProgress />
              </div>
              <div className='card-section mt-[10px]'>
                <div>
                  <h1 className='text-xl font-semibold'>Performance Growth</h1>

                  <p className='text-sm text-input-title max-w-md'>
                    Track your improvement over time
                  </p>
                </div>
                <PerformanceGrowth />
              </div>
            </div>
            <div>
              <div className='card-section'>
                <div>
                  <h1 className='text-xl font-semibold'>Your Badges</h1>

                  <p className='text-sm text-input-title max-w-md'>
                    Achievements unlocked through rehearsals
                  </p>
                </div>
                <Badges />
              </div>
            </div>
          </div>
        </CustomTabPanel>
      </div>

      {selectedReader && (
        <InviteCoachModal
          open={isModalOpen}
          onClose={handleCloseModal}
          coachId={selectedReader.id}
          coachName={selectedReader.name}
          coachEmail={selectedReader.email || ''}
          highlightShareId={openedFromNotification ? notificationHighlightId : null}
        />
      )}

      <BecomeCoachModal
        open={isBecomeCoachModalOpen}
        onClose={() => setIsBecomeCoachModalOpen(false)}
      />
    </>
  );
};
