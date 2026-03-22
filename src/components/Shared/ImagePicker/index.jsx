import { useState, useEffect } from 'react';
import { CrossIcon } from '../../../assets/icons';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

export const ImagePicker = ({
  label,
  name,
  onChange,
  disabled = false,
  error = false,
  errorMsg = '',
  className = '',
  placeholder = 'Upload an image',
  accept = '.jpg,.jpeg,.png,.webp',
}) => {
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    } else {
      setImagePreview(null);
    }
    onChange(e);
  };

  const handleClear = () => {
    setImagePreview(null);
    onChange({ target: { name, value: null, files: [] } });
  };

  return (
    <div className={`relative w-full ${className}`}>
      {label && (
        <label
          className={`absolute left-3 text-xs -top-[8px] text-nowrap z-10 bg-white px-1 transition-all duration-200
            ${error ? 'text-danger' : 'text-input-title'}
          `}
        >
          {label}
        </label>
      )}
      <div
        className={`w-full min-w-[180px] h-[120px] border rounded transition-all flex items-center justify-center relative
          ${disabled ? 'bg-input-disabled cursor-not-allowed' : 'bg-white'}
          ${error ? 'border-danger' : 'border-input hover:border-input-hover'}
        `}
      >
        {imagePreview ? (
          <div className='relative w-full h-full'>
            <img
              src={imagePreview}
              alt='Preview'
              className='w-full h-full object-cover rounded'
            />
            {!disabled && (
              <CrossIcon
                className='absolute top-2 right-2 size-5 cursor-pointer text-white bg-black/50 rounded-full p-1'
                onClick={handleClear}
              />
            )}
          </div>
        ) : (
          <Button
            variant='outlined'
            startIcon={<AddIcon />}
            disabled={disabled}
            onClick={() =>
              document.getElementById(`${name}-image-input`).click()
            }
            sx={{
              textTransform: 'none',
              borderColor: `var(--color-${error ? 'danger' : 'input'})`,
              color: 'var(--color-input-placeholder)',
              '&:hover': {
                borderColor: `var(--color-${error ? 'danger' : 'input-hover'})`,
                backgroundColor: `var(--color-input-hover)20`,
              },
              fontFamily: '"Inter", sans-serif',
              fontSize: '14px',
            }}
          >
            {placeholder}
          </Button>
        )}
        <input
          type='file'
          name={name}
          onChange={handleImageChange}
          disabled={disabled}
          accept={accept}
          className='hidden'
          id={`${name}-image-input`}
        />
      </div>
      {error && (
        <span className='text-[11px] text-danger ml-1 block absolute top-[124px]'>
          {errorMsg}
        </span>
      )}
    </div>
  );
};
