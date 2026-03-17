import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';

// Local Imports
import {
  CustomInput,
  CustomButton,
  DatePicker,
  SelectDropdown,
} from '../../../../../components/Shared';
import { isEmpty } from '../../../../../utils/utils';
import {
  createCastingAudition,
  updateCastingAudition,
} from '../../../../../redux/features/castingAuditions/castingAuditionsSlice';
import { useSnackbar } from '../../../../../hooks/useSnackbar';

export const AddCastingDirectorAudition = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const restProps = location.state;
  const { toast } = useSnackbar();
  const { loading } = useSelector((state) => state?.CastingDirectorAuditions);

  const [formData, setFormData] = useState({
    title: '',
    role_info: '',
    description: '',
    deadline: '',
    status: 'open',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (restProps?.row) {
      setFormData({
        id: restProps?.row?.id || '',
        title: restProps?.row?.title || '',
        role_info: restProps?.row?.role_info || '',
        description: restProps?.row?.description || '',
        deadline: restProps?.row?.deadline || '',
        status: restProps?.row?.status || 'open',
      });
    }
  }, [restProps?.row]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'status') {
      setFormData((prev) => ({
        ...prev,
        status: value?.value,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }));
  };

  const handleDateTimeChange = (name, value) => {
    const formattedValue = value
      ? dayjs(value).format('YYYY-MM-DDTHH:mm:ss')
      : '';
    setFormData((prev) => ({
      ...prev,
      deadline: formattedValue,
    }));
    setErrors((prev) => ({
      ...prev,
      deadline: '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      title: formData.title,
      role_info: formData.role_info,
      description: formData.description,
      deadline: formData.deadline,
      status: formData.status,
    };

    let action;
    if (restProps?.row?.id) {
      action = dispatch(
        updateCastingAudition({ id: formData.id, values: payload })
      );
    } else {
      // Create audition
      action = dispatch(createCastingAudition(payload));
    }

    const data = await action;

    if (data.meta.requestStatus === 'fulfilled') {
      setFormData({
        id: '',
        title: '',
        role_info: '',
        description: '',
        deadline: '',
        status: 'open',
      });
      setErrors({});
      navigate('/auditions');
    } else if (data.meta.requestStatus === 'rejected') {
      toast.error(data?.payload || 'An error occurred');
    }
  };

  const auditionStatus = [
    { label: 'Open', value: 'open' },
    { label: 'Closed', value: 'closed' },
    { label: 'Completed', value: 'completed' },
  ];

  return (
    <div className='mx-5 sm:mx-5 h-full py-5'>
      <h2 className='text-lg md:text-xl font-semibold tracking-tight text-gray-900 mb-6'>
        {restProps?.row ? 'Edit Audition' : 'Add Audition'}
      </h2>

      <form onSubmit={handleSubmit} className='h-[calc(100vh-170px)]'>
        <div className='flex flex-col h-full'>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
            <CustomInput
              label='Project Title'
              name='title'
              type='text'
              autoFocus
              value={formData.title}
              onChange={handleChange}
              placeholder='Enter project title'
              error={!!errors.title}
              errorMsg={errors.title}
              required
            />
            <CustomInput
              label='Role'
              name='role_info'
              type='text'
              value={formData.role_info}
              onChange={handleChange}
              placeholder='Enter role'
              error={!!errors.role_info}
              errorMsg={errors.role_info}
              required
            />
            <CustomInput
              label='Description'
              name='description'
              type='text'
              value={formData.description}
              onChange={handleChange}
              placeholder='Enter description'
              error={!!errors.description}
              errorMsg={errors.description}
              required
            />
            <SelectDropdown
              label='Status'
              name='status'
              value={
                auditionStatus.find(
                  (option) => option.value === formData.status
                ) || null
              }
              onChange={handleChange}
              options={auditionStatus}
              placeholder='Select status'
              error={!!errors.status}
              errorMsg={errors.status}
              required
            />
            <DatePicker
              label='Deadline Date'
              name='deadline'
              value={formData.deadline ? dayjs(formData.deadline) : null}
              onChange={(value) => handleDateTimeChange('deadline', value)}
              error={!!errors.deadline}
              errorMsg={errors.deadline}
              required
            />
          </div>

          <div className='flex flex-col-reverse xs:flex-row sm:gap-1 gap-3 justify-end mt-auto'>
            <CustomButton
              variant='outlined'
              className='w-full sm:w-fit'
              onClick={() => navigate('/auditions')}
              type='button'
            >
              Cancel
            </CustomButton>
            <CustomButton
              type='submit'
              className='w-full sm:!w-fit'
              disabled={loading || isEmpty(formData)}
              loading={loading}
            >
              {restProps?.row ? 'Update Audition' : 'Add Audition'}
            </CustomButton>
          </div>
        </div>
      </form>
    </div>
  );
};
