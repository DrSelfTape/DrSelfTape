// Library imports
import { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

// Local imports
import { CustomModal } from '../../../components/Shared/CustomModal';
import {
  CustomInput,
  SelectDropdown,
  FilePicker,
  Textarea,
  CustomCheckbox,
} from '../../../components/Shared';
import { addCoachProfile, logoutUser } from '../../../redux/features/auth/authSlice';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { setAuthToken } from '../../../redux/http';

// Options for dropdowns
const SPECIALTIES_OPTIONS = [
  { label: 'Drama', value: 'Drama' },
  { label: 'Comedy', value: 'Comedy' },
  { label: 'Character Work', value: 'Character Work' },
  { label: 'Improv', value: 'Improv' },
  { label: 'Commercial', value: 'Commercial' },
  { label: 'Voice Over', value: 'Voice Over' },
  { label: 'Theatrical', value: 'Theatrical' },
  { label: 'Accent Work', value: 'Accent Work' },
];

const LANGUAGES_OPTIONS = [
  { label: 'English', value: 'English' },
  { label: 'Spanish', value: 'Spanish' },
  { label: 'French', value: 'French' },
  { label: 'German', value: 'German' },
  { label: 'Italian', value: 'Italian' },
  { label: 'Punjabi', value: 'Punjabi' },
  { label: 'Hindi', value: 'Hindi' },
  { label: 'Mandarin', value: 'Mandarin' },
];

const SKILLS_OPTIONS = [
  { label: 'Audition Prep', value: 'Audition Prep' },
  { label: 'Scene Study', value: 'Scene Study' },
  { label: 'Monologue Coaching', value: 'Monologue Coaching' },
  { label: 'Cold Reading', value: 'Cold Reading' },
  { label: 'Character Development', value: 'Character Development' },
];

const MEETING_METHODS_OPTIONS = [
  { label: 'Zoom', value: 'zoom' },
  { label: 'Google Meet', value: 'meet' },
  { label: 'Microsoft Teams', value: 'teams' },
  { label: 'In Person', value: 'in_person' },
];

export const BecomeCoachModal = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { toast } = useSnackbar();

  const [formData, setFormData] = useState({
    headshot: null,
    display_name: '',
    bio: '',
    specialties: [],
    years_experience: '',
    languages: [],
    services: '',
    skills: [],
    is_available_now: false,
    meeting_methods: [],
    social_links: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const fieldRefs = {
    display_name: useRef(null),
    headshot: useRef(null),
  };

  const handleChange = (e) => {
    const { name, value, type, files, checked } = e.target;

    let processedValue = value;

    if (type === 'file') {
      processedValue = files[0] || null;
    } else if (type === 'checkbox') {
      processedValue = checked;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));

    // Clear error for this field
    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }));
  };

  const validateFile = (file, allowedTypes) => {
    if (!file) return true;
    const extension = file.name.split('.').pop().toLowerCase();
    return allowedTypes.includes(extension);
  };

  const validateJSON = (str) => {
    if (!str || str.trim() === '') return true; // Optional field
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.display_name?.trim()) {
      newErrors.display_name = 'Display name is required';
    }

    if (!formData.specialties || formData.specialties.length === 0) {
      newErrors.specialties = 'At least one specialty is required';
    }

    // File validation
    if (
      formData.headshot &&
      !validateFile(formData.headshot, ['jpg', 'jpeg', 'png', 'webp'])
    ) {
      newErrors.headshot =
        'Invalid file format. Allowed: jpg, jpeg, png, webp';
    }

    // JSON validation for services
    if (formData.services && !validateJSON(formData.services)) {
      newErrors.services = 'Invalid JSON format';
    }

    // Years experience validation
    if (
      formData.years_experience &&
      (isNaN(formData.years_experience) || formData.years_experience < 0)
    ) {
      newErrors.years_experience = 'Years of experience must be a positive number';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstErrorField = Object.keys(newErrors)[0];
      if (firstErrorField && fieldRefs[firstErrorField]?.current) {
        fieldRefs[firstErrorField].current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const formPayload = new FormData();

      // Required fields
      formPayload.append('display_name', formData.display_name.trim());

      // Optional fields
      if (formData.headshot) {
        formPayload.append('headshot', formData.headshot);
      }

      if (formData.bio) {
        formPayload.append('bio', formData.bio);
      }

      if (formData.specialties && formData.specialties.length > 0) {
        formPayload.append(
          'specialties',
          JSON.stringify(
            formData.specialties.map((s) => s.value || s)
          )
        );
      }

      if (formData.years_experience) {
        formPayload.append('years_experience', formData.years_experience);
      }

      if (formData.languages && formData.languages.length > 0) {
        formPayload.append(
          'languages',
          JSON.stringify(formData.languages.map((l) => l.value || l))
        );
      }

      if (formData.services && formData.services.trim()) {
        // If it's already a JSON string, use it; otherwise, try to parse it
        try {
          const parsed = JSON.parse(formData.services);
          formPayload.append('services', JSON.stringify(parsed));
        } catch {
          // If not valid JSON, create a simple object
          formPayload.append('services', JSON.stringify({ other: formData.services }));
        }
      }

      if (formData.skills && formData.skills.length > 0) {
        formPayload.append(
          'skills',
          JSON.stringify(formData.skills.map((s) => s.value || s))
        );
      }

      formPayload.append('is_available_now', formData.is_available_now);

      if (formData.meeting_methods && formData.meeting_methods.length > 0) {
        formPayload.append(
          'meeting_methods',
          JSON.stringify(formData.meeting_methods.map((m) => m.value || m))
        );
      }

      if (formData.social_links) {
        formPayload.append('social_links', formData.social_links);
      }

      const result = await dispatch(addCoachProfile(formPayload)).unwrap();

      // Show success message
      toast.success(
        result?.message ||
          'Successfully switched role to coach. Please login again.'
      );

      // De-register this device's APNs/VoIP push token FIRST, while the auth
      // header is still present, so the orphaned token stops mapping this
      // device to the now-logged-out user (mirrors performLogout). Best-effort
      // — never block the role switch.
      try {
        const { unregisterPushToken } = await import('../../../hooks/usePushNotifications');
        await unregisterPushToken();
      } catch { /* push util unavailable — don't block logout */ }

      // Clear auth token from axios
      setAuthToken(null);

      // Logout user from Redux
      dispatch(logoutUser());

      // Clear persisted state
      const { persistor } = await import('../../../redux/store');
      persistor.purge();

      // Close modal
      onClose();

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    } catch (error) {
      const errorMessage =
        typeof error === 'string'
          ? error
          : error?.message || 'Failed to create coach profile. Please try again.';

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return; // Prevent closing during submission
    setFormData({
      headshot: null,
      display_name: '',
      bio: '',
      specialties: [],
      years_experience: '',
      languages: [],
      services: '',
      skills: [],
      is_available_now: false,
      meeting_methods: [],
      social_links: '',
    });
    setErrors({});
    onClose();
  };

  return (
    <CustomModal
      open={open}
      close={handleClose}
      title='Become a Reader'
      handleSave={handleSubmit}
      disableSave={loading}
      loading={loading}
      disableBackdropClick={loading}
      disableEscapeKeyDown={loading}
      primaryButtonText='Submit'
      secondaryButtonText='Cancel'
      mainBoxClassName='max-h-[90vh] overflow-hidden flex flex-col'
      childClassName='max-h-[60vh] overflow-y-auto pr-2'
    >
      <div className='space-y-6 py-4'>
        <div className='mb-4 pb-2'>
          <p className='text-sm font-medium text-secondary-dark leading-relaxed'>
            Complete your reader profile to start helping actors prepare for auditions
          </p>
        </div>

        <div className='space-y-6'>
          <FilePicker
            label='Headshot'
            name='headshot'
            type='file'
            accept='.jpg,.jpeg,.png,.webp'
            onChange={handleChange}
            error={!!errors.headshot}
            errorMsg={errors.headshot}
            ref={fieldRefs.headshot}
          />

          <CustomInput
            label='Display Name'
            name='display_name'
            type='text'
            value={formData.display_name}
            onChange={handleChange}
            placeholder='Enter your display name'
            error={!!errors.display_name}
            errorMsg={errors.display_name}
            required
            ref={fieldRefs.display_name}
          />

          <Textarea
            label='Bio'
            name='bio'
            value={formData.bio}
            onChange={handleChange}
            placeholder='Tell us about yourself and your reader experience'
          />

          <SelectDropdown
            label='Specialties'
            name='specialties'
            value={formData.specialties}
            onChange={handleChange}
            options={SPECIALTIES_OPTIONS}
            placeholder='Select your specialties'
            multiSelect={true}
            required
            error={!!errors.specialties}
            errorMsg={errors.specialties}
          />

          <CustomInput
            label='Years of Experience'
            name='years_experience'
            type='number'
            value={formData.years_experience}
            onChange={handleChange}
            placeholder='Enter years of experience'
            error={!!errors.years_experience}
            errorMsg={errors.years_experience}
          />

          <SelectDropdown
            label='Languages'
            name='languages'
            value={formData.languages}
            onChange={handleChange}
            options={LANGUAGES_OPTIONS}
            placeholder='Select languages you speak'
            multiSelect={true}
          />

          <CustomInput
            label='Services (JSON format)'
            name='services'
            type='text'
            value={formData.services}
            onChange={handleChange}
            placeholder='e.g., {"instagram": "your_handle"}'
            error={!!errors.services}
            errorMsg={errors.services}
          />

          <SelectDropdown
            label='Skills'
            name='skills'
            value={formData.skills}
            onChange={handleChange}
            options={SKILLS_OPTIONS}
            placeholder='Select your skills'
            multiSelect={true}
          />

          <SelectDropdown
            label='Meeting Methods'
            name='meeting_methods'
            value={formData.meeting_methods}
            onChange={handleChange}
            options={MEETING_METHODS_OPTIONS}
            placeholder='Select meeting methods'
            multiSelect={true}
          />

          <CustomInput
            label='Social Links'
            name='social_links'
            type='text'
            value={formData.social_links}
            onChange={handleChange}
            placeholder='Enter your social media links'
          />
        </div>

        <div className='pt-2'>
          <CustomCheckbox
            label='Available Now'
            name='is_available_now'
            checked={formData.is_available_now}
            onChange={handleChange}
            className='mt-[3px] accent-primary w-4 h-4'
          />
        </div>
      </div>
    </CustomModal>
  );
};

