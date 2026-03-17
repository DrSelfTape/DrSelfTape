import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import {
  CustomButton,
  CustomModal,
  CustomTabPanel,
} from '../../../components/Shared';
import {
  deleteActorAudition,
  updateActorAudition,
  getActorAuditions,
  addActorAuditionMaterial,
  deleteActorAuditionMaterial,
  getActorAuditionsMaterialListing,
} from '../../../redux/features/actorAuditions/actorAuditionsSlice';
import { useSnackbar } from '../../../hooks/useSnackbar';
import {
  BriefcaseIcon,
  DeleteIcon,
  SaveIcon,
  Edit2Icon,
} from '../../../assets/icons';
import styled from '@emotion/styled';
import { Tab, Tabs } from '@mui/material';
import { Line } from '../../../components/Shared/Line';
import AuditionMaterialsTab from './AuditionMaterialTab';
import AuditionDetailsTab from './AuditionDetailsTab';

const OPTIONS = {
  status: [
    { label: 'Open', value: 'open' },
    { label: 'Closed', value: 'closed' },
    { label: 'Completed', value: 'completed' },
  ],
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
  gender_preference: [
    { label: 'Any', value: 'any' },
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Non-Binary', value: 'non_binary' },
  ],
  purpose: [
    { label: 'Theatrical', value: 'Theatrical' },
    { label: 'Commercial', value: 'Commercial' },
    { label: 'Industrial', value: 'Industrial' },
    { label: 'Others', value: 'Others' },
  ],
  submission_method: [
    { label: 'Self Tape', value: 'self_tape' },
    { label: 'In Person', value: 'in_person' },
    { label: 'Virtual', value: 'virtual' },
  ],
};

const INITIAL_FORM_DATA = {
  id: '',
  title: '',
  description: '',
  purpose: '',
  status: 'open',
  file: null,
  audition_date: null,
  audition_time: null,
  casting_director_name: '',
  casting_director_company: '',
  casting_director_contact: '',
  location_name: '',
  location_address: '',
  is_virtual: 'false',
  virtual_link: '',
  project_name: '',
  role_name: '',
  role_description: '',
  audition_type: 'commercial',
  audition_status: 'preparing',
  gender_preference: 'any',
  self_notes: '',
  submission_method: '',
  materials: [],
};

const CustomTab = styled(Tab)(({ theme }) => ({
  minHeight: 'auto',
  height: '30px',
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.875rem',
  color: 'var(--color-secondary-dark)',
  padding: '6px 12px',
  borderRadius: '0.125rem',
  transition: 'all 0.2s',
  '&.Mui-selected': {
    color: 'var(--color-primary-dark)',
    backgroundColor: 'var(--color-primary-light)',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  '&:hover': {
    color: 'var(--color-primary-dark)',
  },
  '&:focus-visible': {
    outline: 'none',
    boxShadow: `0 0 0 2px var(--color-primary), 0 0 0 4px rgba(255, 255, 255, 0.5)`,
  },
  '&.Mui-disabled': {
    pointerEvents: 'none',
    opacity: 0.5,
  },
}));

const CustomTabs = styled(Tabs)({
  minHeight: 'auto',
  '& .MuiTabs-indicator': {
    display: 'none',
  },
});

export const BookingDetailsModal = ({
  isViewModalOpen,
  rowData,
  handleCloseModal,
  onlyView,
}) => {
  const dispatch = useDispatch();
  const { toast } = useSnackbar();
  const { loading, deleteLoading, materialLoading, materials } = useSelector(
    (state) => state.actorAuditions
  );
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isEditingMaterials, setIsEditingMaterials] = useState(false);
  const [showDeleteConfirmDetails, setShowDeleteConfirmDetails] =
    useState(false);
  const [showDeleteConfirmMaterials, setShowDeleteConfirmMaterials] =
    useState(false);
  const [materialToDelete, setMaterialToDelete] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [value, setValue] = useState(0);

  const handleTabChange = (_, newValue) => setValue(newValue);

  useEffect(() => {
    if (isViewModalOpen) {
      setIsEditingDetails(false);
      setIsEditingMaterials(false);
      setShowDeleteConfirmDetails(false);
      setShowDeleteConfirmMaterials(false);
      setMaterialToDelete(null);
      setFormData(INITIAL_FORM_DATA);
    }

    if (rowData?.row) {
      const validateSelectValue = (key, value) => {
        if (!OPTIONS[key]) return '';
        return OPTIONS[key].some((option) => option.value === value)
          ? value
          : OPTIONS[key][0].value;
      };

      setFormData({
        id: rowData.row.id || '',
        title: rowData.row.title || '',
        description: rowData.row.description || '',
        purpose: validateSelectValue('purpose', rowData.row.purpose),
        status: validateSelectValue('status', rowData.row.status || 'open'),
        file: rowData.row.file || null,
        audition_date: rowData.row.audition_date
          ? dayjs(rowData.row.audition_date)
          : null,
        audition_time: rowData.row.audition_time
          ? dayjs(rowData.row.audition_time, 'HH:mm')
          : null,
        casting_director_name: rowData.row.casting_director_name || '',
        casting_director_company: rowData.row.casting_director_company || '',
        casting_director_contact: rowData.row.casting_director_contact || '',
        location_name: rowData.row.location_name || '',
        location_address: rowData.row.location_address || '',
        is_virtual: rowData.row.is_virtual?.toString() || 'false',
        virtual_link: rowData.row.virtual_link || '',
        project_name: rowData.row.project_name || '',
        role_name: rowData.row.role_name || '',
        role_description: rowData.row.role_description || '',
        audition_type: validateSelectValue(
          'audition_type',
          rowData.row.audition_type || 'commercial'
        ),
        audition_status: validateSelectValue(
          'audition_status',
          rowData.row.audition_status || 'preparing'
        ),
        gender_preference: validateSelectValue(
          'gender_preference',
          rowData.row.gender_preference || 'any'
        ),
        self_notes: rowData.row.self_notes || '',
        submission_method: validateSelectValue(
          'submission_method',
          rowData.row.submission_method
        ),
        materials: rowData?.row?.uploads || [],
      });
    }
  }, [rowData, isViewModalOpen]);

  // In BookingDetailsModal.js - Add useEffect for initial fetch
  useEffect(() => {
    if (isViewModalOpen && rowData?.row?.id) {
      dispatch(
        getActorAuditionsMaterialListing({ self_audition_id: rowData.row.id })
      );
    }
  }, [isViewModalOpen, rowData, dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'file'
          ? e.target.files[0] || null
          : [
              'status',
              'audition_status',
              'audition_type',
              'gender_preference',
              'purpose',
              'submission_method',
            ].includes(name)
          ? value?.value || ''
          : value || '',
    }));
  };

  const handleDateChange = (name) => (date) => {
    setFormData((prev) => ({ ...prev, [name]: date }));
  };

  const handleDeleteDetails = async () => {
    if (!rowData?.row?.id) {
      toast.error('No audition selected for deletion');
      return;
    }
    const action = await dispatch(deleteActorAudition(rowData.row.id));
    if (action.meta.requestStatus === 'fulfilled') {
      dispatch(getActorAuditions());
      handleCloseModal();
    } else {
      toast.error(action.payload || 'Failed to delete audition');
    }
  };

  const handleSaveDetails = async () => {
    if (!formData.id) {
      toast.error('No audition ID provided for update');
      return;
    }
    const values = new FormData();
    values.append('title', formData.title || '');
    values.append('description', formData.description || '');
    values.append('purpose', formData.purpose || '');
    values.append('status', formData.status || 'open');
    if (formData.file) values.append('attachments', formData.file);
    values.append(
      'audition_date',
      formData.audition_date
        ? dayjs(formData.audition_date).format('YYYY-MM-DD')
        : ''
    );
    values.append(
      'audition_time',
      formData.audition_time
        ? dayjs(formData.audition_time, 'HH:mm').format('HH:mm')
        : ''
    );
    values.append(
      'casting_director_name',
      formData.casting_director_name || ''
    );
    values.append(
      'casting_director_company',
      formData.casting_director_company || ''
    );
    values.append(
      'casting_director_contact',
      formData.casting_director_contact || ''
    );
    values.append('location_name', formData.location_name || '');
    values.append('location_address', formData.location_address || '');
    values.append('is_virtual', formData.is_virtual || 'false');
    values.append('virtual_link', formData.virtual_link || '');
    values.append('project_name', formData.project_name || '');
    values.append('role_name', formData.role_name || '');
    values.append('role_description', formData.role_description || '');
    values.append('audition_type', formData.audition_type || 'commercial');
    values.append('audition_status', formData.audition_status || 'preparing');
    values.append('gender_preference', formData.gender_preference || 'any');
    values.append('self_notes', formData.self_notes || '');
    values.append('submission_method', formData.submission_method || '');

    const action = await dispatch(
      updateActorAudition({ id: formData.id, values })
    );
    if (action.meta.requestStatus === 'fulfilled') {
      setIsEditingDetails(false);
      dispatch(getActorAuditions());
    } else {
      toast.error(
        typeof action?.payload === 'string'
          ? action.payload
          : 'Failed to update audition'
      );
    }
  };

  const handleSaveMaterials = async () => {
    const newMaterials = formData.materials.filter((m) => !m.id);
    if (newMaterials.length) {
      const values = new FormData();
      values.append('self_audition', formData.id);
      values.append('file', newMaterials[0].file);
      const action = await dispatch(addActorAuditionMaterial(values));
      if (action.meta.requestStatus === 'fulfilled') {
        setIsEditingMaterials(false);

        dispatch(
          getActorAuditionsMaterialListing({ self_audition_id: formData.id })
        );
      } else {
        toast.error(
          typeof action?.payload === 'string'
            ? action.payload
            : 'Failed to add material'
        );
      }
    } else {
      toast.error('No new materials to save');
    }
  };

  const handleDeleteMaterials = async () => {
    if (!materialToDelete?.id) {
      toast.error('No material selected for deletion');
      return;
    }
    const action = await dispatch(
      deleteActorAuditionMaterial(materialToDelete.id)
    );
    if (action.meta.requestStatus === 'fulfilled') {
      dispatch(
        getActorAuditionsMaterialListing({ self_audition_id: formData.id })
      );
      setShowDeleteConfirmMaterials(false);
      setMaterialToDelete(null);
    } else {
      toast.error(
        typeof action?.payload === 'string'
          ? action.payload
          : 'Failed to delete material'
      );
    }
  };

  return (
    <CustomModal
      open={isViewModalOpen}
      mainBoxClassName='!px-0 !pb-0'
      headerBoxClassName='px-5'
      title={
        <div className='flex items-center gap-3'>
          <div className='p-2 bg-[var(--color-primary-light)] rounded-lg'>
            <BriefcaseIcon className='w-6 h-6 text-[var(--color-primary)]' />
          </div>
          <div>
            <h2 className='text-lg font-semibold text-[var(--color-secondary-dark)]'>
              Audition Details
            </h2>
            <div className='text-xs text-[var(--color-secondary)]'>
              ID: {rowData?.row?.id || '--'}
            </div>
          </div>
        </div>
      }
      close={() => {
        setValue(0);
        handleCloseModal();
      }}
      noFooter
    >
      <div className={`p-4 px-2 sm:px-4 md:px-6 h-[70vh] overflow-y-auto`}>
        <div className='inline-flex h-10 items-center justify-center bg-[var(--color-secondary-light)] text-[var(--color-secondary)] rounded-md p-1 mb-4'>
          <CustomTabs
            value={value}
            onChange={handleTabChange}
            aria-label='audition tabs'
          >
            <CustomTab
              label='Audition Details'
              id='tab-0'
              aria-controls='tabpanel-0'
            />
            <CustomTab
              label='Audition Materials'
              id='tab-1'
              aria-controls='tabpanel-1'
            />
          </CustomTabs>
        </div>
        <div className='w-full flex flex-col'>
          <CustomTabPanel value={value} index={0}>
            <AuditionDetailsTab
              formData={formData}
              isEditing={isEditingDetails}
              setIsEditing={setIsEditingDetails}
              showDeleteConfirm={showDeleteConfirmDetails}
              setShowDeleteConfirm={setShowDeleteConfirmDetails}
              handleChange={handleChange}
              handleDateChange={handleDateChange}
              handleSave={handleSaveDetails}
              handleDelete={handleDeleteDetails}
              loading={loading}
              deleteLoading={deleteLoading}
              OPTIONS={OPTIONS}
            />
          </CustomTabPanel>
          <CustomTabPanel value={value} index={1}>
            <AuditionMaterialsTab
              rowData={rowData}
              formData={formData}
              setFormData={setFormData}
              isEditing={isEditingMaterials}
              setIsEditing={setIsEditingMaterials}
              showDeleteConfirm={showDeleteConfirmMaterials}
              setShowDeleteConfirm={setShowDeleteConfirmMaterials}
              materialToDelete={materialToDelete}
              setMaterialToDelete={setMaterialToDelete}
              handleSave={handleSaveMaterials}
              handleDelete={handleDeleteMaterials}
              loading={materialLoading}
              materials={materials}
            />
          </CustomTabPanel>
        </div>
      </div>
      {!onlyView && (
        <>
          <Line />
          <div className='px-6 py-3.5 border-b rounded-lg border-style bg-[var(--color-secondary-light)]'>
            {value === 0 && showDeleteConfirmDetails ? (
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2 text-[var(--color-danger)]'>
                  <DeleteIcon className='w-5 h-5' />
                  <span className='text-md font-sans font-normal'>
                    Are you sure you want to delete this audition?
                  </span>
                </div>
                <div className='flex gap-3'>
                  <CustomButton
                    onClick={() => setShowDeleteConfirmDetails(false)}
                    className='h-[35px] flex justify-center items-center'
                    variant='outlined'
                    disabled={deleteLoading}
                    sx={{
                      borderColor: 'var(--color-primary)',
                      color: 'var(--color-primary)',
                      padding: 0,
                    }}
                  >
                    Cancel
                  </CustomButton>
                  <CustomButton
                    onClick={handleDeleteDetails}
                    className='h-[35px] !bg-[var(--color-danger)]'
                    loading={deleteLoading}
                  >
                    Delete
                  </CustomButton>
                </div>
              </div>
            ) : value === 1 && showDeleteConfirmMaterials ? (
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2 text-[var(--color-danger)]'>
                  <DeleteIcon className='w-5 h-5' />
                  <span className='text-md font-sans font-normal'>
                    Are you sure you want to delete this material?
                  </span>
                </div>
                <div className='flex gap-3'>
                  <CustomButton
                    onClick={() => {
                      setShowDeleteConfirmMaterials(false);
                      setMaterialToDelete(null);
                    }}
                    className='h-[35px] flex justify-center items-center'
                    variant='outlined'
                    disabled={materialLoading}
                    sx={{
                      borderColor: 'var(--color-primary)',
                      color: 'var(--color-primary)',
                      padding: 0,
                    }}
                  >
                    Cancel
                  </CustomButton>
                  <CustomButton
                    onClick={handleDeleteMaterials}
                    className='h-[35px] !bg-[var(--color-danger)]'
                    loading={materialLoading}
                  >
                    Delete
                  </CustomButton>
                </div>
              </div>
            ) : (
              <div className='flex justify-between'>
                {value === 0 && (
                  <CustomButton
                    sx={{
                      border: 'none',
                      borderColor: 'var(--color-danger)',
                      color: 'var(--color-danger)',
                      padding: 0.5,
                    }}
                    variant='outlined'
                    onClick={() => setShowDeleteConfirmDetails(true)}
                    disabled={deleteLoading}
                  >
                    <div className='flex items-center gap-1 text-[var(--color-danger)]'>
                      <DeleteIcon className='w-4 h-4' />
                      <span className='pt-[2.5px]'>Delete</span>
                    </div>
                  </CustomButton>
                )}
                <div className='flex gap-3 items-center justify-end'>
                  {value === 0 &&
                    (isEditingDetails ? (
                      <>
                        <CustomButton
                          variant='outlined'
                          onClick={() => setIsEditingDetails(false)}
                          className='h-[35px] flex justify-center items-center'
                          disabled={loading}
                          sx={{
                            borderColor: 'var(--color-primary)',
                            color: 'var(--color-primary)',
                            padding: 0,
                          }}
                        >
                          Cancel
                        </CustomButton>
                        <CustomButton
                          onClick={handleSaveDetails}
                          loading={loading}
                        >
                          <div className='flex items-center gap-1 h-[35px]'>
                            <SaveIcon className='w-4 h-4' />
                            <span>Save Changes</span>
                          </div>
                        </CustomButton>
                      </>
                    ) : (
                      <CustomButton
                        onClick={() => setIsEditingDetails(true)}
                        disabled={loading || deleteLoading}
                      >
                        <div className='flex items-center gap-1 h-[35px] pr-1'>
                          {/* <Edit2Icon className='w-3 h-3' /> */}
                          <span>Edit</span>
                        </div>
                      </CustomButton>
                    ))}

                  {value === 1 &&
                    (isEditingMaterials ? (
                      <>
                        <CustomButton
                          variant='outlined'
                          onClick={() => setIsEditingMaterials(false)}
                          className='h-[35px] flex justify-center items-center'
                          disabled={materialLoading}
                          sx={{
                            borderColor: 'var(--color-primary)',
                            color: 'var(--color-primary)',
                            padding: 0,
                          }}
                        >
                          Cancel
                        </CustomButton>
                        <CustomButton
                          onClick={handleSaveMaterials}
                          loading={materialLoading}
                          disabled={
                            materialLoading ||
                            !formData.materials.some((m) => !m.id)
                          }
                        >
                          <div className='flex items-center gap-1 h-[35px]'>
                            <SaveIcon className='w-4 h-4' />
                            <span>Save</span>
                          </div>
                        </CustomButton>
                      </>
                    ) : (
                      <CustomButton
                        onClick={() => setIsEditingMaterials(true)}
                        disabled={materialLoading}
                      >
                        <div className='flex items-center gap-1 h-[35px] pr-1'>
                          {materials?.length > 0 && (
                            <Edit2Icon className='w-3 h-3' />
                          )}
                          <span>{materials?.length > 0 ? 'Edit' : 'Add'}</span>
                        </div>
                      </CustomButton>
                    ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </CustomModal>
  );
};
