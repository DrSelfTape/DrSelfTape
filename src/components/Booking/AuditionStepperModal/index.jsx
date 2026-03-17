import { useEffect, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import {
  CustomInput,
  CustomButton,
  SelectDropdown,
  CustomModal,
  DatePicker,
  TimePicker,
  FilePicker,
} from '../../Shared';
import { CheckCircleIcon, DeleteIcon } from '../../../assets/icons';

const OPTIONS = {
  audition_status: [
    { label: 'Applied', value: 'applied' },
    { label: 'Scheduled', value: 'scheduled' },
    { label: 'Callback', value: 'callback' },
    { label: 'Booked', value: 'booked' },
    { label: 'Rejected', value: 'rejected' },
  ],
  audition_type: [
    { label: 'TV', value: 'tv_drama' },
    { label: 'Film', value: 'film' },
    { label: 'Commercial', value: 'commercial' },
  ],
};

const STEPS = [
  {
    id: 1,
    title: 'Upload & Parse',
    description: 'Upload your script file',
  },
  {
    id: 2,
    title: 'Core Details',
    description: 'Essential information',
  },
  {
    id: 3,
    title: 'Casting Info',
    description: 'Optional casting details',
  },
];

export const AuditionStepperModal = ({
  open,
  onClose,
  initialData = null,
  onSubmit,
  onDelete,
  loading = false,
  deleteLoading = false,
  title = 'Add New Audition',
  showDelete = false,
}) => {
  const isEditMode = !!initialData?.id;
  const [currentStep, setCurrentStep] = useState(isEditMode ? 2 : 1);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    purpose: '',
    audition_date: null,
    audition_time: null,
    casting_director_name: '',
    casting_director_company: '',
    casting_director_contact: '',
    location_name: '',
    location_address: '',
    project_name: '',
    role_name: '',
    role_description: '',
    audition_type: 'commercial',
    audition_status: 'applied',
    gender_preference: 'any',
    self_notes: '',
    submission_method: '',
    materials: [],
  });
  const [errors, setErrors] = useState({});
  const [completedSteps, setCompletedSteps] = useState(new Set());

  // Load initial data for edit mode
  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id || '',
        title: initialData.title || '',
        description: initialData.description || '',
        purpose: initialData.purpose || '',
        audition_date: initialData.audition_date
          ? dayjs(initialData.audition_date)
          : null,
        audition_time: initialData.audition_time
          ? dayjs(initialData.audition_time, 'HH:mm')
          : null,
        casting_director_name: initialData.casting_director_name || '',
        casting_director_company: initialData.casting_director_company || '',
        casting_director_contact: initialData.casting_director_contact || '',
        location_name: initialData.location_name || '',
        location_address: initialData.location_address || '',
        project_name: initialData.project_name || '',
        role_name: initialData.role_name || '',
        role_description: initialData.role_description || '',
        audition_type: initialData.audition_type || 'commercial',
        audition_status: initialData.audition_status || 'applied',
        gender_preference: initialData.gender_preference || 'any',
        self_notes: initialData.self_notes || '',
        submission_method: initialData.submission_method || '',
        materials: initialData.uploads || initialData.materials || [],
      });

      const newCompletedSteps = new Set();
      if (isEditMode) {
        newCompletedSteps.add(1);
      }
      if (
        initialData.project_name &&
        initialData.role_name &&
        initialData.audition_type
      ) {
        newCompletedSteps.add(2);
      }
      if (initialData.casting_director_name) {
        newCompletedSteps.add(3);
      }
      setCompletedSteps(newCompletedSteps);
      setCurrentStep(isEditMode ? 2 : 1);
    }
  }, [initialData, isEditMode]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setShowDeleteConfirm(false);
      setCurrentStep(isEditMode ? 2 : 1);
      setErrors({});
    }
  }, [open, isEditMode]);

  // Extract project name from filename
  const extractProjectNameFromFile = useCallback((filename) => {
    if (!filename) return '';
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    const cleaned = nameWithoutExt
      .replace(/^script[-_\s]*/i, '')
      .replace(/[-_\s]+/g, ' ')
      .trim();
    return cleaned || nameWithoutExt;
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      const extractedName = extractProjectNameFromFile(file.name);
      if (extractedName && !formData.project_name) {
        setFormData((prev) => ({
          ...prev,
          project_name: extractedName,
        }));
      }
      setFormData((prev) => ({
        ...prev,
        materials: [...prev.materials, { file }],
      }));
      setErrors((prev) => ({ ...prev, file: '' }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (['audition_status', 'audition_type'].includes(name)) {
      setFormData((prev) => ({
        ...prev,
        [name]: value?.value || '',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value || '',
      }));
    }
    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }));
  };

  const handleDateChange = (name) => (date) => {
    setFormData((prev) => ({
      ...prev,
      [name]: date,
    }));
    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }));
  };

  const validateStep = useCallback(
    (step) => {
      const newErrors = {};

      if (step === 1) {
        if (!isEditMode && !uploadedFile) {
          newErrors.file = 'Please upload a PDF script file';
        }
      } else if (step === 2) {
        if (!formData.project_name?.trim()) {
          newErrors.project_name = 'Project Name is required';
        }
        if (!formData.role_name?.trim()) {
          newErrors.role_name = 'Role Name is required';
        }
        if (!formData.audition_type) {
          newErrors.audition_type = 'Audition Type is required';
        }
        if (!formData.audition_status) {
          newErrors.audition_status = 'Audition Status is required';
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [formData, uploadedFile, isEditMode]
  );

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepId) => {
    if (isEditMode && stepId === 1) {
      return;
    }
    if (completedSteps.has(stepId - 1) || stepId <= currentStep) {
      setCurrentStep(stepId);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep(2)) {
      setCurrentStep(2);
      return;
    }

    // Build payload - same structure as before
    const formPayload = new FormData();
    Object.entries({
      title: formData.title || formData.project_name || '',
      description: formData.description || '',
      purpose: formData.purpose || '',
      audition_date: formData.audition_date?.format('YYYY-MM-DD') || '',
      audition_time: formData.audition_time?.format('HH:mm') || '',
      casting_director_name: formData.casting_director_name || '',
      casting_director_company: formData.casting_director_company || '',
      casting_director_contact: formData.casting_director_contact || '',
      location_name: formData.location_name || '',
      location_address: formData.location_address || '',
      project_name: formData.project_name || '',
      role_name: formData.role_name || '',
      role_description: formData.role_description || '',
      audition_type: formData.audition_type || 'commercial',
      audition_status: formData.audition_status || 'applied',
      gender_preference: formData.gender_preference || 'any',
      self_notes: formData.self_notes || '',
      submission_method: formData.submission_method || '',
    }).forEach(([key, value]) => {
      formPayload.append(key, value);
    });

    if (uploadedFile) {
      formPayload.append('file', uploadedFile);
    }

    if (isEditMode) {
      formPayload.append('id', formData.id);
    }

    // Call the onSubmit callback with the payload
    if (onSubmit) {
      await onSubmit(formPayload, isEditMode);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id || !onDelete) {
      return;
    }
    await onDelete(initialData.id);
    setShowDeleteConfirm(false);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className='space-y-6'>
            <div className='mb-6'>
              <h3 className='text-lg font-semibold text-gray-800 mb-2'>
                Upload Script File
              </h3>
              <p className='text-sm text-gray-600'>
                Upload a PDF script file.
              </p>
            </div>
            {isEditMode ? (
              <div className='bg-gray-50 border border-gray-200 rounded-lg p-6'>
                <div className='flex items-center gap-3 mb-4'>
                  <CheckCircleIcon className='w-5 h-5 text-gray-600' />
                  <div>
                    <p className='text-sm font-medium text-gray-800'>
                      Script file already uploaded
                    </p>
                    <p className='text-xs text-gray-500 mt-1'>
                      File upload cannot be changed in edit mode
                    </p>
                  </div>
                </div>
                {formData.materials && formData.materials.length > 0 && (
                  <div className='mt-4 pt-4 border-t border-gray-200'>
                    <p className='text-xs text-gray-600 mb-2'>Uploaded files:</p>
                    <div className='space-y-2'>
                      {formData.materials.map((material, index) => (
                        <div
                          key={index}
                          className='text-sm text-gray-700 bg-white p-2 rounded border border-gray-200'
                        >
                          {material.file_name || material.file?.name || 'Script file'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className='border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-primary transition-colors'>
                  <FilePicker
                    label='Upload PDF Script'
                    name='script_file'
                    accept='.pdf'
                    onChange={handleFileUpload}
                    error={!!errors.file}
                    errorMsg={errors.file}
                    required
                  />
                </div>
                {uploadedFile && (
                  <div className='bg-green-50 border border-green-200 rounded-lg p-4'>
                    <div className='flex items-center gap-2'>
                      <CheckCircleIcon className='w-5 h-5 text-green-600' />
                      <span className='text-sm text-green-800'>
                        File uploaded: {uploadedFile.name}
                      </span>
                    </div>
                    {formData.project_name && (
                      <p className='text-xs text-green-700 mt-2 ml-7'>
                        Project name extracted: <strong>{formData.project_name}</strong>. You can edit this in the next step.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 2:
        return (
          <div className='space-y-6'>
            <div className='mb-4'>
              <h3 className='text-lg font-semibold text-gray-800 mb-2'>
                Core Details
              </h3>
              <p className='text-sm text-gray-600'>
                Fill in the essential information for your audition.
              </p>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <CustomInput
                label='Project Name'
                name='project_name'
                type='text'
                value={formData.project_name}
                onChange={handleChange}
                placeholder='Enter project name'
                required
                error={!!errors.project_name}
                errorMsg={errors.project_name}
                autoFocus
              />
              <CustomInput
                label='Role Name'
                name='role_name'
                type='text'
                value={formData.role_name}
                onChange={handleChange}
                placeholder='Enter role name'
                required
                error={!!errors.role_name}
                errorMsg={errors.role_name}
              />
              <SelectDropdown
                label='Audition Type'
                name='audition_type'
                value={
                  OPTIONS.audition_type.find(
                    (option) => option.value === formData.audition_type
                  ) || null
                }
                onChange={handleChange}
                options={OPTIONS.audition_type}
                placeholder='Select audition type'
                required
                error={!!errors.audition_type}
                errorMsg={errors.audition_type}
              />
              <SelectDropdown
                label='Audition Status'
                name='audition_status'
                value={
                  OPTIONS.audition_status.find(
                    (option) => option.value === formData.audition_status
                  ) || null
                }
                onChange={handleChange}
                options={OPTIONS.audition_status}
                placeholder='Select audition status'
                required
                error={!!errors.audition_status}
                errorMsg={errors.audition_status}
              />
              <DatePicker
                label='Audition Date'
                name='audition_date'
                value={formData.audition_date}
                onChange={handleDateChange('audition_date')}
                error={!!errors.audition_date}
                errorMsg={errors.audition_date}
              />
              <TimePicker
                label='Audition Time'
                name='audition_time'
                value={formData.audition_time}
                onChange={handleDateChange('audition_time')}
                error={!!errors.audition_time}
                errorMsg={errors.audition_time}
              />
              <CustomInput
                label='Location Name'
                name='location_name'
                type='text'
                value={formData.location_name}
                onChange={handleChange}
                placeholder='Enter location name'
                error={!!errors.location_name}
                errorMsg={errors.location_name}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className='space-y-6'>
            <div className='mb-4'>
              <h3 className='text-lg font-semibold text-gray-800 mb-2'>
                Casting Information
              </h3>
              <p className='text-sm text-gray-600'>
                Optional: Add casting director details.
              </p>
            </div>
            <div className='space-y-4'>
              <CustomInput
                label='Casting Director Name'
                name='casting_director_name'
                type='text'
                value={formData.casting_director_name}
                onChange={handleChange}
                placeholder='Enter casting director name'
                error={!!errors.casting_director_name}
                errorMsg={errors.casting_director_name}
                autoFocus
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <CustomModal
      open={open}
      close={onClose}
      title={
        <div className='flex items-center gap-3'>
          <h2 className='text-xl font-semibold text-gray-800'>{title}</h2>
        </div>
      }
      mainBoxClassName='!max-w-3xl !w-full'
      childClassName='!max-w-full !min-w-full'
      noFooter
      disableBackdropClick={false}
    >
      <div className='p-6 w-full'>
        {/* Stepper Header */}
        <div className='mb-8'>
          <div className='flex items-center justify-between relative w-full'>
            {/* Progress Line */}
            <div className='absolute top-5 left-0 right-0 h-0.5 bg-gray-200 z-0'>
              <div
                className='h-full bg-primary transition-all duration-300'
                style={{
                  width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
                }}
              />
            </div>

            {/* Steps */}
            {STEPS.map((step) => {
              const isActive = currentStep === step.id;
              const isCompleted = completedSteps.has(step.id);
              const isStep1InEditMode = isEditMode && step.id === 1;
              const isAccessible =
                !isStep1InEditMode &&
                (step.id <= currentStep || completedSteps.has(step.id - 1));

              return (
                <div
                  key={step.id}
                  className='flex flex-col items-center flex-1 relative z-10'
                >
                  <div
                    onClick={() => isAccessible && handleStepClick(step.id)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                      isAccessible ? 'cursor-pointer' : 'cursor-not-allowed'
                    } ${
                      isActive
                        ? 'bg-primary text-white ring-2 ring-primary/30'
                        : isCompleted
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 text-gray-500'
                    } ${isStep1InEditMode ? 'opacity-60' : ''}`}
                    title={
                      isStep1InEditMode
                        ? 'File upload cannot be changed in edit mode'
                        : isAccessible
                        ? `Go to ${step.title}`
                        : 'Complete previous steps to unlock'
                    }
                  >
                    {isCompleted && !isActive ? (
                      <CheckCircleIcon className='w-5 h-5 text-white' />
                    ) : (
                      step.id
                    )}
                  </div>
                  <div className='mt-2 text-center max-w-[120px]'>
                    <p
                      className={`text-xs font-medium ${
                        isActive
                          ? 'text-gray-900'
                          : isCompleted
                          ? 'text-gray-700'
                          : 'text-gray-400'
                      } ${isStep1InEditMode ? 'opacity-60' : ''}`}
                    >
                      {step.title}
                    </p>
                    <p className='text-[10px] text-gray-400 mt-0.5'>
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className='min-h-[300px] mb-6'>{renderStepContent()}</div>

        {/* Navigation Buttons with Delete */}
        <div className='flex justify-between items-center pt-4 border-t border-gray-200 w-full'>
          {showDeleteConfirm ? (
            // Delete Confirmation Mode - Only show Cancel and Delete buttons
            <div className='flex items-center gap-3 w-full justify-center'>
              <div className='flex items-center gap-2 text-[var(--color-danger)]'>
                <DeleteIcon className='w-5 h-5' />
                <span className='text-sm font-medium'>
                  Are you sure you want to delete this audition?
                </span>
              </div>
              <CustomButton
                variant='outlined'
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
                className='!min-w-[80px]'
              >
                Cancel
              </CustomButton>
              <CustomButton
                onClick={handleDelete}
                loading={deleteLoading}
                disabled={deleteLoading}
                className='!min-w-[80px] !bg-[var(--color-danger)]'
              >
                Delete
              </CustomButton>
            </div>
          ) : (
            // Normal Mode - Show Delete button (if enabled) and navigation buttons
            <>
              <div className='flex items-center gap-3'>
                {showDelete && isEditMode && (
                  <CustomButton
                    variant='outlined'
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleteLoading || loading}
                    sx={{
                      borderColor: 'var(--color-danger)',
                      color: 'var(--color-danger)',
                    }}
                  >
                    <div className='flex items-center gap-1'>
                      <DeleteIcon className='w-4 h-4' />
                      <span>Delete</span>
                    </div>
                  </CustomButton>
                )}
              </div>

              <div className='flex gap-3'>
                <CustomButton
                  variant='outlined'
                  onClick={currentStep === 1 ? onClose : handleBack}
                  type='button'
                  className='!min-w-[100px]'
                  disabled={deleteLoading}
                >
                  {currentStep === 1 ? 'Cancel' : 'Back'}
                </CustomButton>

                {currentStep < STEPS.length ? (
                  <CustomButton
                    onClick={handleNext}
                    type='button'
                    className='!min-w-[120px]'
                    disabled={deleteLoading}
                  >
                    Continue →
                  </CustomButton>
                ) : (
                  <CustomButton
                    onClick={handleSubmit}
                    loading={loading}
                    disabled={loading || deleteLoading}
                    className='!min-w-[120px]'
                  >
                    {isEditMode ? 'Update Audition' : 'Finish'}
                  </CustomButton>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </CustomModal>
  );
};
