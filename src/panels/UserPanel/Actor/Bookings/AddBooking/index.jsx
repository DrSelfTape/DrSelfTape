import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import {
  CustomInput,
  SelectDropdown,
  CustomButton,
  CreateLoader,
} from '../../../../../components/Shared';
import { isEmpty } from '../../../../../utils/utils';
import {
  createBooking,
  updateBooking,
} from '../../../../../redux/features/actorBookings/actorBookingsSlice';
import { useSnackbar } from '../../../../../hooks/useSnackbar';

export const AddActorBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { toast } = useSnackbar();
  const restProps = location.state;
  console.log('restprop', restProps);
  const { castingAuditions, loading: auditionsLoading } = useSelector(
    (state) => state?.actorAuditions
  );
  const { loading } = useSelector((state) => state?.actorBookings);
  const [formData, setFormData] = useState({
    audition: null,
    location: '',
    type: null,
    status: null,
  });
  const [errors, setErrors] = useState({});

  const BookingTypeOptions = [
    { label: 'Self Tape', value: 'self_tape' },
    { label: 'Rehearsal', value: 'rehearsal' },
    { label: 'Coaching', value: 'coaching' },
  ];

  const BookingStatusOptions = [
    { label: 'Scheduled', value: 'scheduled' },
    { label: 'Completed', value: 'completed' },
    { label: 'Canceled', value: 'canceled' },
  ];

  const AuditionOptions =
    castingAuditions?.open?.map((audition) => ({
      label: audition.title,
      value: audition.id,
    })) || [];
  useEffect(() => {
    if (restProps) {
      let auditionId;
      let newFormData = { ...formData };

      if (restProps.row) {
        auditionId = restProps.row.auditionID;

        newFormData = {
          id: restProps.row.id || '',
          audition:
            AuditionOptions.find((option) => option.value === auditionId) ||
            null,
          location: restProps.row.location || '',
          type:
            BookingTypeOptions.find(
              (option) => option.value === restProps.row.type
            ) || null,
          status:
            BookingStatusOptions.find(
              (option) => option.value === restProps.row.status
            ) || null,
        };
      } else if (restProps.audition) {
        // Case 1: restProps contains audition object
        auditionId = restProps.audition.id;

        newFormData = {
          ...newFormData,
          audition:
            AuditionOptions.find((option) => option.value === auditionId) ||
            null,
        };
      }

      setFormData(newFormData);
    }
  }, [restProps]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isEmpty(formData)) {
      toast.error('Please fill in all required fields');
      return;
    }

    const payload = {
      audition: formData.audition?.value,
      location: formData.location,
      type: formData.type?.value,
      status: formData.status?.value,
    };
    let action;
    if (restProps?.row?.id) {
      action = dispatch(updateBooking({ id: formData.id, values: payload }));
    } else {
      action = dispatch(createBooking(payload));
    }

    const data = await action;

    if (data.meta.requestStatus === 'fulfilled') {
      setFormData({
        audition: null,
        location: '',
        type: null,
        status: null,
      });
      setErrors({});
      navigate('/bookings');
    } else if (data.meta.requestStatus === 'rejected') {
      toast.error(data?.payload[0]?.error || 'An error occurred');
    }
  };

  const isFieldsDisabled =
    !formData.audition || auditionsLoading;
  return (
    <div className='w-full h-full relative'>
      <div className='py-5 h-full max-h-[calc(100vh-10rem)] overflow-y-auto smd:px-10 px-5'>
        <h2 className='text-2xl font-semibold tracking-tight text-gray-900 mb-6'>
          {restProps && !restProps?.audition ? 'Edit Booking' : 'Add Booking'}
        </h2>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-10'>
          <SelectDropdown
            label='Audition'
            name='audition'
            value={formData.audition}
            onChange={handleChange}
            options={AuditionOptions}
            placeholder='Select Audition'
            error={!!errors.audition}
            errorMsg={errors.audition}
            disabled={!!restProps?.row?.id || auditionsLoading}
            isLoading={auditionsLoading}
          />

          <CustomInput
            label='Location'
            name='location'
            type='text'
            value={formData.location}
            onChange={handleChange}
            placeholder='Enter Location'
            error={!!errors.location}
            errorMsg={errors.location}
            disabled={isFieldsDisabled}
          />

          <SelectDropdown
            label='Type'
            name='type'
            value={formData.type}
            onChange={handleChange}
            options={BookingTypeOptions}
            placeholder='Select Type'
            error={!!errors.type}
            errorMsg={errors.type}
            disabled={isFieldsDisabled}
          />
          <SelectDropdown
            label='Status'
            name='status'
            value={formData.status}
            onChange={handleChange}
            options={BookingStatusOptions}
            placeholder='Select Status'
            error={!!errors.status}
            errorMsg={errors.status}
            disabled={isFieldsDisabled}
          />
        </div>
      </div>

      <div className='flex flex-col-reverse xs:flex-row justify-end items-center sm:gap-4 gap-4 bg-white absolute bottom-0 right-0 w-full border-t border-cool-grey-200 smd:px-10 px-5 py-3 max-h-[10rem] min-h-[4rem]'>
        <CustomButton
          variant='outlined'
          className='!w-full xs:!w-[110px]'
          onClick={(e) => {
            e.preventDefault();
            navigate(-1);
          }}
          type='button'
        >
          Cancel
        </CustomButton>

        <CustomButton
          loading={loading}
          onClick={handleSubmit}
          disabled={isEmpty(formData) || loading}
          className='!w-full xs:!w-[150px]'
        >
          {restProps && !restProps?.audition ? 'Update Booking' : 'Add Booking'}
        </CustomButton>
      </div>

      {loading && <CreateLoader />}
    </div>
  );
};
