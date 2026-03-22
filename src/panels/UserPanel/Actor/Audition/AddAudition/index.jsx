import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  createActorAudition,
  updateActorAudition,
} from '../../../../../redux/features/actorAuditions/actorAuditionsSlice';
import { useSnackbar } from '../../../../../hooks/useSnackbar';
import { AuditionStepperModal } from '../../../../../components/Booking/AuditionStepperModal';

export const AddActorAudition = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const restProps = location.state;
  const { toast } = useSnackbar();
  const { loading } = useSelector((state) => state?.actorAuditions);
  const [isModalOpen, setIsModalOpen] = useState(true);

  const handleClose = () => {
    setIsModalOpen(false);
    navigate(-1);
  };

  const handleSubmit = async (formPayload, isEditMode) => {
    let action;
    if (isEditMode) {
      action = await dispatch(
        updateActorAudition({
          id: formPayload.get('id'),
          values: formPayload,
        })
      );
    } else {
      action = await dispatch(createActorAudition(formPayload));
    }

    if (action.meta.requestStatus === 'fulfilled') {
      toast.success(isEditMode ? 'Audition updated' : 'Audition added');
      setIsModalOpen(false);
      navigate(-1);
    } else {
      toast.error(
        typeof action?.payload === 'string'
          ? action.payload
          : 'An error occurred'
      );
    }
  };

  return (
    <AuditionStepperModal
      open={isModalOpen}
      onClose={handleClose}
      initialData={restProps?.row || null}
      onSubmit={handleSubmit}
      loading={loading}
      showDelete={false}
      title={restProps?.row?.id ? 'Edit Audition' : 'Add New Audition'}
    />
  );
};
