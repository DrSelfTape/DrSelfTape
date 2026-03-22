import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Visibility, Edit, Delete } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import {
  CustomTable,
  CustomModal,
} from '../../../../components/Shared';
import {
  AuditionsColumnData,
  AuditionsColumnExtensionsData,
} from '../../../../components/shared/CustomTable/dummyData';
import {
  ActionUtil,
  AuditionStatusUtil,
} from '../../../../components/shared/TableUtilities';
import {
  getActorAuditions,
  deleteActorAudition,
} from '../../../../redux/features/actorAuditions/actorAuditionsSlice';
import { useSnackbar } from '../../../../hooks/useSnackbar';
import { BookingDetailsModal } from '../../../../components/Booking/BookingDetailsModal';

export const ActorAuditions = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { toast } = useSnackbar();

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [rowData, setRowData] = useState(null);
  const [auditionsList, setAuditionsList] = useState([]);

  const { auditions, loading, deleteLoading } = useSelector(
    (state) => state?.actorAuditions
  );

  useEffect(() => {
    setAuditionsList(auditions || []);
  }, [auditions]);

  useEffect(() => {
    dispatch(getActorAuditions());
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
      icon: <Visibility fontSize="small" className="!text-primary-gray h-[18px] w-[18px]" />,
      label: { text: 'View', sx: { pt: '1px' } },
      onClick: (restProps) => {
        setIsViewModalOpen(true);
        setRowData(restProps);
      },
    },
    {
      icon: <Edit fontSize="small" className="!text-primary-gray h-[18px] w-[18px]" />,
      label: { text: 'Edit', sx: { pt: '1px' } },
      onClick: (restProps) => {
        navigate('/bookings/edit-booking', { state: { ...restProps } });
      },
    },
    {
      icon: <Delete fontSize="small" className="!text-primary-gray h-[18px] w-[18px]" />,
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
        ActionUtil(restProps, popoverData, isViewModalOpen || isDeleteModalOpen),
    },
    {
      columnName: ['Status'],
      func: (restProps) => AuditionStatusUtil(restProps?.row?.audition_status),
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

    const action = await dispatch(deleteActorAudition(rowData.row.id));

    if (action.meta.requestStatus === 'fulfilled') {
      dispatch(getActorAuditions());
      handleCloseModal();
    } else if (action.meta.requestStatus === 'rejected') {
      toast.error(action.payload || 'Failed to delete audition');
    }
  };
  
  return (
    <>
      <div className="">
        <div className="h-[calc(100vh-126px)] overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-[80%]">
              <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <CustomTable
              rows={auditionsList}
              columns={AuditionsColumnData}
              tableColumnExtensions={AuditionsColumnExtensionsData}
              dataProviders={dataProviders}
              metaData={{ totalCount: auditionsList?.length }}
            />
          )}
        </div>
      </div>

      <BookingDetailsModal
        isViewModalOpen={isViewModalOpen}
        rowData={rowData}
        handleCloseModal={handleCloseModal}
        onlyView
      />

      <CustomModal
        open={isDeleteModalOpen}
        title="Delete Audition"
        isDelete
        close={handleCloseModal}
        primaryButtonText="Delete"
        saveButtonSx={{
          width: '120px',
        }}
        handleSave={handleDelete}
        loading={deleteLoading}
      >
        <p className="mt-2 text-primary-darkGray">
          Are you sure you want to delete this audition?
        </p>
      </CustomModal>
    </>
  );
};
