import { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Visibility } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import {
  CustomTable,
  CustomModal,
  Search,
  SelectDropdown,
} from '../../../../../components/Shared';
import {
  openAuditionColumnData,
  openAuditionColumnExtensionsData,
} from '../../../../../components/Shared/CustomTable/dummyData';
import {
  ActionUtil,
  AuditionStatusUtil,
} from '../../../../../components/Shared/TableUtilities';
import { getActorCastingAuditions } from '../../../../../redux/features/actorAuditions/actorAuditionsSlice';
import CustomFilter from '../../../../../components/Shared/CustomFilter';
import { AddIcon } from '../../../../../assets/icons';
export const OpenAuditions = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [rowData, setRowData] = useState(null);
  const [auditionsList, setAuditionsList] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { castingAuditions, loading } = useSelector(
    (state) => state?.actorAuditions
  );

  useEffect(() => {
    setAuditionsList(castingAuditions?.open || []);
  }, [castingAuditions]);

  useEffect(() => {
    dispatch(getActorCastingAuditions());
  }, [dispatch]);

  // Filters State
  const [openFilter, setOpenFilter] = useState(false);
  const [filterOptions] = useState({
    dateRange: [
      { label: '7 days', value: '7-days' },
      { label: '30 days', value: '30-days' },
      { label: '90 days', value: '90-days' },
    ],
  });

  const [selectedFilters, setSelectedFilters] = useState({
    dateRange: null,
  });

  // Popover Data for table actions
  const popoverData = [
    {
      icon: (
        <Visibility
          fontSize='small'
          sx={{ color: 'primary.gray', height: '18px', width: '18px' }}
        />
      ),
      label: { text: 'View', sx: { pt: '1px' } },
      onClick: (restProps) => {
        setIsViewModalOpen(true);
        setRowData(restProps);
      },
    },
    {
      icon: (
        <AddIcon
          fontSize='small'
          sx={{ color: 'primary.gray', height: '18px', width: '18px' }}
        />
      ),
      label: { text: 'Create Booking', sx: { pt: '1px' } },
      onClick: (restProps) => {
    navigate('/bookings/booking-details', {
  state: {
    audition: { ...restProps.row }
  }
});

      },
    },
  ];

  const dataProviders = [
    {
      columnName: ['action'],
      func: (restProps) => ActionUtil(restProps, popoverData, isViewModalOpen),
    },
    {
      columnName: ['status'],
      func: (restProps) => AuditionStatusUtil(restProps?.row?.status),
    },
  ];

  const handleCloseModal = () => {
    setRowData(null);
    setIsViewModalOpen(false);
  };

  // Handle filters functions
  const handleFilterChange = (filterType, value) => {
    const isValid = filterOptions[filterType]?.some(
      (option) => option.value === value?.value
    );
    if (!isValid && value !== null) {
      console.warn(`Invalid filter value for ${filterType}:`, value);
      return;
    }

    setSelectedFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
    setOpenFilter(false);
    console.log(`Filter applied for ${filterType}:`, value);
  };

  const handleClear = () => {
    setSelectedFilters({
      dateRange: null,
    });
    setOpenFilter(false);
  };

  return (
    <>
      <Box>
        <div
          className={`border-b border-cool-grey-200 min-h-[65px] flex items-center justify-end px-4 bg-white overflow-auto `}
        >
          <div className='flex items-center gap-3 w-fit'>
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
              >
                <div className='pt-2'>
                  <SelectDropdown
                    label='Date Range'
                    onChange={(e) =>
                      handleFilterChange('dateRange', e.target.value)
                    }
                    options={filterOptions.dateRange}
                    value={selectedFilters.dateRange?.value || ''}
                    className='w-full'
                    crossIcon={false}
                    placeholder='Select a date range'
                  />
                </div>
              </CustomFilter>
            </div>
          </div>
        </div>
        <Box mt='15px' px={{ xxs: '10px', base: '20px' }}>
          <Box height='calc(100vh - 160px)' overflow='auto' mt={2}>
            {loading ? (
              <Box
                display={'flex'}
                justifyContent={'center'}
                alignItems={'center'}
                height={'80%'}
              >
                <CircularProgress size={40} className='!text-primary' />
              </Box>
            ) : (
              <CustomTable
                rows={auditionsList}
                columns={openAuditionColumnData}
                tableColumnExtensions={openAuditionColumnExtensionsData}
                dataProviders={dataProviders}
                metaData={{ totalCount: auditionsList?.length }}
              />
            )}
          </Box>
        </Box>
      </Box>

      <CustomModal
        open={isViewModalOpen}
        title='Audition Details'
        close={handleCloseModal}
        primaryButtonText={'Create Booking'}
        handleSave={()=>navigate('/bookings/booking-details', {
          state: { ...rowData },
        })}
      >
        <div className='py-4 px-2 sm:px-4 md:px-6'>
          <div className='space-y-4'>
            {/* Title */}
            <div className='flex flex-col sm:flex-row sm:justify-between'>
              <span className='text-sm sm:text-base font-medium text-gray-900'>
                Title:
              </span>
              <span className='text-sm sm:text-base text-gray-500'>
                {rowData?.row?.title || ''}
              </span>
            </div>

            {/* Role Info */}
            <div className='flex flex-col sm:flex-row sm:justify-between'>
              <span className='text-sm sm:text-base font-medium text-gray-900'>
                Role Info:
              </span>
              <span className='text-sm sm:text-base text-gray-500'>
                {rowData?.row?.role_info || ''}
              </span>
            </div>

            {/* Description */}
            <div className='flex flex-col sm:flex-row sm:justify-between'>
              <span className='text-sm sm:text-base font-medium text-gray-900'>
                Description:
              </span>
              <span className='text-sm sm:text-base text-gray-500'>
                {rowData?.row?.description || ''}
              </span>
            </div>

            {/* Status */}
            <div className='flex flex-col sm:flex-row sm:justify-between'>
              <span className='text-sm sm:text-base font-medium text-gray-900'>
                Status:
              </span>
              <span
                className={`text-sm sm:text-base ${
                  rowData?.row?.status === 'open'
                    ? 'text-success'
                    : 'text-danger'
                }`}
              >
                {rowData?.row?.status || ''}
              </span>
            </div>

            {/* Deadline */}
            <div className='flex flex-col sm:flex-row sm:justify-between'>
              <span className='text-sm sm:text-base font-medium text-gray-900'>
                Deadline:
              </span>
              <span className='text-sm sm:text-base text-gray-500'>
                {rowData?.row?.deadline || ''}
              </span>
            </div>
          </div>
        </div>
      </CustomModal>
    </>
  );
};
