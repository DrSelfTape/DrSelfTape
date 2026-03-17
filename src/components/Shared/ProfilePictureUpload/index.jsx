import { useState, useEffect, useRef } from 'react';
import { CustomAvatar, CustomButton } from '../index';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

/**
 * ProfilePictureUpload Component
 * 
 * A professional, reusable component for uploading and managing profile pictures.
 * Features immediate preview, clickable avatar, file validation, and clean UI.
 * 
 * @param {Object} props
 * @param {string} props.firstName - User's first name for initials fallback
 * @param {string} props.currentImageUrl - Current profile image URL
 * @param {File} props.value - Selected file object
 * @param {Function} props.onChange - Callback when file changes: (e) => void
 * @param {Function} props.onRemove - Callback when remove is clicked: () => void
 * @param {boolean} props.showRemoveButton - Whether to show the remove button (default: false)
 * @param {boolean} props.error - Whether there's an error
 * @param {string} props.errorMsg - Error message to display
 * @param {boolean} props.disabled - Whether the component is disabled
 * @param {string} props.label - Label text (default: "Profile Picture")
 * @param {string} props.avatarSize - Avatar size class (default: "w-24 h-24 md:w-28 md:h-28")
 * @param {string} props.accept - Accepted file types (default: ".jpg,.jpeg,.png,.webp")
 * @param {number} props.maxSizeMB - Maximum file size in MB (default: 5)
 */
export const ProfilePictureUpload = ({
  firstName = 'User',
  currentImageUrl = null,
  value = null,
  onChange,
  onRemove,
  showRemoveButton = false,
  error = false,
  errorMsg = '',
  disabled = false,
  label = 'Profile Picture',
  avatarSize = 'w-24 h-24 md:w-28 md:h-28',
  accept = '.jpg,.jpeg,.png,.webp',
  maxSizeMB = 5,
}) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Generate preview URL from selected file - IMMEDIATE PREVIEW
  useEffect(() => {
    if (value) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      setFileName(value.name);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
      setFileName('');
    }
  }, [value]);

  // Clear errors when value changes
  useEffect(() => {
    if (value) {
      setUploadError('');
    }
  }, [value]);

  // Determine which image to show: preview > current > null
  const displayImageUrl = previewUrl || currentImageUrl;
  const hasImage = !!displayImageUrl;
  const isNewUpload = !!previewUrl; // New file selected vs existing image

  // Validate file before processing
  const validateFile = (file) => {
    if (!file) return { valid: false, error: 'No file selected' };

    // Check file type
    const allowedTypes = accept.split(',').map(type => type.trim().toLowerCase());
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed formats: ${accept.replace(/\./g, '').toUpperCase()}`,
      };
    }

    // Check file size (convert MB to bytes)
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size exceeds ${maxSizeMB}MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      };
    }

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      return {
        valid: false,
        error: 'Selected file is not an image',
      };
    }

    return { valid: true, error: '' };
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    
    if (!file) {
      setUploadError('');
      return;
    }

    // Validate file
    const validation = validateFile(file);
    
    if (!validation.valid) {
      setUploadError(validation.error);
      // Clear the input so user can try again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Clear any previous errors
    setUploadError('');
    setIsUploading(true);
    
    // Simulate upload delay for better UX (optional - remove if not needed)
    setTimeout(() => {
      setIsUploading(false);
      // Call onChange with validated file
      if (onChange) {
        onChange(e);
      }
    }, 300);
  };

  const handleAvatarClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Clear preview
    setPreviewUrl(null);
    setFileName('');
    setUploadError('');
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Call remove callback
    if (onRemove) {
      onRemove();
    }
  };

  // Display error from props or internal validation
  const displayError = error && errorMsg ? errorMsg : uploadError;

  return (
    <div className='w-full'>
      <label className='text-sm font-medium text-input-title mb-4 block'>
        {label}
      </label>
      
      <div className='flex flex-col sm:flex-row items-center sm:items-center gap-6'>
        {/* Avatar Display with Upload Overlay */}
        <div className='flex-shrink-0 relative'>
          <div
            className={`relative group ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            onMouseEnter={() => !disabled && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleAvatarClick}
          >
            {/* Avatar */}
            <div className='relative'>
              <CustomAvatar
                userName={firstName}
                hideUsername={true}
                avatarClass={`${avatarSize} transition-all duration-200 ${
                  isHovered && !disabled ? 'ring-2 ring-primary ring-offset-2 scale-105' : ''
                } ${isUploading ? 'opacity-70' : ''}`}
                noUrlNameClass='text-3xl md:text-4xl leading-none'
                url={displayImageUrl}
              />
              
              {/* Loading Overlay */}
              {isUploading && (
                <div className='absolute inset-0 bg-black/30 rounded-full flex items-center justify-center'>
                  <div className='animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent' />
                </div>
              )}
              
              {/* Hover Overlay - Image/File Icon (not camera) */}
              {!disabled && !isUploading && (
                <div
                  className={`absolute inset-0 bg-black/50 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isHovered ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <ImageIcon 
                    sx={{ fontSize: 28, color: 'white' }} 
                    className='drop-shadow-lg'
                  />
                </div>
              )}
            </div>
            
            {/* Upload Badge Indicator - Inside Avatar Border */}
            {hasImage && !disabled && !isUploading && (
              <div className='absolute bottom-1 right-1 bg-primary rounded-full w-5 h-5 shadow-md border-2 border-white z-10 flex items-center justify-center'>
                <ImageIcon sx={{ fontSize: 12, color: 'white' }} />
              </div>
            )}
          </div>
          
          {/* Completely Hidden File Input - Only triggered programmatically */}
          <input
            ref={fileInputRef}
            type='file'
            name='userImage'
            accept={accept}
            onChange={handleFileChange}
            disabled={disabled || isUploading}
            style={{ display: 'none' }}
            aria-label='Upload profile picture'
            tabIndex={-1}
          />
        </div>

        {/* Upload Controls - Left-aligned with form inputs */}
        <div className='flex flex-col gap-2.5 w-full sm:w-auto'>
          <CustomButton
            type='button'
            onClick={handleAvatarClick}
            disabled={disabled || isUploading}
            loading={isUploading}
            className='!bg-primary !text-white hover:!bg-primary-dark !font-medium !px-4 !py-0.5 !rounded-md !text-sm !transition-all !w-full sm:!w-auto !shadow-sm hover:!shadow-md !h-8'
            startIcon={isUploading ? null : <CloudUploadIcon sx={{ fontSize: 18 }} />}
          >
            {isUploading 
              ? 'Uploading...' 
              : hasImage 
                ? 'Change' 
                : 'Upload'
            }
          </CustomButton>
          
          {/* Remove Button - Optional, controlled by showRemoveButton prop */}
          {showRemoveButton && hasImage && !disabled && !isUploading && (
            <CustomButton
              type='button'
              variant='outlined'
              onClick={handleRemove}
              className='!text-sm !text-danger !border-danger hover:!bg-danger/10 !font-medium !px-4 !py-0.5 !rounded-md !transition-all !w-full sm:!w-auto !shadow-sm hover:!shadow-md !h-8'
              startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
            >
              Remove
            </CustomButton>
          )}
          
          {/* Error Message */}
          {displayError && (
            <div className='bg-danger/10 border border-danger/20 rounded-md p-2 mt-1'>
              <p className='text-xs text-danger font-medium'>
                {displayError}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePictureUpload;
