import { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';

// Local Imports
import { AuthLayout } from '../../../components/Auth/AuthLayout';
import {
  CustomButton,
  CustomCheckbox,
  CustomInput,
  Logo,
  SelectDropdown,
  FilePicker,
  Textarea,
} from '../../../components/Shared';
import { validateEmail, validatePassword } from '../../../utils/utils';
import PasswordRequirements from '../../../components/Shared/PasswordRequirments';
import { registerUser } from '../../../redux/features/auth/authSlice';
import { AppleIcon, GoogleIcon } from '../../../assets/icons';
import { useSnackbar } from '../../../hooks/useSnackbar';

export const Signup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { toast } = useSnackbar();
  const [formData, setFormData] = useState({
    firstName: '',
    email: '',
    password: '',
    confirmPassword: '',
    accountType: '',
    phoneNo: '',
    // Actor fields
    bio: '',
    headshot: null,
    reelUrl: '',
    resumeFile: null,
    availability: {},
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
    // Coach fields
    display_name: '',
    specialties: [],
    hourly_rate: '',
  });
  const fieldRefs = {
    email: useRef(null),
    password: useRef(null),
    confirmPassword: useRef(null),
    headshot: useRef(null),
    resumeFile: useRef(null),
    logo: useRef(null),
    agencyEmail: useRef(null),
    reelUrl: useRef(null),
    website: useRef(null),
  };
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    let { name, value, type, files } = e.target;

    if (
      name === 'phoneNo' ||
      name === 'companyPhone' ||
      name === 'agencyPhone'
    ) {
      value = value.replace(/[^0-9+\-\s()]/g, '');
    }

    if (type === 'file') {
      value = files[0] || null;
    }

    if (name === 'metricsOptIn') {
      value = e.target.checked;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

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
  
  const validateURL = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let newErrors = {};

    if (!validateEmail(formData?.email?.trim())) {
      newErrors.email = 'Invalid Email';
    }

    if (
      validatePassword(formData?.password?.trim()) &&
      validatePassword(formData?.confirmPassword?.trim()) &&
      formData?.password !== formData?.confirmPassword
    ) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // File validations
    if (formData.accountType?.value === 'actor') {
      if (
        formData.headshot &&
        !validateFile(formData.headshot, ['jpg', 'jpeg', 'png', 'webp'])
      ) {
        newErrors.headshot =
          'Invalid file format. Allowed: jpg, jpeg, png, webp';
      }
      if (formData.resumeFile && !validateFile(formData.resumeFile, ['pdf'])) {
        newErrors.resumeFile = 'Invalid file format. Allowed: pdf';
      }
    }

    if (
      formData.accountType?.value === 'casting_director' ||
      formData.accountType?.value === 'agent'
    ) {
      if (
        formData.logo &&
        !validateFile(formData.logo, ['jpg', 'jpeg', 'png', 'webp'])
      ) {
        newErrors.logo = 'Invalid file format. Allowed: jpg, jpeg, png, webp';
      }
    }

    if (
      formData.accountType?.value === 'agent' &&
      formData.agencyEmail &&
      !validateEmail(formData.agencyEmail?.trim())
    ) {
      newErrors.agencyEmail = 'Invalid Agency Email';
    }

    if (formData.reelUrl && !validateURL(formData.reelUrl.trim())) {
      newErrors.reelUrl = 'Invalid URL format for Reel';
    }

    if (formData.website && !validateURL(formData.website.trim())) {
      newErrors.website = 'Invalid URL format for Website';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorField = Object.keys(newErrors)[0];
      if (firstErrorField && fieldRefs[firstErrorField]?.current) {
        fieldRefs[firstErrorField].current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
      return;
    }

    const registrationPayload = new FormData();
    registrationPayload.append('email', formData?.email?.trim()?.toLowerCase());
    registrationPayload.append('password', formData?.password);
    registrationPayload.append('first_name', formData?.firstName?.trim());
    registrationPayload.append(
      'role',
      formData?.accountType?.value?.toLowerCase()
    );
    registrationPayload.append('phone_no', formData?.phoneNo?.trim());

    // Append role-specific fields
    if (formData.accountType?.value === 'actor') {
      if (formData.bio) registrationPayload.append('bio', formData.bio);
      if (formData.headshot)
        registrationPayload.append('headshot', formData.headshot);
      if (formData.reelUrl)
        registrationPayload.append('reel_url', formData.reelUrl);
      if (formData.resumeFile)
        registrationPayload.append('resume_file', formData.resumeFile);
      if (Object.keys(formData.availability).length > 0) {
        registrationPayload.append(
          'availability',
          JSON.stringify(formData.availability)
        );
      }
      registrationPayload.append('metrics_opt_in', formData.metricsOptIn);
    }

    if (formData.accountType?.value === 'casting_director') {
      if (formData.companyName)
        registrationPayload.append('company_name', formData.companyName);
      if (formData.companyPhone)
        registrationPayload.append('company_phone', formData.companyPhone);
      if (formData.website)
        registrationPayload.append('website', formData.website);
      if (formData.officeAddress)
        registrationPayload.append('office_address', formData.officeAddress);
      if (formData.logo) registrationPayload.append('logo', formData.logo);
      if (formData.description)
        registrationPayload.append('description', formData.description);
    }

    if (formData.accountType?.value === 'agent') {
      if (formData.agencyName)
        registrationPayload.append('agency_name', formData.agencyName);
      if (formData.agencyPhone)
        registrationPayload.append('agency_phone', formData.agencyPhone);
      if (formData.agencyEmail)
        registrationPayload.append('agency_email', formData.agencyEmail);
      if (formData.website)
        registrationPayload.append('website', formData.website);
      if (formData.officeAddress)
        registrationPayload.append('office_address', formData.officeAddress);
      if (formData.logo) registrationPayload.append('logo', formData.logo);
      if (formData.bio) registrationPayload.append('bio', formData.bio);
    }

    if (formData.accountType?.value === 'coach') {
      if (formData.display_name)
        registrationPayload.append(
          'display_name',
          formData.display_name.trim()
        );
      if (formData.specialties.length > 0)
        registrationPayload.append(
          'specialties',
          JSON.stringify(formData.specialties.map((s) => s.value || s))
        );
      if (formData.hourly_rate)
        registrationPayload.append('hourly_rate', formData.hourly_rate);
      // Automatically add services for coach
      registrationPayload.append('services', JSON.stringify(['Reader']));
    }

    try {
      setLoading(true);
      const action = dispatch(registerUser(registrationPayload));
      const data = await action;

      if (data?.meta?.requestStatus === 'fulfilled') {
        setFormData({
          firstName: '',
          email: '',
          password: '',
          confirmPassword: '',
          accountType: '',
          phoneNo: '',
          bio: '',
          headshot: null,
          reelUrl: '',
          resumeFile: null,
          availability: {},
          metricsOptIn: false,
          companyName: '',
          companyPhone: '',
          website: '',
          officeAddress: '',
          logo: null,
          description: '',
          agencyName: '',
          agencyPhone: '',
          agencyEmail: '',
        });

        setLoading(false);
      } else if (data?.meta?.requestStatus === 'rejected') {
        setLoading(false);
        toast.error(data.payload || 'An error occurred');
      }
    } catch (err) {
      setLoading(false);
      toast.error(typeof err === 'string' ? err : 'An error occurred');
      console.error('Registration failed:', err);
    }
  };

  const accountOptions = [
    { label: 'Actor', value: 'actor' },
    { label: 'Casting Director', value: 'casting_director' },
    { label: 'Agent', value: 'agent' },
    { label: 'Reader', value: 'coach' },
  ];

  const passwordValidation = useMemo(
    () => validatePassword(formData?.password),
    [formData?.password]
  );

  const isPasswordValid =
    passwordValidation.length &&
    passwordValidation.upper &&
    passwordValidation.number &&
    passwordValidation.specialChar;

  return (
    <AuthLayout>
      <div className='mx-auto w-full max-w-sm lg:w-96'>
        <Logo showText={false} />
        <h2 className='mt-3 lg:mt-6 text-2xl font-semibold tracking-tight text-gray-900 text-center'>
          Sign up to your account
        </h2>

        <div className='mt-8'>
          <div>
            <div>
              <p className='text-sm font-medium text-gray-700 pb-1'>
                Sign up with
              </p>
              <div className='mt-1 grid grid-cols-2 gap-3'>
                <div className='h-[42px] inline-flex w-full justify-center items-center rounded-md cursor-pointer border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-500 shadow-sm hover:bg-gray-50'>
                  <span className='sr-only'>Sign in with Google</span>
                  <GoogleIcon />
                </div>

                <div className='h-[42px] inline-flex w-full justify-center rounded-md border cursor-pointer border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-500 shadow-sm hover:bg-gray-50'>
                  <span className='sr-only'>Sign up with Apple</span>
                  <AppleIcon />
                </div>
              </div>
            </div>

            <div className='relative my-6'>
              <div
                className='absolute inset-0 flex items-center'
                aria-hidden='true'
              >
                <div className='w-full border-t border-gray-300' />
              </div>
              <div className='relative flex justify-center text-sm'>
                <span className='bg-white px-2 text-gray-500'>
                  Or continue with
                </span>
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmit} className=''>
            <div className='space-y-8'>
              <CustomInput
                label='Full Name'
                name='firstName'
                type='text'
                autoFocus
                value={formData.firstName}
                onChange={handleChange}
                placeholder='Enter your first name'
                required
              />

              <CustomInput
                label='Email'
                name='email'
                type='text'
                value={formData.email}
                onChange={handleChange}
                placeholder='Enter your email'
                error={!!errors.email}
                errorMsg={errors.email}
                required
                ref={fieldRefs.email}
              />

              <div className='flex flex-col gap-1 relative'>
                <CustomInput
                  label='Password'
                  name='password'
                  type='password'
                  value={formData.password}
                  onChange={handleChange}
                  placeholder='Enter your password'
                  error={!!errors.password}
                  errorMsg={errors.password}
                  required
                  ref={fieldRefs.password}
                />
                {formData.password && !isPasswordValid && (
                  <PasswordRequirements
                    passwordValidation={passwordValidation}
                  />
                )}
              </div>

              <CustomInput
                label='Confirm Password'
                name='confirmPassword'
                type='password'
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder='Re-enter your password'
                error={!!errors.confirmPassword}
                errorMsg={errors.confirmPassword}
                ref={fieldRefs.confirmPassword}
              />

              <CustomInput
                label='Phone Number'
                name='phoneNo'
                value={formData.phoneNo}
                onChange={handleChange}
                placeholder='Enter your phone number'
                required
              />

              <SelectDropdown
                label='Account Type'
                name={'accountType'}
                value={formData.accountType}
                onChange={handleChange}
                options={accountOptions}
                placeholder='Select account type'
                required
              />

              {formData.accountType?.value === 'actor' && (
                <div className='space-y-8'>
                  <Textarea
                    label='Bio'
                    name='bio'
                    type='text'
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder='Enter your bio'
                    required
                  />
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
                    label='Reel URL'
                    name='reelUrl'
                    type='text'
                    value={formData.reelUrl}
                    onChange={handleChange}
                    placeholder='Enter your reel URL'
                    error={!!errors.reelUrl}
                    errorMsg={errors.reelUrl}
                    ref={fieldRefs.reelUrl}
                  />
                  <FilePicker
                    label='Portfolio'
                    name='resumeFile'
                    type='file'
                    accept='.pdf'
                    onChange={handleChange}
                    error={!!errors.resumeFile}
                    errorMsg={errors.resumeFile}
                    ref={fieldRefs.resumeFile}
                  />
                  {/* <CustomCheckbox
                    label='Opt-in for Metrics'
                    name='metricsOptIn'
                    checked={formData.metricsOptIn}
                    onChange={handleChange}
                    className='mt-[3px] accent-primary w-4 h-4'
                  /> */}
                </div>
              )}

              {formData.accountType?.value === 'casting_director' && (
                <div className='space-y-8'>
                  <CustomInput
                    label='Company Name'
                    name='companyName'
                    type='text'
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder='Enter your company name'
                    required
                  />
                  <CustomInput
                    label='Company Phone'
                    name='companyPhone'
                    value={formData.companyPhone}
                    onChange={handleChange}
                    placeholder='Enter your company phone'
                  />
                  <CustomInput
                    label='Website'
                    name='website'
                    type='text'
                    value={formData.website}
                    onChange={handleChange}
                    placeholder='Enter your website'
                    error={!!errors.website}
                    errorMsg={errors.website}
                    ref={fieldRefs.website}
                  />
                  <CustomInput
                    label='Office Address'
                    name='officeAddress'
                    type='text'
                    value={formData.officeAddress}
                    onChange={handleChange}
                    placeholder='Enter your office address'
                  />
                  <FilePicker
                    label='Logo'
                    name='logo'
                    type='file'
                    accept='.jpg,.jpeg,.png,.webp'
                    onChange={handleChange}
                    error={!!errors.logo}
                    errorMsg={errors.logo}
                    ref={fieldRefs.logo}
                  />
                  <Textarea
                    label='Description'
                    name='description'
                    type='text'
                    value={formData.description}
                    onChange={handleChange}
                    placeholder='Enter your description'
                  />
                </div>
              )}

              {formData.accountType?.value === 'agent' && (
                <div className='space-y-8'>
                  <CustomInput
                    label='Agency Name'
                    name='agencyName'
                    type='text'
                    value={formData.agencyName}
                    onChange={handleChange}
                    placeholder='Enter your agency name'
                    required
                  />
                  <CustomInput
                    label='Agency Phone'
                    name='agencyPhone'
                    value={formData.agencyPhone}
                    onChange={handleChange}
                    placeholder='Enter your agency phone'
                  />
                  <CustomInput
                    label='Agency Email'
                    name='agencyEmail'
                    type='text'
                    value={formData.agencyEmail}
                    onChange={handleChange}
                    placeholder='Enter your agency email'
                    error={!!errors.agencyEmail}
                    errorMsg={errors.agencyEmail}
                    ref={fieldRefs.agencyEmail}
                  />
                  <CustomInput
                    label='Website'
                    name='website'
                    type='text'
                    value={formData.website}
                    onChange={handleChange}
                    placeholder='Enter your website'
                    error={!!errors.website}
                    errorMsg={errors.website}
                    ref={fieldRefs.website}
                  />
                  <CustomInput
                    label='Office Address'
                    name='officeAddress'
                    type='text'
                    value={formData.officeAddress}
                    onChange={handleChange}
                    placeholder='Enter your office address'
                  />
                  <FilePicker
                    label='Logo'
                    name='logo'
                    type='file'
                    accept='.jpg,.jpeg,.png,.webp'
                    onChange={handleChange}
                    error={!!errors.logo}
                    errorMsg={errors.logo}
                    ref={fieldRefs.logo}
                  />
                  <Textarea
                    label='Bio'
                    name='bio'
                    type='text'
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder='Enter your bio'
                  />
                </div>
              )}
              {formData.accountType?.value === 'coach' && (
                <div className='space-y-8'>
                  <CustomInput
                    label='Display Name'
                    name='display_name'
                    type='text'
                    value={formData.display_name}
                    onChange={handleChange}
                    placeholder='Enter your display name'
                    required
                  />

                  <SelectDropdown
                    label='Specialties'
                    name='specialties'
                    value={formData.specialties}
                    onChange={handleChange}
                    options={[
                      { label: 'Drama', value: 'Drama' },
                      { label: 'Comedy', value: 'Comedy' },
                      { label: 'Character Work', value: 'Character Work' },
                      { label: 'Improv', value: 'Improv' },
                    ]}
                    placeholder='Select your specialties'
                    multiSelect={true}
                    required
                  />

                  <CustomInput
                    label='Hourly Rate'
                    name='hourly_rate'
                    type='number'
                    value={formData.hourly_rate}
                    onChange={handleChange}
                    placeholder='Enter your hourly rate'
                    required
                  />
                </div>
              )}
            </div>

            <div className='space-y-5 mt-5'>
              <CustomCheckbox
                type='checkbox'
                required={true}
                label={'I agree to the Terms and Conditions'}
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className='mt-[3px] accent-primary w-4 h-4'
              />

              <div className='flex flex-col gap-2'>
                <CustomButton
                  disabled={
                    !formData.firstName ||
                    !formData.email ||
                    !formData.password ||
                    !formData.confirmPassword ||
                    !formData.accountType ||
                    !formData.phoneNo ||
                    (formData.accountType?.value === 'actor' &&
                      !formData.bio) ||
                    (formData.accountType?.value === 'casting_director' &&
                      !formData.companyName) ||
                    (formData.accountType?.value === 'agent' &&
                      !formData.agencyName) ||
                    !isPasswordValid ||
                    !agreeTerms ||
                    (formData.accountType?.value === 'coach' &&
                      (!formData.display_name ||
                        !formData.specialties.length ||
                        !formData.hourly_rate))
                  }
                  type='submit'
                  loading={loading}
                  sx={{
                    width: '100%',
                  }}
                >
                  Sign Up
                </CustomButton>

                <p className='text-sm text-center'>
                  Already have an account?{' '}
                  <button
                    type='button'
                    onClick={() => navigate('/login')}
                    className='text-primary font-medium hover:underline cursor-pointer'
                  >
                    Log in
                  </button>
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
};
