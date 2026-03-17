// LIBRARY IMPORTS
import { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Visibility, Edit, Delete } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';

// LOCAL IMPORTS
import {
  CustomTable,
  CustomModal,
  Search,
  SelectDropdown,
  AddNewButton,
} from '../../../../components/Shared';
import {
  castingAuditionsColumnData,
  castingAuditionsColumnExtensionsData,
} from '../../../../components/shared/CustomTable/dummyData';
import {
  ActionUtil,
  AuditionStatusUtil,
} from '../../../../components/shared/TableUtilities';
import {
  getCastingAuditions,
  deleteCastingAudition,
} from '../../../../redux/features/castingAuditions/castingAuditionsSlice';
import CustomFilter from '../../../../components/Shared/CustomFilter';
import { useSnackbar } from '../../../../hooks/useSnackbar';

export const CastingDirectorAuditions = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { toast } = useSnackbar();

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [rowData, setRowData] = useState(null);
  const [auditionsList, setAuditionsList] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { auditions, loading, deleteLoading } = useSelector(
    (state) => state?.CastingDirectorAuditions
  );

  useEffect(() => {
    setAuditionsList(auditions || []);
  }, [auditions]);

  useEffect(() => {
    dispatch(getCastingAuditions());
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
        <Edit
          fontSize='small'
          sx={{ color: 'primary.gray', height: '18px', width: '18px' }}
        />
      ),
      label: { text: 'Edit', sx: { pt: '1px' } },
      onClick: (restProps) => {
        navigate('/auditions/audition-details', { state: { ...restProps } });
      },
    },
    {
      icon: (
        <Delete
          fontSize='small'
          sx={{ color: 'primary.gray', height: '18px', width: '18px' }}
        />
      ),
      label: { text: 'Delete', sx: { pt: '1px' } },
      onClick: (restProps) => {
        setIsDeleteModalOpen(true);
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

  // Handle delete action
  const handleDelete = async () => {
    if (!rowData?.row?.id) {
      toast.error('No audition selected for deletion');
      return;
    }

    const action = await dispatch(deleteCastingAudition(rowData.row.id));

    if (action.meta.requestStatus === 'fulfilled') {
      dispatch(getCastingAuditions());
      handleCloseModal();
    } else if (action.meta.requestStatus === 'rejected') {
      toast.error(action.payload || 'Failed to delete audition');
    }
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
          className={`border-b border-cool-grey-200 min-h-[65px] flex items-center justify-between px-4 bg-white overflow-auto `}
        >
          <AddNewButton
            text='Audition'
            onClick={() => navigate('/auditions/audition-details')}
            isSearchOpen={isSearchOpen}
          />

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
                columns={castingAuditionsColumnData}
                tableColumnExtensions={castingAuditionsColumnExtensionsData}
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
        saveButton={null}
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

            {/* Deadline */}
            <div className='flex flex-col sm:flex-row sm:justify-between'>
              <span className='text-sm sm:text-base font-medium text-gray-900'>
                Deadline:
              </span>
              <span className='text-sm sm:text-base text-gray-500'>
                {rowData?.row?.deadline || ''}
              </span>
            </div>

            {/* Role */}
            <div className='flex flex-col sm:flex-row sm:justify-between'>
              <span className='text-sm sm:text-base font-medium text-gray-900'>
                Role:
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
          </div>
        </div>
      </CustomModal>

      <CustomModal
        open={isDeleteModalOpen}
        title='Delete Audition'
        isDelete
        close={handleCloseModal}
        primaryButtonText='Delete'
        saveButtonSx={{
          width: '120px',
        }}
        handleSave={handleDelete}
        loading={deleteLoading}
      >
        <Typography mt={2} color='primary.darkGray'>
          Are you sure you want to delete this audition?
        </Typography>
      </CustomModal>
    </>
  );
};
