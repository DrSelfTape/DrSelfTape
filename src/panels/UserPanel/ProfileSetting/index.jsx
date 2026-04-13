// Library imports
import { useMemo, useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

// Local Imports
import {
  CustomButton,
  CustomInput,
  CustomCheckbox,
  SelectDropdown,
  FilePicker,
  Textarea,
  DatePicker,
  ProfilePictureUpload,
} from '../../../components/Shared';
import { isEmpty, validateEmail, validatePassword } from '../../../utils/utils';
import PasswordRequirements from '../../../components/Shared/PasswordRequirments';
import {
  getProfileDetails,
  updatePassword,
  updateProfile,
} from '../../../redux/features/auth/authSlice';
import { useSnackbar } from '../../../hooks/useSnackbar';
import dayjs from 'dayjs';

const Profile = () => {
  const dispatch = useDispatch();
  const { toast } = useSnackbar();
  const { profileDetails, loading, updatePasswordLoading } = useSelector(
    (state) => state.auth
  );
  // Personal Info Form State
  const [personalFormData, setPersonalFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNo: '',
    address: '',
    accountType: { label: '', value: '' },
    // Profile picture
    userImage: null,
    userImageUrl: '',
    // Actor fields
    bio: '',
    headshot: null,
    headshotUrl: '',
    reelUrl: '',
    resumeFile: null,
    metricsOptIn: false,
    // Casting Director fields
    companyName: '',
    companyPhone: '',
    website: '',
    officeAddress: '',
    logo: null,
    description: '',
    // Agent fields
    agencyName: '',
    agencyPhone: '',
    agencyEmail: '',
    // Goals fields
    monthlyAuditionGoal: '',
    goalStartDate: '',
    goalReminderEnabled: false,
    // Coach fields
    display_name: '',
    specialties: [],
    hourly_rate: '',
    is_available_now: false,
  });

  // initial foamData state for compare changes
  const [initialPersonalFormData, setInitialPersonalFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNo: '',
    address: '',
    accountType: { label: '', value: '' },
    // Profile picture
    userImage: null,
    userImageUrl: '',
    // Actor fields
    bio: '',
    headshot: null,
    reelUrl: '',
    resumeFile: null,
    metricsOptIn: false,
    // Casting Director fields
    companyName: '',
    companyPhone: '',
    website: '',
    officeAddress: '',
    logo: null,
    description: '',
    // Agent fields
    agencyName: '',
    agencyPhone: '',
    agencyEmail: '',
    // Goals fields
    monthlyAuditionGoal: '',
    goalStartDate: '',
    goalReminderEnabled: false,
    // Coach fields
    display_name: '',
    specialties: [],
    hourly_rate: '',
    is_available_now: false,
  });
  console.log('compare foam data', personalFormData, initialPersonalFormData);
  const [personalErrors, setPersonalErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  const personalFieldRefs = {
    email: useRef(null),
    userImage: useRef(null),
    headshot: useRef(null),
    resumeFile: useRef(null),
    logo: useRef(null),
    agencyEmail: useRef(null),
    reelUrl: useRef(null),
    website: useRef(null),
  };
  
  // Ref to store headshot preview URL for cleanup
  const headshotPreviewUrlRef = useRef(null);

  // Change Password Form State
  const [passwordFormData, setPasswordFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const fetchUserDetails = async () => {
    try {
      await dispatch(getProfileDetails());
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, []);

  // Load user data into personal form
  useEffect(() => {
    if (profileDetails) {
      const formData = {
        firstName: profileDetails?.first_name || '',
        lastName: profileDetails?.last_name || '',
        email: profileDetails?.email || '',
        phoneNo: profileDetails?.phone_no || '',
        address: profileDetails?.address || '',
        accountType: {
          label:
            profileDetails?.role.charAt(0).toUpperCase() +
            profileDetails?.role.slice(1),
          value: profileDetails?.role,
        },
        userImage: null,
        userImageUrl: profileDetails?.user_image || null,
        bio: profileDetails?.bio || '',
        headshot: null,
        headshotUrl: profileDetails?.headshot || null,
        reelUrl: profileDetails?.reel_url || '',
        resumeFile: null,
        metricsOptIn: profileDetails?.metrics_opt_in || false,
        companyName: profileDetails?.company_name || '',
        companyPhone: profileDetails?.company_phone || '',
        website: profileDetails?.website || '',
        officeAddress: profileDetails?.office_address || '',
        logo: null,
        description: profileDetails?.description || '',
        agencyName: profileDetails?.agency_name || '',
        agencyPhone: profileDetails?.agency_phone || '',
        agencyEmail: profileDetails?.agency_email || '',
        monthlyAuditionGoal: profileDetails?.monthly_audition_goal || '',
        goalStartDate: profileDetails?.goal_start_date || '',
        goalReminderEnabled: profileDetails?.goal_reminder_enabled || false,
        display_name: profileDetails?.display_name || '',
        specialties: profileDetails?.specialties || [],
        hourly_rate: profileDetails?.hourly_rate || '',
        is_available_now: profileDetails?.is_available_now || false,
      };
      setPersonalFormData(formData);
      setInitialPersonalFormData(formData);
    }
  }, [profileDetails]);

  // Cleanup headshot preview URL on unmount
  useEffect(() => {
    return () => {
      if (headshotPreviewUrlRef.current) {
        URL.revokeObjectURL(headshotPreviewUrlRef.current);
      }
    };
  }, []);

  // Handle Personal change
  const handlePersonalChange = (e) => {
    let { name, value, type, files, checked } = e.target;

    if (
      name === 'phoneNo' ||
      name === 'companyPhone' ||
      name === 'agencyPhone'
    ) {
      value = value.replace(/[^0-9+\-\s()]/g, '');
    }

    if (type === 'file') {
      value = files[0] || null;
      
      // Create preview URL for headshot when a new file is selected
      if (name === 'headshot' && value) {
        // Clean up previous preview URL if it exists
        if (headshotPreviewUrlRef.current) {
          URL.revokeObjectURL(headshotPreviewUrlRef.current);
        }
        // Create new preview URL
        const previewUrl = URL.createObjectURL(value);
        headshotPreviewUrlRef.current = previewUrl;
        
        setPersonalFormData((prev) => ({
          ...prev,
          [name]: value,
          headshotUrl: previewUrl,
        }));
        
        setPersonalErrors((prev) => ({
          ...prev,
          [name]: '',
        }));
        return;
      }
      
      // Clear preview URL if file is cleared
      if (name === 'headshot' && !value) {
        if (headshotPreviewUrlRef.current) {
          URL.revokeObjectURL(headshotPreviewUrlRef.current);
          headshotPreviewUrlRef.current = null;
        }
        setPersonalFormData((prev) => ({
          ...prev,
          [name]: null,
          headshotUrl: initialPersonalFormData.headshotUrl || '',
        }));
        
        setPersonalErrors((prev) => ({
          ...prev,
          [name]: '',
        }));
        return;
      }
    }

    if (
      name === 'metricsOptIn' ||
      name === 'goalReminderEnabled' ||
      name === 'is_available_now'
    ) {
      value = checked;
    }

    if (name === 'monthlyAuditionGoal') {
      value = value.replace(/[^0-9]/g, '');
    }

    setPersonalFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setPersonalErrors((prev) => ({
      ...prev,
      [name]: '',
    }));
  };

  // Check is values change
  const hasChanges = useMemo(() => {
    const keys = Object.keys(personalFormData);
    for (const key of keys) {
      if (['headshot', 'resumeFile', 'logo', 'userImage'].includes(key)) {
        if (personalFormData[key] !== null) {
          return true;
        }
      } else {
        if (personalFormData[key] !== initialPersonalFormData[key]) {
          return true;
        }
      }
    }
    return false;
  }, [personalFormData, initialPersonalFormData]);

  const validateFile = (file, allowedTypes) => {
    if (!file) return true;
    const extension = file.name.split('.').pop().toLowerCase();
    return allowedTypes.includes(extension);
  };

  const validateURL = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handlePersonalSubmit = async (e) => {
    e.preventDefault();
    let newErrors = {};

    if (!validateEmail(personalFormData.email?.trim())) {
      newErrors.email = 'Invalid Email';
    }

    // Profile picture validation
    if (
      personalFormData.userImage &&
      !validateFile(personalFormData.userImage, ['jpg', 'jpeg', 'png', 'webp'])
    ) {
      newErrors.userImage =
        'Invalid file format. Allowed: jpg, jpeg, png, webp';
    }
    if (
      personalFormData.userImage &&
      personalFormData.userImage.size > 5 * 1024 * 1024
    ) {
      newErrors.userImage = 'File size must be less than 5MB';
    }

    // File validations
    if (personalFormData.accountType?.value === 'actor') {
      if (
        personalFormData.headshot &&
        !validateFile(personalFormData.headshot, ['jpg', 'jpeg', 'png', 'webp'])
      ) {
        newErrors.headshot =
          'Invalid file format. Allowed: jpg, jpeg, png, webp';
      }
      if (
        personalFormData.resumeFile &&
        !validateFile(personalFormData.resumeFile, ['pdf'])
      ) {
        newErrors.resumeFile = 'Invalid file format. Allowed: pdf';
      }
      if (
        personalFormData.reelUrl &&
        !validateURL(personalFormData.reelUrl.trim())
      ) {
        newErrors.reelUrl = 'Invalid URL format for Reel';
      }
      if (
        personalFormData.monthlyAuditionGoal &&
        (isNaN(personalFormData.monthlyAuditionGoal) ||
          personalFormData.monthlyAuditionGoal < 0)
      ) {
        newErrors.monthlyAuditionGoal =
          'Monthly audition goal must be a positive number';
      }
    }

    if (
      personalFormData.accountType?.value === 'casting_director' ||
      personalFormData.accountType?.value === 'agent'
    ) {
      if (
        personalFormData.logo &&
        !validateFile(personalFormData.logo, ['jpg', 'jpeg', 'png', 'webp'])
      ) {
        newErrors.logo = 'Invalid file format. Allowed: jpg, jpeg, png, webp';
      }
      if (
        personalFormData.website &&
        !validateURL(personalFormData.website.trim())
      ) {
        newErrors.website = 'Invalid URL format for Website';
      }
    }

    if (
      personalFormData.accountType?.value === 'agent' &&
      personalFormData.agencyEmail &&
      !validateEmail(personalFormData.agencyEmail?.trim())
    ) {
      newErrors.agencyEmail = 'Invalid Agency Email';
    }

    if (Object.keys(newErrors).length > 0) {
      setPersonalErrors(newErrors);
      const firstErrorField = Object.keys(newErrors)[0];
      if (firstErrorField && personalFieldRefs[firstErrorField]?.current) {
        personalFieldRefs[firstErrorField].current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
      return;
    }

    if (!hasChanges) {
      toast('No changes to update', 'info');
      return;
    }

    const updatePayload = new FormData();

    // Common fields - append only if changed
    if (
      personalFormData.firstName.trim() !== initialPersonalFormData.firstName
    ) {
      updatePayload.append('first_name', personalFormData.firstName?.trim());
    }
    if (personalFormData.lastName.trim() !== initialPersonalFormData.lastName) {
      updatePayload.append('last_name', personalFormData.lastName?.trim());
    }
    if (
      personalFormData.email.trim().toLowerCase() !==
      initialPersonalFormData.email
    ) {
      updatePayload.append(
        'email',
        personalFormData.email?.trim()?.toLowerCase()
      );
    }
    if (personalFormData.phoneNo.trim() !== initialPersonalFormData.phoneNo) {
      updatePayload.append('phone_no', personalFormData.phoneNo?.trim());
    }
    if (personalFormData.address.trim() !== initialPersonalFormData.address) {
      updatePayload.append('address', personalFormData.address?.trim());
    }

    // Profile picture - append if changed
    if (personalFormData.userImage) {
      updatePayload.append('user_image', personalFormData.userImage);
    }
    // If user removed image (null but was previously set)
    if (
      !personalFormData.userImage &&
      !personalFormData.userImageUrl &&
      initialPersonalFormData.userImageUrl
    ) {
      updatePayload.append('user_image', ''); // Empty string to remove
    }

    // Role-specific fields - append only if changed
    if (personalFormData.accountType?.value === 'actor') {
      if (personalFormData.bio !== initialPersonalFormData.bio) {
        updatePayload.append('bio', personalFormData.bio);
      }
      if (personalFormData.headshot) {
        updatePayload.append('headshot', personalFormData.headshot);
      }
      if (personalFormData.reelUrl !== initialPersonalFormData.reelUrl) {
        updatePayload.append('reel_url', personalFormData.reelUrl);
      }
      if (personalFormData.resumeFile) {
        updatePayload.append('resume_file', personalFormData.resumeFile);
      }
      if (
        personalFormData.metricsOptIn !== initialPersonalFormData.metricsOptIn
      ) {
        updatePayload.append('metrics_opt_in', personalFormData.metricsOptIn);
      }
      if (
        personalFormData.monthlyAuditionGoal !==
        initialPersonalFormData.monthlyAuditionGoal
      ) {
        updatePayload.append(
          'monthly_audition_goal',
          personalFormData.monthlyAuditionGoal
        );
      }
      if (
        personalFormData.goalStartDate !== initialPersonalFormData.goalStartDate
      ) {
        updatePayload.append('goal_start_date', personalFormData.goalStartDate);
      }
      if (
        personalFormData.goalReminderEnabled !==
        initialPersonalFormData.goalReminderEnabled
      ) {
        updatePayload.append(
          'goal_reminder_enabled',
          personalFormData.goalReminderEnabled
        );
      }
    }

    if (personalFormData.accountType?.value === 'casting_director') {
      if (
        personalFormData.companyName !== initialPersonalFormData.companyName
      ) {
        updatePayload.append('company_name', personalFormData.companyName);
      }
      if (
        personalFormData.companyPhone !== initialPersonalFormData.companyPhone
      ) {
        updatePayload.append('company_phone', personalFormData.companyPhone);
      }
      if (personalFormData.website !== initialPersonalFormData.website) {
        updatePayload.append('website', personalFormData.website);
      }
      if (
        personalFormData.officeAddress !== initialPersonalFormData.officeAddress
      ) {
        updatePayload.append('office_address', personalFormData.officeAddress);
      }
      if (personalFormData.logo) {
        updatePayload.append('logo', personalFormData.logo);
      }
      if (
        personalFormData.description !== initialPersonalFormData.description
      ) {
        updatePayload.append('description', personalFormData.description);
      }
    }

    if (personalFormData.accountType?.value === 'agent') {
      if (personalFormData.agencyName !== initialPersonalFormData.agencyName) {
        updatePayload.append('agency_name', personalFormData.agencyName);
      }
      if (
        personalFormData.agencyPhone !== initialPersonalFormData.agencyPhone
      ) {
        updatePayload.append('agency_phone', personalFormData.agencyPhone);
      }
      if (
        personalFormData.agencyEmail !== initialPersonalFormData.agencyEmail
      ) {
        updatePayload.append('agency_email', personalFormData.agencyEmail);
      }
      if (personalFormData.website !== initialPersonalFormData.website) {
        updatePayload.append('website', personalFormData.website);
      }
      if (
        personalFormData.officeAddress !== initialPersonalFormData.officeAddress
      ) {
        updatePayload.append('office_address', personalFormData.officeAddress);
      }
      if (personalFormData.logo) {
        updatePayload.append('logo', personalFormData.logo);
      }
      if (personalFormData.bio !== initialPersonalFormData.bio) {
        updatePayload.append('bio', personalFormData.bio);
      }
    }

    if (personalFormData.accountType?.value === 'coach') {
      if (
        personalFormData.display_name !== initialPersonalFormData.display_name
      ) {
        updatePayload.append(
          'display_name',
          personalFormData.display_name.trim()
        );
      }
      if (
        JSON.stringify(personalFormData.specialties) !==
        JSON.stringify(initialPersonalFormData.specialties)
      ) {
        updatePayload.append(
          'specialties',
          JSON.stringify(personalFormData.specialties.map((s) => s.value || s))
        );
      }
      if (
        personalFormData.hourly_rate !== initialPersonalFormData.hourly_rate
      ) {
        updatePayload.append('hourly_rate', personalFormData.hourly_rate);
      }
      if (
        personalFormData.is_available_now !==
        initialPersonalFormData.is_available_now
      ) {
        updatePayload.append(
          'is_available_now',
          personalFormData.is_available_now
        );
      }
      if (personalFormData.bio !== initialPersonalFormData.bio) {
        updatePayload.append('bio', personalFormData.bio);
      }
      if (personalFormData.headshot) {
        updatePayload.append('headshot', personalFormData.headshot);
      }
    }
    const result = await dispatch(updateProfile(updatePayload));
    if (result?.meta?.requestStatus === 'fulfilled') {
      toast.success('Profile updated', 'success');
      setInitialPersonalFormData(personalFormData);
      await fetchUserDetails();
      // Mark tutorial step if headshot was uploaded
      if (personalFormData.headshot) {
        try { const { markStep } = require('../../../components/Dashboard/TutorialChecklist'); markStep('headshot'); } catch {}
      }
    } else {
      toast.error(result?.payload || 'Failed to update profile', 'error');
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordFormData((prev) => ({ ...prev, [name]: value }));
    setPasswordErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const passwordValidation = useMemo(
    () => validatePassword(passwordFormData.newPassword),
    [passwordFormData.newPassword]
  );

  const isNewPasswordValid =
    passwordValidation.length &&
    passwordValidation.upper &&
    passwordValidation.number &&
    passwordValidation.specialChar;

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    let newErrors = {};

    if (!passwordFormData.oldPassword) {
      newErrors.oldPassword = 'Old password is required';
    }

    if (!isNewPasswordValid) {
      newErrors.newPassword = 'Password does not meet requirements';
    }

    if (passwordFormData.newPassword !== passwordFormData.confirmNewPassword) {
      newErrors.confirmNewPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setPasswordErrors(newErrors);
      return;
    }

    const passwordPayload = {
      current_password: passwordFormData.oldPassword,
      new_password: passwordFormData.newPassword,
    };

    const result = await dispatch(updatePassword(passwordPayload));
    if (result?.meta?.requestStatus === 'fulfilled') {
      setPasswordFormData({
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      toast.success('Password updated', 'success');
    } else {
      toast.error(
        result?.payload?.response?.data?.message[0]?.current_password ||
          'Failed to change password'
      );
    }
  };
  return (
    <div className='w-full'>
      {/* Section 1: Personal Information */}
      <div className='card-section m-[10px]'>
        <h2 className='text-xl md:2xl font-semibold mb-6'>
          Update Personal Information
        </h2>
        <form
          onSubmit={handlePersonalSubmit}
          className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
        >
          {/* Profile Picture Section */}
          <div className='col-span-full mb-6 pb-6 border-b border-style'>
            <ProfilePictureUpload
              firstName={personalFormData.firstName || profileDetails?.first_name || 'User'}
              currentImageUrl={personalFormData.userImageUrl}
              value={personalFormData.userImage}
              onChange={handlePersonalChange}
              onRemove={() => {
                setPersonalFormData((prev) => ({
                  ...prev,
                  userImage: null,
                  userImageUrl: null,
                }));
              }}
              error={!!personalErrors.userImage}
              errorMsg={personalErrors.userImage}
            />
          </div>
          <CustomInput
            label='First Name'
            name='firstName'
            type='text'
            value={personalFormData.firstName}
            onChange={handlePersonalChange}
            placeholder='Enter your first name'
          />
          <CustomInput
            label='Last Name'
            name='lastName'
            type='text'
            value={personalFormData.lastName}
            onChange={handlePersonalChange}
            placeholder='Enter your last name'
          />
          <CustomInput
            label='Email'
            name='email'
            type='text'
            value={personalFormData.email}
            onChange={handlePersonalChange}
            placeholder='Enter your email'
            error={!!personalErrors.email}
            errorMsg={personalErrors.email}
            ref={personalFieldRefs.email}
          />
          <CustomInput
            label='Phone Number'
            name='phoneNo'
            value={personalFormData.phoneNo}
            onChange={handlePersonalChange}
            placeholder='Enter your phone number'
          />
          <CustomInput
            label='Address'
            name='address'
            type='text'
            value={personalFormData.address}
            onChange={handlePersonalChange}
            placeholder='Enter your address'
          />
          <SelectDropdown
            label='Account Type'
            name='accountType'
            value={personalFormData.accountType}
            onChange={handlePersonalChange}
            options={[
              { label: 'Actor', value: 'actor' },
              { label: 'Casting Director', value: 'casting_director' },
              { label: 'Agent', value: 'agent' },
            ]}
            placeholder='Select account type'
            disabled
          />

          {personalFormData.accountType?.value === 'actor' && (
            <>
              <FilePicker
                label='Headshot'
                name='headshot'
                type='file'
                accept='.jpg,.jpeg,.png,.webp'
                onChange={handlePersonalChange}
                error={!!personalErrors.headshot}
                errorMsg={personalErrors.headshot}
                ref={personalFieldRefs.headshot}
              />
              <CustomInput
                label='Reel URL'
                name='reelUrl'
                type='text'
                value={personalFormData.reelUrl}
                onChange={handlePersonalChange}
                placeholder='Enter your reel URL'
                error={!!personalErrors.reelUrl}
                errorMsg={personalErrors.reelUrl}
                ref={personalFieldRefs.reelUrl}
              />
              <FilePicker
                label='Portfolio'
                name='resumeFile'
                type='file'
                accept='.pdf'
                onChange={handlePersonalChange}
                error={!!personalErrors.resumeFile}
                errorMsg={personalErrors.resumeFile}
                ref={personalFieldRefs.resumeFile}
              />
            </>
          )}

          {personalFormData.accountType?.value === 'casting_director' && (
            <>
              <CustomInput
                label='Company Name'
                name='companyName'
                type='text'
                value={personalFormData.companyName}
                onChange={handlePersonalChange}
                placeholder='Enter your company name'
              />
              <CustomInput
                label='Company Phone'
                name='companyPhone'
                value={personalFormData.companyPhone}
                onChange={handlePersonalChange}
                placeholder='Enter your company phone'
              />
              <CustomInput
                label='Website'
                name='website'
                type='text'
                value={personalFormData.website}
                onChange={handlePersonalChange}
                placeholder='Enter your website'
                error={!!personalErrors.website}
                errorMsg={personalErrors.website}
                ref={personalFieldRefs.website}
              />
              <CustomInput
                label='Office Address'
                name='officeAddress'
                type='text'
                value={personalFormData.officeAddress}
                onChange={handlePersonalChange}
                placeholder='Enter your office address'
              />
              <FilePicker
                label='Logo'
                name='logo'
                type='file'
                accept='.jpg,.jpeg,.png,.webp'
                onChange={handlePersonalChange}
                error={!!personalErrors.logo}
                errorMsg={personalErrors.logo}
                ref={personalFieldRefs.logo}
              />
            </>
          )}

          {personalFormData.accountType?.value === 'agent' && (
            <>
              <CustomInput
                label='Agency Name'
                name='agencyName'
                type='text'
                value={personalFormData.agencyName}
                onChange={handlePersonalChange}
                placeholder='Enter your agency name'
              />
              <CustomInput
                label='Agency Phone'
                name='agencyPhone'
                value={personalFormData.agencyPhone}
                onChange={handlePersonalChange}
                placeholder='Enter your agency phone'
              />
              <CustomInput
                label='Agency Email'
                name='agencyEmail'
                type='text'
                value={personalFormData.agencyEmail}
                onChange={handlePersonalChange}
                placeholder='Enter your agency email'
                error={!!personalErrors.agencyEmail}
                errorMsg={personalErrors.agencyEmail}
                ref={personalFieldRefs.agencyEmail}
              />
              <CustomInput
                label='Website'
                name='website'
                type='text'
                value={personalFormData.website}
                onChange={handlePersonalChange}
                placeholder='Enter your website'
                error={!!personalErrors.website}
                errorMsg={personalErrors.website}
                ref={personalFieldRefs.website}
              />
              <CustomInput
                label='Office Address'
                name='officeAddress'
                type='text'
                value={personalFormData.officeAddress}
                onChange={handlePersonalChange}
                placeholder='Enter your office address'
              />
              <FilePicker
                label='Logo'
                name='logo'
                type='file'
                accept='.jpg,.jpeg,.png,.webp'
                onChange={handlePersonalChange}
                error={!!personalErrors.logo}
                errorMsg={personalErrors.logo}
                ref={personalFieldRefs.logo}
              />
            </>
          )}

          {(personalFormData.accountType?.value === 'actor' ||
            personalFormData.accountType?.value === 'casting_director' ||
            personalFormData.accountType?.value === 'agent') && (
            <div className='col-span-full'>
              <Textarea
                label={
                  personalFormData.accountType?.value === 'casting_director'
                    ? 'Description'
                    : 'Bio'
                }
                name={
                  personalFormData.accountType?.value === 'casting_director'
                    ? 'description'
                    : 'bio'
                }
                value={
                  personalFormData.accountType?.value === 'casting_director'
                    ? personalFormData.description
                    : personalFormData.bio
                }
                onChange={handlePersonalChange}
                placeholder={
                  personalFormData.accountType?.value === 'casting_director'
                    ? 'Enter your description'
                    : 'Enter your bio'
                }
              />
            </div>
          )}

          {personalFormData.accountType?.value === 'actor' && (
            <>
              <h2 className='text-xl md:2xl font-semibold col-span-full'>
                Set Goals
              </h2>

              <CustomInput
                label='Monthly Audition Goal'
                name='monthlyAuditionGoal'
                type='text'
                value={personalFormData.monthlyAuditionGoal}
                onChange={handlePersonalChange}
                placeholder='Enter your monthly audition goal'
                errorMsg={personalErrors.monthlyAuditionGoal}
              />
              <DatePicker
                label='Goal Start Date'
                name='goalStartDate'
                value={
                  personalFormData.goalStartDate
                    ? dayjs(personalFormData.goalStartDate)
                    : null
                }
                onChange={(date) =>
                  handlePersonalChange({
                    target: {
                      name: 'goalStartDate',
                      value: date ? date.format('YYYY-MM-DD') : '',
                    },
                  })
                }
                placeholder='Select goal start date'
                required
              />

              <div className='col-span-full'>
                <CustomCheckbox
                  label='Enable Goal Reminder'
                  name='goalReminderEnabled'
                  checked={personalFormData.goalReminderEnabled}
                  onChange={handlePersonalChange}
                />
              </div>
            </>
          )}

          {personalFormData.accountType?.value === 'coach' && (
            <>
              <CustomInput
                label='Display Name'
                name='display_name'
                type='text'
                value={personalFormData.display_name}
                onChange={handlePersonalChange}
                placeholder='Enter your display name'
              />

              <SelectDropdown
                label='Specialties'
                name='specialties'
                value={personalFormData.specialties}
                onChange={handlePersonalChange}
                options={[
                  { label: 'Drama', value: 'Drama' },
                  { label: 'Comedy', value: 'Comedy' },
                  { label: 'Character Work', value: 'Character Work' },
                  { label: 'Improv', value: 'Improv' },
                ]}
                placeholder='Select your specialties'
                multiSelect={true}
              />

              <CustomInput
                label='Hourly Rate'
                name='hourly_rate'
                type='number'
                value={personalFormData.hourly_rate}
                onChange={handlePersonalChange}
                placeholder='Enter your hourly rate'
              />

              <FilePicker
                label='Headshot'
                name='headshot'
                type='file'
                accept='.jpg,.jpeg,.png,.webp'
                onChange={handlePersonalChange}
                error={!!personalErrors.headshot}
                errorMsg={personalErrors.headshot}
                ref={personalFieldRefs.headshot}
                url={personalFormData?.headshotUrl}
              />
              {console.log(
                'finding url inside component ',
                personalFormData?.headshotUrl
              )}
              <div className='col-span-full'>
                <Textarea
                  label='Bio'
                  name='bio'
                  value={personalFormData.bio}
                  onChange={handlePersonalChange}
                  placeholder='Enter your bio'
                />
              </div>
              <div className='col-span-full'>
                <CustomCheckbox
                  label='Available Now'
                  name='is_available_now'
                  checked={personalFormData.is_available_now}
                  onChange={handlePersonalChange}
                />
              </div>
            </>
          )}
          <div className='col-span-full'>
            <CustomButton
              type='submit'
              loading={loading}
              disabled={!hasChanges || loading}
              sx={{ marginLeft: 'auto' }}
            >
              Update Profile
            </CustomButton>
          </div>
        </form>
      </div>

      {/* Section 2: Change Password */}
      <div className='card-section m-[10px]'>
        <h2 className='text-xl md:2xl font-semibold mb-6'>Change Password</h2>
        <form
          onSubmit={handlePasswordSubmit}
          className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
        >
          <CustomInput
            label='Current Password'
            name='oldPassword'
            type='password'
            value={passwordFormData.oldPassword}
            onChange={handlePasswordChange}
            placeholder='Enter your Current Password'
            error={!!passwordErrors.oldPassword}
            errorMsg={passwordErrors.oldPassword}
          />
          <div className='flex flex-col gap-1 relative'>
            <CustomInput
              label='New Password'
              name='newPassword'
              type='password'
              value={passwordFormData.newPassword}
              onChange={handlePasswordChange}
              placeholder='Enter your new password'
              error={!!passwordErrors.newPassword}
              errorMsg={passwordErrors.newPassword}
            />
            {passwordFormData.newPassword && !isNewPasswordValid && (
              <PasswordRequirements passwordValidation={passwordValidation} />
            )}
          </div>
          <CustomInput
            label='Confirm New Password'
            name='confirmNewPassword'
            type='password'
            value={passwordFormData.confirmNewPassword}
            onChange={handlePasswordChange}
            placeholder='Re-enter your new password'
            error={!!passwordErrors.confirmNewPassword}
            errorMsg={passwordErrors.confirmNewPassword}
          />
          <div className='col-span-full'>
            <CustomButton
              disabled={isEmpty(passwordFormData) || updatePasswordLoading}
              type='submit'
              loading={updatePasswordLoading}
              sx={{ marginLeft: 'auto' }}
            >
              Change Password
            </CustomButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
