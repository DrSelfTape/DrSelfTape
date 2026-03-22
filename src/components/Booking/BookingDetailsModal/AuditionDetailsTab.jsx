// AuditionDetailsTab.jsx
import {
  CustomInput,
  SelectDropdown,
  Textarea,
  CustomCheckbox,
  FilePicker,
  DatePicker,
  TimePicker,
} from '../../../components/Shared';
import dayjs from 'dayjs';

const AuditionDetailsTab = ({
  formData,
  isEditing,
  handleChange,
  handleDateChange,
  OPTIONS,
}) => {
  const statusStyles = {
    open: 'bg-[var(--color-primary-light)] text-[var(--color-primary-dark)] border-[var(--color-primary)]',
    closed:
      'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20',
    completed:
      'bg-[var(--color-secondary-light)] text-[var(--color-secondary-dark)] border-[var(--color-secondary)]',
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <span
          className={`px-4 py-2 rounded-full text-sm font-medium border ${
            statusStyles[formData.status]
          }`}
        >
          {formData.status.charAt(0).toUpperCase() +
            formData.status.slice(1)}
        </span>
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {(isEditing || formData.title) && (
          <CustomInput
            title='Title'
            name='title'
            disabled={!isEditing}
            className='edit-booking-style'
            type='text'
            value={formData.title || ''}
            onChange={isEditing ? handleChange : undefined}
            placeholder='Enter Title'
            required={isEditing}
          />
        )}
        {(isEditing || formData.purpose) && (
          <SelectDropdown
            title='Purpose'
            name='purpose'
            disabled={!isEditing}
            className='edit-booking-style !p-0 !h-[45px]'
            value={
              OPTIONS.purpose.find(
                (option) => option.value === formData.purpose
              ) || null
            }
            onChange={isEditing ? handleChange : undefined}
            options={OPTIONS.purpose}
            placeholder='Select Purpose'
          />
        )}
        {(isEditing || formData.status) && (
          <SelectDropdown
            title='Status'
            name='status'
            disabled={!isEditing}
            className='edit-booking-style !p-0 !h-[45px]'
            value={
              OPTIONS.status.find(
                (option) => option.value === formData.status
              ) || null
            }
            onChange={isEditing ? handleChange : undefined}
            options={OPTIONS.status}
            placeholder='Select Status'
            required={isEditing}
          />
        )}
        {(isEditing || formData.audition_date) && (
          <DatePicker
            title='Audition Date'
            name='audition_date'
            disabled={!isEditing}
            className='edit-booking-style !p-0 !h-[45px] !pt-1'
            value={
              formData.audition_date ? dayjs(formData.audition_date) : null
            }
            onChange={
              isEditing ? handleDateChange('audition_date') : undefined
            }
            required={isEditing}
          />
        )}
        {(isEditing || formData.audition_time) && (
          <TimePicker
            title='Audition Time'
            name='audition_time'
            disabled={!isEditing}
            className='edit-booking-style !p-0 !h-[45px] !pt-1'
            value={
              formData.audition_time
                ? dayjs(formData.audition_time, 'HH:mm')
                : null
            }
            onChange={
              isEditing ? handleDateChange('audition_time') : undefined
            }
            placeholder='Select Time'
            required={isEditing}
          />
        )}
        {(isEditing || formData.casting_director_name) && (
          <CustomInput
            title='Casting Director Name'
            name='casting_director_name'
            disabled={!isEditing}
            className='edit-booking-style'
            type='text'
            value={formData.casting_director_name || ''}
            onChange={isEditing ? handleChange : undefined}
            placeholder='Enter Casting Director Name'
            required={isEditing}
          />
        )}
        {(isEditing || formData.casting_director_company) && (
          <CustomInput
            title='Casting Director Company'
            name='casting_director_company'
            disabled={!isEditing}
            className='edit-booking-style'
            type='text'
            value={formData.casting_director_company || ''}
            onChange={isEditing ? handleChange : undefined}
            placeholder='Enter Casting Director Company'
          />
        )}
        {(isEditing || formData.casting_director_contact) && (
          <CustomInput
            title='Casting Director Contact'
            name='casting_director_contact'
            disabled={!isEditing}
            className='edit-booking-style'
            type='text'
            value={formData.casting_director_contact || ''}
            onChange={isEditing ? handleChange : undefined}
            placeholder='Enter Casting Director Contact'
          />
        )}
        {(isEditing || formData.location_name) && (
          <CustomInput
            title='Location Name'
            name='location_name'
            disabled={!isEditing}
            className='edit-booking-style'
            type='text'
            value={formData.location_name || ''}
            onChange={isEditing ? handleChange : undefined}
            placeholder='Enter Location Name'
            required={isEditing}
          />
        )}
        {(isEditing || formData.location_address) && (
          <CustomInput
            title='Location Address'
            name='location_address'
            disabled={!isEditing}
            className='edit-booking-style'
            type='text'
            value={formData.location_address || ''}
            onChange={isEditing ? handleChange : undefined}
            placeholder='Enter Location Address'
          />
        )}
        {(isEditing || formData.virtual_link) && (
          <CustomInput
            title='Virtual Link'
            name='virtual_link'
            disabled={!isEditing}
            className='edit-booking-style'
            type='text'
            value={formData.virtual_link || ''}
            onChange={isEditing ? handleChange : undefined}
            placeholder='Enter Virtual Link'
          />
        )}
        {(isEditing || formData.project_name) && (
          <CustomInput
            title='Project Name'
            name='project_name'
            disabled={!isEditing}
            className='edit-booking-style'
            type='text'
            value={formData.project_name || ''}
            onChange={isEditing ? handleChange : undefined}
            placeholder='Enter Project Name'
            required={isEditing}
          />
        )}
        {(isEditing || formData.role_name) && (
          <CustomInput
            title='Role Name'
            name='role_name'
            disabled={!isEditing}
            className='edit-booking-style'
            type='text'
            value={formData.role_name || ''}
            onChange={isEditing ? handleChange : undefined}
            placeholder='Enter Role Name'
            required={isEditing}
          />
        )}
        {(isEditing || formData.audition_type) && (
          <SelectDropdown
            title='Audition Type'
            name='audition_type'
            disabled={!isEditing}
            className='edit-booking-style !p-0 !h-[45px]'
            value={
              OPTIONS.audition_type.find(
                (option) => option.value === formData.audition_type
              ) || null
            }
            onChange={isEditing ? handleChange : undefined}
            options={OPTIONS.audition_type}
            placeholder='Select Audition Type'
          />
        )}
        {(isEditing || formData.audition_status) && (
          <SelectDropdown
            title='Audition Status'
            name='audition_status'
            disabled={!isEditing}
            className='edit-booking-style !p-0 !h-[45px]'
            value={
              OPTIONS.audition_status.find(
                (option) => option.value === formData.audition_status
              ) || null
            }
            onChange={isEditing ? handleChange : undefined}
            options={OPTIONS.audition_status}
            placeholder='Select Audition Status'
            required={isEditing}
          />
        )}
        {(isEditing || formData.gender_preference) && (
          <SelectDropdown
            title='Gender Preference'
            name='gender_preference'
            disabled={!isEditing}
            className='edit-booking-style !p-0 !h-[45px]'
            value={
              OPTIONS.gender_preference.find(
                (option) => option.value === formData.gender_preference
              ) || null
            }
            onChange={isEditing ? handleChange : undefined}
            options={OPTIONS.gender_preference}
            placeholder='Select Gender Preference'
          />
        )}
        {(isEditing || formData.submission_method) && (
          <SelectDropdown
            title='Submission Method'
            name='submission_method'
            disabled={!isEditing}
            className='edit-booking-style !p-0 !h-[45px]'
            value={
              OPTIONS.submission_method.find(
                (option) => option.value === formData.submission_method
              ) || null
            }
            onChange={isEditing ? handleChange : undefined}
            options={OPTIONS.submission_method}
            placeholder='Select Submission Method'
          />
        )}
        {(isEditing || formData.file) && (
          <FilePicker
            title='File'
            disabled={true}
            name='file'
            url='https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR9SRRmhH4X5N2e4QalcoxVbzYsD44C-sQv-w&s'
            className='edit-booking-style !h-[45px]'
            value={formData.file ? formData.file.name || formData.file : ''}
            onChange={isEditing ? handleChange : undefined}
          />
        )}
        {(isEditing || formData.description) && (
          <Textarea
            title='Description'
            name='description'
            disabled={!isEditing}
            rows={2}
            className='edit-booking-text-area-style'
            value={formData.description || ''}
            onChange={isEditing ? handleChange : undefined}
            placeholder='Enter Description'
          />
        )}
        {(isEditing || formData.role_description) && (
          <Textarea
            title='Role Description'
            name='role_description'
            disabled={!isEditing}
            rows={2}
            className='edit-booking-text-area-style'
            value={formData.role_description || ''}
            onChange={isEditing ? handleChange : undefined}
            placeholder='Enter Role Description'
          />
        )}
        {(isEditing || formData.self_notes) && (
          <Textarea
            title='Self Notes'
            name='self_notes'
            rows={2}
            disabled={!isEditing}
            className='edit-booking-text-area-style'
            value={formData.self_notes || ''}
            onChange={isEditing ? handleChange : undefined}
            placeholder='Enter Self Notes'
          />
        )}
        {isEditing && (
          <div className='col-span-full'>
            <CustomCheckbox
              label='Is Virtual'
              name='is_virtual'
              disabled={!isEditing}
              className='edit-booking-style'
              value={
                formData.is_virtual === 'true' ||
                formData.is_virtual === true
              }
              onChange={
                isEditing
                  ? (e) =>
                      handleChange({
                        target: {
                          name: 'is_virtual',
                          value: e.target.checked ? true : false,
                        },
                      })
                  : undefined
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditionDetailsTab;