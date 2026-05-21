// LIBRARY IMPORTS
import { useState } from 'react';
import { Box } from '@mui/material';
import { Visibility } from '@mui/icons-material';

// LOCAL IMPORTS
import {
  CustomTable,
  CustomModal,
  Search,
  SelectDropdown,
} from '../../../../components/Shared';
import {
  ActorBookingColumnData,
  ActorBookingColumnExtensionsData,
} from '../../../../components/Shared/CustomTable/dummyData';
import {
  ActionUtil,
  AuditionStatusUtil,
} from '../../../../components/Shared/TableUtilities';
import CustomFilter from '../../../../components/Shared/CustomFilter';

export const CastingDirectorBooking = () => {

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [rowData, setRowData] = useState(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
  ];

  const dataProviders = [
    {
      columnName: ['action'],
      func: (restProps) =>
        ActionUtil(
          restProps,
          popoverData,
          isViewModalOpen || isDeleteModalOpen
        ),
    },
    {
      columnName: ['status'],
      func: (restProps) => AuditionStatusUtil(restProps?.row?.status),
    },
  ];

  const handleCloseModal = () => {
    setRowData(null);
    setIsViewModalOpen(false);
    setIsDeleteModalOpen(false);
  };

  // handle filters functions
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
          className={`border-b border-cool-grey-200 min-h-[65px] flex items-center justify-between px-4 bg-white overflow-auto `}
        >
          <div className='flex items-center gap-3 w-full justify-end'>
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
            <CustomTable
              rows={[]}
              columns={ActorBookingColumnData}
              tableColumnExtensions={ActorBookingColumnExtensionsData}
              dataProviders={dataProviders}
              metaData={{ totalCount: 0 }}
            />
          </Box>
        </Box>
      </Box>

      <CustomModal
        open={isViewModalOpen}
        title='Booking Details'
        close={handleCloseModal}
        saveButton={null}
      >
        <div className='py-4 px-2 sm:px-4 md:px-6'>
          <div className='space-y-4'>
            {/* Audition */}
            <div className='flex flex-col sm:flex-row sm:justify-between'>
              <span className='text-sm sm:text-base font-medium text-gray-900'>
                Audition:
              </span>
              <span className='text-sm sm:text-base text-gray-500'>
                {rowData?.row?.audition || ''}
              </span>
            </div>

            {/* Location */}
            <div className='flex flex-col sm:flex-row sm:justify-between'>
              <span className='text-sm sm:text-base font-medium text-gray-900'>
                Location:
              </span>
              <span className='text-sm sm:text-base text-gray-500'>
                {rowData?.row?.location || ''}
              </span>
            </div>

            {/* Type */}
            <div className='flex flex-col sm:flex-row sm:justify-between'>
              <span className='text-sm sm:text-base font-medium text-gray-900'>
                Type:
              </span>
              <span className='text-sm sm:text-base text-gray-500'>
                {rowData?.row?.type || ''}
              </span>
            </div>

            {/* Status */}
            <div className='flex flex-col sm:flex-row sm:justify-between'>
              <span className='text-sm sm:text-base font-medium text-gray-900'>
                Status:
              </span>
              <span
                className={`text-sm sm:text-base ${rowData?.row?.status === 'scheduled'
                    ? 'text-success'
                    : rowData?.row?.status === 'completed'
                      ? 'text-success'
                      : 'text-danger'
                  }`}
              >
                {rowData?.row?.status || ''}
              </span>
            </div>
          </div>
        </div>
      </CustomModal>
    </>
  );
};
